# CareLoop AI

**From screening to follow-up — no patient falls through the cracks.**

A local-first, full-stack care coordination demo for the Future Health Digital Innovation Challenge. The workspace opens with 30 fictional patient journeys at different stages. Every worklist, alert, and chart uses the SQLite records that staff update on case pages.

## Run locally

Use Python 3.11+ and Node 22.13+. From the repository root:

```sh
make setup
make demo
```

Open **http://127.0.0.1:8000**. FastAPI serves the built React app and the REST API on the same origin. The first startup seeds the database. Changes persist in `backend/careloop.sqlite3`. Set `CARELOOP_DB` to a new file path for a separate demo. No API key is needed.

For development, run `make api` and `make web` in separate terminals, then open the URL printed by Vite. The development server proxies `/api` to port 8000. `make build` type-checks and bundles the frontend. `make test` runs workflow integration tests against a temporary database.

Alternatively, `docker compose up --build` serves the complete app at **http://127.0.0.1:8000** and persists SQLite in the `careloop_data` volume.

## Five-minute walkthrough

1. **Find a blocked journey.** In Overview, open Elena Martinez (CL-2401). Her gastroenterology referral awaits acceptance, her follow-up target has passed, and she has reported a transportation barrier. Compare the case record with the dashboard's overdue and barrier queues.
2. **Coordinate a handoff.** Ask the copilot which referral blocks progress. Escalate an open gap, record the receiving office's acceptance, and schedule a visit. Resolve the transportation barrier once the fictional patient confirms travel assistance. Check the audit tab after each action.
3. **Review communication.** Ask the copilot to draft a patient message. Use the initials menu in the top right to switch from coordinator to clinician and approve it. Approval records the review locally. The demo does not send the message.
4. **Verify closure.** Open Lucas Martin (CL-2408), an evidence-ready case. Inspect the visit report, choose **Verify and close case**, and record a verification note. Return to Overview and Analytics to see the changed totals. For the full pathway, record a completed care action with its evidence reference when completion is confirmed.
5. **Start a new journey.** In the clinician role, open Patient worklist and choose **Register screening**. Enter the reviewed outcome, follow-up target, urgency, and owner. Switch to Viewer to inspect the read-only experience.

## Architecture

| Component | Responsibility |
| --- | --- |
| `frontend/src/` | React, TypeScript and Vite workspace with React Router, TanStack Query, Tailwind, shadcn-style Button, Lucide icons, Framer Motion and Recharts. A native chart renderer supports builds in offline environments where Recharts is unavailable. |
| `backend/main.py` | FastAPI and Pydantic routes, demo role sessions, SQLAlchemy transactions and optimistic version checks. SQLite stores each case with its related events, barriers, messages, appointments and evidence. Conflicting edits return HTTP 409. |
| `backend/workflow.py` | Permitted transitions, role checks, closure conditions, audit events and time-based care-gap rules. Clinicians can approve a direct testing pathway, reroute a rejected referral or reopen a closed case. |
| `backend/copilot.py`, `backend/language.py` | Optional language classification, record-grounded summaries and reviewable patient communications. Model output can select only predefined administrative intents or barrier categories. |
| `backend/seed.py` | Linked fictional records with dates relative to first startup. Startup preserves existing edits. |
| `tests/` | Integration tests covering the complete care journey, permissions, stale writes, closure gates and invalid model output. |

Explore the REST API at **/docs**. Key endpoints are `/api/session`, `/api/cases`, `/api/cases/{id}/actions`, and `/api/cases/{id}/copilot`. Case edits require the latest record version. A successful action writes the state change and the audit entry together. Open alerts are recalculated from the new state.

## Configuration and AI behavior

Copy `backend/.env.example` to `backend/.env` to customize the acknowledgement, referral acceptance and scheduling targets. Values are **demo administrative targets in days**. Clinical urgency and the requested follow-up date come from the clinician.

To enable compatible API classification, set `LLM_API_KEY`, `LLM_BASE_URL` and `LLM_MODEL` on the backend. Questions are sent with the recorded stage, referral status and rule identifiers. Barrier categorization sends the entered barrier description. The model cannot write to case records. Server code uses the selected intent to construct replies from the case, keeping facts and suggestions separate. Unknown classifications, provider errors and missing keys use deterministic logic. Generated drafts require clinician approval. The UI never receives an API key.

The overview counts active cases separately from verified closures. The verified closure rate is the number of currently closed cases divided by all screened cases. Queue counts can overlap. Analytics uses dated journey events for stage durations and weekly completion counts.

## Demo boundaries

Use fictional data only. The role picker simulates assigned demo identities. Sessions live in memory and reset on server restart. The application stores evidence references and staff attestations locally. Real identity verification, secure document uploads, independent verification of provider records, EHR integration, outbound communication and background notification delivery would require additional implementation before clinical deployment.
