import os
import json
import httpx
from typing import List, Dict, Any, AsyncGenerator
from dotenv import load_dotenv

from tools import get_enabled_tool_definitions, TOOL_FUNCTIONS
from rag import hybrid_search

load_dotenv(override=True)

GROK_API_KEY = os.getenv("GROK_API_KEY")
GROK_MODEL = os.getenv("GROK_MODEL", "openai/gpt-oss-120b")

FALLBACK_MODELS = [
    GROK_MODEL,
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
    "groq/compound"
]

# Strict System prompt requiring answers ONLY from retrieved context or tools
SYSTEM_PROMPT = """You are Kai, the official AI customer support assistant for Gleap.

STRICT GROUNDING & ATTACHMENT RULES:
1. When the user attaches a document (e.g. PDF, report, text file, code, or logs), thoroughly read the attached document content and prioritize answering the user's questions or providing summaries directly from the attached document.
2. For questions regarding Gleap, its features, policies, or documentation, answer STRICTLY and EXCLUSIVELY using the retrieved documentation context provided from the knowledge base or the attached document.
3. If no documentation context was returned and no attached document contains the answer, clearly state:
   "I am sorry, but that information is not listed in our documentation. I don't have information about that."
4. When the user asks to perform an action or inquiry that can be fulfilled by an available tool (e.g. getting live weather, checking Gleap system status/uptime, calculating custom pricing quotes, looking up customer details, checking order shipping, checking subscriptions, or creating support tickets), you MUST invoke the appropriate tool.
5. Always present answers and tool results with clean, professional Markdown:
   - Use **bold** to highlight key terms, status, metrics, and important details.
   - Use Markdown tables (`| ... |`) when presenting comparison data, pricing options, system uptime, or multi-field records.
   - Use headings (`##` or `###`) for distinct sections and horizontal dividers (`---`) between major topics.
   - Use structured bullet points for lists and readability."""

def get_system_prompt() -> str:
    global SYSTEM_PROMPT
    return SYSTEM_PROMPT

def set_system_prompt(prompt: str) -> str:
    global SYSTEM_PROMPT
    if prompt and prompt.strip():
        SYSTEM_PROMPT = prompt.strip()
    return SYSTEM_PROMPT

def execute_tool(name: str, arguments: Dict[str, Any]) -> str:
    """Executes a local Python function and returns the JSON result."""
    func = TOOL_FUNCTIONS.get(name)
    if not func:
        return json.dumps({"error": f"Tool {name} not found or disabled."})
        
    try:
        result = func(**arguments)
        return json.dumps(result)
    except Exception as e:
        return json.dumps({"error": str(e)})

