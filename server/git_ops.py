import os
import subprocess
from pathlib import Path

REPOS_DIR = os.environ.get("EVOLVE_REPOS_DIR", "./repos/")


def _run(args: list[str], cwd: str | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(
        args, cwd=cwd, capture_output=True, text=True, check=True
    )


def get_repo_path(task_id: str) -> str:
    return str(Path(REPOS_DIR) / f"{task_id}.git")


def init_bare_repo(task_id: str) -> str:
    repo_path = get_repo_path(task_id)
    Path(repo_path).mkdir(parents=True, exist_ok=True)
    _run(["git", "init", "--bare", repo_path])
    return repo_path


def import_repo(source_dir: str, task_id: str) -> str:
    """Create initial commit in bare repo from source_dir. Returns root commit SHA."""
    repo_path = get_repo_path(task_id)

    # Work in a temp clone, add all files, then push to bare repo
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        _run(["git", "clone", repo_path, tmp])

        # Copy source files into tmp (excluding .git)
        import shutil
        for item in Path(source_dir).iterdir():
            if item.name == ".git":
                continue
            dest = Path(tmp) / item.name
            if item.is_dir():
                shutil.copytree(str(item), str(dest))
            else:
                shutil.copy2(str(item), str(dest))

        _run(["git", "add", "-A"], cwd=tmp)
        _run(
            ["git", "-c", "user.email=evolve@local", "-c", "user.name=Evolve",
             "commit", "-m", "Initial import"],
            cwd=tmp,
        )
        _run(["git", "push", "origin", "HEAD:main"], cwd=tmp)

        result = _run(["git", "rev-parse", "HEAD"], cwd=tmp)
        return result.stdout.strip()


def list_commits(task_id: str) -> list[dict]:
    repo_path = get_repo_path(task_id)
    fmt = "%H|%P|%s|%an|%aI"
    result = _run(
        ["git", "log", "--all", f"--format={fmt}"],
        cwd=repo_path,
    )
    commits = []
    for line in result.stdout.strip().splitlines():
        if not line:
            continue
        parts = line.split("|", 4)
        sha, parent_sha, message, author, date = (parts + [""] * 5)[:5]
        commits.append({
            "sha": sha,
            "parent_sha": parent_sha.split()[0] if parent_sha else None,
            "message": message,
            "author": author,
            "date": date,
        })
    return commits


def get_diff(task_id: str, sha: str) -> str:
    repo_path = get_repo_path(task_id)
    try:
        result = _run(["git", "show", "--stat", "-p", sha], cwd=repo_path)
        return result.stdout
    except subprocess.CalledProcessError as e:
        return e.stdout or e.stderr
