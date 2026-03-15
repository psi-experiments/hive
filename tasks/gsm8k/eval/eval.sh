#!/bin/bash
# Run from the task root. Prints accuracy as final stdout line.
cd "$(dirname "$0")/.."
python eval/eval.py
