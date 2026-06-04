class ProjectBody(BaseModel):
    name: str = "기본 프로젝트"
    description: str = ""


def ensure_default_project(user_id, name="기본 프로젝트"):
    import uuid
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM projects WHERE user_id=? ORDER BY created_at ASC LIMIT 1",
        (user_id,),
    ).fetchone()
    if row:
        conn.close()
        return dict(row)
    project_id = str(uuid.uuid4())[:8]
    now = datetime.now().isoformat()
    conn.execute(
        "INSERT INTO projects (id,user_id,name,description,created_at,updated_at) VALUES (?,?,?,?,?,?)",
        (project_id, user_id, name, "자동 생성된 기본 작업공간 프로젝트", now, now),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM projects WHERE id=?", (project_id,)).fetchone()
    conn.close()
    return dict(row)


def save_dataset_record(user, filename, df, target_col, quality, domain_info):
    if not user:
        return None
    import uuid
    project = ensure_default_project(user["sub"])
    dataset_id = str(uuid.uuid4())[:8]
    now = datetime.now().isoformat()
    conn = get_db()
    conn.execute(
        """INSERT INTO datasets
           (id,project_id,user_id,filename,rows,columns,target_col,domain,quality,created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (
            dataset_id, project["id"], user["sub"], filename, int(df.shape[0]), int(df.shape[1]),
            str(target_col), domain_info.get("dataset_domain"), json.dumps(quality, ensure_ascii=False), now,
        ),
    )
    conn.execute("UPDATE projects SET updated_at=? WHERE id=?", (now, project["id"]))
    conn.commit()
    conn.close()
    return {"id": dataset_id, "project_id": project["id"], "project_name": project["name"]}


@app.get("/api/projects")
async def list_projects(user=Depends(get_current_user)):
    if not user:
        return []
    ensure_default_project(user["sub"])
    conn = get_db()
    rows = conn.execute(
        """SELECT p.*, COUNT(d.id) AS dataset_count
           FROM projects p LEFT JOIN datasets d ON d.project_id=p.id
           WHERE p.user_id=? GROUP BY p.id ORDER BY p.updated_at DESC""",
        (user["sub"],),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/api/projects")
async def create_project(body: ProjectBody, user=Depends(get_current_user)):
    if not user:
        raise HTTPException(401, "로그인이 필요합니다")
    import uuid
    project_id = str(uuid.uuid4())[:8]
    now = datetime.now().isoformat()
    conn = get_db()
    conn.execute(
        "INSERT INTO projects (id,user_id,name,description,created_at,updated_at) VALUES (?,?,?,?,?,?)",
        (project_id, user["sub"], body.name.strip() or "새 프로젝트", body.description, now, now),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM projects WHERE id=?", (project_id,)).fetchone()
    conn.close()
    return dict(row)


@app.get("/api/datasets")
async def list_datasets(user=Depends(get_current_user)):
    if not user:
        return []
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM datasets WHERE user_id=? ORDER BY created_at DESC LIMIT 100",
        (user["sub"],),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]
