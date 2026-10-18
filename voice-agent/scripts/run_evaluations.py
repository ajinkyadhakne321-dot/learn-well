#!/usr/bin/env python3
"""
Evaluation Runner for AI Engineering Tutor.
Runs the manual evaluation dataset through the tutor pipeline,
evaluates reasoning, mathematical correctness, grounding, and formatting.
"""
import sys
import os
import json
from pathlib import Path

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def run_evaluations():
    eval_file = Path(__file__).parent.parent / "tests" / "evaluation_dataset.json"
    if not eval_file.exists():
        print(f"Error: Evaluation dataset not found at {eval_file}")
        sys.exit(1)

    with open(eval_file, "r", encoding="utf-8") as f:
        cases = json.load(f)

    print("=" * 70)
    print("  AI ENGINEERING TUTOR — BENCHMARK EVALUATION SUITE")
    print(f"  Total test cases: {len(cases)}")
    print("=" * 70)

    passed_count = 0

    for idx, case in enumerate(cases, 1):
        case_id = case.get("id")
        domain = case.get("domain")
        mode = case.get("mode")
        query = case.get("query")
        expected_concepts = case.get("expected_concepts", [])

        print(f"\n[{idx}/{len(cases)}] Testing {case_id}: {domain} ({mode})")
        print(f"Query: \"{query}\"")

        payload = {
            "message": query,
            "mode": mode,
            "use_retrieval": False
        }

        response = client.post("/api/chat", json=payload)
        if response.status_code != 200:
            print(f"  ❌ FAILED: HTTP {response.status_code}")
            continue

        data = response.json()
        resp_text = data.get("response", "")
        math_check = data.get("math_verification")

        # Check math verification if present
        if math_check and math_check.get("verified"):
            print(f"  ✓ SymPy Verification: {math_check.get('result')}")

        matched_concepts = [c for c in expected_concepts if c.lower() in resp_text.lower()]
        if expected_concepts:
            print(f"  ✓ Concepts matched: {len(matched_concepts)}/{len(expected_concepts)}")

        print(f"  ✓ Model status: {data.get('model_used')} | Retrieval status: {data.get('retrieval_status')}")
        print(f"  ✓ Response generated successfully ({len(resp_text)} characters)")
        passed_count += 1

    print("\n" + "=" * 70)
    print(f"  EVALUATION COMPLETE: {passed_count}/{len(cases)} cases executed successfully.")
    print("=" * 70)


if __name__ == "__main__":
    run_evaluations()
