from datetime import timedelta
from .settings import OWNERS, STAGES
from .workflow import now

NAMES = "Elena Martinez|James Okafor|Olivia Bennett|Daniel Kim|Amira Hassan|Noah Williams|Priya Shah|Lucas Martin|Sofia Rossi|Ethan Clarke|Grace Lin|Mateo Garcia|Zara Ali|Liam Fraser|Ruby Patel|Samuel Brooks|Isla Campbell|Adam Singh|Chloe Morgan|Leo Anderson|Eva Laurent|Omar Khalil|Mia Turner|Henry Wilson|Aya Tanaka|Oscar Young|Leila Haddad|Arthur Lewis|Nora Reed|Ava Scott".split(
    "|"
)
SCREENINGS = [
    (
        "Colorectal screening",
        "Screening finding flagged for review",
        "Complete the clinician-requested gastroenterology visit",
        "Gastroenterology",
    ),
    (
        "Retinal screening",
        "Images flagged for clinician review",
        "Attend the requested eye clinic review",
        "Ophthalmology",
    ),
    (
        "Breast screening",
        "Additional assessment requested",
        "Complete the recommended imaging visit",
        "Breast imaging",
    ),
    (
        "Blood pressure screening",
        "Repeat assessment requested",
        "Attend the planned primary care assessment",
        "Primary care",
    ),
    (
        "Cervical screening",
        "Further review requested",
        "Complete the assigned specialist consultation",
        "Women's health",
    ),
]


def records():
    for i, name in enumerate(NAMES):
        s = [
            4,
            1,
            5,
            3,
            2,
            4,
            0,
            6,
            5,
            1,
            4,
            2,
            3,
            5,
            4,
            1,
            2,
            0,
            6,
            4,
            5,
            3,
            4,
            1,
            7,
            7,
            7,
            7,
            7,
            7,
        ][i]
        screen, outcome, requirement, provider = SCREENINGS[i % 5]
        elapsed = 2 + (i * 3) % 11 if s != 7 else 1 + (i - 24) * 5
        base = now() - timedelta(days=s + elapsed, hours=2 + i % 6)
        when = lambda j: (base + timedelta(days=j)).isoformat()
        owner = OWNERS[i % 3] if i != 6 else ""
        events = [
            dict(
                at=when(j),
                stage=j,
                label=STAGES[j],
                actor=OWNERS[2] if j in (0, 3, 7) else owner or OWNERS[0],
                note=[
                    "Clinician reviewed the screening report.",
                    "Result shared by phone.",
                    "Patient confirmed receipt.",
                    "Next step reviewed with clinician.",
                    f"Referral sent to {provider}.",
                    "Visit booked with receiving provider.",
                    "Visit report received.",
                    "Clinician reviewed the completion record.",
                ][j],
            )
            for j in range(s + 1)
        ]
        ref = "Not sent" if s < 4 else "Sent" if s == 4 and i % 3 != 1 else "Accepted"
        if i == 14:
            ref = "Rejected"
        if ref in ("Accepted", "Rejected"):
            events.append(
                dict(
                    at=when(4.3),
                    stage=None,
                    label="Referral " + ref.lower(),
                    actor=owner,
                    note=provider,
                )
            )
        if i == 8:
            events.append(
                dict(
                    at=when(5.1),
                    stage=None,
                    label="Appointment missed",
                    actor=owner,
                    note="Receiving office confirmed a missed visit.",
                )
            )
        barriers = []
        if i in (0, 4, 9, 11, 15, 17, 19):
            label = ["Transportation", "Language", "Scheduling", "Cost"][i % 4]
            barriers.append(dict(label=label, at=when(s + 0.1), resolved=False))
            events.append(
                dict(
                    at=when(s + 0.1),
                    stage=None,
                    label="Patient reported barrier",
                    actor=owner or OWNERS[0],
                    note=label,
                )
            )
        drafts = []
        if i in (1, 11):
            drafts.append(
                dict(
                    id=f"draft-{i}",
                    text=f"Hello {name.split()[0]}, your care team would like to confirm your next step. Please contact us if you need help arranging your visit.",
                    approved=False,
                )
            )
            events.append(
                dict(
                    at=when(s + 0.2),
                    stage=None,
                    label="Copilot draft requested",
                    actor=owner,
                    note="Patient-friendly follow-up message prepared for clinician review.",
                )
            )
        yield dict(
            id=f"CL-{2401+i}",
            name=name,
            screening=screen,
            outcome=outcome,
            requirement=requirement,
            urgency=(
                "Urgent" if i in (0, 14) else "Priority" if i % 3 == 1 else "Routine"
            ),
            owner=owner,
            stage=s,
            created=when(0),
            due=(
                now()
                + timedelta(days=(-3 - i % 4 if i in (0, 1, 5, 14, 19) else 2 + i % 8))
            ).isoformat(),
            referral=ref,
            ref_at=when(4) if s >= 4 else "",
            provider=provider if s >= 4 else "",
            appointment=(
                (
                    (now() + timedelta(days=2 + i % 5)).isoformat()
                    if s == 5 and i != 8
                    else when(5)
                )
                if s >= 5
                else ""
            ),
            missed=i == 8,
            evidence=f"Visit report VR-{730+i}" if s >= 6 else "",
            version=1,
            barriers=barriers,
            events=sorted(events, key=lambda e: e["at"]),
            escalations=[],
            chat=[],
            drafts=drafts,
        )
