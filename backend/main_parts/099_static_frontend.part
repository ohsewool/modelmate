if os.path.isdir(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        index_path = os.path.join(STATIC_DIR, "index.html")
        if full_path.startswith("api/"):
            raise HTTPException(404, "Not Found")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        raise HTTPException(404, "Frontend build not found")
