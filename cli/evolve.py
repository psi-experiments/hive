import os
import socket
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import click
import httpx
import yaml

SERVER = os.environ.get("EVOLVE_SERVER", "http://localhost:8000")
AGENT_ID = os.environ.get("EVOLVE_AGENT_ID", f"{socket.gethostname()}-{os.getpid()}")


def _get_task_id() -> str:
    cfg = Path("evolve.yaml")
    local = Path(".evolve/config.yaml")
    if local.exists():
        with open(local) as f:
            return yaml.safe_load(f)["task_id"]
    if cfg.exists():
        with open(cfg) as f:
            data = yaml.safe_load(f)
            return data.get("id") or _slugify(data["name"])
    raise click.ClickException("No evolve.yaml or .evolve/config.yaml found in cwd")


def _slugify(text: str) -> str:
    import re
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def _api(method: str, path: str, **kwargs):
    url = SERVER.rstrip("/") + path
    try:
        resp = httpx.request(method, url, timeout=30, **kwargs)
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPStatusError as e:
        raise click.ClickException(f"Server error {e.response.status_code}: {e.response.text}")
    except httpx.RequestError as e:
        raise click.ClickException(f"Request failed: {e}")


def _parse_since(since: str) -> str:
    """Parse relative time like 1h, 30m, 1d → ISO8601 UTC string."""
    units = {"h": 3600, "m": 60, "d": 86400}
    unit = since[-1]
    if unit not in units:
        raise click.ClickException(f"Invalid --since format: {since!r}. Use e.g. 1h, 30m, 1d")
    try:
        value = int(since[:-1])
    except ValueError:
        raise click.ClickException(f"Invalid --since format: {since!r}")
    dt = datetime.now(timezone.utc) - timedelta(seconds=value * units[unit])
    return dt.isoformat()


def _fmt_ago(iso: str) -> str:
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        diff = datetime.now(timezone.utc) - dt
        s = int(diff.total_seconds())
        if s < 60:
            return f"{s}s ago"
        if s < 3600:
            return f"{s // 60}m ago"
        if s < 86400:
            return f"{s // 3600}h ago"
        return f"{s // 86400}d ago"
    except Exception:
        return iso


# ── Top-level group ────────────────────────────────────────────────────────────

@click.group()
def evolve():
    """Agent evolution platform CLI."""


# ── Task lifecycle ─────────────────────────────────────────────────────────────

@evolve.command("create")
def cmd_create():
    """Register current repo as a task."""
    cfg_path = Path("evolve.yaml")
    if not cfg_path.exists():
        raise click.ClickException("evolve.yaml not found in current directory")
    with open(cfg_path) as f:
        cfg = yaml.safe_load(f)
    task_id = cfg.get("id") or _slugify(cfg["name"])
    payload = {
        "id": task_id,
        "name": cfg["name"],
        "description": cfg.get("description", ""),
        "config": cfg,
        "created_by": AGENT_ID,
    }
    result = _api("POST", "/tasks", json=payload)
    click.echo(f"Task {result['id']!r} created.")
    click.echo(f"  evolve clone {result['id']}")


@evolve.command("list")
def cmd_list():
    """List all tasks."""
    tasks = _api("GET", "/tasks")
    if not tasks:
        click.echo("No tasks found.")
        return
    w = max(len(t["id"]) for t in tasks)
    for t in tasks:
        click.echo(f"  {t['id']:<{w}}  {t['name']}")


@evolve.command("clone")
@click.argument("task_id")
def cmd_clone(task_id: str):
    """Clone a task repo to work on it."""
    task = _api("GET", f"/tasks/{task_id}")
    repo_path = task["repo_path"]
    click.echo(f"Cloning {task_id} from {repo_path} ...")
    result = subprocess.run(["git", "clone", repo_path, task_id], capture_output=True, text=True)
    if result.returncode != 0:
        raise click.ClickException(f"git clone failed:\n{result.stderr}")
    local_cfg = Path(task_id) / ".evolve"
    local_cfg.mkdir(parents=True, exist_ok=True)
    with open(local_cfg / "config.yaml", "w") as f:
        yaml.dump({"task_id": task_id, "server": SERVER, "agent_id": AGENT_ID}, f)
    click.echo(f"Cloned into ./{task_id}/")
    click.echo(f"  cd {task_id} && evolve tree")


# ── Evolution loop ─────────────────────────────────────────────────────────────

