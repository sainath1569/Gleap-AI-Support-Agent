export const API_URL = "http://localhost:8000/api";

export async function uploadKnowledge(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_URL}/knowledge/upload`, {
    method: "POST",
    body: formData,
  });
  return response.json();
}

export async function getKnowledgeSources() {
  const response = await fetch(`${API_URL}/knowledge`);
  return response.json();
}

export async function deleteKnowledgeSource(documentName) {
  const response = await fetch(`${API_URL}/knowledge/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ document_name: documentName }),
  });
  return response.json();
}

export async function getSystemPrompt() {
  const response = await fetch(`${API_URL}/system-prompt`);
  return response.json();
}

export async function updateSystemPrompt(prompt) {
  const response = await fetch(`${API_URL}/system-prompt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
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
    },
    body: JSON.stringify({ tool_name: toolName, enabled }),
  });
  return response.json();
}

export async function getConversations() {
  const response = await fetch(`${API_URL}/conversations`);
  return response.json();
}
