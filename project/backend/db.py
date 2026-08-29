import os
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import pymongo
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError, ConnectionFailure

logger = logging.getLogger("nova-backend.db")

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017").strip().strip("'\"")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "gleap_support").strip().strip("'\"")

class MongoConversationManager:
    """
    MongoDB Conversation Persistence Manager.
    Persists ONLY conversations and their message history in the 'conversations' collection.
    Features:
    - Unique index on conversation_id
    - Descending index on updated_at
    - Connection timeout handling (serverSelectionTimeoutMS=5000)
    - Graceful in-memory runtime fallback on temporary database failure
    - Message timestamps and last_snippet preservation
    """
    def __init__(self, uri: Optional[str] = None, db_name: Optional[str] = None, client: Optional[MongoClient] = None):
        raw_uri = uri or MONGODB_URI
        self.uri = raw_uri.strip().strip("'\"") if raw_uri else "mongodb://localhost:27017"
        raw_db = db_name or MONGODB_DATABASE
        self.db_name = raw_db.strip().strip("'\"") if raw_db else "gleap_support"
        self.client: Optional[MongoClient] = client
        self.collection = None
        self._memory_fallback: Dict[str, List[Dict[str, Any]]] = {}
        self._is_connected = False
        
        if client is not None:
            self._init_with_client(client)
        else:
            self._connect()

    def _connect(self):
        try:
            self.client = MongoClient(
                self.uri,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                socketTimeoutMS=3000
            )
            # Quick ping to verify connectivity
            self.client.admin.command('ping')
            db = self.client[self.db_name]
            self.collection = db['conversations']
            self._ensure_indexes()
            self._is_connected = True
            logger.info(f"Connected to MongoDB at {self.uri.split('@')[-1]} (Database: {self.db_name})")
        except Exception as e:
            logger.warning(
                f"[DATABASE WARNING] MongoDB unavailable at {self.uri} ({e}). "
                "Operating in resilient runtime fallback mode."
            )
            self.collection = None
            self._is_connected = False

    def _init_with_client(self, client: MongoClient):
        try:
            self.client = client
            db = client[self.db_name]
            self.collection = db['conversations']
            self._ensure_indexes()
            self._is_connected = True
        except Exception as e:
            logger.warning(f"Failed to initialize client: {e}")
            self.collection = None
            self._is_connected = False

    def _ensure_indexes(self):
        if self.collection is not None:
            try:
                self.collection.create_index([("conversation_id", ASCENDING)], unique=True)
                self.collection.create_index([("updated_at", DESCENDING)])
            except Exception as e:
                logger.warning(f"Index creation notice: {e}")

    def ping(self) -> bool:
        """Verifies if MongoDB is connected and reachable."""
        if not self.client:
            return False
        try:
            self.client.admin.command('ping')
            return True
        except Exception:
            return False

    def get_messages(self, conversation_id: str) -> List[Dict[str, Any]]:
        """
        Retrieves ordered conversation messages.
        Primary source: MongoDB. Fallback: runtime in-memory cache.
        """
        if not conversation_id:
            return []

        if self.collection is not None:
            try:
                doc = self.collection.find_one(
                    {"conversation_id": conversation_id},
                    {"_id": 0, "messages": 1}
                )
                if doc and "messages" in doc:
                    self._memory_fallback[conversation_id] = doc["messages"]
                    return doc["messages"]
            except Exception as e:
                logger.warning(f"MongoDB read error for conversation '{conversation_id}': {e}. Using fallback.")

        return self._memory_fallback.get(conversation_id, [])

    def save_messages(self, conversation_id: str, messages: List[Dict[str, Any]]):
        """
        Persists full message history to MongoDB 'conversations' collection.
        Survives crashes and restarts.
        """
        if not conversation_id:
            return

        now = datetime.now(timezone.utc).isoformat()
        
        normalized_messages = []
        for m in messages:
            msg_copy = dict(m)
            if "timestamp" not in msg_copy:
                msg_copy["timestamp"] = now
            normalized_messages.append(msg_copy)

        last_snippet = "New Conversation"
        for m in reversed(normalized_messages):
            if m.get("role") == "user" and m.get("content"):
                last_snippet = m.get("content")[:80].strip()
                break

        self._memory_fallback[conversation_id] = normalized_messages

        if self.collection is not None:
            try:
                self.collection.update_one(
                    {"conversation_id": conversation_id},
                    {
                        "$set": {
                            "messages": normalized_messages,
                            "updated_at": now,
                            "last_snippet": last_snippet
                        },
                        "$setOnInsert": {
                            "created_at": now
                        }
                    },
                    upsert=True
                )
            except Exception as e:
                logger.warning(f"MongoDB write error for conversation '{conversation_id}': {e}. Kept in runtime fallback.")

    def list_conversations(self) -> Dict[str, str]:
        """
        Lists all conversations sorted by recency.
        Returns mapping: {conversation_id: last_snippet}.
        """
        result = {}
        if self.collection is not None:
            try:
                cursor = self.collection.find(
                    {},
                    {"_id": 0, "conversation_id": 1, "last_snippet": 1}
                ).sort("updated_at", DESCENDING).limit(100)
                
                for doc in cursor:
                    cid = doc.get("conversation_id")
                    snippet = doc.get("last_snippet") or "New Conversation"
                    if cid:
                        result[cid] = snippet
                if result:
                    return result
            except Exception as e:
                logger.warning(f"MongoDB list error: {e}. Using fallback.")

        for cid, msgs in self._memory_fallback.items():
            user_msgs = [m for m in msgs if m.get("role") == "user"]
            result[cid] = user_msgs[-1]["content"][:80] if user_msgs else "New Conversation"

        return result

    def close(self):
        """Closes the MongoDB client connection cleanly."""
        if self.client:
            try:
                self.client.close()
                logger.info("MongoDB client connection closed cleanly.")
            except Exception:
                pass
