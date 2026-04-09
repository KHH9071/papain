# run_production_seed.ps1
# Papain — 운영 canonical seed 파이프라인 자동화
#
# 실행 예시:
#   .\scripts\run_production_seed.ps1                  # 전체 실행 (STEP1~8)
#   .\scripts\run_production_seed.ps1 -StartFromApply  # STEP5(apply)부터 재시작
#   .\scripts\run_production_seed.ps1 -DryRunOnly      # dry-run 확인만 (seed 없음)
#
# 사람 개입이 필요한 단계:
#   STEP4: decisions.json 확인 및 수정 → 스크립트가 중단하고 안내
#   STEP7: 실제 seed → 명시적 'y' 입력 필요
#   STEP8: baseline 승격 → 명시적 'y' 입력 필요

param(
    [switch]$StartFromApply,  # STEP5(apply)부터 시작 (decisions 수정 후 재시작 시)
    [switch]$DryRunOnly        # STEP6(dry-run)까지만 실행, 실제 seed 없음
)

$ErrorActionPreference = "Stop"
Set-Location "C:\Users\khh90\Desktop\CODE\papain"

$PYTHON  = "C:\Users\khh90\Desktop\CODE\papain\.venv\Scripts\python.exe"
$CAND    = "data_pipeline/candidates"
$INPUT   = "data_pipeline/input_sources"

function Write-Step { param($n, $msg) Write-Host "`n=== STEP $n : $msg ===" -ForegroundColor Cyan }
function Write-Ok   { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "[!!] $msg" -ForegroundColor Yellow }
function Confirm-Continue {
    param($prompt)
    $ans = Read-Host "$prompt [y/N]"
    if ($ans -ne 'y') {
        Write-Host "중단됨." -ForegroundColor Red
        exit 1
    }
}

