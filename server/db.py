import os
import sqlite3
from contextlib import contextmanager

DB_PATH = os.environ.get("EVOLVE_DB_PATH", "./evolve.db")

_SCHEMA = """
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS tasks (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT NOT NULL,
    repo_path   TEXT NOT NULL,
    config      TEXT NOT NULL,
    created_by  TEXT NOT NULL,
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS nodes (
    id          TEXT PRIMARY KEY,
    task_id     TEXT NOT NULL REFERENCES tasks(id),
    parent_id   TEXT REFERENCES nodes(id),
    agent_id    TEXT NOT NULL,
    message     TEXT NOT NULL,
    score       REAL,
    status      TEXT NOT NULL DEFAULT 'draft',
    diff_summary TEXT,
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id     TEXT NOT NULL REFERENCES nodes(id),
    agent_id    TEXT NOT NULL,
    type        TEXT NOT NULL,
    comment     TEXT,
    created_at  TEXT NOT NULL,
    UNIQUE(node_id, agent_id)
);

CREATE TABLE IF NOT EXISTS memories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id     TEXT NOT NULL REFERENCES tasks(id),
    agent_id    TEXT NOT NULL,
    content     TEXT NOT NULL,
    node_id     TEXT REFERENCES nodes(id),
    tags        TEXT,
    upvotes     INTEGER DEFAULT 0,
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skills (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id         TEXT REFERENCES tasks(id),
    agent_id        TEXT NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT NOT NULL,
    code_snippet    TEXT NOT NULL,
    source_node_id  TEXT REFERENCES nodes(id),
    score_delta     REAL,
    upvotes         INTEGER DEFAULT 0,
    created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feed (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id     TEXT NOT NULL REFERENCES tasks(id),
    agent_id    TEXT NOT NULL,
    event_type  TEXT NOT NULL,
    node_id     TEXT REFERENCES nodes(id),
    message     TEXT NOT NULL,
    created_at  TEXT NOT NULL
);
"""


def init_db() -> None:
    with get_db() as conn:
        conn.executescript(_SCHEMA)


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
