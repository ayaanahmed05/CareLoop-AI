"""Safe synthetic patient communication, provider handoff, and escalation policy.
All actions are in-app simulations. Never sends messages or makes care decisions.
"""
from datetime import timedelta
from fastapi import HTTPException
from .workflow import check, now, stamp, gaps, moment
from .language import barrier_category

PREFS = {"sms", "email", "phone", "portal"}
LANGUAGES = {"en", "ar"}
RESPONSES = {"acknowledge", "report_barrier", "request_callback", "confirm_appointment"}


def patient_reply(c, data):
    """Synthetic reply injected by an authorized staff member to demo a patient view."""
    check(c["stage"] != 7, "Reopen the completed case before further action.")
    response = data["response"]
    check(response in RESPONSES, "Unsupported patient reply")
    check(data["language"] in LANGUAGES and data["channel"] in PREFS, "Choose a supported language and channel")
    check(data["consent"] is True, "Demo messaging consent must be explicitly recorded")
    note = data.get("note", "").strip()
    check(len(note) <= 160, "Reply note too long")
    if response == "report_barrier":
        check(4 <= len(note) <= 80, "Describe an access barrier in 4–80 characters")
        check(not any(b["label"].lower() == note.lower() and not b["resolved"] for b in c["barriers"]), "This barrier is already open")
        c["barriers"].append(dict(label=note, category=barrier_category(note), at=stamp(), resolved=False))
    elif response == "acknowledge":
        check(c["stage"] == 1, "Acknowledgement is only available after result notification")
        c["stage"] = 2
    elif response == "confirm_appointment":
        check(c["stage"] == 5 and bool(c["appointment"]), "An appointment must already exist")
    c["patient_preferences"] = dict(language=data["language"], channel=data["channel"], consent=True, consent_at=stamp())
    c.setdefault("patient_replies", []).append(dict(at=stamp(), response=response, note=note, simulated=True))
    c["events"].append(dict(at=stamp(), stage=2 if response == "acknowledge" else None,
                            label="Synthetic patient " + response.replace("_", " "), actor="Patient simulation", note=note or response))


def handoff_nudge(c, actor, note):
    check(c["stage"] == 4 and c["referral"] == "Sent", "No outstanding referral handoff")
    check(len(note.strip()) >= 5, "Record a follow-up note about the receiving provider")
    h = c.setdefault("handoff", {"provider":c["provider"], "sent_at":c["ref_at"], "status":"Pending", "nudges":[]})
    previous = h.get("nudges", [])
    if previous:
        check((now() - moment(previous[-1]["at"])) >= timedelta(hours=12), "Handoff nudge already recorded in the last 12 hours")
    h.setdefault("nudges", []).append(dict(at=stamp(), by=actor, note=note.strip()))
    c["events"].append(dict(at=stamp(), stage=None, label="Provider handoff follow-up simulated", actor=actor, note=note.strip()))


def escalation_queue(cases):
    result = []
    for c in cases:
        for g in gaps(c):
            if (g["review"] or g["days"] >= 2) and not g["escalated"]:
                result.append(dict(case_id=c["id"], patient=c["name"], gap=g["key"], title=g["title"],
                    owner=c.get("owner") or "Unassigned", days=g["days"], reason=g["reason"],
                    priority="Clinician review" if g["review"] or c["urgency"] == "Urgent" else "Care coordination"))
    return sorted(result, key=lambda r: (r["priority"] != "Clinician review", -r["days"],r["case_id"]))


def escalation_apply(c, keys):
    existing = set(c["escalations"])
    targets = {g["key"]:g for g in gaps(c)}
    updated = []
    for key in keys:
        if key in targets and key not in existing:
            c["escalations"].append(key)
            c["events"].append(dict(at=stamp(), stage=None, label="Policy escalation simulated", actor="CareLoop rules engine",
                        note=f"Gap {key} queued for {('clinician' if targets[key]['review'] else 'care coordinator')} review; no message sent."))
            updated.append(key)
    return updated
