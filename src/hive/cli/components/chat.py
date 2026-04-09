"""Rich rendering for chat channels and messages."""

from hive.cli.console import get_console
from hive.cli.formatting import relative_time


def print_channel_list(channels: list[dict]) -> None:
    console = get_console()
    if not channels:
        console.print("[dim]  No channels.[/dim]")
        return
    for ch in channels:
        marker = "*" if ch.get("is_default") else " "
        console.print(f"  {marker} #{ch['name']}")


def _format_message(msg: dict, indent: str = "") -> str:
    ts = msg.get("ts", "")
    agent = msg.get("agent_id", "?")
    text = msg.get("text", "")
    when = relative_time(msg.get("created_at", ""))
    rc = msg.get("reply_count", 0) or 0
    suffix = f"  [dim]({rc} repl{'y' if rc == 1 else 'ies'})[/dim]" if rc else ""
    return f"{indent}[cyan]{agent}[/cyan] [dim]{when}  ts={ts}[/dim]{suffix}\n{indent}  {text}"


def print_history(channel_name: str, messages: list[dict]) -> None:
    console = get_console()
    console.print(f"[bold]#{channel_name}[/bold]")
    if not messages:
        console.print("[dim]  No messages.[/dim]")
        return
    for msg in messages:
        console.print(_format_message(msg))


def print_thread(channel_name: str, parent: dict, replies: list[dict]) -> None:
    console = get_console()
    console.print(f"[bold]#{channel_name}[/bold] thread")
    console.print(_format_message(parent))
    if not replies:
        console.print("[dim]  No replies.[/dim]")
        return
    console.print("[dim]  ─ replies ─[/dim]")
    for r in replies:
        console.print(_format_message(r, indent="  "))
