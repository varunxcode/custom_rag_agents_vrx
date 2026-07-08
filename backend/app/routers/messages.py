import logging

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.auth import get_current_user_id
from app.db import run_query, supabase
from app.models import Message, MessageCreate
from app.services.embeddings import embed_text
from app.services.llm import stream_chat_response
from app.services.ownership import get_owned_chat, get_owned_space
from app.services.retrieval import get_relevant_chunks

logger = logging.getLogger(__name__)

router = APIRouter(tags=["messages"])

FALLBACK_ERROR_MESSAGE = (
    "Sorry, the AI model is temporarily unavailable (high demand or a transient error "
    "on Google's side). Please try sending your message again in a moment."
)

TITLE_MAX_WORDS = 8
TITLE_MAX_CHARS = 60


def _title_from_message(content: str) -> str:
    words = content.strip().split()
    title = " ".join(words[:TITLE_MAX_WORDS])
    if len(title) > TITLE_MAX_CHARS:
        title = title[:TITLE_MAX_CHARS].rstrip()
    if len(words) > TITLE_MAX_WORDS or len(title) < len(content.strip()):
        title += "..."
    return title


@router.get("/chats/{chat_id}/messages", response_model=list[Message])
async def list_messages(chat_id: str, user_id: str = Depends(get_current_user_id)):
    await get_owned_chat(chat_id, user_id)

    def _query():
        return (
            supabase.table("messages")
            .select("*")
            .eq("chat_id", chat_id)
            .order("created_at")
            .execute()
        )

    result = await run_query(_query)
    return result.data


@router.post("/chats/{chat_id}/messages")
async def send_message(chat_id: str, body: MessageCreate, user_id: str = Depends(get_current_user_id)):
    chat = await get_owned_chat(chat_id, user_id)
    space = await get_owned_space(chat["space_id"], user_id)

    def _history_query():
        return (
            supabase.table("messages")
            .select("role, content")
            .eq("chat_id", chat_id)
            .order("created_at")
            .execute()
        )

    history_result = await run_query(_history_query)
    history = history_result.data

    if not history and chat["title"] == "New Chat":
        title = _title_from_message(body.content)

        def _update_title():
            return supabase.table("chats").update({"title": title}).eq("id", chat_id).execute()

        await run_query(_update_title)

    def _insert_user_message():
        return (
            supabase.table("messages")
            .insert({"chat_id": chat_id, "role": "user", "content": body.content})
            .execute()
        )

    await run_query(_insert_user_message)

    async def event_stream():
        full_response = []
        try:
            query_embedding = await embed_text(body.content)
            context_chunks = await get_relevant_chunks(space["id"], query_embedding)
            async for token in stream_chat_response(
                instructions=space["instructions"],
                context_chunks=context_chunks,
                history=history,
                user_message=body.content,
            ):
                full_response.append(token)
                yield token
        except Exception as exc:
            logger.exception("Message handling failed for chat %s", chat_id)
            message = getattr(exc, "message", None) or str(exc) or FALLBACK_ERROR_MESSAGE
            note = message if not full_response else f"\n\n[Error: {message}]"
            full_response.append(note)
            yield note

        def _insert_assistant_message():
            return (
                supabase.table("messages")
                .insert({"chat_id": chat_id, "role": "assistant", "content": "".join(full_response)})
                .execute()
            )

        await run_query(_insert_assistant_message)

    return StreamingResponse(event_stream(), media_type="text/event-stream")
