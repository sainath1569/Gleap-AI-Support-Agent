import pytest
import sys
import os
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app, ADMIN_API_KEY

client = TestClient(app)

def test_health_check():
    res = client.get("/healthz")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "service": "nova-backend"}

def test_security_headers_present():
    res = client.get("/healthz")
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "SAMEORIGIN"

def test_tools_list_endpoint():
    res = client.get("/api/tools")
    assert res.status_code == 200
    data = res.json()
    assert "tools" in data
    assert len(data["tools"]) >= 5

def test_admin_auth_with_valid_key():
    headers = {"X-API-Key": ADMIN_API_KEY}
    res = client.get("/api/system-prompt", headers=headers)
    assert res.status_code == 200
    assert "prompt" in res.json()

def test_chat_validation_bad_conversation_id():
    # Attempt path traversal in conversation_id
    payload = {
        "message": "Hello",
        "conversation_id": "../../etc/shadow"
    }
    res = client.post("/api/chat", json=payload)
    assert res.status_code == 422  # Unprocessable Entity / validation error
