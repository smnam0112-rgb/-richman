#!/usr/bin/env python3
"""Fetch Korean equity quotes and update the static price feed."""

from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "market_prices.json"
CLOSING = ROOT / "data" / "closing_prices.json"
STOCKS = {
    "000660.KS": "000660",
    "005930.KS": "005930",
    "402340.KS": "402340",
    "009150.KS": "009150",
}


def number(value):
    if isinstance(value, (int, float)):
        return float(value)
    if value is None:
        return None
    cleaned = re.sub(r"[^0-9.-]", "", str(value))
    try:
        return float(cleaned) if cleaned else None
    except ValueError:
        return None


def fetch_json(url, referer=None):
    headers = {
        "Accept": "application/json,text/plain,*/*",
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/136 Safari/537.36",
    }
    if referer:
        headers["Referer"] = referer
    with urlopen(Request(url, headers=headers), timeout=15) as response:
        return json.load(response)


def pick(data, *keys):
    for key in keys:
        value = number(data.get(key))
        if value is not None and value > 0:
            return value
    return None


def normalized_status(value):
    status = str(value or "UNKNOWN").upper()
    if status in {"OPEN", "REGULAR", "TRADING"}:
        return "OPEN"
    if status in {"CLOSE", "CLOSED", "POST", "POSTPOST", "AFTER_HOURS"}:
        return "CLOSE"
    if status in {"PRE", "PREPRE", "PRE_MARKET"}:
        return "PRE"
    return "UNKNOWN"


def quote_from_naver(code):
    data = fetch_json(
        f"https://m.stock.naver.com/api/stock/{code}/basic",
        "https://m.stock.naver.com/",
    )
    history = fetch_json(
        f"https://m.stock.naver.com/api/stock/{code}/price",
        "https://m.stock.naver.com/",
    )
    latest = history[0] if isinstance(history, list) and history else {}
    current = pick(data, "closePrice", "currentPrice", "now", "nv")
    if current is None:
        raise ValueError("Naver returned no current price")
    change = number(data.get("compareToPreviousClosePrice"))
    return {
        "price": current,
        "open": pick(latest, "openPrice") or pick(data, "openPrice", "open", "ov"),
        "previous_close": pick(data, "previousClosePrice", "previousClose", "pcv") or (current - change if change is not None else None),
        "status": normalized_status(data.get("marketStatus")),
        "provider": "Naver Finance",
        "traded_at": data.get("localTradedAt"),
    }


def first_number(values):
    for value in values or []:
        value = number(value)
        if value is not None and value > 0:
            return value
    return None


def quote_from_yahoo(ticker):
    data = fetch_json(
        f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1m&range=1d"
    )
    result = data["chart"]["result"][0]
    meta = result.get("meta", {})
    quotes = ((result.get("indicators") or {}).get("quote") or [{}])[0]
    current = number(meta.get("regularMarketPrice")) or first_number(reversed(quotes.get("close") or []))
    if current is None:
        raise ValueError("Yahoo returned no current price")
    return {
        "price": current,
        "open": number(meta.get("regularMarketOpen")) or first_number(quotes.get("open")),
        "previous_close": number(meta.get("chartPreviousClose")) or number(meta.get("previousClose")),
        "status": normalized_status(meta.get("marketState")),
        "provider": "Yahoo Finance",
        "traded_at": datetime.fromtimestamp(meta["regularMarketTime"], ZoneInfo("Asia/Seoul")).isoformat() if meta.get("regularMarketTime") else None,
    }


def load_json(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def integer_or_none(value):
    return int(round(value)) if value is not None else None


def main():
    previous = load_json(OUTPUT)
    closing = load_json(CLOSING)
    prices = dict(previous.get("prices") or closing.get("prices") or {})
    opens = dict(previous.get("opens") or {})
    previous_closes = dict(previous.get("previous_closes") or {})
    statuses = []
    providers = []
    traded_times = []
    successes = 0

    for ticker, code in STOCKS.items():
        quote = None
        errors = []
        for provider in (lambda: quote_from_naver(code), lambda: quote_from_yahoo(ticker)):
            try:
                quote = provider()
                break
            except Exception as exc:  # A single symbol must not block the remaining feed.
                errors.append(str(exc))
        if quote is None:
            print(f"warning: {ticker} unavailable: {'; '.join(errors)}", file=sys.stderr)
            continue
        successes += 1
        prices[ticker] = integer_or_none(quote["price"])
        if quote.get("open"):
            opens[ticker] = integer_or_none(quote["open"])
        if quote.get("previous_close"):
            previous_closes[ticker] = integer_or_none(quote["previous_close"])
        statuses.append(quote["status"])
        providers.append(quote["provider"])
        if quote.get("traded_at"):
            try:
                traded_times.append(datetime.fromisoformat(str(quote["traded_at"])))
            except ValueError:
                pass

    if successes == 0:
        print("No external quotes were available; keeping the last known feed.", file=sys.stderr)
        return 0

    market_status = "OPEN" if "OPEN" in statuses else "CLOSE" if statuses and all(x == "CLOSE" for x in statuses) else "UNKNOWN"
    now = max(traded_times).astimezone(ZoneInfo("Asia/Seoul")).replace(microsecond=0) if traded_times else datetime.now(ZoneInfo("Asia/Seoul")).replace(microsecond=0)
    payload = {
        "updated_at": now.isoformat(),
        "market_status": market_status,
        "source": " + ".join(dict.fromkeys(providers)),
        "prices": prices,
        "opens": opens,
        "previous_closes": previous_closes,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {successes}/{len(STOCKS)} symbols at {payload['updated_at']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
