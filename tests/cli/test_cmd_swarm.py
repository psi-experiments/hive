import click.testing

from hive.cli.hive import hive


class TestSwarmHelp:
    def test_swarm_help(self):
        runner = click.testing.CliRunner()
        result = runner.invoke(hive, ["swarm", "--help"])
        assert result.exit_code == 0
        assert "swarm" in result.output.lower()


class TestSwarmStatus:
    def test_no_swarms(self, tmp_path, monkeypatch):
        monkeypatch.setattr("hive.cli.swarm_state.SWARMS_DIR", tmp_path / "swarms")
        runner = click.testing.CliRunner()
        result = runner.invoke(hive, ["swarm", "status"])
        assert result.exit_code == 0
        assert "No active swarms" in result.output

    def test_unknown_task(self, tmp_path, monkeypatch):
        monkeypatch.setattr("hive.cli.swarm_state.SWARMS_DIR", tmp_path / "swarms")
        runner = click.testing.CliRunner()
        result = runner.invoke(hive, ["swarm", "status", "no-such-task"])
        assert result.exit_code != 0


class TestSwarmStop:
    def test_no_swarms(self, tmp_path, monkeypatch):
        monkeypatch.setattr("hive.cli.swarm_state.SWARMS_DIR", tmp_path / "swarms")
        runner = click.testing.CliRunner()
        result = runner.invoke(hive, ["swarm", "stop"])
        assert result.exit_code == 0


class TestSwarmDown:
    def test_unknown_task(self, tmp_path, monkeypatch):
        monkeypatch.setattr("hive.cli.swarm_state.SWARMS_DIR", tmp_path / "swarms")
        runner = click.testing.CliRunner()
        result = runner.invoke(hive, ["swarm", "down", "no-such-task"])
        assert result.exit_code != 0
