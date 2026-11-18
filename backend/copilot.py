"""The optional LLM selects a bounded intent. All rendered statements come from records."""

import uuid
from .language import classify
from .workflow import gaps
from .settings import STAGES


def intent(q):
    q = q.lower()
    groups = [
        (
            "clinical",
            ("diagnos", "medication", "treatment", "dose", "prescri", "interpret"),
        ),
        ("draft", ("draft", "message", "explain")),
        ("barrier", ("barrier", "access")),
        ("handoff", ("handoff", "referral")),
        ("summary", ("summary", "summar", "journey")),
        ("tasks", ("task", "outstanding", "follow-up", "why", "blocked", "waiting")),
    ]
    return next((k for k, words in groups if any(w in q for w in words)), "other")


def respond(c, q):
    topic = intent(q)
    source = "Deterministic assistant"
    gs = gaps(c)
    if (
        topic == "other"
        and c["chat"]
        and q.strip().lower()
        in {"tell me more", "what next?", "what next", "and then?"}
    ):
        topic = "tasks"
    if topic != "clinical":
        topic, used_model = classify(
            f"Recorded stage: {STAGES[c['stage']]}. Referral: {c['referral']}. "
            f"Open rule flags: {', '.join(g['key'].split(':')[0] for g in gs)}. Question: {q}",
            ["draft", "barrier", "handoff", "summary", "tasks", "clinical", "other"],
            topic,
            "Classify this question. Medical interpretation and prescribing are clinical.",
        )
        if used_model:
            source = "AI-assisted · record-grounded"
    facts = [
        f'{c["id"]} · {STAGES[c["stage"]]}. Responsible owner: {c["owner"] or "unassigned"}.'
    ]
    suggestions = []
    draft = ""
    if topic == "clinical":
        suggestions = [
            "Ask the responsible clinician to interpret the result or review clinical urgency."
        ]
    elif topic == "other":
        suggestions = [
            "Ask about this case’s barriers, handoff, outstanding tasks, or communication draft."
        ]
    elif topic == "draft":
        if c["stage"] == 7:
            facts += ["Closure has been verified."]
        else:
            plan = c["requirement"].strip().rstrip(".")
            message = [
                f"Hello {c['name'].split()[0]}, your care team's follow-up plan is recorded below.",
                plan + ".",
            ]
            if c["stage"] == 4 and c["referral"] == "Sent":
                message.append(
                    f"We sent your referral to {c['provider']} and are waiting for their confirmation."
                )
            elif c["stage"] == 4 and c["referral"] == "Accepted":
                message.append(
                    f"{c['provider']} accepted your referral. A visit time has yet to be recorded."
                )
            elif c["stage"] == 5 and c["appointment"] and not c["missed"]:
                message.append(f"Your record lists a visit on {c['appointment'][:10]}.")
            elif c["stage"] == 6:
                message = [
                    f"Hello {c['name'].split()[0]}, your care team received documentation of your follow-up."
                ]
            if any(not b["resolved"] for b in c["barriers"]):
                message.append(
                    "You told us about a difficulty getting care. Please let us know what help would work for you."
                )
            else:
                message.append(
                    "Please contact your care team if you have questions or need help arranging care."
                )
            draft = " ".join(message)
            c["drafts"].append(dict(id=uuid.uuid4().hex, text=draft, approved=False))
            suggestions = ["A clinician should review this draft before sharing it."]
    elif topic == "handoff":
        facts += [
            f'Referral status: {c["referral"]}. Receiving provider: {c["provider"] or "none recorded"}.'
        ]
        suggestions = [
            g["next"] for g in gs if g["key"] in ("accept", "schedule", "reject")
        ]
    elif topic == "barrier":
        facts += [
            b["label"] + " · " + ("resolved" if b["resolved"] else "open")
            for b in c["barriers"]
        ] or ["No patient-reported barriers recorded."]
        suggestions = [g["next"] for g in gs if g["key"].startswith("barrier:")][:1]
    else:
        if topic == "summary":
            facts += [
                f'{e["at"][:10]} · {e["label"]}'
                for e in c["events"]
                if e["stage"] is not None
            ][-8:]
        facts += [g["reason"] for g in gs] or ["No active rule-based gaps."]
        suggestions = [g["next"] for g in gs] or (
            []
            if c["stage"] == 7
            else ["Review the documented next step with the case owner."]
        )
    result = dict(
        question=q, facts=facts, suggestions=suggestions, draft=draft, source=source
    )
    c["chat"].append(result)
    return result
