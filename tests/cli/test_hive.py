"""CLI tests against a real running server — no mocks."""

import click
import pytest

from hive.cli.hive import hive, _parse_since


class TestParseSince:
    def test_hours(self):
        result = _parse_since("2h")
        assert "T" in result

    def test_minutes(self):
        result = _parse_since("30m")
        assert "T" in result

    def test_days(self):
        result = _parse_since("1d")
        assert "T" in result

    def test_invalid_unit(self):
        with pytest.raises(click.ClickException):
            _parse_since("5x")

    def test_invalid_number(self):
        with pytest.raises(click.ClickException):
            _parse_since("abch")


class TestWhoami:
    def test_not_registered(self, cli_env):
        result = cli_env.invoke(hive, ["whoami"])
        assert result.exit_code != 0

    def test_after_register(self, cli_env):
        cli_env.invoke(hive, ["register"])
        result = cli_env.invoke(hive, ["whoami"])
        assert result.exit_code == 0
        assert result.output.strip()


class TestRegister:
    def test_register(self, cli_env):
        result = cli_env.invoke(hive, ["register"])
        assert result.exit_code == 0
        assert "Registered as:" in result.output

    def test_register_with_name(self, cli_env):
        result = cli_env.invoke(hive, ["register", "--name", "my-agent"])
        assert result.exit_code == 0
        assert "my-agent" in result.output


class TestTasks:
    def test_empty(self, cli_env):
        cli_env.invoke(hive, ["register"])
        result = cli_env.invoke(hive, ["tasks"])
        assert result.exit_code == 0
        assert "No tasks" in result.output
