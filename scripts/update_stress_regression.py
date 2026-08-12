#!/usr/bin/env python3
"""Estimate linked-stock stress betas versus SK hynix from daily returns."""

from __future__ import annotations

import json
import math
import statistics
from datetime import datetime
from pathlib import Path
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "stress_regression.json"
TICKERS = {
    "SK하이닉스": "000660.KS",
    "삼성전자": "005930.KS",
    "SK스퀘어": "402340.KS",
    "삼성전기": "009150.KS",
}
BASE = "SK하이닉스"
WINDOWS = {"3m": 66, "6m": 132}


def fetch_yahoo(ticker: str) -> dict[str, float]:
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=8mo&events=div%2Csplits"
    req = Request(url, headers={"User-Agent": "Mozilla/5.0 Richman/1.0", "Accept": "application/json"})
    with urlopen(req, timeout=20) as response:
        payload = json.load(response)
    result = payload["chart"]["result"][0]
    timestamps = result.get("timestamp") or []
    indicators = result.get("indicators") or {}
    quote = (indicators.get("quote") or [{}])[0]
    adj = (indicators.get("adjclose") or [{}])[0].get("adjclose") or []
    close = quote.get("close") or []
    values = adj if len(adj) == len(timestamps) else close
    out: dict[str, float] = {}
    for ts, value in zip(timestamps, values):
        if value is None:
            continue
        d = datetime.fromtimestamp(ts, ZoneInfo("Asia/Seoul")).date().isoformat()
        v = float(value)
        if math.isfinite(v) and v > 0:
            out[d] = v
    if len(out) < 40:
        raise ValueError(f"not enough history for {ticker}: {len(out)}")
    return out


def returns(prices: dict[str, float]) -> dict[str, float]:
    dates = sorted(prices)
    out: dict[str, float] = {}
    for prev, cur in zip(dates, dates[1:]):
        p0, p1 = prices[prev], prices[cur]
        if p0 > 0:
            r = p1 / p0 - 1.0
            if math.isfinite(r):
                out[cur] = r
    return out


def regression(x: list[float], y: list[float]) -> dict[str, float | int | None]:
    n = min(len(x), len(y))
    if n < 20:
        return {"n": n, "beta": None, "alpha": None, "correlation": None, "r2": None}
    x, y = x[-n:], y[-n:]
    mx, my = statistics.fmean(x), statistics.fmean(y)
    sxx = sum((v - mx) ** 2 for v in x)
    syy = sum((v - my) ** 2 for v in y)
    sxy = sum((a - mx) * (b - my) for a, b in zip(x, y))
    if sxx <= 0 or syy <= 0:
        return {"n": n, "beta": None, "alpha": None, "correlation": None, "r2": None}
    beta = sxy / sxx
    alpha = my - beta * mx
    corr = sxy / math.sqrt(sxx * syy)
    return {
        "n": n,
        "beta": round(beta, 4),
        "alpha_daily": round(alpha, 6),
        "correlation": round(corr, 4),
        "r2": round(corr * corr, 4),
    }


def main() -> int:
    prices = {name: fetch_yahoo(ticker) for name, ticker in TICKERS.items()}
    rets = {name: returns(series) for name, series in prices.items()}
    base_ret = rets[BASE]
    latest_common = min(max(v) for v in rets.values())
    windows: dict[str, dict] = {}

    for label, days in WINDOWS.items():
        window_out: dict[str, dict] = {}
        for name in TICKERS:
            if name == BASE:
                continue
            common = sorted(set(base_ret) & set(rets[name]))
            common = [d for d in common if d <= latest_common][-days:]
            x = [base_ret[d] for d in common]
            y = [rets[name][d] for d in common]
            stats = regression(x, y)
            stats["start_date"] = common[0] if common else None
            stats["end_date"] = common[-1] if common else None
            window_out[name] = stats
        windows[label] = window_out

    now = datetime.now(ZoneInfo("Asia/Seoul")).replace(microsecond=0)
    payload = {
        "updated_at": now.isoformat(),
        "as_of": latest_common,
        "source": "Yahoo Finance daily adjusted close",
        "base": BASE,
        "method": "OLS on aligned daily close-to-close returns; y = alpha + beta * SK hynix return",
        "recommended_window": "6m",
        "windows": windows,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