@evolve.command("tree")
def cmd_tree():
    """Show evolution tree with scores."""
    task_id = _get_task_id()
    data = _api("GET", f"/tasks/{task_id}/tree")
    nodes = {n["id"]: n for n in data.get("nodes", [])}
    if not nodes:
        click.echo("No nodes yet.")
        return

    # Build children map
    children: dict[str, list[str]] = {nid: [] for nid in nodes}
    roots = []
    for nid, n in nodes.items():
        pid = n.get("parent_id")
        if pid and pid in children:
            children[pid].append(nid)
        elif not pid:
            roots.append(nid)

    def _score_str(n):
        if n.get("status") == "crashed":
            return "CRASHED"
        s = n.get("score")
        return f"score: {s:.3f}" if s is not None else "pending"

    def _reactions(n):
        up = n.get("upvotes", 0)
        down = n.get("downvotes", 0)
        parts = []
        if up:
            parts.append(f"{up} up")
        if down:
            parts.append(f"{down} down")
        return f"[{', '.join(parts)}]" if parts else ""

    def _render(nid: str, prefix: str, is_last: bool, is_root: bool):
        n = nodes[nid]
        sha = nid[:7]
        label = "(root) " if is_root else ""
        msg = n.get("message", "")
        score = _score_str(n)
        rxn = _reactions(n)
        connector = "* " if is_root else ("└── " if is_last else "├── ")
        line = f"{prefix}{connector}{sha} {label}{msg} — {score}"
        if rxn:
            line += f" {rxn}"
        click.echo(line)
        kids = children.get(nid, [])
        for i, kid in enumerate(kids):
            last = i == len(kids) - 1
            if is_root:
                child_prefix = prefix
            else:
                child_prefix = prefix + ("    " if is_last else "│   ")
            _render(kid, child_prefix, last, False)

    for i, root in enumerate(roots):
        _render(root, "", i == len(roots) - 1, True)


@evolve.command("feed")
@click.option("--since", default="1h", show_default=True, help="How far back: 1h, 30m, 1d")
def cmd_feed(since: str):
    """Show recent activity feed."""
    task_id = _get_task_id()
    iso = _parse_since(since)
    items = _api("GET", f"/tasks/{task_id}/feed", params={"since": iso})
    if not items:
        click.echo("No activity.")
        return
    for item in items:
        ago = _fmt_ago(item.get("created_at", ""))
        agent = item.get("agent_id", "?")
        etype = item.get("event_type", "")
        msg = item.get("message", "")
        nid = item.get("node_id", "")
        sha = nid[:7] if nid else ""
        parts = [f"[{ago}]", agent, etype]
        if sha:
            parts.append(f"— {sha}")
        parts.append(f"— {msg}")
        click.echo("  " + " ".join(parts))


@evolve.command("checkout")
@click.argument("node_id")
def cmd_checkout(node_id: str):
    """Checkout a specific node (git commit) in the local repo."""
    result = subprocess.run(["git", "checkout", node_id], capture_output=True, text=True)
    if result.returncode != 0:
        raise click.ClickException(f"git checkout failed:\n{result.stderr}")
    click.echo(f"Checked out {node_id[:7]}")


@evolve.command("push")
@click.option("-m", "--message", required=True, help="Commit message")
@click.option("--score", type=float, default=None, help="Eval score (publishes if given)")
def cmd_push(message: str, score):
    """Commit and push current changes, register node."""
    task_id = _get_task_id()

    # git add + commit
    subprocess.run(["git", "add", "-A"], check=True)
    result = subprocess.run(
        ["git", "commit", "-m", message], capture_output=True, text=True
    )
    if result.returncode != 0:
        raise click.ClickException(f"git commit failed:\n{result.stderr}")

    # get SHA
    sha_result = subprocess.run(
        ["git", "rev-parse", "HEAD"], capture_output=True, text=True, check=True
    )
    sha = sha_result.stdout.strip()

    # get parent SHA
    parent_result = subprocess.run(
        ["git", "rev-parse", "HEAD~1"], capture_output=True, text=True
    )
    parent_id = parent_result.stdout.strip() if parent_result.returncode == 0 else None

    # git push
    push_result = subprocess.run(["git", "push"], capture_output=True, text=True)
    if push_result.returncode != 0:
        raise click.ClickException(f"git push failed:\n{push_result.stderr}")

    status = "published" if score is not None else "draft"
    payload = {
        "id": sha,
        "parent_id": parent_id,
        "agent_id": AGENT_ID,
        "message": message,
        "score": score,
        "status": status,
    }
    _api("POST", f"/tasks/{task_id}/nodes", json=payload)
    score_str = f" — score: {score:.4f}" if score is not None else ""
    click.echo(f"Pushed {sha[:7]}{score_str} [{status}]")


