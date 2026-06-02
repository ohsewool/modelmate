    )

@app.post("/api/auth/signup")
async def auth_signup(body: EmailAuthBody):
    import uuid
    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE email=?", (body.email,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(400, "이미 사용 중인 이메일입니다")
    user_id = str(uuid.uuid4())
    password_hash = hash_password(body.password)
    name = body.name or body.email.split("@")[0]
    conn.execute(
        "INSERT INTO users (id, email, name, picture, password_hash, created_at) VALUES (?,?,?,?,?,?)",
        (user_id, body.email, name, "", password_hash, datetime.now().isoformat())
    )
    conn.commit(); conn.close()
    token = make_token(user_id, body.email, name)
    return {"token": token, "user": {"id": user_id, "email": body.email, "name": name, "picture": ""}}

@app.post("/api/auth/login")
async def auth_login(body: EmailAuthBody):
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE email=?", (body.email,)).fetchone()
    conn.close()
    if not row or not row["password_hash"]:
        raise HTTPException(400, "이메일 또는 비밀번호가 올바르지 않습니다")
    if not verify_password(body.password, row["password_hash"]):
        raise HTTPException(400, "이메일 또는 비밀번호가 올바르지 않습니다")
    token = make_token(row["id"], row["email"], row["name"], row["picture"] or "")
    return {"token": token, "user": {"id": row["id"], "email": row["email"], "name": row["name"], "picture": row["picture"] or ""}}

@app.get("/api/auth/me")
async def auth_me(user=Depends(get_current_user)):
    if not user:
        raise HTTPException(401, "로그인이 필요합니다")
    return user

# ── 기록 ─────────────────────────────────────────────────
@app.get("/api/history")
async def get_history(user=Depends(get_current_user)):
    if user:
        conn = get_db()
        rows = conn.execute(
            "SELECT data, created_at FROM experiments WHERE user_id=? ORDER BY id DESC LIMIT 50",
            (user["sub"],)
        ).fetchall()
        conn.close()
        user_history = [json.loads(r["data"]) for r in rows]
        return user_history if user_history else load_history()
    return load_history()

@app.delete("/api/history")
async def clear_history():
    if os.path.exists(HISTORY_FILE): os.remove(HISTORY_FILE)
    return {"ok": True}

# ── 상태 ─────────────────────────────────────────────────
@app.get("/api/debug-env")
async def debug_env():
    key = os.getenv("GEMINI_API_KEY", "")
    all_keys = sorted(os.environ.keys())
    gemini_keys = [k for k in all_keys if "GEMINI" in k.upper() or "API" in k.upper()]
