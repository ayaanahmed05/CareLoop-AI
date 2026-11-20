"""Auditable, bounded non-clinical care-barrier interventions for the demo.

Recommendations are operational suggestions, not medical treatment or real service bookings.
"""
import json
from fastapi import HTTPException

INTERVENTIONS = {
    "Transportation": (
        "Coordinate a patient-approved transport option",
        "Offer a clinician-approved remote visit if suitable",
    ),
    "Language": (
        "Arrange a qualified interpreter for the next contact",
        "Provide clinician-reviewed instructions in the preferred language",
    ),
    "Scheduling": (
        "Request an alternative appointment time from the clinic",
        "Arrange care navigator callback to identify availability",
    ),
    "Cost": (
        "Refer to a financial-access or social-work navigator",
        "Check approved coverage and assistance resources",
    ),
    "Other": (
        "Arrange a care navigator call to identify support needs",
        "Escalate the access barrier to the care coordination team",
    ),
}


def category(barrier):
    explicit = barrier.get("category")
    if explicit in INTERVENTIONS:
        return explicit
    label = barrier.get("label", "").lower()
    if any(w in label for w in ("ride", "transport", "travel", "bus")):
        return "Transportation"
    if any(w in label for w in ("language", "interpreter", "translation")):
        return "Language"
    if any(w in label for w in ("schedule", "hours", "time off", "work")):
        return "Scheduling"
    if any(w in label for w in ("cost", "insurance", "afford", "finance")):
        return "Cost"
    return "Other"


def recommended(barrier):
    return INTERVENTIONS[category(barrier)][0]


def parse_payload(value, keys):
    try:
        obj = json.loads(value)
    except (ValueError, TypeError):
        raise HTTPException(422, "Provide the structured support details.")
    if not isinstance(obj, dict) or not all(
        isinstance(obj.get(k), str) and obj[k].strip() for k in keys
    ):
        raise HTTPException(422, "The support request is missing required details.")
    return {k: obj[k].strip() for k in keys}


def open_barrier(case, label):
    b = next(
        (b for b in case["barriers"] if b["label"] == label and not b["resolved"]),
        None,
    )
    if b is None:
        raise HTTPException(422, "No open barrier matches this request.")
    return b


def start_support(case, value, actor, at):
    data = parse_payload(value, ["label", "intervention"])
    b = open_barrier(case, data["label"])
    if b.get("support"):
        raise HTTPException(422, "Support is already in progress for this barrier.")
    if data["intervention"] not in INTERVENTIONS[category(b)]:
        raise HTTPException(422, "Choose an approved administrative support action.")
    b["support"] = dict(
        intervention=data["intervention"], owner=actor, started=at,
        status="In progress", verified_at="", verification="",
    )
    return f'{data["label"]}: {data["intervention"]}'


def verify_support(case, value, actor, at):
    data = parse_payload(value, ["label", "verification"])
    b = open_barrier(case, data["label"])
    support = b.get("support")
    if not support or support["status"] != "In progress":
        raise HTTPException(422, "Start an actual support intervention before verification.")
    if len(data["verification"]) < 12:
        raise HTTPException(422, "Record concrete patient or provider confirmation (12+ characters).")
    b["resolved"] = True
    support.update(status="Verified", verified_at=at, verification=data["verification"], verified_by=actor)
    return f'{data["label"]}: {data["verification"]}'
