You are in PLAN MODE only.

Your task is to analyze the current Papain repository and produce an integration plan for the staged product-data expansion materials located in:

`_staging_papain_data_expansion/`

## Objective
Integrate a new product-data expansion system for formula, milk, and cheese into the existing Papain codebase safely and incrementally.

## Important context
This is NOT a greenfield project.
This repository already contains:
- a Next.js 14 App Router app
- existing frontend routes: `/`, `/search`, `/record`
- existing product-related logic in `src/lib/`
- an existing Python-based `data_pipeline/`
- an existing `.claude/settings.json`

The staging folder contains draft/reference files only.
Do NOT treat those files as final production placement.
Do NOT execute changes.
Do NOT modify files.
Do NOT generate code patches yet.

## What you must inspect
Please inspect at minimum:
- repository root structure
- `_staging_papain_data_expansion/`
- existing `.claude/settings.json`
- `data_pipeline/`
- `src/lib/types.ts`
- `src/lib/metadata_seed.ts`
- `src/lib/routine_foods.ts`
- `src/app/_components/SearchClient.tsx`
- any other files that are clearly relevant

## What you must produce
Produce a concrete integration plan with these sections:

### 1. Current-state understanding
Summarize how the current Papain project is structured and where the product/data expansion work should attach.

### 2. Staging-file placement plan
For each file in `_staging_papain_data_expansion/`, propose:
- whether it should be moved, merged, split, or discarded
- final target path
- reason for that path
- whether it is temporary, permanent, or partially merged

### 3. Claude configuration merge plan
Propose how to handle:
- `CLAUDE.md.draft`
- `settings.json.draft`
- `agents/*.md`

Specifically:
- compare them conceptually against current `.claude/settings.json`
- identify conflicts or overlaps
- recommend merge strategy
- do not assume overwrite is acceptable

### 4. Data-pipeline integration plan
Explain how the new product-data expansion system should connect to:
- `fetch_raw.py`
- `fetch_curated.py`
- `enrich_curated.py`
- `refine_data.py`
- `seed_supabase.py`
- `seed_curated_to_supabase.py`

Clarify:
- what should remain unchanged
- what new files/modules are likely needed
- whether a canonical taxonomy layer should exist inside `data_pipeline/`
- whether source registry should be consumed directly or transformed first

### 5. App-layer integration plan
Explain how the new data model may affect:
- `src/lib/types.ts`
- `src/lib/metadata_seed.ts`
- `src/lib/routine_foods.ts`
- `src/app/_components/SearchClient.tsx`

Focus on:
- schema implications
- metadata seed implications
- search/filter implications
- what should be deferred until later

### 6. Recommended final folder structure
Provide a proposed final folder/file structure after integration.
Keep it realistic and incremental.
Do NOT redesign the whole repository unnecessarily.

### 7. Implementation phases
Break the work into phases:
- Phase 1: safe preparation
- Phase 2: canonical taxonomy + source registry integration
- Phase 3: pipeline extension
- Phase 4: frontend/search alignment
- Phase 5: Claude agent workflow integration

For each phase, include:
- objective
- exact target files/folders
- key risks
- completion criteria

### 8. Blockers and decisions requiring human review
List anything that should NOT be auto-decided, especially:
- settings merge risk
- unclear schema ownership
- uncertain Supabase coupling
- canonical vs offer/listing separation
- formula stage/country_version ambiguity

## Output style requirements
- Be concrete, not generic
- Reference actual file paths
- Prefer incremental integration over large refactor
- Assume the current codebase must keep working
- Do not produce implementation code
- Do not apply changes
