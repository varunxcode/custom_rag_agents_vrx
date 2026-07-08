# Custom_RAG_Agents

Multi-tenant RAG app: create a Space, upload documents into it, set custom instructions, then chat with an LLM scoped to that Space's documents. Entirely on free tiers (Supabase + Google AI Studio + Vercel + Render).


## Setup

### 1. Supabase
1. Create a project at supabase.com (free tier).
2. SQL Editor → run [`backend/sql/schema.sql`](backend/sql/schema.sql).
3. Storage → New bucket named `documents`, keep it private (not public).
4. Project Settings → API → copy the `Project URL`, `Publishable key`, and `Secret key`. (No JWT secret needed — the backend verifies tokens against Supabase's public JWKS endpoint.)

### 2. Google AI Studio (free tier)
Get a key at aistudio.google.com/apikey — used for both chat (Gemma/Gemini) and embeddings.

### 3. Backend (FastAPI)
```
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows
pip install -r requirements.txt
copy .env.example .env       # then fill in the values from steps 1-2
uvicorn app.main:app --reload
```
Runs at http://localhost:8000. Check http://localhost:8000/health.

### 4. Frontend (Next.js)
```
cd frontend
npm install
copy .env.local.example .env.local   # fill in Supabase URL/anon key + backend URL
npm run dev
```
Runs at http://localhost:3000.

### 5. Deploy (both free tier)
- **Backend → Render**: New Web Service from `backend/`. Build: `pip install -r requirements.txt`. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Add the same env vars as `.env`.
- **Frontend → Vercel**: Import `frontend/`. Add the same env vars as `.env.local`, with `NEXT_PUBLIC_API_URL` pointing at the Render URL.

Note: Render's free tier spins the service down after inactivity, so the first request after idling takes ~30-50s to wake up — expected for a demo, not a bug.
