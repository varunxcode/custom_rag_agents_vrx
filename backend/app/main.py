import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import chats, documents, messages, spaces
from app.services.cleanup import delete_expired_guest_spaces

logger = logging.getLogger(__name__)

GUEST_CLEANUP_INTERVAL_SECONDS = 15 * 60


async def _guest_cleanup_loop():
    while True:
        await asyncio.sleep(GUEST_CLEANUP_INTERVAL_SECONDS)
        try:
            await delete_expired_guest_spaces()
        except Exception:
            logger.exception("Guest space cleanup sweep failed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(_guest_cleanup_loop())
    yield
    task.cancel()


app = FastAPI(title="RAG Chatbots API", lifespan=lifespan)

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
