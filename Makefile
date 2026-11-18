.PHONY: setup dev api web build demo test
setup:
	python3 -m venv .venv
	.venv/bin/python -m pip install -r backend/requirements.txt
	cd frontend && npm install
api:
	.venv/bin/python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
web:
	cd frontend && npm run dev
build:
	cd frontend && npm run build
demo: build
	.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
test:
	.venv/bin/python -m unittest discover -s tests -v
