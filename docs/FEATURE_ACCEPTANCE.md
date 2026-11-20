# Feature acceptance and test coverage — v2.0

| Capability | Core acceptance case | Automated verification |
| --- | --- | --- |
| Barrier recovery | Cannot resolve until an approved intervention starts and a 12+ character confirmation is recorded | `test_barrier_support_proof_and_permissions` |
| Patient companion | Opt-in simulated acknowledgement moves notified case to acknowledged, user can report a new barrier, viewer is denied | `test_patient_reply_consent_permissions_and_barrier` |
| Handoff | Staff can log provider follow-up with 12-hour dedup; referral acceptance updates handoff status | `test_handoff_nudge_and_escalation_idempotency` |
| Escalation | Preview has no side effects; record creates audited entries; rerun is idempotent | `test_handoff_nudge_and_escalation_idempotency` |
| FHIR intake | Only demo IDs and fictitious name accepted; identical import deduplicated; amended report forces clinician review | `test_fhir_synthetic_dedup_amendment_review_export` |
| FHIR cancellations | Cancelled diagnostic report triggers review, not automatic clinical conclusion | `test_fhir_cancelled_report_requires_review` |
| Impact | Metrics derive from stored cases and show synthetic-data disclaimer | `test_operational_metrics_are_explicitly_synthetic` |
| Reset | Viewer denied, invalid token rejected, clinician reset restores 30 sample records | `test_demo_reset_is_explicit_and_role_limited` |
| Clinician workflow and review | Stages, closure gates, evidence refs, optimistic version conflicts, draft approval and clinical boundaries | `tests/test_workflow.py` |

## Not implemented; must never claim otherwise

- Real phone/SMS/email delivery or two-way messaging to authenticated patients.
- Real hospital EHR connection or validated external FHIR interoperability.
- Independent provider proof of appointment attendance or clinical treatment.
- Production authentication/authorization, encryption/data residency, secure PHI processing, consent governance, and clinical regulatory approval.
- Background scheduler and reliable external escalation alerting.
- Prospective outcomes evidence, certified translation, performance trials or commercial pilot contracts.

## Manual smoke tests to complete on development machine

1. Run `make setup`, `make test` and `make demo`.
2. Browse all eight main navigation routes, and check responsive layout at 390px and 1440px.
3. Switch coordinator, clinician and viewer roles; ensure server returns 403 for restricted writes.
4. Open Patient companion and test English and Arabic simulated responses, including an error without consent.
5. Run FHIR example twice and an amended version; review in clinician case page.
6. Preview and record escalations; check updated case audit events.
7. Check Impact metrics change after case closure or support verification.
8. Reset fictional demo and confirm data are restored.
