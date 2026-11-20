import os
import json
import tempfile
import unittest
from datetime import timedelta
from pathlib import Path
from unittest.mock import patch

demo = tempfile.TemporaryDirectory()
os.environ["CARELOOP_DB"] = str(Path(demo.name) / "test.sqlite3")
os.environ["LLM_API_KEY"] = ""

from fastapi.testclient import TestClient
from backend.main import app
from backend.workflow import now


class CareLoopTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.client.__enter__()
        self.role("clinician")

    def tearDown(self):
        self.client.__exit__(None, None, None)

    def role(self, role):
        self.assertEqual(
            self.client.post("/api/session", json={"role": role}).status_code, 200
        )

    def intake(self):
        today = now().date().isoformat()
        res = self.client.post(
            "/api/cases",
            json=dict(
                name="Demo Patient",
                screening="Fictional screening",
                outcome="Clinician review requested",
                requirement="Attend the review visit",
                screened=today,
                target=today,
                urgency="Priority",
                owner="Maya Chen",
            ),
        )
        self.assertEqual(res.status_code, 201, res.text)
        self.case = res.json()

    def act(self, kind, value="", expected=200):
        res = self.client.post(
            "/api/cases/" + self.case["id"] + "/actions",
            json=dict(kind=kind, value=value, version=self.case["version"]),
        )
        self.assertEqual(res.status_code, expected, res.text)
        if expected == 200:
            self.case = res.json()

    def ask(self, question):
        res = self.client.post(
            "/api/cases/" + self.case["id"] + "/copilot",
            json=dict(question=question, version=self.case["version"]),
        )
        self.assertEqual(res.status_code, 200, res.text)
        self.case = res.json()
        return self.case["chat"][-1]

    def test_full_journey_and_approval(self):
        self.intake()
        self.role("coordinator")
        self.act("barrier", "I need a ride to the clinic")
        self.assertEqual(self.case["barriers"][0]["category"], "Transportation")
        self.act("escalate", "barrier:I need a ride to the clinic")
        self.assertTrue(self.case["gaps"][0]["escalated"])
        self.act("notify", "Called patient")
        self.act("acknowledge", "Confirmed by phone")
        self.act("consult", "Care team reviewed plan")
        self.act("refer", "Northlake eye clinic")
        self.act("schedule", now().isoformat(), 422)
        self.act("reject", "Receiving service unable to accept")
        self.assertIn("reject", [g["key"] for g in self.case["gaps"]])
        self.act("refer", "Community eye clinic")
        self.act("accept")
        self.act("schedule", (now() + timedelta(hours=2)).isoformat())
        self.act("complete", "", 422)
        self.act("complete", "Same-day visit completed early; report VIS-441")
        self.ask("Draft a patient message")
        draft = self.case["drafts"][0]["id"]
        self.act("approve", draft, 403)
        self.act("close", "Reviewed report", 403)
        self.role("clinician")
        self.act("approve", draft)
        self.act("close", "Reviewed report", 422)
        self.act("resolve_barrier", "I need a ride to the clinic", 422)
        self.act("start_support", json.dumps({
            "label": "I need a ride to the clinic",
            "intervention": "Coordinate a patient-approved transport option",
        }))
        self.act("resolve_barrier", json.dumps({
            "label": "I need a ride to the clinic",
            "verification": "Patient confirmed booked transport and attendance.",
        }))
        self.act("close", "Reviewed visit report VIS-441")
        self.assertEqual(self.case["stage"], 7)
        self.assertFalse(self.case["gaps"])
        self.assertEqual(
            self.client.get("/api/cases/" + self.case["id"]).json(), self.case
        )
        self.act("note", "Unapproved change", 422)
        self.act("reopen", "New review requested")
        self.assertEqual(self.case["stage"], 3)
        self.assertEqual(self.case["evidence"], "")

    def test_seed_permissions_and_conflict(self):
        listing = self.client.get("/api/cases").json()
        self.case = next(c for c in listing if c["id"] == "CL-2401")
        self.assertTrue(any(g["key"] == "overdue" for g in self.case["gaps"]))
        self.role("viewer")
        self.act("escalate", "overdue", 403)
        self.role("coordinator")
        old = self.case["version"]
        self.act("note", "Outreach recorded")
        res = self.client.post(
            "/api/cases/CL-2401/actions",
            json=dict(kind="note", value="Stale write", version=old),
        )
        self.assertEqual(res.status_code, 409)
        self.assertNotIn("Stale write", [e["note"] for e in self.case["events"]])

    def test_ai_boundary_and_direct_path(self):
        self.intake()
        before = self.case["stage"]
        answer = self.ask("What medication should I prescribe?")
        self.assertEqual(self.case["stage"], before)
        self.assertFalse(self.case["drafts"])
        self.assertIn("clinician", answer["suggestions"][0])
        with patch.dict(os.environ, {"LLM_API_KEY": "test"}), patch(
            "backend.language.httpx.post"
        ) as provider:
            provider.return_value.json.return_value = {
                "choices": [{"message": {"content": "Appointment is confirmed!"}}]
            }
            answer = self.ask("What referral is blocking progress?")
            self.assertIn("Not sent", " ".join(answer["facts"]))
        self.act("notify", "Discussed result")
        self.act("acknowledge", "Patient confirmed")
        self.act("consult", "Reviewed")
        self.role("coordinator")
        self.act("skip_referral", "Direct testing plan", 403)
        self.role("clinician")
        self.act("skip_referral", "Direct testing plan")
        self.assertEqual(self.case["referral"], "Direct testing")

    def test_barrier_support_proof_and_permissions(self):
        self.intake()
        self.role("coordinator")
        self.act("barrier", "Interpreter needed for appointment")
        item = self.case["barriers"][0]
        self.assertEqual(item["category"], "Language")
        self.assertIn("interpreter", self.case["gaps"][0]["next"].lower())
        label = item["label"]
        plan = json.dumps({"label": label, "intervention": "Arrange a qualified interpreter for the next contact"})
        resolution = json.dumps({"label": label, "verification": "Patient confirmed interpreter attended the call."})
        self.act("resolve_barrier", resolution, 422)
        self.act("start_support", json.dumps({"label": label, "intervention": "Unsafe clinical advice"}), 422)
        self.role("viewer")
        self.act("start_support", plan, 403)
        self.role("coordinator")
        self.act("start_support", plan)
        self.assertEqual(self.case["barriers"][0]["support"]["status"], "In progress")
        self.act("start_support", plan, 422)
        self.assertIn("Confirm intervention", self.case["gaps"][0]["next"])
        self.act("resolve_barrier", json.dumps({"label": label, "verification": "Done"}), 422)
        self.act("resolve_barrier", resolution)
        item = self.case["barriers"][0]
        self.assertTrue(item["resolved"])
        self.assertEqual(item["support"]["status"], "Verified")
        self.assertIn("confirmed", item["support"]["verification"])
        self.assertFalse(any(g["key"].startswith("barrier:") for g in self.case["gaps"]))
