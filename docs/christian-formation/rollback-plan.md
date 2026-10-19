# Christian Formation Rollback Plan

## Fast rollback

1. Disable `formation_completion_enabled`, `formation_content_admin_enabled`, `formation_analytics_enabled`, and, if needed, `formation_circuits_enabled` through the existing feature-flag environment/adapter.
2. Redeploy the last known-good frontend artifact or revert the release commit.
3. Keep additive database tables in place. Do not drop them during an incident; preserving user records is safer than destructive schema rollback.
4. Stop content publication and formation analytics ingestion while investigating.

## Data-safe database rollback

- RPCs and policies can be replaced with a corrective forward migration.
- Never remove circuit, completion, reflection, proof, content-version, or review rows as part of an emergency rollback.
- Before any later schema removal, export row counts and owner/content-version references, take a Supabase backup, and verify restore.
- If a publication is incorrect, publish a corrected immutable version or withdraw visibility with a forward migration; retain the historical version referenced by prior records.

## Incident-specific actions

| Incident | Immediate action |
| --- | --- |
| Sensitive analytics payload | Disable formation analytics flag, revoke ingestion key if necessary, identify/delete affected events under retention policy |
| Cross-user data access | Disable formation routes, revoke affected RPC/table grants in a forward migration, rotate proof signed URLs, notify privacy owner |
| Incorrect theological/historical content | Unpublish/withdraw the version, preserve audit history, require independent re-review |
| False completion claim | Disable completion flag, preserve records for investigation, correct through server authority—never rewrite silently |
| Upload abuse | Disable proof UI/bucket writes, retain audit metadata, tighten policy/validation before re-enable |

## Verification after rollback

- Legacy Dashboard, book progress, proof archive, reflections, and existing routes still load.
- Formation routes redirect safely when flags are disabled.
- No database row was deleted or historical content reference rewritten.
- Monitoring, support note, owner, timeline, and re-enable criteria are documented.


## Sabbath rules v2 rollback

Before any production migration, obtain JB's explicit authorization. To stop new v2 starts after an authorized release, a database administrator/service role sets `formation_rule_rollouts.sabbath_new_attempts_enabled = false`. Deploy the previous start UI if needed; legacy v1 starts remain available. Do not rewrite or downgrade existing v2 attempts, change their locked weekday, delete canonical days, remove required content gates or alter closeout. Continue serving pinned v2 attempts until terminal. Any correction ships as a reviewed forward-only migration; do not drop the new column/functions while v2 history exists. No remote operation is included in PR-C.
