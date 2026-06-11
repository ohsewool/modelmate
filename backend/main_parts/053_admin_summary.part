def _metric_value(item):
    results = item.get("results") or []
    first = results[0] if results else {}
    value = item.get("tuned_score")
    if value is None:
        value = first.get("roc_auc", first.get("r2", first.get("accuracy")))
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


@app.get("/api/admin/summary")
async def admin_summary(user=Depends(get_current_user)):
    if not user or user.get("role") != "admin":
        raise HTTPException(403, "관리자 권한이 필요합니다")

    conn = get_db()
    user_count = conn.execute("SELECT COUNT(*) AS n FROM users").fetchone()["n"]
    project_count = conn.execute("SELECT COUNT(*) AS n FROM projects").fetchone()["n"]
    dataset_count = conn.execute("SELECT COUNT(*) AS n FROM datasets").fetchone()["n"]
    domain_rows = conn.execute(
        """SELECT COALESCE(NULLIF(domain, ''), '도메인 확인 필요') AS domain, COUNT(*) AS n
           FROM datasets GROUP BY COALESCE(NULLIF(domain, ''), '도메인 확인 필요')
           ORDER BY n DESC LIMIT 8"""
    ).fetchall()
    recent_datasets = conn.execute(
        """SELECT d.filename, d.rows, d.columns, d.target_col, d.domain, d.created_at, u.email AS owner_email
           FROM datasets d LEFT JOIN users u ON d.user_id=u.id
           ORDER BY d.created_at DESC LIMIT 5"""
    ).fetchall()
    exp_rows = conn.execute(
        """SELECT e.data, e.created_at, u.email AS owner_email
           FROM experiments e LEFT JOIN users u ON e.user_id=u.id
           ORDER BY e.id DESC LIMIT 200"""
    ).fetchall()
    conn.close()

    experiments = []
    best = None
    optuna_count = 0
    task_counts = {}
    for row in exp_rows:
        item = json.loads(row["data"])
        item["owner_email"] = row["owner_email"] or ""
        item["created_at"] = row["created_at"]
        experiments.append(item)
        if item.get("optuna_applied"):
            optuna_count += 1
        task = item.get("task_type") or "unknown"
        task_counts[task] = task_counts.get(task, 0) + 1
        score = _metric_value(item)
        if score is not None:
            best = score if best is None else max(best, score)

    return {
        "user_count": int(user_count),
        "project_count": int(project_count),
        "dataset_count": int(dataset_count),
        "experiment_count": len(experiments),
        "best_score": round(best, 4) if best is not None else None,
        "optuna_count": int(optuna_count),
        "task_counts": task_counts,
        "domain_counts": [dict(r) for r in domain_rows],
        "recent_datasets": [dict(r) for r in recent_datasets],
        "recent_experiments": experiments[:5],
    }
