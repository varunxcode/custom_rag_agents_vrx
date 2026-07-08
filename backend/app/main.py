from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import chats, documents, messages, spaces

app = FastAPI(title="RAG Spaces API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(spaces.router)
app.include_router(documents.router)
app.include_router(chats.router)
app.include_router(messages.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
