from fastapi import APIRouter, Depends

from app.auth import get_current_user_id
from app.db import run_query, supabase
from app.models import Chat, ChatCreate
from app.services.ownership import get_owned_chat, get_owned_space

router = APIRouter(tags=["chats"])


@router.post("/spaces/{space_id}/chats", response_model=Chat, status_code=201)
async def create_chat(space_id: str, body: ChatCreate, user_id: str = Depends(get_current_user_id)):
    await get_owned_space(space_id, user_id)

    def _insert():
        return supabase.table("chats").insert({"space_id": space_id, "title": body.title}).execute()

    result = await run_query(_insert)
    return result.data[0]


@router.get("/spaces/{space_id}/chats", response_model=list[Chat])
async def list_chats(space_id: str, user_id: str = Depends(get_current_user_id)):
    await get_owned_space(space_id, user_id)

    def _query():
        return (
            supabase.table("chats")
            .select("*")
            .eq("space_id", space_id)
            .order("created_at", desc=True)
            .execute()
        )

    result = await run_query(_query)
    return result.data


@router.delete("/chats/{chat_id}", status_code=204)
async def delete_chat(chat_id: str, user_id: str = Depends(get_current_user_id)):
    await get_owned_chat(chat_id, user_id)

    def _delete():
        return supabase.table("chats").delete().eq("id", chat_id).execute()

    await run_query(_delete)
