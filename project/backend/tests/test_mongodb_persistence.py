import pytest
import sys
import os
import threading
from datetime import datetime, timezone
import mongomock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from db import MongoConversationManager

@pytest.fixture
def mock_mongo_client():
    return mongomock.MongoClient()

@pytest.fixture
def manager(mock_mongo_client):
    return MongoConversationManager(client=mock_mongo_client, db_name="test_support")

# 1. New conversation
def test_new_conversation(manager):
    cid = "conv_test_001"
    messages = [{"role": "user", "content": "Hello Gleap support!"}]
    manager.save_messages(cid, messages)

    doc = manager.collection.find_one({"conversation_id": cid})
    assert doc is not None
    assert doc["conversation_id"] == cid
    assert len(doc["messages"]) == 1
    assert doc["messages"][0]["content"] == "Hello Gleap support!"
    assert "created_at" in doc
    assert "updated_at" in doc

# 2. Existing conversation retrieval
def test_existing_conversation_retrieval(manager):
    cid = "conv_test_002"
    initial_messages = [
        {"role": "user", "content": "How do I install widget?"},
        {"role": "assistant", "content": "You can add our script tag to HTML head."}
    ]
    manager.save_messages(cid, initial_messages)

    retrieved = manager.get_messages(cid)
    assert len(retrieved) == 2
    assert retrieved[0]["content"] == "How do I install widget?"
    assert retrieved[1]["content"] == "You can add our script tag to HTML head."

# 3. Message persistence
def test_message_persistence(manager):
    cid = "conv_test_003"
    msg = {
        "role": "user",
        "content": "Check order ORD-1001",
        "attachment": {"name": "invoice.txt", "content": "order receipt"}
    }
    manager.save_messages(cid, [msg])

    persisted = manager.get_messages(cid)
    assert len(persisted) == 1
    assert persisted[0]["role"] == "user"
    assert persisted[0]["content"] == "Check order ORD-1001"
    assert persisted[0]["attachment"]["name"] == "invoice.txt"
    assert "timestamp" in persisted[0]

# 4. Multiple messages in the same conversation
def test_multiple_messages_same_conversation(manager):
    cid = "conv_test_004"
    turn1 = [{"role": "user", "content": "Hi"}]
    manager.save_messages(cid, turn1)

    turn2 = turn1 + [{"role": "assistant", "content": "Hello! How can I help you today?"}]
    manager.save_messages(cid, turn2)

    turn3 = turn2 + [{"role": "user", "content": "What plans do you offer?"}]
    manager.save_messages(cid, turn3)

    final = manager.get_messages(cid)
    assert len(final) == 3
    assert final[0]["content"] == "Hi"
    assert final[1]["content"] == "Hello! How can I help you today?"
    assert final[2]["content"] == "What plans do you offer?"

# 5. Conversation history ordering
def test_conversation_history_ordering(manager):
    cid = "conv_test_005"
    ordered = [
        {"role": "user", "content": "1. First message", "timestamp": "2026-08-29T10:00:00Z"},
        {"role": "assistant", "content": "2. Second message", "timestamp": "2026-08-29T10:01:00Z"},
        {"role": "user", "content": "3. Third message", "timestamp": "2026-08-29T10:02:00Z"},
        {"role": "assistant", "content": "4. Fourth message", "timestamp": "2026-08-29T10:03:00Z"}
    ]
    manager.save_messages(cid, ordered)

    res = manager.get_messages(cid)
    assert [m["content"] for m in res] == [
        "1. First message",
        "2. Second message",
        "3. Third message",
        "4. Fourth message"
    ]

# 6. Backend restart persistence
def test_backend_restart_persistence(mock_mongo_client):
    cid = "conv_restart_006"
    # Instance 1 saves data before restart
    manager_1 = MongoConversationManager(client=mock_mongo_client, db_name="test_restart_db")
    manager_1.save_messages(cid, [
        {"role": "user", "content": "Will this survive restart?"},
        {"role": "assistant", "content": "Yes, persisted in MongoDB."}
    ])
    manager_1.close()

    # Instance 2 starts up after restart on same database
    manager_2 = MongoConversationManager(client=mock_mongo_client, db_name="test_restart_db")
    restored = manager_2.get_messages(cid)
    assert len(restored) == 2
    assert restored[0]["content"] == "Will this survive restart?"
    assert restored[1]["content"] == "Yes, persisted in MongoDB."

    conversations = manager_2.list_conversations()
    assert cid in conversations
    assert "Will this survive restart?" in conversations[cid]

# 7. Invalid conversation ID
def test_invalid_conversation_id(manager):
    # Empty string
    assert manager.get_messages("") == []
    manager.save_messages("", [{"role": "user", "content": "test"}])
    # None
    assert manager.get_messages(None) == []
    manager.save_messages(None, [{"role": "user", "content": "test"}])

# 8. MongoDB unavailable (resilient fallback)
def test_mongodb_unavailable_fallback():
    # Intentionally point to non-existent host with 50ms timeout
    failing_manager = MongoConversationManager(uri="mongodb://non-existent-host-999:27017")
    assert failing_manager._is_connected is False
    assert failing_manager.ping() is False

    # App should NOT crash; should use graceful runtime fallback
    cid = "fallback_conv_008"
    failing_manager.save_messages(cid, [{"role": "user", "content": "Saved during outage"}])
    msgs = failing_manager.get_messages(cid)
    assert len(msgs) == 1
    assert msgs[0]["content"] == "Saved during outage"

    list_res = failing_manager.list_conversations()
    assert cid in list_res
    assert "Saved during outage" in list_res[cid]

# 9. Concurrent messages
def test_concurrent_messages(manager):
    errors = []

    def worker(worker_id):
        try:
            cid = f"concurrent_conv_{worker_id}"
            for turn in range(5):
                msgs = manager.get_messages(cid)
                msgs.append({"role": "user", "content": f"Worker {worker_id} Turn {turn}"})
                manager.save_messages(cid, msgs)
        except Exception as e:
            errors.append(e)

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len(errors) == 0, f"Encountered errors in concurrent threads: {errors}"
    for i in range(10):
        cid = f"concurrent_conv_{i}"
        saved = manager.get_messages(cid)
        assert len(saved) == 5
