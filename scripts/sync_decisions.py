"""
sync_decisions.py — reconciliation_decisions.json 보조 자동화 스크립트

기능:
  1. 현재 reconciliation_report.json 기준 candidate_group_id 목록 추출
  2. reconciliation_decisions.json 의 orphan decision 탐지 (report에 없는 group)
  3. 누락된 decision skeleton 탐지 (report에 있으나 decision=null 또는 decisions에 없음)
  4. --fix: orphan 제거 + 누락된 skeleton 추가 (기존 승인 decision 유지)

사용법:
  python scripts/sync_decisions.py \\
      --report data_pipeline/candidates/reconciliation_report.json \\
      --decisions data_pipeline/candidates/reconciliation_decisions.json

  # 자동 수정 (orphan 제거 + skeleton 추가, 기존 결정 유지):
  python scripts/sync_decisions.py \\
      --report data_pipeline/candidates/reconciliation_report.json \\
      --decisions data_pipeline/candidates/reconciliation_decisions.json \\
      --fix
"""

import argparse
import json
import sys
from pathlib import Path

VALID_DECISIONS = {
    "new_review_candidates":       ["approve_single_source_override", "pending_second_source", "reject"],
    "partial_match_needs_review":  ["confirm_same_product", "confirm_different_product", "pending"],
    "rejected_as_duplicate":       ["confirm_reject", "override_to_review"],
    "matched_existing_canonical":  ["confirm_increment", "pending"],
}


def load_json(path: str) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def main():
    parser = argparse.ArgumentParser(description="sync_decisions: decisions.json 상태 점검 및 보정")
    parser.add_argument("--report",    required=True, help="reconciliation_report.json 경로")
    parser.add_argument("--decisions", required=True, help="reconciliation_decisions.json 경로")
    parser.add_argument("--fix", action="store_true",
                        help="orphan 제거 + 누락 skeleton 추가 (기존 결정은 유지)")
    args = parser.parse_args()

    # ── 로드 ──────────────────────────────────────
    report    = load_json(args.report)
    decisions = load_json(args.decisions)

    report_candidates = report.get("candidates", report.get("results", []))
    decision_list     = decisions.get("decisions", [])

    # report 기준 index
    report_map = {c["candidate_group_id"]: c for c in report_candidates}
    # decisions 기준 index
    decision_map = {d["candidate_group_id"]: d for d in decision_list}

    # ── 분석 ──────────────────────────────────────
    orphans  = [gid for gid in decision_map if gid not in report_map]
    missing  = [gid for gid in report_map   if gid not in decision_map]
    null_dec = [gid for gid in decision_map if gid in report_map and decision_map[gid].get("decision") is None]

    print("=== sync_decisions 상태 리포트 ===")
    print(f"\n[report] {len(report_candidates)}건")
    for c in report_candidates:
        gid = c["candidate_group_id"]
        cls = c.get("reconciliation_classification", "?")
        dec = decision_map.get(gid, {}).get("decision", "(없음)")
        status = "OK" if dec and dec != "(없음)" else "NEEDS DECISION"
        print(f"  [{status}] {gid} | {cls} | decision={dec}")

    if orphans:
        print(f"\n[ORPHAN] decisions에 있으나 report에 없는 항목 ({len(orphans)}건):")
        for gid in orphans:
            print(f"  {gid}")
    else:
        print("\n[ORPHAN] 없음")

    if missing:
        print(f"\n[MISSING] report에 있으나 decisions에 없는 항목 ({len(missing)}건):")
        for gid in missing:
            print(f"  {gid}")
    else:
        print("\n[MISSING] 없음")

    if null_dec:
        print(f"\n[NULL DECISION] decision=null 인 항목 ({len(null_dec)}건):")
        for gid in null_dec:
            cls = report_map.get(gid, {}).get("reconciliation_classification", "?")
            opts = VALID_DECISIONS.get(cls, [])
            print(f"  {gid} | 분류={cls} | 선택 가능={opts}")
    else:
        print("\n[NULL DECISION] 없음")

    # ── 최종 요약 ─────────────────────────────────
    needs_action = len(orphans) + len(missing) + len(null_dec)
    if needs_action == 0:
        print("\n[통과] decisions.json 이 report 와 완전히 일치합니다. STEP5 진행 가능.")
    else:
        print(f"\n[주의] {needs_action}건 조치 필요. --fix 로 자동 보정하거나 직접 수정하세요.")

    # ── --fix: 자동 보정 ──────────────────────────
    if not args.fix:
        return

    if needs_action == 0:
        print("\n[fix] 변경 사항 없음.")
        return

    # orphan 제거
    new_decision_list = [d for d in decision_list if d["candidate_group_id"] not in orphans]
    if orphans:
        print(f"\n[fix] orphan {len(orphans)}건 제거: {orphans}")

    # 누락된 skeleton 추가
    existing_ids = {d["candidate_group_id"] for d in new_decision_list}
    for gid in missing:
        c   = report_map[gid]
        cls = c.get("reconciliation_classification", "new_review_candidates")
        opts = VALID_DECISIONS.get(cls, ["pending"])
        skeleton = {
            "candidate_group_id": gid,
            "reconciliation_classification": cls,
            "normalized_name": c.get("normalized_name", ""),
            "matched_canonical_id": c.get("matched_canonical_id"),
            "decision": None,
            "decision_options": opts,
            "context": f"[자동 생성 skeleton] 분류={cls}. 위 decision_options 중 하나를 선택하여 기입하세요.",
            "reviewer_note": "",
        }
        new_decision_list.append(skeleton)
        print(f"[fix] skeleton 추가: {gid} | 분류={cls} | 선택 가능={opts}")

    decisions["decisions"] = new_decision_list
    Path(args.decisions).write_text(
        json.dumps(decisions, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    print(f"\n[fix] {args.decisions} 업데이트 완료 ({len(new_decision_list)}건)")
    print("[fix] decision=null 항목은 직접 기입 필요 (자동 승인 금지)")


if __name__ == "__main__":
    main()
