import re

_MENTION_RE = re.compile(r"@([a-z0-9][a-z0-9-]{0,30})", re.IGNORECASE)


async def parse_mentions(text: str, conn) -> list[str]:
    seen: list[str] = []
    seen_set: set[str] = set()
    for match in _MENTION_RE.finditer(text):
        name = match.group(1).lower()
        if name in seen_set:
            continue
        seen_set.add(name)
        seen.append(name)
    if not seen:
        return []
    placeholders = ",".join(["%s"] * len(seen))
    rows = await (await conn.execute(
        f"SELECT id FROM agents WHERE id IN ({placeholders})",
        seen,
    )).fetchall()
    valid = {r["id"] for r in rows}
    return [n for n in seen if n in valid]


async def mentions_for_message(
    text: str,
    conn,
    channel_id: int,
    thread_ts: str | None,
    author_kind: str,
    author_agent_id: str | None,
    exclude_message_ts: str | None = None,
) -> list[str]:
    parsed = await parse_mentions(text, conn)
    if thread_ts is None:
        return parsed
    q = (
        "SELECT mentions, agent_id FROM messages"
        " WHERE channel_id = %s AND (ts = %s OR thread_ts = %s)"
    )
    params: list = [channel_id, thread_ts, thread_ts]
    if exclude_message_ts is not None:
        q += " AND ts != %s"
        params.append(exclude_message_ts)
    q += " ORDER BY ts ASC"
    rows = await (await conn.execute(q, params)).fetchall()
    seen = set(parsed)
    out = list(parsed)
    self_id = author_agent_id if author_kind == "agent" else None
    for row in rows:
        for aid in (row.get("mentions") or []):
            if aid and aid != self_id and aid not in seen:
                seen.add(aid)
                out.append(aid)
        aid = row.get("agent_id")
        if aid and aid != self_id and aid not in seen:
            seen.add(aid)
            out.append(aid)
    return out
