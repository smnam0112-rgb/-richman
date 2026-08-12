#!/usr/bin/env python3
"""Fetch Korean equity quotes from Naver KRX/NXT feeds and update the static price feed."""

from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import urlencode
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
SEOUL = ZoneInfo("Asia/Seoul")


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
    if not isinstance(data, dict):
        return None
    for key in keys:
        value = number(data.get(key))
        if value is not None and value > 0:
            return value
    return None


def deep_value(data, keys):
    """Return the first value whose exact key matches one of keys in a nested JSON payload."""
    if isinstance(data, dict):
        for key in keys:
            if key in data and data[key] not in (None, ""):
                return data[key]
        for value in data.values():
            found = deep_value(value, keys)
            if found not in (None, ""):
                return found
    elif isinstance(data, list):
        for value in data:
            found = deep_value(value, keys)
            if found not in (None, ""):
                return found
    return None


def deep_number(data, *keys):
    return number(deep_value(data, keys))


def normalized_status(value):
    status = str(value or "UNKNOWN").upper()
    if status in {"OPEN", "REGULAR", "TRADING", "OPENED", "CONTINUOUS"}:
        return "OPEN"
    if status in {"CLOSE", "CLOSED", "POST", "POSTPOST", "AFTER_HOURS", "END"}:
        return "CLOSE"
    if status in {"PRE", "PREPRE", "PRE_MARKET", "BEFORE_HOURS"}:
        return "PRE"
    return "UNKNOWN"


def quote_from_naver_krx(code):
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
        raise ValueError("Naver KRX returned no current price")
    change = number(data.get("compareToPreviousClosePrice"))
    return {
        "price": current,
        "open": pick(latest, "openPrice") or pick(data, "openPrice", "open", "ov"),
        "previous_close": pick(data, "previousClosePrice", "previousClose", "pcv") or (current - change if change is not None else None),
        "status": normalized_status(data.get("marketStatus")),
        "provider": "Naver Finance KRX",
        "traded_at": data.get("localTradedAt"),
    }


def quote_from_naver_nxt_detail(code):
    data = fetch_json(
        f"https://stock.naver.com/api/domestic/detail/{code}/detail?codeType=NXT",
        "https://stock.naver.com/",
    )
    current = deep_number(data, "closePrice", "currentPrice", "now", "nv", "tradePrice")
    if current is None or current <= 0:
        raise ValueError("Naver NXT detail returned no current price")
    previous_close = deep_number(data, "previousClosePrice", "previousClose", "pcv")
    change = deep_number(data, "compareToPreviousClosePrice", "changePrice", "compareToPreviousPrice")
    if previous_close is None and change is not None:
        previous_close = current - change
    return {
        "price": current,
        "open": deep_number(data, "openPrice", "open", "ov"),
        "previous_close": previous_close,
        "status": normalized_status(deep_value(data, ("marketStatus", "marketStatusType", "marketState", "status"))),
        "provider": "Naver Finance NXT",
        "traded_at": deep_value(data, ("localTradedAt", "tradedAt", "tradeDateTime", "dateTime")),
    }


def record_for_code(data, code):
    if isinstance(data, dict):
        candidate = str(data.get("itemCode") or data.get("stockCode") or data.get("code") or "")
        if candidate == code:
            return data
        for value in data.values():
            found = record_for_code(value, code)
            if found is not None:
                return found
    elif isinstance(data, list):
        for value in data:
            found = record_for_code(value, code)
            if found is not None:
                return found
    return None


def quote_from_naver_nxt_polling(code):
    query = urlencode({"itemCodes": code})
    data = fetch_json(
        f"https://stock.naver.com/api/polling/domestic/NXT/stock?{query}",
        "https://stock.naver.com/",
    )
    record = record_for_code(data, code) or data
    current = deep_number(record, "closePrice", "currentPrice", "now", "nv", "tradePrice")
    if current is None or current <= 0:
        raise ValueError("Naver NXT polling returned no current price")
    return {
        "price": current,
        "open": deep_number(record, "openPrice", "open", "ov"),
        "previous_close": deep_number(record, "previousClosePrice", "previousClose", "pcv"),
        "status": normalized_status(deep_value(record, ("marketStatus", "marketStatusType", "marketState", "status"))),
        "provider": "Naver Finance NXT",
        "traded_at": deep_value(record, ("localTradedAt", "tradedAt", "tradeDateTime", "dateTime")),
    }


def quote_from_naver_nxt(code):
    errors = []
    for provider in (quote_from_naver_nxt_detail, quote_from_naver_nxt_polling):
        try:
            return provider(code)
        except Exception as exc:
            errors.append(str(exc))
    raise ValueError("; ".join(errors))


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
        "traded_at": datetime.fromtimestamp(meta["regularMarketTime"], SEOUL).isoformat() if meta.get("regularMarketTime") else None,
    }


