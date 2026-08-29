// Base backend API URL configured via Vite environment variable VITE_BACKEND_URL
const rawBackendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
export const BACKEND_URL = rawBackendUrl.replace(/\/+$/, "");
export const API_URL = `${BACKEND_URL}/api`;

// Admin API Key for protected endpoints
export const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY || "gleap_admin_secret_key_123";

const authHeaders = {
  "X-API-Key": ADMIN_API_KEY
};

export async function uploadKnowledge(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_URL}/knowledge/upload`, {
    method: "POST",
    headers: {
      ...authHeaders
    },
    body: formData,
  });
  return response.json();
}

export async function getKnowledgeSources() {
  const response = await fetch(`${API_URL}/knowledge`, { headers: { ...authHeaders } });
  return response.json();
}

export async function deleteKnowledgeSource(documentName) {
  const response = await fetch(`${API_URL}/knowledge/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders
    },
    body: JSON.stringify({ document_name: documentName }),
  });
  return response.json();
}

export async function getSystemPrompt() {
  const response = await fetch(`${API_URL}/system-prompt`, { headers: { ...authHeaders } });
  return response.json();
}

export async function updateSystemPrompt(prompt) {
  const response = await fetch(`${API_URL}/system-prompt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders
    },
    body: JSON.stringify({ prompt }),
  });
  return response.json();
}

export async function getTools() {
  const response = await fetch(`${API_URL}/tools`);
  return response.json();
}

export async function toggleTool(toolName, enabled) {
  const response = await fetch(`${API_URL}/tools/toggle`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders
    },
    body: JSON.stringify({ tool_name: toolName, enabled }),
  });
  return response.json();
}

export async function getConversations() {
  const response = await fetch(`${API_URL}/conversations`, { headers: { ...authHeaders } });
  return response.json();
}
