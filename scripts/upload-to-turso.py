#!/usr/bin/env python3
"""
Upload local saints_encyclopedia.db to a Turso database.

Usage:
    Set env vars TURSO_DATABASE_URL and TURSO_AUTH_TOKEN, then run:
    python scripts/upload-to-turso.py

    Or pass them as arguments:
    python scripts/upload-to-turso.py --url libsql://... --token ...
"""

import sqlite3
import argparse
import os
import sys
import json
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import HTTPError

DB_PATH = Path(__file__).parent.parent / "scraper" / "saints_encyclopedia.db"


def turso_execute(url: str, token: str, statements: list[dict]) -> dict:
    """Execute statements via Turso HTTP API."""
    # Convert libsql:// to https://
    http_url = url.replace("libsql://", "https://")
    if not http_url.startswith("https://"):
        http_url = f"https://{http_url}"
    endpoint = f"{http_url}/v3/pipeline"

    body = json.dumps({
        "requests": [
            {"type": "execute", "stmt": {"sql": s["sql"]}} for s in statements
        ] + [{"type": "close"}]
    }).encode()

    req = Request(
        endpoint,
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urlopen(req) as resp:
            return json.loads(resp.read())
    except HTTPError as e:
        error_body = e.read().decode() if e.fp else ""
        raise RuntimeError(f"HTTP {e.code}: {error_body[:500]}") from e


def main():
    parser = argparse.ArgumentParser(description="Upload SQLite DB to Turso")
    parser.add_argument("--url", default=os.environ.get("TURSO_DATABASE_URL", ""))
    parser.add_argument("--token", default=os.environ.get("TURSO_AUTH_TOKEN", ""))
    parser.add_argument("--db", default=str(DB_PATH))
    args = parser.parse_args()

    if not args.url or not args.token:
        print("Error: Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN env vars")
        print("  or pass --url and --token arguments")
        sys.exit(1)

    db_path = Path(args.db)
    if not db_path.exists():
        print(f"Error: Database not found at {db_path}")
        sys.exit(1)

    print(f"Source DB: {db_path}")
    print(f"Target:    {args.url}")

    # Dump the database
    conn = sqlite3.connect(str(db_path))
    statements = []
    for line in conn.iterdump():
        if line.startswith("BEGIN") or line.startswith("COMMIT"):
            continue
        statements.append({"sql": line})
    conn.close()

    print(f"Total statements: {len(statements)}")

    # Execute in batches
    BATCH_SIZE = 50
    executed = 0
    errors = 0

    for i in range(0, len(statements), BATCH_SIZE):
        batch = statements[i : i + BATCH_SIZE]
        try:
            turso_execute(args.url, args.token, batch)
            executed += len(batch)
        except Exception as e:
            # Try one by one on failure
            for stmt in batch:
                try:
                    turso_execute(args.url, args.token, [stmt])
                    executed += 1
                except Exception as inner_e:
                    msg = str(inner_e)
                    if "already exists" not in msg:
                        errors += 1
                        if errors <= 5:
                            print(f"\n  Error: {msg[:150]}")
                    executed += 1

        pct = (executed / len(statements)) * 100
        print(f"\r  Progress: {executed}/{len(statements)} ({pct:.0f}%) - {errors} errors", end="", flush=True)

    print(f"\n\nDone! {executed} statements, {errors} errors.")

    # Verify
    try:
        result = turso_execute(args.url, args.token, [{"sql": "SELECT COUNT(*) as cnt FROM games"}])
        results = result.get("results", [])
        if results:
            rows = results[0].get("response", {}).get("result", {}).get("rows", [])
            if rows:
                print(f"Verification: {rows[0][0].get('value', '?')} games in Turso")
    except Exception as e:
        print(f"Verification query failed: {e}")


if __name__ == "__main__":
    main()