def load_json(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def integer_or_none(value):
    return int(round(value)) if value is not None else None


def parse_time(value):
    if not value:
        return None
    text = str(value).strip()
    try:
        dt = datetime.fromisoformat(text.replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=SEOUL)
    except ValueError:
        return None


def active_session(now):
    """Choose the price used for account valuation. KRX remains the reference close."""
    if now.weekday() >= 5:
        return "NXT_FINAL"
    minute = now.hour * 60 + now.minute
    if 8 * 60 <= minute <= 8 * 60 + 50:
        return "NXT_PRE"
    if 9 * 60 <= minute <= 15 * 60 + 30:
        return "KRX_MAIN"
    if 15 * 60 + 40 <= minute <= 20 * 60:
        return "NXT_AFTER"
    if minute > 20 * 60:
        return "NXT_FINAL"
    return "KRX_CLOSE"


def main():
    previous = load_json(OUTPUT)
    closing = load_json(CLOSING)

    krx_prices = dict(previous.get("krx_prices") or previous.get("prices") or closing.get("prices") or {})
    nxt_prices = dict(previous.get("nxt_prices") or {})
    opens = dict(previous.get("opens") or {})
    previous_closes = dict(previous.get("previous_closes") or {})

    krx_statuses = []
    nxt_statuses = []
    providers = []
    krx_times = []
    nxt_times = []
    krx_successes = 0
    nxt_successes = 0

    for ticker, code in STOCKS.items():
        krx_quote = None
        krx_errors = []
        for provider in (lambda: quote_from_naver_krx(code), lambda: quote_from_yahoo(ticker)):
            try:
                krx_quote = provider()
                break
            except Exception as exc:
                krx_errors.append(str(exc))
        if krx_quote is not None:
            krx_successes += 1
            krx_prices[ticker] = integer_or_none(krx_quote["price"])
            if krx_quote.get("open"):
                opens[ticker] = integer_or_none(krx_quote["open"])
            if krx_quote.get("previous_close"):
                previous_closes[ticker] = integer_or_none(krx_quote["previous_close"])
            krx_statuses.append(krx_quote["status"])
            providers.append(krx_quote["provider"])
            dt = parse_time(krx_quote.get("traded_at"))
            if dt:
                krx_times.append(dt)
        else:
            print(f"warning: KRX {ticker} unavailable: {'; '.join(krx_errors)}", file=sys.stderr)

        try:
            nxt_quote = quote_from_naver_nxt(code)
            nxt_successes += 1
            nxt_prices[ticker] = integer_or_none(nxt_quote["price"])
            nxt_statuses.append(nxt_quote["status"])
            providers.append(nxt_quote["provider"])
            dt = parse_time(nxt_quote.get("traded_at"))
            if dt:
                nxt_times.append(dt)
        except Exception as exc:
            print(f"warning: NXT {ticker} unavailable: {exc}", file=sys.stderr)

    if krx_successes == 0 and nxt_successes == 0:
        print("No external quotes were available; keeping the last known feed.", file=sys.stderr)
        return 0

    now = datetime.now(SEOUL).replace(microsecond=0)
    session = active_session(now)
    use_nxt = session.startswith("NXT") and bool(nxt_prices)
    active_venue = "NXT" if use_nxt else "KRX"

    prices = dict(krx_prices)
    if use_nxt:
        for ticker in STOCKS:
            if number(nxt_prices.get(ticker)):
                prices[ticker] = nxt_prices[ticker]

    krx_status = "OPEN" if "OPEN" in krx_statuses else "CLOSE" if krx_statuses and all(x == "CLOSE" for x in krx_statuses) else "UNKNOWN"
    nxt_status = "OPEN" if "OPEN" in nxt_statuses else "CLOSE" if nxt_statuses and all(x == "CLOSE" for x in nxt_statuses) else "UNKNOWN"
    overall_status = "OPEN" if session in {"NXT_PRE", "KRX_MAIN", "NXT_AFTER"} else "CLOSE"

    krx_traded_at = max(krx_times).astimezone(SEOUL).replace(microsecond=0) if krx_times else None
    nxt_traded_at = max(nxt_times).astimezone(SEOUL).replace(microsecond=0) if nxt_times else None

    payload = {
        "updated_at": now.isoformat(),
        "market_status": overall_status,
        "active_venue": active_venue,
        "active_session": session,
        "source": " + ".join(dict.fromkeys(providers)),
        "krx_status": krx_status,
        "nxt_status": nxt_status,
        "krx_updated_at": now.isoformat() if krx_successes else previous.get("krx_updated_at"),
        "nxt_updated_at": now.isoformat() if nxt_successes else previous.get("nxt_updated_at"),
        "krx_traded_at": krx_traded_at.isoformat() if krx_traded_at else None,
        "nxt_traded_at": nxt_traded_at.isoformat() if nxt_traded_at else None,
        "prices": prices,
        "krx_prices": krx_prices,
        "nxt_prices": nxt_prices,
        "opens": opens,
        "previous_closes": previous_closes,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"Updated KRX {krx_successes}/{len(STOCKS)}, NXT {nxt_successes}/{len(STOCKS)} "
        f"at {payload['updated_at']} using {active_venue}/{session}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
