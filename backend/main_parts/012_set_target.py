@app.post("/api/set-target")
async def set_target(body: dict):
    df = STATE.get("df")
    if df is None: raise HTTPException(400, "파일 없음")
    tgt = body["target_col"]
    if tgt not in df.columns: raise HTTPException(400, f"컬럼 없음: {tgt}")

    # 제외 컬럼 처리
    drop_cols = [c for c in body.get("drop_cols", []) if c in df.columns and c != tgt]
    df_use = df.drop(columns=drop_cols) if drop_cols else df
    STATE["drop_cols"] = drop_cols
    if body.get("col_labels"):
        STATE["col_labels"] = body["col_labels"]

    # 피처 인코딩
    X, cat_cols, encoders = encode_features(df_use, tgt)

    # 타겟 인코딩 + task type
    y_raw = df[tgt]
    y, target_le, task_type, n_unique = encode_target(y_raw)

    STATE.update({
        "target_col": tgt, "X": X, "y": y,
        "task_type": task_type,
        "cat_cols": cat_cols, "encoders": encoders,
        "target_encoder": target_le,
        "n_unique_target": n_unique,
    })

    # 상관관계 (수치형 컬럼만)
    num_df = X.copy(); num_df[tgt] = y
    cols = X.columns.tolist()
    corr_mat = num_df.corr(numeric_only=True).fillna(0)
    corr_data = [{"x": r, "y": c, "v": round(float(corr_mat.loc[r, c]), 3)}
                 for r in cols for c in cols if r in corr_mat.index and c in corr_mat.columns]

    # 분포 (최대 6개 피처, 이진/다중 분류 모두 지원)
    dists = {}
    unique_vals = sorted(y.unique())
    is_binary = len(unique_vals) == 2
    for col in X.columns[:6]:
        h, b = np.histogram(X[col].dropna(), bins=20)
        entry = {
            "bins": [round(float(v), 3) for v in b[:-1]],
            "total": [int(v) for v in h],
        }
        if is_binary:
            v0, v1 = unique_vals[0], unique_vals[1]
            norm_h, _ = np.histogram(X[col][y == v0].dropna(), bins=b)
            fail_h, _ = np.histogram(X[col][y == v1].dropna(), bins=b)
            entry["normal"] = [int(v) for v in norm_h]
            entry["failure"] = [int(v) for v in fail_h]
        else:
            entry["normal"] = [int(v) for v in h]
            entry["failure"] = [0] * len(h)
        dists[col] = entry

    class_dist = y.value_counts().to_dict()
    pos_rate = float(y.mean()) * 100 if task_type == "classification" and is_binary else 0
    # 타겟 레이블 복원 (표시용)
    label_map = {}
    if target_le is not None:
        label_map = {int(i): str(c) for i, c in enumerate(target_le.classes_)}

    return {
        "n_samples": len(X), "n_features": len(X.columns),
        "failure_rate": round(pos_rate, 2),
        "missing_total": int(df_use.isnull().sum().sum()),
        "dropped_cols": drop_cols,
        "features": X.columns.tolist(),
        "cat_cols": cat_cols,
        "corr_data": corr_data, "corr_cols": cols,
        "distributions": dists,
        "class_distribution": {str(k): int(v) for k, v in class_dist.items()},
        "label_map": label_map,
        "task_type": task_type,
        "n_unique_target": n_unique,
        "stats": df.describe(include="all").fillna(0).round(3).to_dict(),
        "explanations": preprocess_explanations(task_type, n_unique, len(X.columns)),
    }

