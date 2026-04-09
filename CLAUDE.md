# Papain Product Data Rules

## Mission
Build a high-coverage, high-trust product catalog for infant formula, milk, and cheese that Korean parents can realistically explore and purchase.

## Scope
Current scope is product data infrastructure, not recommendation logic.
Focus on catalog coverage, normalization, deduplication, review queues, and controlled approval.

## Priority Order
1. Formula
2. Milk
3. Cheese

## Non-negotiables
- Never treat a channel listing as the canonical product.
- Never auto-approve low-confidence mappings.
- Treat country_version, stage, form, and package size as first-class attributes.
- Do not overwrite canonical records without evidence from at least 2 sources or explicit human approval.
- Safety/compliance conflicts must be escalated, not resolved silently.

## Core Entities
- canonical_product
- offer_listing
- raw_candidate
- review_queue_item
- source_registry

## Source Priority
1. Official brand catalog
2. Public regulatory/import source
3. Major commerce listing
4. Secondary commerce listing

## Review Triggers
- unknown country_version
- unknown stage
- specialty formula or allergy-related claims
- conflicting ingredient or product claims
- source_count < 2
- official catalog and commerce listing mismatch

## Working Style
- Prefer conservative classification over overconfident guessing.
- If evidence is weak, mark needs_human_review.
- Keep formula taxonomy stable before expanding milk and cheese.
- Optimize for traceability, not speed.

## Reference Document Priority
When documents conflict, use this order:

1. **Current codebase** — actual files under `src/` and `data_pipeline/` are ground truth.
2. **Recent data expansion docs** — `docs/product_data_expansion_strategy_v2.md` and `docs/formula_canonical_taxonomy_v1.md` govern current expansion work.
3. **`plan.md` (root)** — historical reference only. Not authoritative for current implementation or workflow. If it conflicts with the codebase or recent docs, disregard it.

## Expected Outputs
When planning or implementing, prefer these outputs:
- explicit file-by-file changes
- clear data model fields
- parser scope and exclusions
- validation rules
- review queue logic
- risk log and rollback logic
