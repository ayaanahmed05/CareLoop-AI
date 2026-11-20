# CareLoop AI 2.0 — Status and challenge-aligned upgrade plan

**Challenge:** Future Health Digital Innovation Challenge 2026 / Population Health / Closing the Screening-to-Care Loop. Official prototype deadline: **20 November 2026**, subject to the official portal's exact time. Official criteria: health impact and clinical relevance; technical depth; working demonstration; responsible AI and data governance; scalability; commercial path to pilot.

## Implemented in this delivered source (synthetic demo only)

1. **Care Recovery Engine:** barrier category detection; bounded transportation, interpreter, scheduling, cost and generic support interventions; administrative action and owner; staff confirmation required before marking resolved; audited progress and updated care gap.
2. **Interactive Patient Companion:** mobile-aware English/Arabic interface; language and communication-channel preference; consent checkbox; fictional acknowledgment, barrier report, callback request and appointment confirmation; audit logging; role restriction. A simulated patient response does not confirm medical completion.
3. **Provider Handoff + Escalation:** referral send, accept, reject, retry, pending-provider tracking; timed deduplicated handoff follow-up notes; calculated administrative/clinical escalation queue; preview and idempotent on-demand in-app escalation events.
4. **Synthetic FHIR Interoperability:** FHIR-like Patient, DiagnosticReport and Observation ingestion from a synthetic bundle; identifier/subject matching, stable case ID; exact content-hash deduplication; changed/amended/cancelled/entered-in-error reports flagged and workflow progression held for clinician review; illustrative Task, ServiceRequest, Appointment export.
5. **Transparent Impact Dashboard:** open gaps, staff-attested closure rate, barriers reported → intervention started → staff-confirmed resolved, referral handoffs, missed visits, participant language availability, measurement assumptions and audit-derived time-to-closure.
6. **Reproducible Demo:** clinician-only guarded database reseeding; 30 fictional longitudinal records; test suite and GitHub Actions CI template; architecture, safety, pilot and demo documentation.
7. **Original application retained:** React/TypeScript + FastAPI + SQLite; existing worklist, case pages, audit timeline, optional rule-constrained copilot, permissions, clinician-approved closure and optimistic version checking.

## Required safety caveats

- No real clinical diagnosis/urgency prediction, patient contact, referral scheduling, provider receipt confirmation or EHR integration.
- "Verified" in this demonstration means **staff-entered attestation only**, not independently verified treatment.
- FHIR mappings are limited, synthetic and not certified profiles. No genuine PHI should be provided.
- Demo role switching is **not** production authentication; additional SSO, row-level permissions, encryption, privacy policies, consent and external evidence validation are required.
- No background scheduler or real notification delivery. Escalations are computed and recorded only when invoked.
- Arabic strings are proof of localization concept, not professionally validated clinical instructions.
- Clinical benefit, fairness and commercial uptake remain hypotheses, not demonstrated results.

## Submission-critical next actions

1. Run `make setup`, `make test`, `make demo` on an internet-connected computer and conduct the manual UI smoke-test checklist.
2. Record the 3-minute narrated walkthrough in `docs/DEMO_SCRIPT.md`. Include visible actions, not screenshots of dummy buttons.
3. Prepare a screen capture, source link/ZIP, the technical docs, safety limitations and pilot plan. Verify the exact portal cutoff.
4. Do not use real patient records or claim that staff-entered fictional outcomes prove real health impact.

## Judges evidence index

| Dimension | Evidence |
| --- | --- |
| Clinical relevance | Patient narrative CL-2401 and realistic care-recovery support path |
| Technical depth | Working versioned REST API, SQLite transactions, FHIR adapter, stateful logic and tests |
| Demonstration | Patient companion, intervention recovery, escalation, amended FHIR review and impact page |
| Responsible AI | Clinician-owned priority, review-required report changes, draft approval and audit boundaries |
| Scalability | Illustrative FHIR design and documented move to managed DB, job queue and secure identity |
| Business / pilot | Single-clinic prospective evaluation in `docs/PILOT_AND_EVALUATION.md` |

See `README.md`, `docs/FEATURE_ACCEPTANCE.md`, `docs/SUBMISSION_CHECKLIST.md`, `docs/ARCHITECTURE_AND_SAFETY.md` and `docs/DEMO_SCRIPT.md` for full details.
