from datetime import date, datetime, time, timezone
import uuid
import json
import secrets
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, text
from .settings import DATABASE, ROOT, OWNERS
from .seed import records
from .workflow import gaps, action, check, stamp
from .copilot import respond

engine = create_engine(
    "sqlite:///" + DATABASE, connect_args={"check_same_thread": False, "timeout": 10}
)
ACCOUNTS = {"coordinator": OWNERS[0], "clinician": OWNERS[2], "viewer": "Taylor Moore"}
sessions = {}


@asynccontextmanager
async def lifespan(app):
    with engine.begin() as con:
        con.exec_driver_sql(
            "CREATE TABLE IF NOT EXISTS cases(id TEXT PRIMARY KEY, version INTEGER NOT NULL, data TEXT NOT NULL)"
        )
        for c in records():
            con.execute(
                text("INSERT OR IGNORE INTO cases VALUES (:id,1,:data)"),
                dict(id=c["id"], data=json.dumps(c)),
            )
    yield


app = FastAPI(title="CareLoop AI", lifespan=lifespan)


class Login(BaseModel):
    role: str


class Action(BaseModel):
    kind: str
    value: str = Field(default="", max_length=2000)
    version: int


class Question(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    version: int


def account(req):
    role = sessions.get(req.cookies.get("careloop_session"))
    check(role, "Open a demo session first.", 401)
    return role


@app.get("/api/session")
def session(req: Request, response: Response):
    role = sessions.get(req.cookies.get("careloop_session"))
    if not role:
        return login(Login(role="coordinator"), response)
    return dict(role=role, name=ACCOUNTS[role])


@app.post("/api/session")
def login(data: Login, response: Response):
    check(data.role in ACCOUNTS, "Unknown demo account.")
    token = secrets.token_urlsafe(32)
    sessions[token] = data.role
    response.set_cookie("careloop_session", token, httponly=True, samesite="strict")
    return dict(role=data.role, name=ACCOUNTS[data.role])


def present(c):
    return {**c, "gaps": gaps(c)}


def load(id):
    with engine.connect() as con:
        data = con.execute(
            text("SELECT data FROM cases WHERE id=:id"), {"id": id}
        ).scalar()
    if not data:
        raise HTTPException(404, "Case not found.")
    return json.loads(data)


def save(c, version):
    c["version"] = version + 1
    with engine.begin() as con:
        changed = con.execute(
            text(
                "UPDATE cases SET version=:v,data=:data WHERE id=:id AND version=:old"
            ),
            dict(v=version + 1, data=json.dumps(c), id=c["id"], old=version),
        )
        check(
            changed.rowcount == 1,
            "Another user updated this record. Refresh and try again.",
            409,
        )
    return present(c)


@app.get("/api/cases")
def listing(req: Request):
    account(req)
    with engine.connect() as con:
        return [
            present(json.loads(row))
            for row in con.execute(text("SELECT data FROM cases ORDER BY id")).scalars()
        ]


class Intake(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    screening: str = Field(min_length=1, max_length=500)
    outcome: str = Field(min_length=1, max_length=500)
    requirement: str = Field(min_length=1, max_length=500)
    screened: date
    target: date
    urgency: str
    owner: str


@app.post("/api/cases", status_code=201)
def register(data: Intake, req: Request):
    check(
        account(req) == "clinician",
        "A clinician must register the screening plan.",
        403,
    )
    check(
        data.owner in [*OWNERS, ""]
        and data.urgency in ("Routine", "Priority", "Urgent"),
        "Invalid care owner or priority.",
    )
    check(
        data.screened <= datetime.now(timezone.utc).date()
        and data.target >= data.screened,
        "Check screening and target dates.",
    )
    fields = {
        k: getattr(data, k).strip()
        for k in ("name", "screening", "outcome", "requirement")
    }
    check(all(fields.values()), "Complete all screening details.")
    created = datetime.combine(data.screened, time.min, timezone.utc).isoformat()
    due = datetime.combine(data.target, time.min, timezone.utc).isoformat()
    c = dict(
        **fields,
        id="CL-" + uuid.uuid4().hex[:10].upper(),
        created=created,
        due=due,
        urgency=data.urgency,
        owner=data.owner,
        stage=0,
        referral="Not sent",
        provider="",
        ref_at="",
        appointment="",
        missed=False,
        evidence="",
        version=1,
        barriers=[],
        escalations=[],
        drafts=[],
        chat=[],
        events=[
            dict(
                at=created,
                stage=0,
                label="Screening result",
                actor=ACCOUNTS["clinician"],
                note=fields["outcome"],
            ),
            dict(
                at=stamp(),
                stage=None,
                label="Screening registered",
                actor=ACCOUNTS["clinician"],
                note=fields["requirement"],
            ),
        ]
    )
    with engine.begin() as con:
        con.execute(
            text("INSERT INTO cases VALUES (:id,1,:data)"),
            dict(id=c["id"], data=json.dumps(c)),
        )
    return present(c)


@app.get("/api/cases/{id}")
def detail(id: str, req: Request):
    account(req)
    return present(load(id))


@app.post("/api/cases/{id}/actions")
def update(id: str, data: Action, req: Request):
    role = account(req)
    c = load(id)
    check(c["version"] == data.version, "Record changed. Refresh and try again.", 409)
    action(c, data.kind, data.value.strip(), role, ACCOUNTS[role])
    return save(c, data.version)


@app.post("/api/cases/{id}/copilot")
def ask(id: str, data: Question, req: Request):
    role = account(req)
    check(role != "viewer", "Read-only session.", 403)
    c = load(id)
    check(c["version"] == data.version, "Record changed. Refresh and try again.", 409)
    check(bool(data.question.strip()), "Enter a question.")
    answer = respond(c, data.question.strip())
    c["events"].append(
        dict(
            at=stamp(),
            stage=None,
            label="Copilot draft requested" if answer["draft"] else "Copilot consulted",
            actor=ACCOUNTS[role],
            note=data.question.strip(),
        )
    )
    return save(c, data.version)


dist = ROOT / "frontend/dist"
if dist.is_dir():
    app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{path:path}")
    def spa(path: str):
        if path.startswith("api/"):
            raise HTTPException(404)
        return FileResponse(dist / "index.html")