# ──────────────────────────────────────────────
# STEP 1: map_to_canonical x3
# ──────────────────────────────────────────────
if (-not $StartFromApply) {
    Write-Step 1 "map_to_canonical.py — 3개 example 파일 → canonical_candidates.json"

    & $PYTHON data_pipeline/map_to_canonical.py `
        --input "$INPUT/second_source_kendamil_example.json" `
        --output "$CAND/canonical_candidates.json"
    if ($LASTEXITCODE -ne 0) { Write-Error "Kendamil map 실패"; exit 1 }

    & $PYTHON data_pipeline/map_to_canonical.py `
        --input "$INPUT/second_source_hipp_example.json" `
        --output "$CAND/canonical_candidates.json" `
        --append
    if ($LASTEXITCODE -ne 0) { Write-Error "HiPP map 실패"; exit 1 }

    & $PYTHON data_pipeline/map_to_canonical.py `
        --input "$INPUT/second_source_aptamil_example.json" `
        --output "$CAND/canonical_candidates.json" `
        --append
    if ($LASTEXITCODE -ne 0) { Write-Error "Aptamil map 실패"; exit 1 }

    Write-Ok "canonical_candidates.json 생성 완료"

    # ──────────────────────────────────────────
    # STEP 2: dedupe_candidates.py
    # ──────────────────────────────────────────
    Write-Step 2 "dedupe_candidates.py — canonical_candidates.json → deduped_candidates.json"

    & $PYTHON data_pipeline/dedupe_candidates.py `
        --input "$CAND/canonical_candidates.json" `
        --output "$CAND/deduped_candidates.json"
    if ($LASTEXITCODE -ne 0) { Write-Error "dedupe 실패"; exit 1 }

    Write-Ok "deduped_candidates.json 생성 완료"

    # ──────────────────────────────────────────
    # STEP 3: reconcile_with_existing_canonical.py
    # ──────────────────────────────────────────
    Write-Step 3 "reconcile_with_existing_canonical.py → reconciliation_report.json"

    & $PYTHON data_pipeline/reconcile_with_existing_canonical.py `
        --new-candidates "$CAND/deduped_candidates.json" `
        --existing "$CAND/approved_canonical.json" `
        --output "$CAND/reconciliation_report.json"
    if ($LASTEXITCODE -ne 0) { Write-Error "reconcile 실패"; exit 1 }

    Write-Ok "reconciliation_report.json 생성 완료"

    # ──────────────────────────────────────────
    # STEP 4: decisions.json 상태 확인 후 중단
    # ──────────────────────────────────────────
    Write-Step 4 "decisions.json 상태 확인 (사람 개입 필요)"

    Write-Host "`n[현재 report 기준 candidate 목록]" -ForegroundColor White
    & $PYTHON scripts/sync_decisions.py --report "$CAND/reconciliation_report.json" `
                                         --decisions "$CAND/reconciliation_decisions.json"

    Write-Warn "decisions.json 을 확인하고 필요 시 수정하세요."
    Write-Warn "  sync_decisions.py 출력에서 pending/null 항목을 직접 기입하세요."
    Write-Warn "  선택 가능한 decision: approve_single_source_override / pending_second_source / reject"
    Write-Warn ""
    Write-Warn "수정이 완료되면 아래 명령으로 STEP5부터 재시작하세요:"
    Write-Warn "  .\scripts\run_production_seed.ps1 -StartFromApply"
    Write-Host ""
    exit 0
}

# ──────────────────────────────────────────────
# STEP 5: apply_reconciliation_decisions.py
# ──────────────────────────────────────────────
Write-Step 5 "apply_reconciliation_decisions.py → approved_canonical.next.json"

& $PYTHON data_pipeline/apply_reconciliation_decisions.py `
    --decisions "$CAND/reconciliation_decisions.json" `
    --report    "$CAND/reconciliation_report.json" `
    --approved  "$CAND/approved_canonical.json" `
    --deduped   "$CAND/deduped_candidates.json" `
    --output-dir "$CAND"
if ($LASTEXITCODE -ne 0) { Write-Error "apply 실패"; exit 1 }

Write-Ok "approved_canonical.next.json 생성 완료"

# ──────────────────────────────────────────────
# STEP 6: dry-run + 체크포인트 출력
# ──────────────────────────────────────────────
Write-Step 6 "dry-run 및 체크포인트 확인"

& $PYTHON data_pipeline/seed_canonical_to_supabase.py `
    --input "$CAND/approved_canonical.next.json" `
    --dry-run
if ($LASTEXITCODE -ne 0) { Write-Error "dry-run 실패"; exit 1 }

Write-Host "`n[approved_canonical.next.json 체크포인트]" -ForegroundColor White
$nextData = Get-Content "$CAND/approved_canonical.next.json" -Encoding UTF8 -Raw | ConvertFrom-Json
$nextRecs = $nextData.records
$newIds   = @(
    'formula_group_kendamil_classic_uk_s1_powder_800g',
    'formula_group_kendamil_classic_uk_s2_powder_800g',
    'formula_group_kendamil_classic_uk_s3_powder_800g',
    'formula_group_kendamil_organic_uk_s1_powder_800g',
    'formula_group_kendamil_organic_uk_s2_powder_800g',
    'formula_group_kendamil_organic_uk_s3_powder_800g',
    'formula_group_hipp_bio_combiotik_de_s2_powder_600g',
    'formula_group_hipp_bio_combiotik_de_s3_powder_600g',
    'formula_group_aptamil_aptamil_uk_s3_powder_800g'
)
Write-Host ("총 " + $nextRecs.Count + "건")
$ckOk = $true
foreach ($r in $nextRecs) {
    $prodId = [string]$r.canonical_product_id
    $grade  = [string]$r.evidence_grade
    $recall = [string]$r.recall_status
    $approv = [string]$r.requires_human_approval
    $url    = [string]$r.evidence_source_1_url
    $flag   = if ($newIds -contains $prodId) { ' <-- NEW' } else { '' }
    Write-Host ("  " + $prodId + $flag)
    Write-Host ("    evidence_grade          = " + $grade)
    Write-Host ("    recall_status           = " + $recall)
    Write-Host ("    requires_human_approval = " + $approv)
    Write-Host ("    evidence_source_1_url   = " + $url)
    if ($newIds -contains $prodId) {
        if (-not $grade -or $grade -eq '' -or $grade -eq 'Unverified') { Write-Host "    [FAIL] evidence_grade invalid or missing"; $ckOk = $false }
        if (-not $url -or $url -eq '') { Write-Host "    [FAIL] evidence_source_1_url missing"; $ckOk = $false }
        if ($approv -ne 'False') { Write-Host "    [FAIL] requires_human_approval != False"; $ckOk = $false }
    }
    Write-Host ""
}
if ($ckOk) { Write-Host ("[체크 통과] 신규 " + $newIds.Count + "건 필드 정상") -ForegroundColor Green }
else        { Write-Host "[체크 실패] 위 항목 확인 필요" -ForegroundColor Red }

if ($DryRunOnly) {
    Write-Ok "DryRunOnly 모드: 여기서 종료. seed는 실행되지 않았습니다."
    exit 0
}

# ──────────────────────────────────────────────
# STEP 7: 실제 seed (명시적 확인 필요)
# ──────────────────────────────────────────────
Write-Step 7 "실제 Supabase seed"
Write-Warn "위 dry-run 출력과 체크포인트를 확인하세요."
Confirm-Continue "체크포인트 통과 확인 완료. 실제 seed를 실행하시겠습니까?"

& $PYTHON data_pipeline/seed_canonical_to_supabase.py `
    --input "$CAND/approved_canonical.next.json"
if ($LASTEXITCODE -ne 0) { Write-Error "seed 실패"; exit 1 }

Write-Ok "Supabase seed 완료"
Write-Warn ("Supabase Dashboard에서 신규 " + $newIds.Count + "건 반영을 직접 확인하세요:")
Write-Host "  SELECT canonical_product_id, evidence_grade, recall_status, requires_human_approval"
Write-Host "  FROM canonical_product"
Write-Host "  WHERE canonical_product_id IN ("
foreach ($nid in $newIds) { Write-Host ("    '" + $nid + "',") }
Write-Host "  );"
Write-Host ""

# ──────────────────────────────────────────────
# STEP 8: baseline 백업 + 승격 (명시적 확인 필요)
# ──────────────────────────────────────────────
Write-Step 8 "approved_canonical.json baseline 백업 및 승격"
Write-Warn "Supabase 반영을 확인한 후 baseline을 업데이트합니다."
Confirm-Continue "Supabase 반영 확인 완료. baseline을 업데이트하시겠습니까?"

$TS     = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP = "$CAND/approved_canonical.backup.$TS.json"
Copy-Item "$CAND/approved_canonical.json" $BACKUP
Write-Ok "백업 완료: $BACKUP"

Copy-Item "$CAND/approved_canonical.next.json" "$CAND/approved_canonical.json"
Write-Ok "승격 완료: approved_canonical.json 업데이트됨"

Write-Host "`n[baseline 무결성 확인]" -ForegroundColor White
$baseData  = Get-Content "$CAND/approved_canonical.json" -Encoding UTF8 -Raw | ConvertFrom-Json
$baseRecs  = $baseData.records
$targetIds = $newIds
$found = $baseRecs | Where-Object { $targetIds -contains $_.canonical_product_id } |
         ForEach-Object { $_.canonical_product_id }
Write-Host ("총 레코드 수: " + $baseRecs.Count)
Write-Host ("신규 " + $newIds.Count + "건 포함: " + ($found -join ', '))
if ($found.Count -lt $newIds.Count) {
    Write-Host "[WARN] 일부 신규 ID 가 baseline 에서 누락됨" -ForegroundColor Yellow
}

Write-Host ""
Write-Ok "=== 운영 seed 사이클 완료 ==="
Write-Host "  백업: $BACKUP"
Write-Host "  baseline: $CAND/approved_canonical.json"
