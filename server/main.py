import json
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse

from .db import init_db, get_db
from .git_ops import init_bare_repo, get_repo_path

app = FastAPI(title="Evolve Hive Mind Server")


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def row_to_dict(row) -> dict:
    return dict(row) if row else None


@app.on_event("startup")
def startup():
    init_db()


# ── Tasks ──────────────────────────────────────────────────────────────────

@app.post("/tasks", status_code=201)
def create_task(body: dict[str, Any]):
    task_id = body.get("id")
    if not task_id:
        raise HTTPException(400, "id required")

    repo_path = init_bare_repo(task_id)

    with get_db() as conn:
        conn.execute(
            "INSERT INTO tasks (id, name, description, repo_path, config, created_by, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                task_id,
                body.get("name", ""),
                body.get("description", ""),
                repo_path,
                json.dumps(body.get("config", {})),
                body.get("created_by", "unknown"),
                now(),
            ),
        )
    return JSONResponse({"id": task_id, "repo_path": repo_path}, status_code=201)


@app.get("/tasks")
def list_tasks():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM tasks ORDER BY created_at DESC").fetchall()
    return [row_to_dict(r) for r in rows]


@app.get("/tasks/{task_id}")
def get_task(task_id: str):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    if not row:
        raise HTTPException(404, "task not found")
    return row_to_dict(row)


# ── Nodes ──────────────────────────────────────────────────────────────────

@app.post("/tasks/{task_id}/nodes", status_code=201)
def register_node(task_id: str, body: dict[str, Any]):
    sha = body.get("id")
    if not sha:
        raise HTTPException(400, "id (commit sha) required")

    ts = now()
    agent_id = body.get("agent_id", "unknown")

    with get_db() as conn:
        conn.execute(
            "INSERT INTO nodes (id, task_id, parent_id, agent_id, message, score, status, diff_summary, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                sha,
                task_id,
                body.get("parent_id"),
                agent_id,
                body.get("message", ""),
                body.get("score"),
                body.get("status", "draft"),
                body.get("diff_summary"),
                ts,
            ),
        )
        conn.execute(
            "INSERT INTO feed (task_id, agent_id, event_type, node_id, message, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (
                task_id,
                agent_id,
                "push",
                sha,
                body.get("message", ""),
                ts,
            ),
        )
    return JSONResponse({"id": sha}, status_code=201)


@app.get("/tasks/{task_id}/nodes/{sha}")
def get_node(task_id: str, sha: str):
    with get_db() as conn:
        node = conn.execute(
            "SELECT * FROM nodes WHERE id = ? AND task_id = ?", (sha, task_id)
        ).fetchone()
        if not node:
            raise HTTPException(404, "node not found")
        reactions = conn.execute(
            "SELECT * FROM reactions WHERE node_id = ?", (sha,)
        ).fetchall()
    result = row_to_dict(node)
    result["reactions"] = [row_to_dict(r) for r in reactions]
    return result


@app.patch("/tasks/{task_id}/nodes/{sha}")
def update_node(task_id: str, sha: str, body: dict[str, Any]):
    fields = {k: v for k, v in body.items() if k in ("score", "status")}
    if not fields:
        raise HTTPException(400, "nothing to update")
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    with get_db() as conn:
        conn.execute(
            f"UPDATE nodes SET {set_clause} WHERE id = ? AND task_id = ?",
            (*fields.values(), sha, task_id),
        )
    return {"ok": True}


@app.get("/tasks/{task_id}/tree")
def get_tree(task_id: str):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM nodes WHERE task_id = ? ORDER BY created_at", (task_id,)
        ).fetchall()
    return [row_to_dict(r) for r in rows]


@app.get("/tasks/{task_id}/leaderboard")
def get_leaderboard(task_id: str, limit: int = Query(10, ge=1, le=100)):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT n.*, ("
            "  SELECT COUNT(*) FROM reactions r WHERE r.node_id = n.id AND r.type = 'up'"
            ") AS upvotes"
            " FROM nodes n WHERE n.task_id = ? AND n.score IS NOT NULL"
            " ORDER BY n.score DESC LIMIT ?",
            (task_id, limit),
        ).fetchall()
    return [row_to_dict(r) for r in rows]


# ── Feed ───────────────────────────────────────────────────────────────────

@app.get("/tasks/{task_id}/feed")
def get_feed(
    task_id: str,
    since: str | None = Query(None),
    limit: int = Query(50, ge=1, le=500),
):
    with get_db() as conn:
        if since:
            rows = conn.execute(
                "SELECT * FROM feed WHERE task_id = ? AND created_at > ?"
                " ORDER BY created_at DESC LIMIT ?",
                (task_id, since, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM feed WHERE task_id = ? ORDER BY created_at DESC LIMIT ?",
                (task_id, limit),
            ).fetchall()
    return [row_to_dict(r) for r in rows]


# ── Reactions ──────────────────────────────────────────────────────────────

@app.post("/tasks/{task_id}/nodes/{sha}/react", status_code=201)
def add_reaction(task_id: str, sha: str, body: dict[str, Any]):
    agent_id = body.get("agent_id", "unknown")
    reaction_type = body.get("type")
    if reaction_type not in ("up", "down"):
        raise HTTPException(400, "type must be 'up' or 'down'")

    ts = now()
    with get_db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO reactions (node_id, agent_id, type, comment, created_at)"
            " VALUES (?, ?, ?, ?, ?)",
            (sha, agent_id, reaction_type, body.get("comment"), ts),
        )
        conn.execute(
            "INSERT INTO feed (task_id, agent_id, event_type, node_id, message, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (
                task_id,
                agent_id,
                "react",
                sha,
                f"{reaction_type} — {body.get('comment', '')}",
                ts,
            ),
        )
    return JSONResponse({"ok": True}, status_code=201)


