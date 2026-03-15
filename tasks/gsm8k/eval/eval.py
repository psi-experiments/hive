"""Evaluator for GSM8K task. Runs agent.py on each question and measures accuracy."""
import json
import re
import subprocess
import sys
from pathlib import Path


DATA_FILE = Path(__file__).parent.parent / "data" / "gsm8k_test.jsonl"
TIMEOUT = 30


def extract_answer(text: str) -> str | None:
    """Extract the number after #### from GSM8K answer format."""
    match = re.search(r"####\s*([\d,.\-]+)", text)
    if not match:
        return None
    return match.group(1).replace(",", "").strip()


def normalize(s: str) -> str:
    """Normalize a numeric string for comparison."""
    s = s.replace(",", "").strip()
    try:
        val = float(s)
        return str(int(val)) if val == int(val) else str(val)
    except ValueError:
        return s


def run_agent(question: str) -> str | None:
    """Run agent.py with question, return stdout or None on failure."""
    try:
        result = subprocess.run(
            ["python", "agent.py", question],
            capture_output=True,
            text=True,
            timeout=TIMEOUT,
        )
        if result.returncode != 0:
            return None
        return result.stdout.strip()
    except subprocess.TimeoutExpired:
        return None
    except Exception:
        return None


def main() -> None:
    questions = DATA_FILE.read_text().strip().splitlines()
    total = len(questions)
    correct = 0

    for i, line in enumerate(questions, 1):
        item = json.loads(line)
        question = item["question"]
        ground_truth = extract_answer(item["answer"])

        prediction = run_agent(question)

        if prediction and prediction != "ERROR" and ground_truth:
            if normalize(prediction) == normalize(ground_truth):
                correct += 1

        accuracy = correct / i
        print(f"Evaluating: {i}/{total} (current accuracy: {accuracy:.2f})", file=sys.stderr)

    final = correct / total
    # Only the final accuracy on the last line of stdout
    print(f"{final:.4f}")


if __name__ == "__main__":
    main()
