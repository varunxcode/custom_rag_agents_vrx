from fastapi import HTTPException

from app.db import run_query, supabase


async def get_owned_space(space_id: str, user_id: str) -> dict:
    def _query():
        return (
            supabase.table("spaces")
            .select("*")
            .eq("id", space_id)
            .eq("user_id", user_id)
            .execute()
        )

    result = await run_query(_query)
    if not result.data:
        raise HTTPException(status_code=404, detail="Space not found")
    return result.data[0]


async def get_owned_chat(chat_id: str, user_id: str) -> dict:
    """A chat belongs to a space, which belongs to a user; join through both."""

    def _query():
        return (
            supabase.table("chats")
            .select("*, spaces!inner(user_id)")
            .eq("id", chat_id)
            .eq("spaces.user_id", user_id)
            .execute()
        )

    result = await run_query(_query)
    if not result.data:
        raise HTTPException(status_code=404, detail="Chat not found")
    chat = result.data[0]
    chat.pop("spaces", None)
    return chat
