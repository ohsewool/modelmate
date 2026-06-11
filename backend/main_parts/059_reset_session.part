@app.post("/api/reset-session")
async def reset_session(user=Depends(get_current_user)):
    STATE.clear()
    return {"ok": True}
