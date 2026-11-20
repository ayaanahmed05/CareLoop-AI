# CareLoop AI 2.0 — Submission pitch

**Track:** Population Health — Closing the Screening-to-Care Loop
**Project:** CareLoop AI 2.0
**Tagline:** From screening to supported care — no patient falls through the cracks.

## 170-word solution summary

An actionable screening result should lead to appropriate follow-up. Yet the journey can stall between referral, scheduling and attendance, especially when patients encounter transportation, language, timing or financial barriers.

**CareLoop AI 2.0** is a human-governed care recovery workspace that connects follow-up tracking with a specific, accountable intervention. Staff can see stalled journeys, start bounded support plans, record patient-reported needs, manage receiving-provider handoffs, and escalate unresolved care gaps. A simulated English/Arabic patient companion supports acknowledgment, requests for help and communication preferences. A synthetic FHIR sandbox demonstrates how diagnostic reports might enter the workflow while changed or cancelled reports require clinician review. Transparent metrics monitor operational progress and distinguish staff-attested actions from independently confirmed care.

The working prototype uses React, TypeScript, FastAPI and SQLite with 30 fictional patients, audited workflows, versioned case writes and integration tests. It does not diagnose, transmit real patient communications or connect to a hospital. A proposed pilot with a clinical partner would evaluate independently confirmed follow-up completion, time to care, safety, workload and equity.

## Differentiation

**Not another reminder app.** CareLoop turns a missed follow-up into a specific support action with an owner, escalation pathway and record of what changed.

## Technical innovation

- Safe, role-bounded, intervention-to-attestation care-recovery state machine.
- Rule-based escalation queue with idempotent audited simulation.
- Synthetic FHIR report import with changed-content hash detection and clinician review hold.
- Embedded English/Arabic fictional patient response journey.
- Descriptive, auditable impact indicators with explicit evidence limitations.

## Why this matters

The eventual goal is a measurable reduction in missed follow-up, not simply more reminders. The prototype demonstrates the workflow; only an authorized clinical pilot could establish outcomes.
