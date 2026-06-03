from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.model_selection import cross_val_score, StratifiedKFold, KFold
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score, r2_score, mean_squared_error, mean_absolute_error
from sklearn.preprocessing import LabelEncoder
from pydantic import BaseModel
import json, os, io, asyncio, sqlite3, joblib
from datetime import datetime

# ── Google OAuth ──────────────────────────────────────────
from google.oauth2 import id_token
from google.auth.transport import requests as grequests
from jose import jwt as jose_jwt
import hashlib, secrets

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260000)
    return f"{salt}${hashed.hex()}"

def verify_password(password: str, stored: str) -> bool:
    try:
        salt, hashed = stored.split("$")
        check = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260000)
        return check.hex() == hashed
    except Exception:
        return False

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "373474705259-7b18amrkom84aqqt59n87lglhrgq1trj.apps.googleusercontent.com")
JWT_SECRET = os.getenv("JWT_SECRET", "modelmate-secret-key-change-in-prod")
JWT_ALGORITHM = "HS256"
security = HTTPBearer(auto_error=False)

DB_PATH    = os.getenv("DB_PATH", os.path.join(os.path.dirname(__file__), "..", "modelmate.db"))
MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "deployed_models")
os.makedirs(MODELS_DIR, exist_ok=True)

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            picture TEXT,
            password_hash TEXT,
            role TEXT DEFAULT 'user',
            created_at TEXT
        )
    """)
    # 기존 테이블에 password_hash 컬럼 없으면 추가
    cols = [r[1] for r in conn.execute("PRAGMA table_info(users)").fetchall()]
    if "password_hash" not in cols:
        conn.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")
    if "role" not in cols:
        conn.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'")

    # 기본 계정 자동 생성 (없을 때만)
    admin_email = os.getenv("ADMIN_EMAIL", "admin@modelmate.local")
    admin_pw    = os.getenv("ADMIN_PASSWORD", "admin1234")
    exists = conn.execute("SELECT id, password_hash FROM users WHERE email=?", (admin_email,)).fetchone()
    if not exists:
        import uuid
        conn.execute(
            "INSERT INTO users (id, email, name, picture, password_hash, role, created_at) VALUES (?,?,?,?,?,?,?)",
            (str(uuid.uuid4()), admin_email, "관리자", "", hash_password(admin_pw), "admin", datetime.now().isoformat())
        )
    else:
        if not exists["password_hash"]:
            conn.execute("UPDATE users SET password_hash=? WHERE email=?", (hash_password(admin_pw), admin_email))
        conn.execute("UPDATE users SET role='admin', name=COALESCE(NULLIF(name, ''), '관리자') WHERE email=?", (admin_email,))
    conn.execute("""
        CREATE TABLE IF NOT EXISTS deployed_models (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            task_type TEXT NOT NULL,
            best_model_name TEXT,
            target_col TEXT,
            features TEXT,
            metrics TEXT,
            created_at TEXT
        )
    """)
