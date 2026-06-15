"""Deterministic data profiling tool for PR-05.

This tool inspects tabular input only. It does not call an LLM and does not call
the existing ModelMate AutoML pipeline.
"""

from __future__ import annotations

import io
import re
import warnings
from typing import Any

import pandas as pd


ID_NAME_RE = re.compile(
    r"(^id$|_id$|id_|uuid|guid|name|email|phone|address|addr|주민|이름|주소|전화|메일|이메일)",
    re.I,
)


def dataframe_from_arguments(arguments: dict[str, Any]) -> pd.DataFrame | None:
    if "dataframe" in arguments and isinstance(arguments["dataframe"], pd.DataFrame):
        return arguments["dataframe"].copy()
    if "records" in arguments and isinstance(arguments["records"], list):
        return pd.DataFrame(arguments["records"])
    if "csv_text" in arguments and isinstance(arguments["csv_text"], str):
        return pd.read_csv(io.StringIO(arguments["csv_text"]))
    if "file_path" in arguments and isinstance(arguments["file_path"], str):
        return pd.read_csv(arguments["file_path"])
    return None


def _is_datetime_like(series: pd.Series) -> bool:
    if pd.api.types.is_datetime64_any_dtype(series):
        return True
    if not (pd.api.types.is_object_dtype(series) or pd.api.types.is_string_dtype(series)):
        return False
    sample = series.dropna().astype(str).head(30)
    if sample.empty:
        return False
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", UserWarning)
        parsed = pd.to_datetime(sample, errors="coerce")
    return float(parsed.notna().mean()) >= 0.8


def _json_number(value: Any) -> int | float | None:
    try:
        if pd.isna(value):
            return None
        if isinstance(value, float):
            return round(float(value), 6)
        return int(value)
    except Exception:
        return None


def profile_dataframe(df: pd.DataFrame) -> dict[str, Any]:
    row_count = int(len(df))
    column_count = int(len(df.columns))
    missing_counts = {col: int(df[col].isna().sum()) for col in df.columns}
    missing_ratios = {
        col: round((missing_counts[col] / row_count) if row_count else 0.0, 6)
        for col in df.columns
    }
    unique_counts = {col: int(df[col].nunique(dropna=True)) for col in df.columns}
    numeric_columns = [col for col in df.columns if pd.api.types.is_numeric_dtype(df[col])]
    datetime_like_columns = [col for col in df.columns if _is_datetime_like(df[col])]
    categorical_columns = [
        col for col in df.columns
        if col not in numeric_columns and col not in datetime_like_columns
    ]
    high_cardinality_columns = [
        col for col in df.columns
        if row_count and unique_counts[col] >= max(20, int(row_count * 0.7))
    ]
    constant_columns = [col for col in df.columns if unique_counts[col] <= 1]
    possible_id_like_columns = [
        col for col in df.columns
        if ID_NAME_RE.search(str(col)) or (row_count >= 20 and unique_counts[col] == row_count)
    ]
    class_balance_candidates = {}
    for col in df.columns:
        unique = unique_counts[col]
        if 1 < unique <= 20:
            counts = df[col].fillna("__missing__").astype(str).value_counts(normalize=True).head(10)
            class_balance_candidates[col] = {str(k): round(float(v), 6) for k, v in counts.items()}

    warnings = []
    if row_count < 30:
        warnings.append({"severity": "warning", "message": "Very few rows for reliable training."})
    if column_count < 2:
        warnings.append({"severity": "error", "message": "At least two columns are needed for prediction."})
    for col, ratio in missing_ratios.items():
        if ratio >= 0.8:
            warnings.append({"severity": "warning", "column": col, "message": "Column has at least 80% missing values."})
    if len(possible_id_like_columns) >= max(1, column_count - 1):
        warnings.append({"severity": "warning", "message": "Most columns look identifier-like, so prediction may be weak."})

    return {
        "status": "profiled",
        "summary": f"Profiled {row_count} rows and {column_count} columns.",
        "row_count": row_count,
        "column_count": column_count,
        "columns": [str(col) for col in df.columns],
        "column_types": {col: str(df[col].dtype) for col in df.columns},
        "missing_value_count": missing_counts,
        "missing_value_ratio": missing_ratios,
        "unique_count": unique_counts,
        "high_cardinality_columns": high_cardinality_columns,
        "constant_columns": constant_columns,
        "possible_id_like_columns": possible_id_like_columns,
        "numeric_columns": numeric_columns,
        "categorical_columns": categorical_columns,
        "datetime_like_columns": datetime_like_columns,
        "basic_class_balance_candidates": class_balance_candidates,
        "profiling_warnings": warnings,
        "preview_stats": {
            col: {
                "min": _json_number(df[col].min()),
                "max": _json_number(df[col].max()),
                "mean": _json_number(df[col].mean()),
            }
            for col in numeric_columns[:10]
        },
    }


def data_profile_tool(arguments: dict[str, Any]) -> dict[str, Any]:
    try:
        df = dataframe_from_arguments(arguments)
    except Exception as exc:
        return {
            "status": "fail",
            "summary": "Could not parse tabular input for profiling.",
            "profiling_warnings": [{"severity": "error", "message": str(exc)}],
        }
    if df is None:
        return {
            "status": "no_input",
            "summary": "No dataset input was provided to data_profile_tool.",
            "profiling_warnings": [{"severity": "warning", "message": "Provide csv_text, records, file_path, or dataframe."}],
        }
    return profile_dataframe(df)
