"""Database helpers for Supabase Postgres via psycopg."""

from __future__ import annotations

import os
from typing import Any, Dict, Iterable, Optional


def resolve_db_url(config: Dict[str, Any]) -> str:
    cfg_url = (config.get("db") or {}).get("url") if config else None
    env_url = (
        os.getenv("DATABASE_URL")
        or os.getenv("SUPABASE_DB_URL")
        or os.getenv("SUPABASE_DATABASE_URL")
    )
    db_url = env_url or cfg_url
    if not db_url:
        raise RuntimeError(
            "No database URL found. Set db.url in config or DATABASE_URL/SUPABASE_DB_URL env var."
        )
    return db_url


class Database:
    def __init__(self, db_url: str):
        self.db_url = db_url
        self.conn = None

    def __enter__(self) -> "Database":
        try:
            import psycopg
        except ImportError as exc:
            raise RuntimeError("psycopg is required. Install via requirements.txt") from exc

        self.conn = psycopg.connect(self.db_url, autocommit=False)
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        if not self.conn:
            return
        if exc_type is None:
            self.conn.commit()
        else:
            self.conn.rollback()
        self.conn.close()

    def execute(self, sql: str, params: Optional[Iterable[Any]] = None) -> None:
        with self.conn.cursor() as cur:
            cur.execute(sql, params or ())

    def executemany(self, sql: str, params_seq: Iterable[Iterable[Any]]) -> None:
        with self.conn.cursor() as cur:
            cur.executemany(sql, params_seq)

    def commit(self) -> None:
        self.conn.commit()

    def fetchone(self, sql: str, params: Optional[Iterable[Any]] = None) -> Optional[Dict[str, Any]]:
        with self.conn.cursor() as cur:
            cur.execute(sql, params or ())
            row = cur.fetchone()
            if row is None:
                return None
            cols = [d.name for d in cur.description]
            return dict(zip(cols, row))

    def fetchall(self, sql: str, params: Optional[Iterable[Any]] = None) -> list[Dict[str, Any]]:
        with self.conn.cursor() as cur:
            cur.execute(sql, params or ())
            rows = cur.fetchall()
            cols = [d.name for d in cur.description]
            return [dict(zip(cols, row)) for row in rows]