async def stream_grok_chat(messages: List[Dict[str, Any]]) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Communicates with Groq using an OpenAI-compatible REST API.
    Streams back tool calls and text deltas.
    """
    if not GROK_API_KEY:
        yield {"type": "error", "content": "GROK_API_KEY not configured"}
        return
        
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Ensure system prompt is the first message and sanitize keys for Groq API
    prepared_messages = []
    for m in messages:
        if m.get("role") == "system":
            continue
        clean_m = {
            "role": m.get("role"),
            "content": m.get("content") or ""
        }
        if "tool_calls" in m:
            clean_m["tool_calls"] = m["tool_calls"]
        if "tool_call_id" in m:
            clean_m["tool_call_id"] = m["tool_call_id"]
        if "name" in m:
            clean_m["name"] = m["name"]
        prepared_messages.append(clean_m)
        
    prepared_messages.insert(0, {"role": "system", "content": get_system_prompt()})
        
    tools = get_enabled_tool_definitions()

    models_to_try = []
    for m in FALLBACK_MODELS:
        if m and m not in models_to_try:
            models_to_try.append(m)

    async with httpx.AsyncClient(timeout=60.0) as client:
        last_error = ""
        for model in models_to_try:
            payload = {
                "model": model,
                "messages": prepared_messages,
                "stream": True,
            }
            if tools:
                payload["tools"] = tools
                payload["tool_choice"] = "auto"

            try:
                async with client.stream("POST", url, headers=headers, json=payload) as response:
                    if response.status_code == 404 or "model_not_found" in response.headers.get("content-type", ""):
                        error_text = await response.aread()
                        last_error = error_text.decode("utf-8")
                        continue
                        
                    if response.status_code != 200:
                        error_text = await response.aread()
                        last_error = f"Groq Error ({model}): {response.status_code} - {error_text.decode('utf-8')}"
                        continue

                    tool_call_buffer = {}
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data_str = line[6:]
                            if data_str == "[DONE]":
                                break
                            try:
                                data = json.loads(data_str)
                                choices = data.get("choices", [])
                                if not choices:
                                    continue
                                choice = choices[0]
                                delta = choice.get("delta", {})
                                
                                # Handle tool calls
                                if "tool_calls" in delta and delta["tool_calls"]:
                                    for tc in delta["tool_calls"]:
                                        idx = tc.get("index", 0)
                                        if idx not in tool_call_buffer:
                                            tool_call_buffer[idx] = {
                                                "id": tc.get("id", f"tc_{idx}"),
                                                "type": "function",
                                                "function": {
                                                    "name": tc.get("function", {}).get("name", ""),
                                                    "arguments": tc.get("function", {}).get("arguments", "")
                                                }
                                            }
                                        else:
                                            if "name" in tc.get("function", {}):
                                                tool_call_buffer[idx]["function"]["name"] += tc["function"]["name"]
                                            if "arguments" in tc.get("function", {}):
                                                tool_call_buffer[idx]["function"]["arguments"] += tc["function"]["arguments"]
                                                
                                # Handle text content
                                if "content" in delta and delta["content"]:
                                    yield {"type": "assistant_delta", "content": delta["content"]}
                                    
                                # Handle finish reasons
                                if choice.get("finish_reason") == "tool_calls":
                                    for idx, tc in tool_call_buffer.items():
                                        yield {
                                            "type": "tool_call",
                                            "id": tc["id"],
                                            "name": tc["function"]["name"],
                                            "arguments": tc["function"]["arguments"]
                                        }
                            except json.JSONDecodeError:
                                continue
                    return
            except Exception as e:
                last_error = str(e)
                continue

        yield {"type": "error", "content": f"AI Engine error: {last_error}"}

async def run_conversation_loop(messages: List[Dict[str, Any]]) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Manages the conversation loop with strict RAG context and attached document retrieval:
    1. Extracts latest user question and any attached document.
    2. Retrieves real document chunks from Qdrant/BM25.
    3. Injects attachment text and retrieved context into prompt.
    4. Enforces strict answering only from context.
    """
    # Find and augment the latest user message with retrieved context and attachment
    for m in reversed(messages):
        if m.get("role") == "user" and not m.get("_rag_injected"):
            raw_query = m.get("content", "").strip()
            attachment = m.get("attachment")
            
            # Hybrid search query
            search_query = raw_query if raw_query else (attachment.get("name", "") if attachment else "")
            rag_hits = hybrid_search(search_query, top_k=4, rerank_k=2) if search_query else []
            
            snippets = []
            if rag_hits:
                for h in rag_hits:
                    src = h.get("metadata", {}).get("document_name", "Document")
                    text = h.get("text", "").strip()
                    if text:
                        snippets.append(f"Document [{src}]:\n{text}")
                        
            context_block = "\n\n".join(snippets) if snippets else "NO DOCUMENTS FOUND."
            
            prompt_sections = []
            if attachment and attachment.get("content"):
                prompt_sections.append(
                    f"[USER ATTACHED DOCUMENT: {attachment.get('name', 'document')}]:\n{attachment.get('content')}"
                )
                
            prompt_sections.append(f"[USER INQUIRY]:\n{raw_query if raw_query else 'Please review and summarize the attached document.'}")
            prompt_sections.append(f"[RETRIEVED DOCUMENTATION CONTEXT FROM KNOWLEDGE BASE]:\n{context_block}")
            
            m["content"] = "\n\n".join(prompt_sections)
            m["_rag_injected"] = True
            break

    while True:
        tool_calls = []
        assistant_message = {"role": "assistant", "content": ""}
        
        async for event in stream_grok_chat(messages):
            if event["type"] == "assistant_delta":
                assistant_message["content"] += event["content"]
                yield event
            elif event["type"] == "tool_call":
                tool_calls.append(event)
                try:
                    args = json.loads(event["arguments"])
                except Exception:
                    args = event["arguments"]
                    
                yield {
                    "type": "tool_call",
                    "id": event["id"],
                    "tool": event["name"],
                    "arguments": args
                }
            elif event["type"] == "error":
                yield event
                return
                
        if tool_calls:
            msg_tool_calls = []
            for tc in tool_calls:
                msg_tool_calls.append({
                    "id": tc["id"],
                    "type": "function",
                    "function": {
                        "name": tc["name"],
                        "arguments": tc["arguments"]
                    }
                })
            assistant_message["tool_calls"] = msg_tool_calls
            messages.append(assistant_message)
            
            for tc in tool_calls:
                tool_name = tc["name"]
                try:
                    args = json.loads(tc["arguments"])
                except Exception:
                    args = {}
                    
                result = execute_tool(tool_name, args)
                try:
                    parsed_result = json.loads(result)
                except Exception:
                    parsed_result = result
                    
                yield {
                    "type": "tool_result",
                    "tool": tool_name,
                    "result": parsed_result
                }
                
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "name": tool_name,
                    "content": result
                })
        else:
            if assistant_message["content"]:
                messages.append(assistant_message)
            break
            
    yield {"type": "done"}
