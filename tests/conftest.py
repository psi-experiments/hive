import os
import socket
import threading

import pytest
import uvicorn
from fastapi.testclient import TestClient

from hive.server.db import init_db
from hive.server.main import app
from tests.mocks import MockGitHubApp
from hive.server.github import set_github_app

_ALL_TABLES = "votes, comments, claims, skills, posts, runs, forks, agents, tasks"


def _free_port():
    with socket.socket() as s:
        s.bind(("", 0))
        return s.getsockname()[1]


@pytest.fixture(scope="session")
def _pg_test_url():
    """Create a temporary PostgreSQL database for the test session."""
    db_name = f"hive_test_{os.getpid()}"
    try:
        import psycopg
        conn = psycopg.connect("postgresql://localhost:5432/postgres", autocommit=True)
        conn.execute(f"DROP DATABASE IF EXISTS {db_name}")
        conn.execute(f"CREATE DATABASE {db_name}")
        conn.close()
    except Exception:
        yield None
        return
    yield f"postgresql://localhost:5432/{db_name}"
    try:
        import psycopg
        conn = psycopg.connect("postgresql://localhost:5432/postgres", autocommit=True)
        conn.execute(f"DROP DATABASE IF EXISTS {db_name}")
        conn.close()
    except Exception:
        pass


@pytest.fixture(params=["sqlite", "postgres"])
def client(request, tmp_path, monkeypatch, _pg_test_url):
    """TestClient with a fresh DB per test, runs against both SQLite and PostgreSQL."""
    if request.param == "postgres":
        if _pg_test_url is None:
            pytest.skip("PostgreSQL not available")
        db_url = _pg_test_url
        monkeypatch.setattr("hive.server.db.DATABASE_URL", db_url)
        init_db()
        import psycopg
        with psycopg.connect(db_url, autocommit=True) as conn:
            conn.execute(f"TRUNCATE {_ALL_TABLES} RESTART IDENTITY CASCADE")
    else:
        db_url = f"sqlite:///{tmp_path}/test.db"
        monkeypatch.setattr("hive.server.db.DATABASE_URL", db_url)
        init_db()
    set_github_app(MockGitHubApp())
    return TestClient(app)


@pytest.fixture()
def mock_github(client):
    from hive.server.github import get_github_app
    return get_github_app()


@pytest.fixture()
def registered_agent(client):
    """Register an agent and return (client, agent_id, token)."""
    resp = client.post("/api/register")
    data = resp.json()
    return client, data["id"], data["token"]


@pytest.fixture()
def live_server(tmp_path, monkeypatch):
    """Start a real uvicorn server on a random port. Returns the base URL."""
    db_url = f"sqlite:///{tmp_path}/test.db"
    monkeypatch.setattr("hive.server.db.DATABASE_URL", db_url)
    init_db()
    set_github_app(MockGitHubApp())

    port = _free_port()
    config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="error")
    server = uvicorn.Server(config)
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()

    import httpx, time
    url = f"http://127.0.0.1:{port}"
    for _ in range(50):
        try:
            httpx.get(f"{url}/api/tasks", timeout=1)
            break
        except httpx.ConnectError:
            time.sleep(0.1)

    yield url

    server.should_exit = True
    thread.join(timeout=5)


@pytest.fixture()
def cli_env(live_server, tmp_path, monkeypatch):
    """Set up CLI to point at the live test server. Returns (runner, config_path)."""
    import click.testing

    cfg_path = tmp_path / "cli_cfg.json"
    monkeypatch.setattr("hive.cli.helpers.CONFIG_PATH", cfg_path)
    monkeypatch.setenv("HIVE_SERVER", live_server)

    return click.testing.CliRunner()
