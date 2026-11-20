# CareLoop AI 2.0 — 3-minute demo script and backup walkthrough

**Scope:** Future Health Digital Innovation Challenge / Closing the Screening-to-Care Loop.
**All people, places, reports and confirmations in the demo are fictional.**

## Narration and action cues (approximately 3 minutes)

| Time | Show | Say |
| --- | --- | --- |
| 0:00–0:20 | Overview → worklist | “A screening result matters only if the recommended next care step happens. CareLoop helps coordinators see not just who's overdue, but the practical barriers that stop the journey.” |
| 0:20–0:55 | CL-2401 → Care recovery plans | “This fictional patient has a referral awaiting action and a transportation barrier. Instead of only sending a reminder, the navigator starts a specific transport support plan with a named owner. We record a separate fictional confirmation before removing the gap.” |
| 0:55–1:25 | Patient companion | “The patient companion lets people acknowledge results, ask for callbacks or report a new barrier. Here's the Arabic/English experience. These replies are simulated for this prototype and require consent to record.” |
| 1:25–1:50 | Escalation center | “The rules engine identifies stalled handoffs and overdue follow-ups, routes them to the appropriate review queue and records auditable escalation events. Repeated runs won't create duplicate alerts.” |
| 1:50–2:20 | FHIR sandbox | “We can ingest a strictly synthetic FHIR report and clinician-selected follow-up plan. A duplicate is ignored; an amendment or cancellation is flagged for clinical review rather than silently changing the care pathway. This is not yet a live EHR connection.” |
| 2:20–2:45 | Impact metrics | “Our dashboard tracks recovery interventions, open gaps, staff-attested closures and subgroup data availability. These are transparent measurements on fictional cases, not claims of clinical efficacy.” |
| 2:45–3:00 | Overview + final slide | “CareLoop's differentiation is accountable recovery: identify, assist, hand off, verify and learn. Our pilot proposal tests whether this reduces missed follow-up under genuine clinical supervision.” |

## Before recording

1. Build the frontend on an internet-connected machine and run backend tests.
2. Switch to the clinician role, then open **Escalation center → Reset fictional demo**, type `RESET-SYNTHETIC-DEMO` and confirm. This **permanently clears local fictional edits**.
3. Switch back to coordinator and open CL-2401; the transport barrier is visible and unresolved.
4. Open a second browser tab at Patient companion and FHIR sandbox. Keep all browser tabs at the same local origin.
5. Prepare the synthetic FHIR sample from `examples/fhir-synthetic-bundle.json`.
6. Record screen and audio; do not show personal tabs, real messages or healthcare data.

## Backup demo if the browser build is unavailable

Run `python -m unittest discover -s tests -v` and show the API docs at `/docs` plus the API endpoints on a working local server. Demonstrate these requests with the same synthetic JSON; do not claim an interactive frontend succeeded if it did not.

## Presenter Q&A

**What is unique?** The auditable barrier-to-intervention-to-confirmation workflow, plus human-governed escalation and safe handling of amended reports.

**What does AI actually do?** The existing copilot can summarize state and produce reviewable administrative drafts, and an optional constrained model classifier chooses from predefined intents. Clinical priorities are explicitly assigned by clinicians. This prototype does not autonomously diagnose or triage.

**Does CareLoop message patients?** No. Patient replies, support and provider interactions are in-app simulations.

**How do you prove impact?** You cannot prove real impact from synthetic cases. We show deterministic workflow correctness now and propose a prospective, clinician-supervised pilot with predefined completion and safety metrics.
