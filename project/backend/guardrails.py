import re
from typing import Tuple, Dict, Any, Optional

# ----------------------------------------------------
# PII REGEX PATTERNS
# ----------------------------------------------------
CREDIT_CARD_REGEX = re.compile(r"\b(?:\d[ -]*?){13,16}\b|\b(?:\d{4}[-\s]?){3}\d{4}\b")
SSN_REGEX = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
API_KEY_REGEX = re.compile(r"\b(?:sk-[a-zA-Z0-9]{32,}|ghp_[a-zA-Z0-9]{36}|tvly-[a-zA-Z0-9_-]{25,}|c235[a-zA-Z0-9]{28}|lsv2_pt_[a-zA-Z0-9_]{30,})\b")
PHONE_REGEX = re.compile(r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")
SECRET_REGEX = re.compile(r"(?i)\b(?:password|passwd|secret_key|api_secret)\s*[:=]\s*\S{6,}\b")

# ----------------------------------------------------
# PROMPT INJECTION & JAILBREAK PATTERNS
# ----------------------------------------------------
INJECTION_PATTERNS = [
    re.compile(r"(?i)ignore\s+(?:all\s+)?(?:previous|system|above|rules|instructions)*\s*(?:instructions|rules|prompts|directives)"),
    re.compile(r"(?i)disregard\s+(?:all\s+)?(?:previous|system|above|rules|instructions)*\s*(?:instructions|rules|prompts)"),
    re.compile(r"(?i)forget\s+(?:all\s+)?(?:previous|system|above|rules|instructions)*\s*(?:instructions|rules|prompts)"),
    re.compile(r"(?i)override\s+(?:system|safety|security)?\s*(?:rules|instructions|settings)"),
    re.compile(r"(?i)you\s+are\s+now\s+(?:dan|aim|an\s+unrestricted|free\s+from)"),
    re.compile(r"(?i)do\s+anything\s+now"),
    re.compile(r"(?i)jailbreak\s+mode"),
    re.compile(r"(?i)bypass\s+safety"),
    re.compile(r"(?i)system\s+prompt\s*:\s*"),
    re.compile(r"(?i)new\s+system\s+instruction\s*:"),
    re.compile(r"(?i)execute\s+tool\s*:\s*"),
    re.compile(r"(?i)call\s+function\s*:\s*"),
    re.compile(r"(?i)call\s+tool\s*:\s*"),
    re.compile(r"(?i)(?:repeat|print|show|reveal|output|display)\s+(?:the\s+)?(?:exact\s+)?(?:words\s+of\s+)?(?:your|the)\s+(?:system\s+prompt|initial\s+instructions|system\s+instructions)"),
    re.compile(r"(?i)what\s+(?:are|were)\s+(?:your|the)\s+(?:initial\s+instructions|system\s+instructions|system\s+prompt)"),
    re.compile(r"!\[.*?\]\(https?://[^\s\)]+[\?&](?:data|leak|token|secret|q)=.*?\)"),
]

def anonymize_pii(text: str) -> str:
    """Detects and redacts sensitive PII (credit cards, SSNs, API keys, passwords, phone numbers)."""
    if not text:
        return text

    sanitized = text
    sanitized = CREDIT_CARD_REGEX.sub('[REDACTED_CREDIT_CARD]', sanitized)
    sanitized = SSN_REGEX.sub('[REDACTED_SSN]', sanitized)
    sanitized = API_KEY_REGEX.sub('[REDACTED_API_KEY]', sanitized)
    sanitized = SECRET_REGEX.sub('[REDACTED_SECRET]', sanitized)
    sanitized = PHONE_REGEX.sub('[REDACTED_PHONE]', sanitized)

    return sanitized

def sanitize_delimiters(text: str) -> str:
    """Escapes XML/HTML tags inside user inputs/attachments to prevent delimiter breakout attacks."""
    if not text:
        return text

    sanitized = text.replace("<untrusted_user_attachment>", "&lt;untrusted_user_attachment&gt;")
    sanitized = sanitized.replace("</untrusted_user_attachment>", "&lt;/untrusted_user_attachment&gt;")
    sanitized = sanitized.replace("<untrusted_retrieved_context>", "&lt;untrusted_retrieved_context&gt;")
    sanitized = sanitized.replace("</untrusted_retrieved_context>", "&lt;/untrusted_retrieved_context&gt;")
    sanitized = sanitized.replace("<system>", "&lt;system&gt;")
    sanitized = sanitized.replace("</system>", "&lt;/system&gt;")

    return sanitized

def detect_prompt_injection(text: str) -> Tuple[bool, str]:
    """Scans input text for direct or indirect prompt injection and jailbreak attack patterns."""
    if not text:
        return False, ""

    for pattern in INJECTION_PATTERNS:
        match = pattern.search(text)
        if match:
            matched_phrase = match.group(0)
            return True, f"Detected injection pattern: '{matched_phrase}'"

    return False, ""


IMAGE_EXFILTRATION_REGEX = re.compile(r'!\[.*?\]\(https?://[^\s\)]+[\?&][a-zA-Z0-9_]+=.*?\)')

def sanitize_llm_output(text: str) -> str:
    """Sanitizes outgoing LLM output against Markdown image data exfiltration and PII leakage."""
    if not text:
        return text
    clean = anonymize_pii(text)
    clean = IMAGE_EXFILTRATION_REGEX.sub('[EXTERNAL_IMAGE_LINK_FILTERED]', clean)
    return clean
