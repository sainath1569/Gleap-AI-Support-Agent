import os
import json
import secrets
import logging
import asyncio
from contextlib import asynccontextmanager
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, Request, File, UploadFile, HTTPException, Depends, Header, status
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from agent import run_conversation_loop, get_system_prompt, set_system_prompt, GROK_API_KEY
from tools import TOOL_DEFINITIONS, ENABLED_TOOLS
from rag import ingest_document, get_real_qdrant_sources, delete_document_from_qdrant, init_qdrant, qdrant_client, COLLECTION_NAME
from guardrails import anonymize_pii, detect_prompt_injection, sanitize_delimiters
from db import MongoConversationManager

load_dotenv(override=True)

# ----------------------------------------------------
# STRUCTURED LOGGING CONFIGURATION
# ----------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger('nova-backend')

# ----------------------------------------------------
# ENVIRONMENT & SECURITY CONFIGURATION
# ----------------------------------------------------
ADMIN_API_KEY = os.getenv('ADMIN_API_KEY', 'gleap_admin_secret_key_123')
ALLOW_UNAUTHENTICATED_ADMIN = os.getenv('ALLOW_UNAUTHENTICATED_ADMIN', 'true').lower() in ('true', '1', 'yes')

RATE_LIMIT_CHAT = os.getenv('RATE_LIMIT_CHAT', '20/minute')
RATE_LIMIT_UPLOAD = os.getenv('RATE_LIMIT_UPLOAD', '5/minute')
MAX_UPLOAD_SIZE_MB = int(os.getenv('MAX_UPLOAD_SIZE_MB', '10'))
MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024
ALLOWED_EXTENSIONS = {'.pdf', '.txt', '.md', '.json', '.csv'}
MAX_PDF_PAGES = 50

# ----------------------------------------------------
# LIFESPAN CONTEXT MANAGER
# ----------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up NOVA / Gleap Support Backend...")
    try:
        init_qdrant()
        logger.info("Qdrant collection and schemas initialized successfully.")
    except Exception as e:
        logger.warning(f"Qdrant startup warning: {e}")
    yield
    logger.info("Shutting down NOVA / Gleap Support Backend...")
    conversation_manager.close()

# ----------------------------------------------------
# RATE LIMITER & FASTAPI SETUP
# ----------------------------------------------------
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title='NOVA / Gleap Backend Hardened', lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ----------------------------------------------------
# SECURITY HEADERS MIDDLEWARE
# ----------------------------------------------------
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# ----------------------------------------------------
# CORS CONFIGURATION (DYNAMICALLY CONFIGURED VIA ENV)
# ----------------------------------------------------
cors_origins_raw = os.getenv('CORS_ORIGINS', '*').strip()
frontend_url = os.getenv('FRONTEND_URL', '').strip()

# If CORS_ORIGINS is '*' or unset, reflect any requesting origin (Vercel, localhost, custom domains)
if cors_origins_raw == '*' or not cors_origins_raw:
    allow_origin_regex = r'.*'
    origins = []
else:
    # Explicit comma-separated origins provided in environment
    origins = [o.strip().rstrip('/') for o in cors_origins_raw.split(',') if o.strip()]
    if frontend_url and frontend_url.rstrip('/') not in origins:
        origins.append(frontend_url.rstrip('/'))
    allow_origin_regex = None

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if not allow_origin_regex else [],
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
    expose_headers=['*'],
)

# ----------------------------------------------------
# MONGODB CONVERSATION PERSISTENCE (PERSISTENT DATA STORE)
# ----------------------------------------------------
conversation_manager = MongoConversationManager()

# ----------------------------------------------------
# ADMIN AUTHENTICATION DEPENDENCY WITH DEV OVERRIDE
# ----------------------------------------------------
def verify_admin_api_key(
    x_api_key: Optional[str] = Header(None, alias='X-API-Key'),
    authorization: Optional[str] = Header(None)
):
    provided_key = x_api_key
    if not provided_key and authorization and authorization.startswith('Bearer '):
        provided_key = authorization[7:].strip()

    if provided_key and secrets.compare_digest(provided_key, ADMIN_API_KEY):
        return True

    if ALLOW_UNAUTHENTICATED_ADMIN:
        logger.warning(
            '[SECURITY NOTICE] Administrative endpoint accessed without valid API Key. '
            'Allowed due to ALLOW_UNAUTHENTICATED_ADMIN=true (Dev Override Mode).'
        )
        return True

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail='Unauthorized: Invalid or missing X-API-Key or Bearer token.'
    )

