import json
import asyncio
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, Request, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel

from agent import run_conversation_loop, get_system_prompt, set_system_prompt
from tools import TOOL_DEFINITIONS, ENABLED_TOOLS
from rag import ingest_document, get_real_qdrant_sources, delete_document_from_qdrant

app = FastAPI(title="NOVA / Gleap Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory conversation state
conversations: Dict[str, List[Dict[str, Any]]] = {}

class AttachmentModel(BaseModel):
    name: str
    content: str

class ChatRequest(BaseModel):
    message: str
    conversation_id: str
    attachment: Optional[AttachmentModel] = None

class ToolToggleRequest(BaseModel):
    tool_name: str
    enabled: bool

class SystemPromptRequest(BaseModel):
    prompt: str

class DeleteKnowledgeRequest(BaseModel):
    document_name: str

@app.post("/api/chat/parse-attachment")
async def parse_attachment_endpoint(file: UploadFile = File(...)):
    """Extracts text from an attached document (PDF, TXT, MD, JSON, CSV)."""
    try:
        content = await file.read()
        filename = file.filename or "document"
        content_type = file.content_type or ""
        text = ""

        if filename.lower().endswith(".pdf") or "pdf" in content_type:
            from io import BytesIO
            from pypdf import PdfReader
            reader = PdfReader(BytesIO(content))
            for idx, page in enumerate(reader.pages):
                t = page.extract_text()
                if t:
                    text += f"--- Page {idx+1} ---\n{t}\n"
        else:
            try:
                text = content.decode("utf-8")
            except UnicodeDecodeError:
                text = content.decode("latin-1", errors="ignore")

        # Context window guardrail: limit to 35,000 characters
        max_chars = 35000
        if len(text) > max_chars:
            text = text[:max_chars] + "\n\n... [Document content truncated to fit context limits] ..."

        return {
            "status": "success",
            "filename": filename,
            "text": text.strip(),
            "chars": len(text)
        }
    except Exception as e:
        return {"status": "error", "message": str(e), "filename": file.filename}

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    conversation_id = req.conversation_id
    
    if conversation_id not in conversations:
        conversations[conversation_id] = []
        
    messages = conversations[conversation_id]
    user_entry = {"role": "user", "content": req.message}
    if req.attachment:
        user_entry["attachment"] = {
            "name": req.attachment.name,
            "content": req.attachment.content
        }
    messages.append(user_entry)
    
    async def event_generator():
        try:
            async for event in run_conversation_loop(messages):
                yield {
                    "event": event["type"],
                    "data": json.dumps(event)
                }
        except Exception as e:
            yield {
                "event": "error",
                "data": json.dumps({"type": "error", "content": str(e)})
            }
            
    return EventSourceResponse(event_generator())

# ----------------------------------------------------
# SYSTEM PROMPT MANAGEMENT
# ----------------------------------------------------
@app.get("/api/system-prompt")
def get_prompt():
    return {"prompt": get_system_prompt()}

@app.post("/api/system-prompt")
def update_prompt(req: SystemPromptRequest):
    new_prompt = set_system_prompt(req.prompt)
    return {"status": "success", "prompt": new_prompt}

# ----------------------------------------------------
# REAL QDRANT KNOWLEDGE MANAGEMENT
# ----------------------------------------------------
@app.get("/api/knowledge")
def get_knowledge_sources():
    """Fetch real documents stored in Qdrant vector database."""
    sources = get_real_qdrant_sources()
    return {"sources": sources}

@app.post("/api/knowledge/upload")
async def upload_knowledge(file: UploadFile = File(...)):
    try:
        content = await file.read()
        # Ingest document into Qdrant vectors + BM25
        ingest_document(content, file.filename, file.content_type)
        return {"status": "success", "filename": file.filename}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/knowledge/delete")
def delete_knowledge(req: DeleteKnowledgeRequest):
    success = delete_document_from_qdrant(req.document_name)
    if success:
        return {"status": "success", "document_name": req.document_name}
    return {"status": "error", "message": f"Could not delete {req.document_name}"}

# ----------------------------------------------------
# TOOLS & CONVERSATIONS
# ----------------------------------------------------
@app.get("/api/tools")
def get_tools():
    tools_list = []
    for tool_def in TOOL_DEFINITIONS:
        name = tool_def["function"]["name"]
        tools_list.append({
            "name": name,
            "description": tool_def["function"]["description"],
            "enabled": ENABLED_TOOLS.get(name, False)
        })
    return {"tools": tools_list}

@app.post("/api/tools/toggle")
def toggle_tool(req: ToolToggleRequest):
    if req.tool_name in ENABLED_TOOLS:
        ENABLED_TOOLS[req.tool_name] = req.enabled
        return {"status": "success", "tool": req.tool_name, "enabled": req.enabled}
    return {"status": "error", "message": "Tool not found"}

@app.get("/api/conversations")
def get_conversations():
    result = {}
    for cid, msgs in conversations.items():
        user_msgs = [m for m in msgs if m["role"] == "user"]
        result[cid] = user_msgs[-1]["content"] if user_msgs else "New Conversation"
    return {"conversations": result}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
