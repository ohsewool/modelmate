"""Static deployment contract checks that do not require FastAPI imports."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def require(text: str, fragment: str, label: str) -> None:
    assert fragment in text, f"Missing runtime contract: {label}"


def main() -> int:
    imports_part = (ROOT / "backend" / "main_parts" / "001_imports_db.part").read_text(encoding="utf-8-sig")
    integrations = (ROOT / "backend" / "main_parts" / "002_auth_integrations.part").read_text(encoding="utf-8-sig")
    static_part = (ROOT / "backend" / "main_parts" / "099_static_frontend.part").read_text(encoding="utf-8-sig")
    sample_part = (ROOT / "backend" / "main_parts" / "098_sample_files.part").read_text(encoding="utf-8-sig")
    api_client = (ROOT / "frontend" / "src" / "api.js").read_text(encoding="utf-8")
    railway = (ROOT / "railway.toml").read_text(encoding="utf-8")

    require(railway, "--host 0.0.0.0 --port $PORT", "Railway host and PORT binding")
    require(railway, "npm ci && npm run build", "frontend production build")
    require(imports_part, 'os.getenv("ALLOWED_ORIGINS"', "configurable CORS origins")
    assert 'allow_origins=["*"]' not in integrations, "CORS wildcard must not be hardcoded"
    require(integrations, "allow_origins=get_allowed_origins()", "CORS helper wiring")
    require(imports_part, 'os.getenv("DB_PATH"', "database path override")
    require(imports_part, 'os.getenv("MODELS_DIR"', "model path override")
    require(imports_part, 'os.getenv("DATASETS_DIR"', "dataset path override")
    require(imports_part, "os.makedirs(os.path.dirname(os.path.abspath(DB_PATH))", "database parent creation")
    require(api_client, "replace(/\\/+$/, '')", "frontend API trailing slash normalization")
    require(api_client, "configuredApiUrl.endsWith('/api')", "frontend API path normalization")
    require(static_part, 'app.mount("/assets"', "built asset serving")
    require(static_part, '@app.get("/{full_path:path}")', "SPA route fallback")
    require(sample_part, 'media_type="text/csv; charset=utf-8"', "sample CSV MIME type")
    require(sample_part, 'lowered.startswith("<!doctype html")', "sample HTML rejection")

    print("Runtime configuration contracts: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