def validate_upload_file(file: UploadFile):
    raw_name = file.filename or 'file'
    clean_name = os.path.basename(raw_name)
    ext = os.path.splitext(clean_name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'File extension "{ext}" not allowed. Must be one of: {", ".join(sorted(ALLOWED_EXTENSIONS))}'
        )

# ----------------------------------------------------
# BOUNDED PYDANTIC MODELS
# ----------------------------------------------------
class AttachmentModel(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1, max_length=100000)

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)
    conversation_id: str = Field(..., min_length=1, max_length=128, pattern=r"^[a-zA-Z0-9_\-]+$")
    attachment: Optional[AttachmentModel] = None

class ToolToggleRequest(BaseModel):
    tool_name: str = Field(..., min_length=1, max_length=100)
    enabled: bool

class SystemPromptRequest(BaseModel):
    prompt: str = Field(..., min_length=10, max_length=20000)

class DeleteKnowledgeRequest(BaseModel):
    document_name: str = Field(..., min_length=1, max_length=255)

# ----------------------------------------------------
# HEALTH & READINESS PROBES
# ----------------------------------------------------
@app.get('/healthz')
def health_check():
    return {'status': 'ok', 'service': 'nova-backend'}

@app.get('/readyz')
def readiness_check():
    status_details = {
        'fastapi': 'ok',
        'grok_api_key_configured': bool(GROK_API_KEY),
        'qdrant_connected': False,
        'mongodb_connected': conversation_manager.ping()
    }
    try:
        collections = qdrant_client.get_collections().collections
        status_details['qdrant_connected'] = True
    except Exception as e:
        status_details['qdrant_error'] = str(e)

    if not status_details['qdrant_connected']:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=status_details
        )

    return {'status': 'ready', 'details': status_details}

