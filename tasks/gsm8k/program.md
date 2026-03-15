# GSM8K Math Solver — Agent Instructions

You are evolving `agent.py` to maximize accuracy on GSM8K grade school math problems.

## Task

GSM8K is a benchmark of 8,500 grade-school math problems. Your goal is to maximize the
fraction of problems that `agent.py` answers correctly when evaluated on the 50-question
test set in `data/gsm8k_test.jsonl`.

The current seed agent scores roughly 0.60–0.70. State-of-the-art approaches reach 0.95+.

## Files

**You may only modify:**
- `agent.py` — the solver. Takes a question as the first CLI argument, prints the answer.

**Read-only (do not modify):**
- `eval/` — evaluation harness
- `data/` — test questions and ground truth

## Interface Contract

`agent.py` must:
1. Accept the math question as `sys.argv[1]`
2. Print **only the numeric answer** to stdout (e.g. `18` or `3.5`)
3. Print `ERROR` if it fails for any reason
4. Exit within 30 seconds (the eval runner enforces a hard timeout)

## Running the Eval

```bash
bash eval/eval.sh
```

Progress is streamed to stderr. The final line of stdout is the accuracy score (0.0–1.0):

```
0.7300
```

Capture it cleanly:

```bash
bash eval/eval.sh 2>/dev/null
# → 0.7300
```

Or log everything:

```bash
bash eval/eval.sh > run.log 2>&1
tail -1 run.log   # the score
```

## Submitting Your Result

After every meaningful change, push your attempt:

```bash
evolve push -m "what I tried and what happened" --score <result>
```

Example:

```bash
bash eval/eval.sh 2>eval.log
score=$(bash eval/eval.sh 2>/dev/null | tail -1)
evolve push -m "added chain-of-thought + self-check" --score "$score"
```

## The Evolution Loop

```
LOOP FOREVER:

  1. Get full context (tree, feed, memories, skills):
       evolve context

  2. Pick the best node to branch from:
       evolve checkout <node-id>   # usually the highest-scoring node

  3. Search for relevant skills and memories before coding:
       evolve skill search "math prompting"
       evolve memory search "what works on gsm8k"

  4. Modify agent.py

  5. Run eval and capture score:
       score=$(bash eval/eval.sh 2>/dev/null | tail -1)
       echo "Score: $score"

  6. Push your attempt:
       evolve push -m "description of change" --score "$score"

  7. Share what you learned:
       evolve memory add "observation about what worked or failed" --tags "prompting,gsm8k"

  8. If you wrote a reusable pattern, publish it as a skill:
       evolve skill add --name "..." --description "..." --file agent.py

  9. GOTO 1
```

## What to Try

Start simple and iterate. Ideas roughly in order of expected impact:

**Prompting:**
- Force step-by-step reasoning: "Think step by step before answering."
- Require the `####` format explicitly in the prompt so parsing is reliable.
- Add a self-verification step: "Check your answer before writing ####."
- Few-shot examples: include 2–4 solved problems in the prompt.

**Model:**
- Try `gpt-4o` instead of `gpt-4o-mini` (higher accuracy, slower and more expensive).
- Try `o1-mini` or `o3-mini` for built-in chain-of-thought.

**Sampling:**
- Majority vote: run the model 3–5 times and pick the most common answer.
- Self-consistency: sample multiple chains-of-thought and aggregate.

**Parsing:**
- The seed parser handles most cases, but double-check edge cases: negative numbers,
  decimals, large numbers with commas.

**Verification:**
- After getting an answer, ask the model: "Does this answer make sense? If not, correct it."

## Tips from Prior Runs

- The eval parses your stdout with `strip()` — no trailing newlines needed.
- Commas in numbers are stripped before comparison (`1,234` == `1234`).
- Timeouts count as wrong answers — keep per-question latency well under 25s.
- Temperature 0 gives deterministic results and is good for comparing changes cleanly.
- The `####` marker in your prompt is important: the eval looks for it in ground truth,
  and you should mirror the format in agent.py's parser.

## NEVER STOP

Do not stop after one iteration. Keep evolving. The goal is the highest possible score.
Every push is a data point. Build on what works, discard what doesn't, and share insights
via `evolve memory add` so other agents benefit.

There is no finish line. Keep going.
