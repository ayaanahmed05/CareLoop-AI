# Clinical pilot and evaluation proposal

## Problem and buyer

CareLoop aims to reduce missed follow-up after actionable screening results. Candidate customer: a screening program, health-system population health team or integrated care network. Primary users: care coordinators and clinical staff; patients are the eventual beneficiaries. The chosen use case should be agreed with a clinical partner, not assumed from a synthetic record.

## Phased roadmap

**Phase 0 — synthetic prototype (this repository):** 30 fictional journeys, workflow gates, barrier-resolution plans, simulated patient and provider responses, demonstrable FHIR shapes, administrative analytics and audit history. No clinical impact claims.

**Phase 1 — clinical design:** One partner clinic and one pathway (e.g. clinician-approved follow-up after an abnormal colorectal screening). Co-design with clinicians and patient representatives. Approve language, safe escalation thresholds, referral definitions and exact outcome evidence.

**Phase 2 — secure integration:** Real SSO/roles, sandbox FHIR testing with consent and provenance, accessibility tests, retention rules, no PHI in prototype environments, delivery receipts and provider confirmations. Validate changed/cancelled result workflows and error recovery.

**Phase 3 — authorized pilot:** Appropriate approvals and consents; record baseline and intervention periods; report uncertainty, adverse events, subgroup equity and staff workload. Only claim observed effects after appropriate analysis and clinical signoff.

## Outcomes and definitions

**Primary metric:** fraction of all actionable, clinician-confirmed screening results in the defined eligible cohort with independently confirmed required follow-up within a clinically specified interval. Define and report exclusions, censored cases, reopened cases, transfers and external completions.

**Supporting operational metrics:** referral acceptance and time to acceptance; patient contact/acknowledgment; missed-visit rescheduling; time to next action; percentage of reported access barriers assigned a support intervention; navigator time per case; queue escalations and response time.

**Safety metrics:** erroneous report mapping, false closure, incorrect priority assignment, failed escalation, duplicate external messages, inappropriate recommendations, escalation to clinical oversight, data access and consent incidents.

**Equity assessment:** stratify using self-reported, consented variables such as language and region where lawful and sample sizes are sufficient; avoid inferred protected traits and disclose subgroup limitations.

## Evaluation design

- Pre-register primary and safety metrics, observation window and statistical approach with clinical investigators.
- Use baseline care-coordination process as comparator; a stepped-wedge or randomized operational evaluation may be appropriate if ethically and operationally acceptable.
- Ensure clinician-defined pathway and follow-up urgency remain unchanged by administrative AI.
- Quantify missing data and use sensitivity analyses. Do not interpret staff attestations as externally verified attendance.
- Report pilot results transparently, including neutral or adverse results.

## Deployment / commercial hypothesis

An institution might pay a subscription or per-clinic deployment fee for navigator workflow management, support services and interoperability. This is an **untested business hypothesis**, not confirmed demand. Pilot success requires demonstrable coordinator adoption, acceptable security and integration effort, measurable care benefits, accessible patient interactions, and procurement/clinical approval.