# ----------------------------------------------------
# CHAT ENDPOINTS
# ----------------------------------------------------
@app.post('/api/chat/parse-attachment')
async def parse_attachment_endpoint(file: UploadFile = File(...)):
    validate_upload_file(file)
    try:
        content = await file.read()
        if len(content) > MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f'File size exceeds maximum allowed limit of {MAX_UPLOAD_SIZE_MB}MB.'
            )

        filename = os.path.basename(file.filename or 'document')
        content_type = file.content_type or ''
        text = ''

        if filename.lower().endswith('.pdf') or 'pdf' in content_type:
            from io import BytesIO
            from pypdf import PdfReader
            reader = PdfReader(BytesIO(content))
            total_pages = min(len(reader.pages), MAX_PDF_PAGES)
            for idx in range(total_pages):
                t = reader.pages[idx].extract_text()
                if t:
                    text += f'--- Page {idx+1} ---\n{t}\n'
        else:
            try:
                text = content.decode('utf-8')
            except UnicodeDecodeError:
                text = content.decode('latin-1', errors='ignore')

        max_chars = 35000
        if len(text) > max_chars:
            text = text[:max_chars] + '\n\n... [Document content truncated to fit context limits] ...'

        # AI Safety Scanning on Attached Document
        is_injected, reason = detect_prompt_injection(text)
        if is_injected:
            logger.warning(f"[SECURITY ALERT] Uploaded document '{filename}' contained prompt injection instructions: {reason}")
            text = "[SECURITY NOTICE: Uploaded document contained malicious prompt injection instructions and has been neutralized for safety.]"
        else:
            text = sanitize_delimiters(anonymize_pii(text))

        return {
            'status': 'success',
            'filename': filename,
            'text': text.strip(),
            'chars': len(text)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error parsing attachment {file.filename}: {e}')
        return {'status': 'error', 'message': str(e), 'filename': file.filename}

@app.post('/api/chat')
@limiter.limit(RATE_LIMIT_CHAT)
async def chat_endpoint(request: Request, req: ChatRequest):
    conversation_id = req.conversation_id
    messages = conversation_manager.get_messages(conversation_id)
    
    user_entry = {'role': 'user', 'content': req.message}
    if req.attachment:
        user_entry['attachment'] = {
            'name': req.attachment.name,
            'content': req.attachment.content
        }
    messages.append(user_entry)
    
    async def event_generator():
        try:
            async for event in run_conversation_loop(messages):
                yield {
                    'event': event['type'],
                    'data': json.dumps(event)
                }
            conversation_manager.save_messages(conversation_id, messages)
        except Exception as e:
            logger.error(f'Chat stream error in conversation {conversation_id}: {e}')
            yield {
                'event': 'error',
                'data': json.dumps({'type': 'error', 'content': str(e)})
            }
            
    return EventSourceResponse(event_generator())

# ----------------------------------------------------
# SYSTEM PROMPT MANAGEMENT (PROTECTED W/ DEV OVERRIDE)
# ----------------------------------------------------
@app.get('/api/system-prompt')
def get_prompt(authenticated: bool = Depends(verify_admin_api_key)):
    return {'prompt': get_system_prompt()}

@app.post('/api/system-prompt')
def update_prompt(req: SystemPromptRequest, authenticated: bool = Depends(verify_admin_api_key)):
    new_prompt = set_system_prompt(req.prompt)
    logger.info('System prompt updated via Admin API')
    return {'status': 'success', 'prompt': new_prompt}

# ----------------------------------------------------
# KNOWLEDGE MANAGEMENT (PROTECTED W/ DEV OVERRIDE)
# ----------------------------------------------------
@app.get('/api/knowledge')
def get_knowledge_sources(authenticated: bool = Depends(verify_admin_api_key)):
    sources = get_real_qdrant_sources()
    return {'sources': sources}

@app.post('/api/knowledge/upload')
@limiter.limit(RATE_LIMIT_UPLOAD)
async def upload_knowledge(
    request: Request,
    file: UploadFile = File(...),
    authenticated: bool = Depends(verify_admin_api_key)
):
    validate_upload_file(file)
    try:
        content = await file.read()
        if len(content) > MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f'Uploaded file exceeds limit of {MAX_UPLOAD_SIZE_MB}MB.'
            )

        safe_filename = os.path.basename(file.filename or 'document')
        ingest_document(content, safe_filename, file.content_type)
        logger.info(f'Successfully ingested document "{safe_filename}" into Qdrant & BM25')
        return {'status': 'success', 'filename': safe_filename}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Failed to upload document {file.filename}: {e}')
        return {'status': 'error', 'message': str(e)}

@app.post('/api/knowledge/delete')
def delete_knowledge(
    req: DeleteKnowledgeRequest,
    authenticated: bool = Depends(verify_admin_api_key)
):
    success = delete_document_from_qdrant(req.document_name)
    if success:
        logger.info(f'Successfully deleted document "{req.document_name}" from Qdrant & BM25')
        return {'status': 'success', 'document_name': req.document_name}
    return {'status': 'error', 'message': f'Could not delete {req.document_name}'}

# ----------------------------------------------------
# TOOLS & CONVERSATIONS (PROTECTED W/ DEV OVERRIDE)
# ----------------------------------------------------
@app.get('/api/tools')
def get_tools():
    tools_list = []
    for tool_def in TOOL_DEFINITIONS:
        name = tool_def['function']['name']
        tools_list.append({
            'name': name,
            'description': tool_def['function']['description'],
            'enabled': ENABLED_TOOLS.get(name, False)
        })
    return {'tools': tools_list}

@app.post('/api/tools/toggle')
def toggle_tool(
    req: ToolToggleRequest,
    authenticated: bool = Depends(verify_admin_api_key)
):
    if req.tool_name in ENABLED_TOOLS:
        ENABLED_TOOLS[req.tool_name] = req.enabled
        logger.info(f'Tool "{req.tool_name}" set to enabled={req.enabled}')
        return {'status': 'success', 'tool': req.tool_name, 'enabled': req.enabled}
    return {'status': 'error', 'message': 'Tool not found'}

@app.get('/api/conversations')
def get_conversations(authenticated: bool = Depends(verify_admin_api_key)):
    result = conversation_manager.list_conversations()
    return {'conversations': result}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run('main:app', host='127.0.0.1', port=8000, reload=True)
