// Mock unified diffs keyed by run ID (diff from parent)
export const mockDiffs: Record<string, string> = {
  "b2c3d4e": `diff --git a/agent.py b/agent.py
index 1a2b3c4..5d6e7f8 100644
--- a/agent.py
+++ b/agent.py
@@ -1,12 +1,35 @@
 import openai
+from examples import FEW_SHOT_EXAMPLES

 def solve(problem: str) -> str:
-    response = openai.chat.completions.create(
-        model="gpt-4",
-        messages=[
-            {"role": "system", "content": "Solve this math problem step by step."},
-            {"role": "user", "content": problem},
-        ],
-    )
-    answer = response.choices[0].message.content
-    return extract_answer(answer)
+    examples = select_examples(problem, k=8)
+    messages = build_few_shot_prompt(examples, problem)
+    response = openai.chat.completions.create(
+        model="gpt-4",
+        messages=messages,
+    )
+    answer = response.choices[0].message.content
+    return extract_answer(answer)
+
+
+def select_examples(problem: str, k: int = 8) -> list[dict]:
+    """Select k most relevant few-shot examples."""
+    return FEW_SHOT_EXAMPLES[:k]
+
+
+def build_few_shot_prompt(examples: list[dict], problem: str) -> list[dict]:
+    messages = [
+        {"role": "system", "content": "Solve math problems step by step. Follow the format shown in examples."},
+    ]
+    for ex in examples:
+        messages.append({"role": "user", "content": ex["question"]})
+        messages.append({"role": "assistant", "content": ex["solution"]})
+    messages.append({"role": "user", "content": problem})
+    return messages`,

  "d4e5f6g": `diff --git a/agent.py b/agent.py
index 5d6e7f8..9a0b1c2 100644
--- a/agent.py
+++ b/agent.py
@@ -8,6 +8,7 @@ def solve(problem: str) -> str:
         messages=messages,
     )
     answer = response.choices[0].message.content
+    answer = self_verify(problem, answer)
     return extract_answer(answer)


@@ -18,3 +19,22 @@ def build_few_shot_prompt(examples: list[dict], problem: str) -> list[dict]:
     for ex in examples:
         messages.append({"role": "user", "content": ex["question"]})
         messages.append({"role": "assistant", "content": ex["solution"]})
+
+
+def self_verify(problem: str, solution: str) -> str:
+    """Ask the model to verify its own solution."""
+    response = openai.chat.completions.create(
+        model="gpt-4",
+        messages=[
+            {"role": "system", "content": "Check this math solution for errors. If correct, repeat the final answer. If wrong, solve it correctly."},
+            {"role": "user", "content": f"Problem: {problem}\\n\\nSolution: {solution}"},
+        ],
+    )
+    verified = response.choices[0].message.content
+    return verified`,

  "f6g7h8i": `diff --git a/agent.py b/agent.py
index 9a0b1c2..3d4e5f6 100644
--- a/agent.py
+++ b/agent.py
@@ -1,5 +1,6 @@
 import openai
+import re
 from examples import FEW_SHOT_EXAMPLES


@@ -40,5 +41,12 @@ def self_verify(problem: str, solution: str) -> str:

 def extract_answer(text: str) -> str:
-    # Extract the final numerical answer
-    lines = text.strip().split("\\n")
-    return lines[-1].strip()
+    """Extract final numerical answer, handling $, %, commas."""
+    patterns = [
+        r"(?:the answer is|final answer)[:\\s]*\\$?([\\d,]+\\.?\\d*)",
+        r"\\\\boxed\\{([^}]+)\\}",
+        r"(?:=\\s*)\\$?([\\d,]+\\.?\\d*)\\s*$",
+    ]
+    for pattern in patterns:
+        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
+        if match:
+            return match.group(1).replace(",", "")
+    return text.strip().split("\\n")[-1].strip()`,

  "k1l2m3n": `diff --git a/agent.py b/agent.py
index 7g8h9i0..1j2k3l4 100644
--- a/agent.py
+++ b/agent.py
@@ -1,8 +1,12 @@
 import openai
 import re
+from classifier import classify_problem
 from examples import FEW_SHOT_EXAMPLES
-from sympy_solver import symbolic_fallback
+from strategies import cot_solve, decompose_solve, symbolic_solve


 def solve(problem: str) -> str:
-    examples = select_examples(problem, k=8)
-    messages = build_few_shot_prompt(examples, problem)
+    strategy = classify_problem(problem)
+    if strategy == "symbolic":
+        return symbolic_solve(problem)
+    elif strategy == "decompose":
+        return decompose_solve(problem)
+    examples = select_examples(problem, k=8)
+    messages = build_few_shot_prompt(examples, problem)
     response = openai.chat.completions.create(
@@ -12,3 +16,20 @@ def solve(problem: str) -> str:
     answer = self_verify(problem, answer)
     return extract_answer(answer)
+
+
+def classify_problem(problem: str) -> str:
+    """Route problem to best strategy based on type."""
+    response = openai.chat.completions.create(
+        model="gpt-4",
+        messages=[
+            {"role": "system", "content": "Classify this math problem as one of: arithmetic, algebra, decompose. Reply with just the category."},
+            {"role": "user", "content": problem},
+        ],
+    )
+    category = response.choices[0].message.content.strip().lower()
+    if category == "algebra":
+        return "symbolic"
+    elif category == "decompose":
+        return "decompose"
+    return "cot"`,
};
