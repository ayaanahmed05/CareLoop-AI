import os
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / "backend/.env")
DATABASE = os.getenv("CARELOOP_DB", str(ROOT / "backend/careloop.sqlite3"))
ACK_DAYS = int(os.getenv("ACK_DAYS", 3))
REFERRAL_DAYS = int(os.getenv("REFERRAL_DAYS", 4))
SCHEDULE_DAYS = int(os.getenv("SCHEDULE_DAYS", 5))
OWNERS = ["Maya Chen", "Jordan Ellis", "Dr. Alex Rivera"]
STAGES = [
    "Screening result",
    "Patient notified",
    "Acknowledged",
    "Consultation",
    "Referral",
    "Appointment",
    "Care completed",
    "Verified closure",
]