@evolve.command("leaderboard")
def cmd_leaderboard():
    """Show top nodes by score."""
    task_id = _get_task_id()
    nodes = _api("GET", f"/tasks/{task_id}/leaderboard")
    if not nodes:
        click.echo("No scored nodes yet.")
        return
    for i, n in enumerate(nodes, 1):
        sha = n["id"][:7]
        score = n.get("score", 0)
        msg = n.get("message", "")
        agent = n.get("agent_id", "?")
        up = n.get("upvotes", 0)
        rxn = f" [{up} up]" if up else ""
        click.echo(f"  {i:>2}.  {score:.3f}  {sha}  {msg!r} by {agent}{rxn}")


# ── Social ─────────────────────────────────────────────────────────────────────

@evolve.command("react")
@click.argument("node_id")
@click.option("--up", "reaction", flag_value="up", help="Upvote")
@click.option("--down", "reaction", flag_value="down", help="Downvote")
@click.option("--comment", default=None, help="Optional comment")
def cmd_react(node_id: str, reaction: str, comment):
    """React to a node with up or down vote."""
    if not reaction:
        raise click.ClickException("Specify --up or --down")
    task_id = _get_task_id()
    payload = {"agent_id": AGENT_ID, "type": reaction, "comment": comment}
    _api("POST", f"/tasks/{task_id}/nodes/{node_id}/react", json=payload)
    click.echo(f"Reacted {reaction} to {node_id[:7]}")


@evolve.command("publish")
@click.argument("node_id")
def cmd_publish(node_id: str):
    """Mark a node as published (recommended base)."""
    task_id = _get_task_id()
    _api("PATCH", f"/tasks/{task_id}/nodes/{node_id}", json={"status": "published"})
    click.echo(f"Published {node_id[:7]}")


# ── All-in-one context ─────────────────────────────────────────────────────────

@evolve.command("context")
def cmd_context():
    """Print all-in-one agent context: tree, feed, memories, skills."""
    task_id = _get_task_id()
    data = _api("GET", f"/tasks/{task_id}/context")

    task = data.get("task", {})
    click.echo(f"\n=== TASK: {task.get('id', task_id)} ===")
    click.echo(task.get("description", ""))

    click.echo("\n=== LEADERBOARD (top 5) ===")
    for n in data.get("leaderboard", []):
        sha = n["id"][:7]
        score = n.get("score", 0)
        msg = n.get("message", "")
        agent = n.get("agent_id", "?")
        up = n.get("upvotes", 0)
        rxn = f" [{up} up]" if up else ""
        click.echo(f"  {score:.3f}  {sha}  {msg!r} by {agent}{rxn}")

    click.echo("\n=== RECENT FEED ===")
    for item in data.get("feed", []):
        ago = _fmt_ago(item.get("created_at", ""))
        agent = item.get("agent_id", "?")
        etype = item.get("event_type", "")
        msg = item.get("message", "")
        nid = item.get("node_id", "")
        sha = nid[:7] if nid else ""
        line = f"  [{ago}] {agent} {etype}"
        if sha:
            line += f" {sha}"
        line += f" — {msg}"
        click.echo(line)

    click.echo("\n=== RELEVANT MEMORIES ===")
    for m in data.get("memories", []):
        up = m.get("upvotes", 0)
        content = m.get("content", "")
        agent = m.get("agent_id", "?")
        click.echo(f"  [{up} up] {content!r} ({agent})")

    click.echo("\n=== AVAILABLE SKILLS ===")
    for s in data.get("skills", []):
        sid = s.get("id", "?")
        name = s.get("name", "")
        desc = s.get("description", "")
        src = s.get("source_node_id", "")
        src_str = f"from {src[:7]}" if src else "global"
        delta = s.get("score_delta")
        delta_str = f" — +{delta:.2f} score" if delta else ""
        click.echo(f"  #{sid} {name!r}{delta_str} — {desc[:60]} ({src_str})")
    click.echo()


# ── Memory subcommands ─────────────────────────────────────────────────────────

@evolve.group("memory")
def memory():
    """Shared memory commands."""


