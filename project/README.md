# NOVA Support Widget

A complete, working AI customer-support widget demonstrating LLM tool calling, structured UI updates, and a genuine Retrieval-Augmented Generation (RAG) pipeline.

## Architecture

This project consists of a React frontend and a FastAPI backend. It leverages the Grok LLM for reasoning and conversation, and Google Gemini for document embeddings.

```mermaid
graph TD;
  User[Customer] --> UI[React Frontend];
  UI --> API[FastAPI Backend];
  API --> Grok[Grok LLM];
  Grok -. "Decides to call tool" .-> API;
  API --> Tool[Python Dummy Tool or RAG];
  Tool --> API;
  API --> Grok;
  Grok --> UI;
  
  subgraph RAG Pipeline
    API -. "search_knowledge" .-> Hybrid[Hybrid Search];
    Hybrid --> Qdrant[(Qdrant Vector DB)];
    Hybrid --> BM25[(In-memory BM25)];
    Qdrant --> Rerank[Reranker];
    BM25 --> Rerank;
    Rerank --> Tool;
  end
```

## How It Works

### React UI (Frontend)
- The frontend closely matches the visual fidelity of the provided assignment screenshots.
- It connects to FastAPI using standard REST for actions like tool toggling and document uploads, and uses Server-Sent Events (SSE) for real-time chat streaming.
- **Tool Visibility**: When the LLM calls a tool, the backend sends a structured `tool_call` event. The React UI instantly renders this state (`🔧 Calling...`, `🔄 Executing...`, `✓ Completed`), giving the evaluator full visibility into the AI's actions.

### Backend (FastAPI)
- Exposes minimal endpoints to power the chat experience and manage configuration.
- **`agent.py`**: Handles communication with the Grok API (via standard OpenAI-compatible REST endpoints). It streams responses, detects when Grok requests a tool, executes it locally, appends the result to the conversation context, and requests the next generation from Grok.
- **`tools.py`**: Defines standard customer support tools with dummy data (`get_customer`, `get_order_status`, etc.) and exposes their JSON Schema for the LLM.

### RAG Pipeline (`rag.py`)
- **Ingestion**: Uploaded documents (TXT, PDF, MD) have text extracted and split into 500-token chunks. Gemini generates dense embeddings (768d) for each chunk. The chunks are saved in both a Qdrant collection and an in-memory BM25 corpus.
- **Hybrid Retrieval**: When the LLM uses the `search_knowledge` tool, the user query is embedded. We perform both a dense cosine similarity search in Qdrant and a sparse keyword search using BM25.
- **Reranking**: Scores from Qdrant and BM25 are normalized and combined using configurable weights (e.g., 60% Dense / 40% Sparse). We sort the results and feed only the top 3 highest-quality chunks back to the LLM to minimize prompt bloating.

## Setup Instructions

### Environment Variables
Copy `.env.example` to `.env` in the `backend/` directory and populate your keys:
```
GROK_API_KEY=your_xai_key
GROK_MODEL=grok-beta
GEMINI_API_KEY=your_google_key
GEMINI_EMBEDDING_MODEL=models/text-embedding-004
QDRANT_URL=your_cluster_url # Leave blank for local memory testing
QDRANT_API_KEY=your_qdrant_key
```

### Running the Backend
1. Open a terminal and navigate to `project/backend`.
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the server:
   ```bash
   uvicorn main:app --reload
   ```

### Running the Frontend
1. Open a terminal and navigate to `project/frontend`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```

## Example Questions to Test

- **Tool Calling**: "Where is my order ORD-1001?" -> (Expect `get_order_status`)
- **Multiple Tools**: "Tell me my subscription and what features my plan includes for john@example.com." -> (Expect `get_subscription` then `get_product_information`)
- **RAG**: "What is the refund policy?" -> (Expect `search_knowledge`, requires a document to be uploaded first in the UI).
- **Action**: "My payment failed for john@example.com. Create a support ticket." -> (Expect `create_support_ticket`).
