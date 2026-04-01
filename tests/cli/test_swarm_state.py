import json
import os
from pathlib import Path

from hive.cli.swarm_state import (
    _atomic_write, load_swarm, save_swarm, delete_swarm, list_swarms,
    new_swarm_state, add_agent_to_state, refresh_statuses, check_agent_alive,
)


class TestAtomicWrite:
    def test_write_creates_file(self, tmp_path):
        p = tmp_path / "test.json"
        _atomic_write(p, {"key": "value"})
        assert p.exists()
        assert json.loads(p.read_text()) == {"key": "value"}

    def test_write_overwrites(self, tmp_path):
        p = tmp_path / "test.json"
        _atomic_write(p, {"a": 1})
        _atomic_write(p, {"b": 2})
        assert json.loads(p.read_text()) == {"b": 2}

    def test_write_creates_parent_dirs(self, tmp_path):
        p = tmp_path / "sub" / "dir" / "test.json"
        _atomic_write(p, {"ok": True})
        assert p.exists()


class TestLoadSaveSwarm:
    def test_load_nonexistent_returns_none(self, tmp_path, monkeypatch):
        monkeypatch.setattr("hive.cli.swarm_state.SWARMS_DIR", tmp_path / "swarms")
        assert load_swarm("no-such-task") is None

    def test_save_and_load(self, tmp_path, monkeypatch):
        monkeypatch.setattr("hive.cli.swarm_state.SWARMS_DIR", tmp_path / "swarms")
        state = new_swarm_state("test-task", "/tmp/base", "echo hi")
        save_swarm(state)
        loaded = load_swarm("test-task")
        assert loaded["task_id"] == "test-task"
        assert loaded["agent_command"] == "echo hi"

    def test_delete_swarm(self, tmp_path, monkeypatch):
        monkeypatch.setattr("hive.cli.swarm_state.SWARMS_DIR", tmp_path / "swarms")
        state = new_swarm_state("test-task", "/tmp/base", "echo")
        save_swarm(state)
        assert load_swarm("test-task") is not None
        delete_swarm("test-task")
        assert load_swarm("test-task") is None


class TestListSwarms:
    def test_empty(self, tmp_path, monkeypatch):
        monkeypatch.setattr("hive.cli.swarm_state.SWARMS_DIR", tmp_path / "swarms")
        assert list_swarms() == []

    def test_lists_all(self, tmp_path, monkeypatch):
        monkeypatch.setattr("hive.cli.swarm_state.SWARMS_DIR", tmp_path / "swarms")
        save_swarm(new_swarm_state("task-a", "/a", "echo"))
        save_swarm(new_swarm_state("task-b", "/b", "echo"))
        result = list_swarms()
        assert len(result) == 2
        ids = {s["task_id"] for s in result}
        assert ids == {"task-a", "task-b"}


class TestAddAgentToState:
    def test_adds_agent(self):
        state = new_swarm_state("t", "/base", "cmd")
        add_agent_to_state(state, "agent-1", "agent-1", 12345, "/base/agent-1", "/base/agent-1/log")
        assert len(state["agents"]) == 1
        assert state["agents"][0]["agent_id"] == "agent-1"
        assert state["agents"][0]["pid"] == 12345
        assert state["agents"][0]["status"] == "running"


class TestCheckAgentAlive:
    def test_no_pid(self):
        assert check_agent_alive({}) is False

    def test_dead_pid(self):
        assert check_agent_alive({"pid": 99999999}) is False

    def test_own_pid_alive(self):
        assert check_agent_alive({"pid": os.getpid()}) is True


class TestRefreshStatuses:
    def test_marks_dead_agents_stopped(self):
        state = new_swarm_state("t", "/base", "cmd")
        add_agent_to_state(state, "a1", "a1", 99999999, "/w", "/l")
        assert state["agents"][0]["status"] == "running"
        refresh_statuses(state)
        assert state["agents"][0]["status"] == "stopped"

    def test_keeps_alive_agents_running(self):
        state = new_swarm_state("t", "/base", "cmd")
        add_agent_to_state(state, "a1", "a1", os.getpid(), "/w", "/l")
        refresh_statuses(state)
        assert state["agents"][0]["status"] == "running"
