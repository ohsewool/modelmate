
# ── 컬럼 목록 (부분 재실행용) ─────────────────────────────
@app.get("/api/columns")
async def get_columns():
    df = STATE.get("df")
    if df is None: raise HTTPException(400, "데이터 없음")
    return {
        "columns": df.columns.tolist(),
        "current_target": STATE.get("target_col"),
        "current_drop": STATE.get("drop_cols", []),
    }

# ── 인증 ─────────────────────────────────────────────────
class GoogleTokenBody(BaseModel):
    credential: str

@app.post("/api/auth/google")
async def auth_google(body: GoogleTokenBody):
    try:
        info = id_token.verify_oauth2_token(
            body.credential, grequests.Request(), GOOGLE_CLIENT_ID
        )
    except Exception as e:
        raise HTTPException(400, f"Google 토큰 검증 실패: {e}")

    user_id = info["sub"]
    email   = info.get("email", "")
    name    = info.get("name", "")
    picture = info.get("picture", "")

    conn = get_db()
    existing = conn.execute("SELECT id, role FROM users WHERE id=?", (user_id,)).fetchone()
    if not existing:
        role = "admin" if email == os.getenv("ADMIN_EMAIL", "admin@modelmate.local") else "user"
        conn.execute(
            "INSERT INTO users (id, email, name, picture, role, created_at) VALUES (?,?,?,?,?,?)",
            (user_id, email, name, picture, role, datetime.now().isoformat())
        )
        conn.commit()
    else:
        role = existing["role"] or "user"
    conn.close()

    token = jose_jwt.encode(
        {"sub": user_id, "email": email, "name": name, "picture": picture, "role": role},
        JWT_SECRET, algorithm=JWT_ALGORITHM
    )
    return {"token": token, "user": {"id": user_id, "email": email, "name": name, "picture": picture, "role": role}}

class EmailAuthBody(BaseModel):
    email: str
    password: str
    name: str = ""

def make_token(user_id, email, name, picture="", role="user"):
    return jose_jwt.encode(
        {"sub": user_id, "email": email, "name": name, "picture": picture, "role": role},
        JWT_SECRET, algorithm=JWT_ALGORITHM