# ── Memories ───────────────────────────────────────────────────────────────

@app.post("/tasks/{task_id}/memories", status_code=201)
def add_memory(task_id: str, body: dict[str, Any]):
    ts = now()
    agent_id = body.get("agent_id", "unknown")
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO memories (task_id, agent_id, content, node_id, tags, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (
                task_id,
                agent_id,
                body.get("content", ""),
                body.get("node_id"),
                body.get("tags"),
                ts,
            ),
        )
        memory_id = cur.lastrowid
        conn.execute(
            "INSERT INTO feed (task_id, agent_id, event_type, node_id, message, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (task_id, agent_id, "memory", body.get("node_id"), body.get("content", ""), ts),
        )
    return JSONResponse({"id": memory_id}, status_code=201)


@app.get("/tasks/{task_id}/memories")
def list_memories(task_id: str, q: str | None = Query(None)):
    with get_db() as conn:
        if q:
            rows = conn.execute(
                "SELECT * FROM memories WHERE task_id = ? AND content LIKE ?"
                " ORDER BY upvotes DESC",
                (task_id, f"%{q}%"),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM memories WHERE task_id = ? ORDER BY upvotes DESC",
                (task_id,),
            ).fetchall()
    return [row_to_dict(r) for r in rows]


@app.post("/tasks/{task_id}/memories/{memory_id}/upvote")
def upvote_memory(task_id: str, memory_id: int):
    with get_db() as conn:
        conn.execute(
            "UPDATE memories SET upvotes = upvotes + 1 WHERE id = ? AND task_id = ?",
            (memory_id, task_id),
        )
    return {"ok": True}


# ── Skills ─────────────────────────────────────────────────────────────────

@app.post("/tasks/{task_id}/skills", status_code=201)
def add_skill(task_id: str, body: dict[str, Any]):
    ts = now()
    agent_id = body.get("agent_id", "unknown")
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO skills"
            " (task_id, agent_id, name, description, code_snippet, source_node_id, score_delta, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                task_id,
                agent_id,
                body.get("name", ""),
                body.get("description", ""),
                body.get("code_snippet", ""),
                body.get("source_node_id"),
                body.get("score_delta"),
                ts,
            ),
        )
        skill_id = cur.lastrowid
        conn.execute(
            "INSERT INTO feed (task_id, agent_id, event_type, node_id, message, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (task_id, agent_id, "skill", body.get("source_node_id"), body.get("name", ""), ts),
        )
    return JSONResponse({"id": skill_id}, status_code=201)


@app.get("/tasks/{task_id}/skills")
def list_skills(task_id: str, q: str | None = Query(None)):
    with get_db() as conn:
        if q:
            rows = conn.execute(
                "SELECT * FROM skills WHERE task_id = ?"
                " AND (name LIKE ? OR description LIKE ?)"
                " ORDER BY upvotes DESC",
                (task_id, f"%{q}%", f"%{q}%"),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM skills WHERE task_id = ? ORDER BY upvotes DESC",
                (task_id,),
            ).fetchall()
    return [row_to_dict(r) for r in rows]


@app.get("/tasks/{task_id}/skills/{skill_id}")
def get_skill(task_id: str, skill_id: int):
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM skills WHERE id = ? AND task_id = ?", (skill_id, task_id)
        ).fetchone()
    if not row:
        raise HTTPException(404, "skill not found")
    return row_to_dict(row)


@app.post("/tasks/{task_id}/skills/{skill_id}/upvote")
def upvote_skill(task_id: str, skill_id: int):
    with get_db() as conn:
        conn.execute(
            "UPDATE skills SET upvotes = upvotes + 1 WHERE id = ? AND task_id = ?",
            (skill_id, task_id),
        )
    return {"ok": True}


# ── Context (all-in-one) ───────────────────────────────────────────────────

@app.get("/tasks/{task_id}/context")
def get_context(task_id: str):
    with get_db() as conn:
        task = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if not task:
            raise HTTPException(404, "task not found")

        leaderboard = conn.execute(
            "SELECT n.*, ("
            "  SELECT COUNT(*) FROM reactions r WHERE r.node_id = n.id AND r.type = 'up'"
            ") AS upvotes"
            " FROM nodes n WHERE n.task_id = ? AND n.score IS NOT NULL"
            " ORDER BY n.score DESC LIMIT 5",
            (task_id,),
        ).fetchall()

        feed = conn.execute(
            "SELECT * FROM feed WHERE task_id = ? ORDER BY created_at DESC LIMIT 10",
            (task_id,),
        ).fetchall()

        memories = conn.execute(
            "SELECT * FROM memories WHERE task_id = ? ORDER BY upvotes DESC LIMIT 10",
            (task_id,),
        ).fetchall()

        skills = conn.execute(
            "SELECT * FROM skills WHERE task_id = ? ORDER BY upvotes DESC LIMIT 5",
            (task_id,),
        ).fetchall()

    return {
        "task": row_to_dict(task),
        "leaderboard": [row_to_dict(r) for r in leaderboard],
        "feed": [row_to_dict(r) for r in feed],
        "memories": [row_to_dict(r) for r in memories],
        "skills": [row_to_dict(r) for r in skills],
    }
