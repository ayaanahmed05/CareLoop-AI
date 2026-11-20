# Submission checklist — Future Health Digital Innovation Challenge 2026

**Official site:** https://hack2skill.com/event/futurehealthchallenge/
**Publicly listed prototype due date:** November 20, 2026. Confirm the exact portal close time and team eligibility in your registration account.

## What to submit

- [ ] Complete source ZIP or accessible repository with this README.
- [ ] Working public or locally runnable prototype and link/steps for judges; no real patient data.
- [ ] 2–3 minute recorded demo and backup static screenshots.
- [ ] Technical architecture, API table and data/provenance boundaries.
- [ ] Explicit assumptions and known limitations.
- [ ] Demonstration instructions and synthetic FHIR fixture.
- [ ] Evidence of backend tests, frontend build and manual browser smoke test.
- [ ] One-page pilot/business plan with outcome definitions, not invented outcome percentages.
- [ ] Make sure all names and screenshots are fictional; do not disclose private health data or secrets.

## Judging evidence matrix

| Judging dimension | Evidence in CareLoop 2.0 | Honest qualification |
| --- | --- | --- |
| Health impact / clinical relevance | Recovery story with late referral, transportation barrier and follow-up; pilot primary metric | Prototype impact unproven |
| Technical depth / architecture | FastAPI + SQLite, optimistic transactions, roles, audit, safe patient replies, FHIR input hash, idempotent escalations | No distributed deployment |
| Working solution / demo quality | Five interactive v2 workflows plus existing case management; demo script; ten backend tests | Frontend build and interactive demo require local verification |
| Responsible AI / safety / governance | Rule-bounded copilot, clinician authority, safe report amendments, synthetic records, no transmissions | Not clinical software; no validated patient identity |
| Scalability / deployment readiness | Interoperability mapping, Docker build and CI template, plan to move to managed storage and queue | EHR and notification integrations not live |
| Commercial viability / path to pilot | Single-clinic pathway, buyer hypothesis, outcome and rollout plan | Business hypothesis has not been validated |

## Reviewer demonstration acceptance

- [ ] Reset demo and verify exactly 30 fictional cases.
- [ ] Start and verify a transport support plan; see audit event and updated gap.
- [ ] Patient companion can record consented simulated reply, with English and Arabic available.
- [ ] Viewer cannot submit a patient reply or run an escalation.
- [ ] Escalation preview is non-mutating; first record run creates events; second creates zero duplicates.
- [ ] FHIR import creates one case; identical repeat returns duplicate; amended/cancelled version needs clinician review.
- [ ] Impact page labels its closure evidence staff-attested and dataset synthetic.
- [ ] Browser layout works on desktop and mobile; buttons, navigation and errors tested.
- [ ] Notes explicitly say no actual diagnosis, messaging, bookings or patient privacy certification.
