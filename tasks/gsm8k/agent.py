"""GSM8K math solver agent. Takes a question as CLI arg, prints the numeric answer."""
import os
import re
import sys

from openai import OpenAI


def solve(question: str) -> str:
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "user",
                "content": (
                    "Solve this math problem step by step. "
                    "Put your final numeric answer after ####\n\n"
                    f"{question}"
                ),
            }
        ],
        temperature=0,
    )

    text = response.choices[0].message.content or ""

    # Extract the number after ####
    match = re.search(r"####\s*([\d,.\-]+)", text)
    if not match:
        return "ERROR"

    raw = match.group(1).replace(",", "")
    try:
        # Return as int string if possible, else float string
        val = float(raw)
        return str(int(val)) if val == int(val) else str(val)
    except ValueError:
        return "ERROR"


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("ERROR")
        sys.exit(1)

    try:
        print(solve(sys.argv[1]))
    except Exception:
        print("ERROR")
