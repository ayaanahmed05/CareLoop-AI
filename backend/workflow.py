from datetime import datetime, timezone
from fastapi import HTTPException
from .language import barrier_category
from .settings import ACK_DAYS, REFERRAL_DAYS, SCHEDULE_DAYS, OWNERS, STAGES


def now():
    return datetime.now(timezone.utc)


def stamp():
    return now().isoformat()


def moment(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


def age(value):
    return max(0, (now() - moment(value)).days)


def gaps(c):
    if c["stage"] == 7:
        return []
    result = []

    def flag(key, title, reason, next_step, since, review=False):
        result.append(
            dict(
                key=key,
                title=title,
                reason=reason,
                next=next_step,
                days=age(since),
                review=review,
                escalated=key in c["escalations"],
            )
        )

    stage = c["stage"]
    since = next(
        (e["at"] for e in reversed(c["events"]) if e["stage"] == stage), c["created"]
    )
    if not c["owner"]:
        flag(
            "owner",
            "Owner needed",
            "No coordinator is assigned.",
            "Assign a responsible coordinator.",
            since,
            True,
        )
    if c["urgency"] == "Urgent":
        flag(
            "urgent",
            "Clinician review",
            "A clinician assigned urgent priority.",
            "Arrange clinician review of the next action.",
            since,
            True,
        )
    if now().date() > moment(c["due"]).date() and stage < 6:
        flag(
            "overdue",
            "Follow-up overdue",
            "The recorded follow-up target has passed.",
            "Confirm the next action with the owner.",
            c["due"],
            True,
        )
    if stage < 2 and age(since) >= ACK_DAYS:
        flag(
            "ack",
            "Acknowledgement pending",
            f"No acknowledgement within the {ACK_DAYS}-day demo target.",
            "Contact the patient and record their response.",
            since,
        )
    ref = c["referral"]
    if ref == "Sent" and age(since) >= REFERRAL_DAYS:
        flag(
            "accept",
            "Handoff pending",
            f"The receiving provider has not accepted within {REFERRAL_DAYS} days.",
            "Contact the receiving office.",
            since,
        )
    if ref == "Rejected":
        flag(
            "reject",
            "Referral rejected",
            "The receiving provider declined the referral.",
            "Review the rejection and arrange another handoff.",
            since,
            True,
        )
    if ref == "Accepted" and stage == 4 and age(c["ref_at"]) >= SCHEDULE_DAYS:
        flag(
            "schedule",
            "Scheduling stalled",
            "An accepted referral has no booked appointment within the demo target.",
            "Coordinate a booking with the receiving provider.",
            c["ref_at"],
        )
    if stage == 5 and (c["missed"] or moment(c["appointment"]) < now()):
        flag(
            "visit",
            "Visit needs follow-up",
            "Attendance or completion is unconfirmed.",
            "Confirm attendance or reschedule.",
            c["appointment"],
            True,
        )
    for b in c["barriers"]:
        if not b["resolved"]:
            flag(
                "barrier:" + b["label"],
                b["label"] + " barrier",
                "The patient reported an unresolved access barrier.",
                "Coordinate assistance and confirm resolution.",
                b["at"],
            )
    if (
        stage >= 5
        and not c["evidence"]
        and c["appointment"]
        and moment(c["appointment"]) <= now()
        and not c["missed"]
    ):
        flag(
            "evidence",
            "Evidence pending",
            "Completion evidence has not been recorded.",
            "Request a visit report or completion reference.",
            since,
        )
    return result


def check(ok, msg, status=422):
    if not ok:
        raise HTTPException(status, msg)


def action(c, kind, value, role, actor):
    check(role in ("coordinator", "clinician"), "Read-only session.", 403)
    if kind in ("urgency", "close", "skip_referral", "approve", "discard", "reopen"):
        check(role == "clinician", "A clinician must perform this action.", 403)
    s = c["stage"]
    check(s != 7 or kind == "reopen", "Reopen this closed case before making changes.")
    at = stamp()
    dest = None
    label = ""
    if kind == "assign":
        check(value in OWNERS, "Choose a listed care team member.")
        c["owner"] = value
        label = "Owner assigned"
    elif kind == "urgency":
        check(value in ("Routine", "Priority", "Urgent"), "Unknown priority.")
        c["urgency"] = value
        label = "Clinical priority updated"
    elif kind in ("notify", "acknowledge", "consult"):
        src = {"notify": 0, "acknowledge": 1, "consult": 2}[kind]
        check(s == src, "This step is unavailable at the current stage.")
        dest = src + 1
        label = STAGES[dest]
    elif kind == "refer":
        check(
            (s == 3 or (s == 4 and c["referral"] == "Rejected")) and value,
            "Enter the receiving provider after consultation.",
        )
        dest = 4
        c.update(referral="Sent", provider=value, ref_at=at)
        label = "Referral sent"
    elif kind in ("accept", "reject"):
        check(s == 4 and c["referral"] == "Sent", "A sent referral is required.")
        check(kind == "accept" or value, "Record the rejection reason.")
        c.update(referral="Accepted" if kind == "accept" else "Rejected", ref_at=at)
        label = "Referral " + c["referral"].lower()
    elif kind == "skip_referral":
        check(
            s == 3 and value,
            "Document the clinician-approved pathway after consultation.",
        )
        c.update(referral="Direct testing", ref_at=at)
        dest = 4
        label = "Direct testing pathway approved"
    elif kind == "schedule":
        check(
            s in (4, 5) and c["referral"] in ("Accepted", "Direct testing"),
            "Confirm the handoff or approve direct testing first.",
        )
        try:
            date = moment(value)
        except (ValueError, TypeError):
            raise HTTPException(422, "Enter a valid appointment date and time.")
        check(date > now(), "Choose a future appointment.")
        c.update(appointment=date.isoformat(), missed=False)
        dest = 5
        label = "Appointment scheduled"
    elif kind == "miss":
        check(
            s == 5 and not c["missed"] and moment(c["appointment"]) <= now(),
            "Only a past appointment can be marked missed.",
        )
        c["missed"] = True
        label = "Appointment missed"
    elif kind == "complete":
        check(
            s == 5 and not c["missed"] and len(value) >= 5,
            "Record a completed care action with a report or evidence reference.",
        )
        c["evidence"] = value
        dest = 6
        label = "Care completion documented"
    elif kind == "close":
        check(
            s == 6
            and c["owner"]
            and c["evidence"]
            and not any(not b["resolved"] for b in c["barriers"])
            and not any(
                not d["approved"] and not d.get("discarded") for d in c["drafts"]
            )
            and value,
            "Closure requires an owner, evidence, resolved barriers, reviewed drafts, and a verification note.",
        )
        dest = 7
        label = "Closure verified"
    elif kind == "reopen":
        check(s == 7 and value, "Document the reason to reopen.")
        dest = 3
        c.update(
            referral="Not sent", provider="", appointment="", evidence="", missed=False
        )
        label = "Case reopened for consultation"
    elif kind == "barrier":
        check(
            value
            and len(value) <= 80
            and not any(
                b["label"] == value and not b["resolved"] for b in c["barriers"]
            ),
            "Provide a distinct barrier (up to 80 characters).",
        )
        c["barriers"].append(
            dict(label=value, category=barrier_category(value), at=at, resolved=False)
        )
        label = "Patient reported barrier"
    elif kind == "resolve_barrier":
        b = next(
            (b for b in c["barriers"] if b["label"] == value and not b["resolved"]),
            None,
        )
        check(b, "No open barrier matches.")
        b["resolved"] = True
        label = "Barrier resolution confirmed"
    elif kind == "escalate":
        check(
            any(g["key"] == value and not g["escalated"] for g in gaps(c)),
            "Select an open, un-escalated gap.",
        )
        c["escalations"].append(value)
        label = "Escalated for clinician review"
    elif kind in ("approve", "discard"):
        d = next(
            (
                d
                for d in c["drafts"]
                if d["id"] == value and not d["approved"] and not d.get("discarded")
            ),
            None,
        )
        check(d, "Select a pending draft.")
        d["approved"] = kind == "approve"
        d["discarded"] = kind == "discard"
        label = (
            "Communication draft approved"
            if kind == "approve"
            else "Communication draft discarded"
        )
    elif kind == "note":
        check(value, "Enter a note.")
        label = "Coordination note"
    else:
        raise HTTPException(422, "Unknown workflow action.")
    if dest is not None:
        c["stage"] = dest
    c["events"].append(dict(at=at, stage=dest, label=label, actor=actor, note=value))
    live = {g["key"] for g in gaps(c)}
    c["escalations"] = [k for k in c["escalations"] if k in live]