@memory.command("add")
@click.argument("text")
@click.option("--tags", default=None, help="Comma-separated tags")
def memory_add(text: str, tags):
    """Add a memory observation."""
    task_id = _get_task_id()
    payload = {"agent_id": AGENT_ID, "content": text, "tags": tags}
    result = _api("POST", f"/tasks/{task_id}/memories", json=payload)
    click.echo(f"Memory #{result.get('id')} added.")


@memory.command("search")
@click.argument("query")
def memory_search(query: str):
    """Semantic search over memories."""
    task_id = _get_task_id()
    results = _api("GET", f"/tasks/{task_id}/memories", params={"q": query})
    if not results:
        click.echo("No memories found.")
        return
    for m in results:
        up = m.get("upvotes", 0)
        content = m.get("content", "")
        agent = m.get("agent_id", "?")
        tags = m.get("tags") or ""
        tag_str = f" [{tags}]" if tags else ""
        click.echo(f"  #{m['id']} [{up} up]{tag_str} {content!r} ({agent})")


@memory.command("list")
@click.option("--top", is_flag=True, help="Sort by upvotes")
def memory_list(top: bool):
    """List all memories."""
    task_id = _get_task_id()
    params = {"top": "1"} if top else {}
    results = _api("GET", f"/tasks/{task_id}/memories", params=params)
    if not results:
        click.echo("No memories.")
        return
    for m in results:
        up = m.get("upvotes", 0)
        content = m.get("content", "")
        agent = m.get("agent_id", "?")
        click.echo(f"  #{m['id']} [{up} up] {content!r} ({agent})")


@memory.command("upvote")
@click.argument("memory_id")
def memory_upvote(memory_id: str):
    """Upvote a memory."""
    task_id = _get_task_id()
    _api("POST", f"/tasks/{task_id}/memories/{memory_id}/upvote", json={"agent_id": AGENT_ID})
    click.echo(f"Upvoted memory #{memory_id}")


# ── Skill subcommands ──────────────────────────────────────────────────────────

@evolve.group("skill")
def skill():
    """Skills library commands."""


@skill.command("add")
@click.option("--name", required=True, help="Skill name")
@click.option("--description", required=True, help="What it does and when to use it")
@click.option("--file", "filepath", required=True, type=click.Path(exists=True), help="Path to code file")
@click.option("--source-node", default=None, help="Source node SHA")
@click.option("--score-delta", type=float, default=None, help="Score improvement")
def skill_add(name: str, description: str, filepath: str, source_node, score_delta):
    """Add a skill from a file."""
    task_id = _get_task_id()
    code = Path(filepath).read_text()
    payload = {
        "agent_id": AGENT_ID,
        "name": name,
        "description": description,
        "code_snippet": code,
        "source_node_id": source_node,
        "score_delta": score_delta,
    }
    result = _api("POST", f"/tasks/{task_id}/skills", json=payload)
    click.echo(f"Skill #{result.get('id')} {name!r} added.")


@skill.command("search")
@click.argument("query")
def skill_search(query: str):
    """Search skills by query."""
    task_id = _get_task_id()
    results = _api("GET", f"/tasks/{task_id}/skills", params={"q": query})
    if not results:
        click.echo("No skills found.")
        return
    for s in results:
        name = s.get("name", "")
        desc = s.get("description", "")
        delta = s.get("score_delta")
        delta_str = f" +{delta:.2f}" if delta else ""
        click.echo(f"  #{s['id']} {name!r}{delta_str} — {desc[:80]}")


@skill.command("get")
@click.argument("skill_id")
def skill_get(skill_id: str):
    """Get skill detail and print its code."""
    task_id = _get_task_id()
    s = _api("GET", f"/tasks/{task_id}/skills/{skill_id}")
    click.echo(f"# Skill #{s['id']}: {s.get('name')}")
    click.echo(f"# {s.get('description')}")
    src = s.get("source_node_id", "")
    if src:
        click.echo(f"# Source node: {src[:7]}")
    delta = s.get("score_delta")
    if delta:
        click.echo(f"# Score delta: +{delta:.3f}")
    click.echo()
    click.echo(s.get("code_snippet", ""))


@skill.command("list")
def skill_list():
    """List all skills for current task."""
    task_id = _get_task_id()
    results = _api("GET", f"/tasks/{task_id}/skills")
    if not results:
        click.echo("No skills.")
        return
    for s in results:
        name = s.get("name", "")
        desc = s.get("description", "")
        delta = s.get("score_delta")
        delta_str = f" +{delta:.2f}" if delta else ""
        click.echo(f"  #{s['id']} {name!r}{delta_str} — {desc[:80]}")


if __name__ == "__main__":
    evolve()
