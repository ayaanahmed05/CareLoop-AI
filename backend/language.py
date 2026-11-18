"""Bounded language classification. Model output never changes clinical state."""

import os
import httpx


def classify(text, choices, fallback, instruction):
    if not os.getenv("LLM_API_KEY"):
        return fallback, False
    try:
        response = httpx.post(
            os.getenv("LLM_BASE_URL", "https://api.openai.com/v1").rstrip("/")
            + "/chat/completions",
            headers={"Authorization": "Bearer " + os.environ["LLM_API_KEY"]},
            json={
                "model": os.getenv("LLM_MODEL", "gpt-4o-mini"),
                "messages": [
                    {
                        "role": "system",
                        "content": instruction
                        + " Return exactly one label: "
                        + ", ".join(choices),
                    },
                    {"role": "user", "content": text},
                ],
                "temperature": 0,
                "max_tokens": 12,
            },
            timeout=7,
        )
        response.raise_for_status()
        answer = response.json()["choices"][0]["message"]["content"].strip().lower()
        if answer in choices:
            return answer, True
    except (
        httpx.HTTPError,
        KeyError,
        ValueError,
        TypeError,
        IndexError,
        AttributeError,
    ):
        pass
    return fallback, False


def barrier_category(text):
    groups = {
        "transportation": ("ride", "bus", "transport", "travel"),
        "language": ("language", "interpreter", "translation"),
        "scheduling": ("schedul", "work", "time off", "hours"),
        "cost": ("cost", "afford", "insurance", "financial"),
    }
    fallback = next(
        (k for k, v in groups.items() if any(word in text.lower() for word in v)),
        "other",
    )
    category, _ = classify(
        text,
        [*groups, "other"],
        fallback,
        "Classify this patient-reported access barrier.",
    )
    return category.title()
