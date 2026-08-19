#!/usr/bin/env python3
"""Generate synthetic demo datasets, including deliberately leaky ones.

Why generated rather than downloaded: a public repository that vendors someone
else's dataset inherits their licence, and the terms of the well-known tabular
sets are inconsistent enough that "it was only a demo" is not a defence. Nothing
here is anybody's data. It is also seeded, so the file a visitor generates is
the file this repo's documentation describes.

Why the leaky variant exists: ModelMate's leakage check is the part worth
looking at, and a demo where nothing is wrong cannot show it working. So
`customer_churn_leaky.csv` has three planted leaks, chosen to sit on both sides
of what the checker can see:

  churn_reason         only populated for churners. Name-detectable - the token
                       `churn` is the target's own name.
  account_closed_date  filled after the outcome is known. Name-detectable via
                       the future-information pattern (`closed`).
  exit_survey_score    near-perfectly separates the classes and has an entirely
                       innocent name. **The checker does not catch this one.**

The third is planted on purpose. The check is name-based, so a leak whose name
gives nothing away is outside what it can detect, and a demo that only showed
the successes would misrepresent the tool. `docs/DEMO_DATA.md` records which of
the three the checker finds.

Usage:
    python3 scripts/make_demo_data.py [--rows 1200] [--out sample_data/generated]
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

SEED = 20260819
CONTRACTS = ("monthly", "annual", "two_year")
REGIONS = ("seoul", "busan", "daegu", "gwangju", "daejeon")


def _churn_frame(rows: int, rng: np.random.Generator) -> pd.DataFrame:
    """A churn dataset whose signal is real but not trivially separable.

    The probability is built from tenure, price, support load and inactivity so
    a model has something to find, then sampled - a deterministic rule would let
    any model score 1.0 and make the metrics meaningless.
    """
    tenure = rng.integers(1, 72, rows)
    monthly_fee = np.round(rng.normal(45, 15, rows).clip(9.9, 120), 2)
    support_tickets = rng.poisson(1.4, rows)
    last_login_days = rng.integers(0, 90, rows)
    contract = rng.choice(CONTRACTS, rows, p=(0.55, 0.30, 0.15))

    logit = (
        -2.9
        - 0.045 * tenure
        + 0.022 * monthly_fee
        + 0.30 * support_tickets
        + 0.028 * last_login_days
        + np.where(contract == "monthly", 0.75, np.where(contract == "annual", -0.20, -0.85))
        + rng.normal(0, 0.5, rows)
    )
    churn = rng.random(rows) < 1 / (1 + np.exp(-logit))

    return pd.DataFrame({
        "customer_id": [f"CUST{i:05d}" for i in range(1, rows + 1)],
        "tenure_months": tenure,
        "monthly_fee": monthly_fee,
        "support_tickets": support_tickets,
        "contract_type": contract,
        "last_login_days": last_login_days,
        "region": rng.choice(REGIONS, rows),
        "churn": np.where(churn, "yes", "no"),
    })


def _add_leaks(frame: pd.DataFrame, rng: np.random.Generator) -> pd.DataFrame:
    """Plant three leaks: two the checker can name, one it cannot."""
    leaky = frame.copy()
    churned = leaky["churn"].to_numpy() == "yes"
    rows = len(leaky)

    # Detectable: carries the target's own name.
    leaky["churn_reason"] = np.where(
        churned, rng.choice(("price", "support", "moved", "competitor"), rows), ""
    )

    # Detectable: information that exists only after the outcome.
    days = rng.integers(0, 400, rows)
    leaky["account_closed_date"] = np.where(
        churned,
        (pd.Timestamp("2025-01-01") + pd.to_timedelta(days, unit="D")).strftime("%Y-%m-%d"),
        "",
    )

    # NOT detectable by a name-based check: an innocent name that separates the
    # classes almost perfectly. This is the interesting one.
    leaky["exit_survey_score"] = np.where(
        churned, rng.normal(2.1, 0.6, rows), rng.normal(8.4, 0.6, rows)
    ).round(2).clip(0, 10)

    return leaky


def _regression_frame(rows: int, rng: np.random.Generator) -> pd.DataFrame:
    month = pd.date_range("2023-01-01", periods=rows, freq="D")
    temperature = 14 + 11 * np.sin(np.arange(rows) * 2 * np.pi / 365) + rng.normal(0, 2.5, rows)
    promotions = rng.poisson(0.6, rows)
    stations = rng.integers(40, 90, rows)
    is_weekend = pd.Series(month).dt.dayofweek.isin((5, 6)).to_numpy()

    signups = (
        45
        + 4.2 * temperature
        + 18 * promotions
        + 0.9 * stations
        + np.where(is_weekend, 25, 0)
        + rng.normal(0, 12, rows)
    ).round().clip(0).astype(int)

    return pd.DataFrame({
        "date": month.strftime("%Y-%m-%d"),
        "avg_temperature": temperature.round(1),
        "promotion_count": promotions,
        "station_count": stations,
        "is_weekend": is_weekend,
        "signup_count": signups,
    })


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rows", type=int, default=1200)
    parser.add_argument("--out", default="sample_data/generated")
    args = parser.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(SEED)

    clean = _churn_frame(args.rows, rng)
    leaky = _add_leaks(clean, rng)
    regression = _regression_frame(args.rows, rng)

    written = [
        ("customer_churn.csv", clean),
        ("customer_churn_leaky.csv", leaky),
        ("bike_signups.csv", regression),
    ]
    for name, frame in written:
        frame.to_csv(out / name, index=False)
        print(f"{out / name}  {len(frame)} rows x {len(frame.columns)} cols")

    rate = (clean["churn"] == "yes").mean()
    print(f"\nchurn rate {rate:.1%} - imbalanced like real churn data, so a model "
          f"that predicts \"no\" for everyone already scores well. That is the point: "
          f"accuracy alone will not tell you the model is useless.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
