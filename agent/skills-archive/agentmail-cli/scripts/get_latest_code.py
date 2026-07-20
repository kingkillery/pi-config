from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable


INBOX_FIELDS = ("email", "address", "fromAddress", "from_address", "username", "name", "displayName", "display_name")
INBOX_ID_FIELDS = ("id", "inboxId", "inbox_id")
MESSAGE_ID_FIELDS = ("id", "messageId", "message_id")
SUBJECT_FIELDS = ("subject", "title")
BODY_FIELDS = ("text", "html", "body", "plainText", "plain_text", "content", "extracted_text")
TIME_FIELDS = (
    "createdAt",
    "created_at",
    "updatedAt",
    "updated_at",
    "receivedAt",
    "received_at",
    "timestamp",
    "sentAt",
    "sent_at",
    "date",
)


def resolve_agentmail_command() -> list[str]:
    """Return a Windows-safe AgentMail command prefix.

    The npm-generated `agentmail.cmd` shim expands `%*` without quoting, so
    Salesforce Message-IDs wrapped in angle brackets can be interpreted by
    `cmd.exe` as redirection. Calling the Node entrypoint directly avoids that
    parsing layer while still using the installed CLI package.
    """

    node = shutil.which("node")
    for executable_name in ("agentmail.cmd", "agentmail.exe", "agentmail"):
        executable = shutil.which(executable_name)
        if not executable:
            continue
        executable_path = Path(executable)
        node_entrypoint = executable_path.parent / "node_modules" / "agentmail-cli" / "bin" / "agentmail"
        if node and node_entrypoint.exists():
            return [node, str(node_entrypoint)]
        if executable_path.suffix.lower() != ".cmd":
            return [str(executable_path)]

    powershell_shim = shutil.which("agentmail.ps1")
    pwsh = shutil.which("pwsh") or shutil.which("powershell")
    if powershell_shim and pwsh:
        return [pwsh, "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", powershell_shim]

    raise RuntimeError("AgentMail CLI was not found on PATH")


def run_agentmail(*args: str) -> Any:
    command = [*resolve_agentmail_command(), *args, "--format", "json"]
    completed = subprocess.run(command, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if completed.returncode != 0:
        raise RuntimeError(completed.stderr.strip() or completed.stdout.strip() or "agentmail failed")
    raw = completed.stdout.strip()
    if not raw:
        raise RuntimeError("agentmail returned empty output")
    return json.loads(raw)


def iter_objects(value: Any) -> Iterable[dict[str, Any]]:
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from iter_objects(child)
    elif isinstance(value, list):
        for item in value:
            yield from iter_objects(item)


def first_present(mapping: dict[str, Any], keys: tuple[str, ...]) -> Any:
    for key in keys:
        if key in mapping and mapping[key] not in (None, ""):
            return mapping[key]
    return None


def parse_sort_key(value: Any) -> tuple[int, str]:
    if value in (None, ""):
        return (0, "")
    text = str(value)
    for candidate in (
        text,
        text.replace("Z", "+00:00"),
    ):
        try:
            return (1, datetime.fromisoformat(candidate).isoformat())
        except ValueError:
            continue
    return (1, text)


def find_inbox_id(email: str) -> tuple[str, dict[str, Any]]:
    payload = run_agentmail("inboxes", "list", "--limit", "200")
    matches: list[tuple[str, dict[str, Any]]] = []
    target = email.casefold()
    for item in iter_objects(payload):
        inbox_id = first_present(item, INBOX_ID_FIELDS)
        if not inbox_id:
            continue
        haystacks = [str(item.get(field, "")) for field in INBOX_FIELDS]
        if any(target == value.casefold() for value in haystacks if value):
            matches.append((str(inbox_id), item))
    if not matches:
        raise RuntimeError(f"No AgentMail inbox matched {email!r}")
    if len(matches) > 1:
        rendered = ", ".join(f"{item.get('id')}" for _, item in matches)
        raise RuntimeError(f"Multiple AgentMail inboxes matched {email!r}: {rendered}")
    return matches[0]


def select_message(
    inbox_id: str,
    *,
    subject_pattern: re.Pattern[str] | None,
    limit: int,
    unread_label: str,
) -> dict[str, Any]:
    payload = run_agentmail(
        "inboxes:messages",
        "list",
        "--inbox-id",
        inbox_id,
        "--label",
        unread_label,
        "--limit",
        str(limit),
    )
    candidates: list[dict[str, Any]] = []
    for item in iter_objects(payload):
        message_id = first_present(item, MESSAGE_ID_FIELDS)
        if not message_id:
            continue
        subject = str(first_present(item, SUBJECT_FIELDS) or "")
        if subject_pattern and not subject_pattern.search(subject):
            continue
        candidates.append(item)
    if not candidates:
        raise RuntimeError("No unread AgentMail messages matched the requested filters")
    candidates.sort(
        key=lambda item: parse_sort_key(first_present(item, TIME_FIELDS)),
        reverse=True,
    )
    return candidates[0]


def extract_body(message: dict[str, Any], inbox_id: str) -> tuple[str, dict[str, Any]]:
    message_id = first_present(message, MESSAGE_ID_FIELDS)
    if not message_id:
        raise RuntimeError("Selected AgentMail message is missing an id")
    full_message = run_agentmail(
        "inboxes:messages",
        "get",
        "--inbox-id",
        str(inbox_id),
        "--message-id",
        str(message_id),
    )
    for item in iter_objects(full_message):
        body = first_present(item, BODY_FIELDS)
        if body not in (None, ""):
            return str(body), item
    raise RuntimeError("AgentMail message body was empty")


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract the newest verification code from an AgentMail inbox via the AgentMail CLI.")
    parser.add_argument("--email", default="flywheel@agentmail.to", help="Inbox email address to resolve.")
    parser.add_argument(
        "--subject-regex",
        default=r"Salesforce|Verify|verification|identity",
        help="Regex used to filter message subjects.",
    )
    parser.add_argument(
        "--code-regex",
        default=r"\b(\d{6})\b",
        help="Regex used to extract the verification code from the body.",
    )
    parser.add_argument("--limit", type=int, default=20, help="Maximum unread messages to inspect.")
    parser.add_argument("--unread-label", default="unread", help="Label used to filter unread messages.")
    parser.add_argument("--output", choices=("code", "json"), default="code", help="Return just the code or a JSON envelope.")
    args = parser.parse_args()

    if not os.environ.get("AGENTMAIL_API_KEY"):
        raise RuntimeError("AGENTMAIL_API_KEY is not visible in the current shell")

    subject_pattern = re.compile(args.subject_regex, re.IGNORECASE) if args.subject_regex else None
    code_pattern = re.compile(args.code_regex)

    inbox_id, inbox = find_inbox_id(args.email)
    message = select_message(
        inbox_id,
        subject_pattern=subject_pattern,
        limit=args.limit,
        unread_label=args.unread_label,
    )
    body, full_message = extract_body(message, inbox_id)

    match = code_pattern.search(body)
    if not match:
        raise RuntimeError("No verification code matched the requested regex in the latest AgentMail message")

    code = match.group(1) if match.groups() else match.group(0)
    if args.output == "code":
        print(code)
        return

    payload = {
        "inboxEmail": args.email,
        "inboxId": inbox_id,
        "inbox": inbox,
        "messageId": first_present(full_message, MESSAGE_ID_FIELDS),
        "subject": first_present(full_message, SUBJECT_FIELDS),
        "timestamp": first_present(full_message, TIME_FIELDS),
        "code": code,
    }
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # pragma: no cover - operator-facing script
        print(str(exc), file=sys.stderr)
        sys.exit(1)
