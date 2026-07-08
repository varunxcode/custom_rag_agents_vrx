from fastapi import APIRouter, Depends

from app.auth import get_current_user_id, get_current_user_is_guest
from app.db import run_query, supabase
from app.models import Space, SpaceCreate, SpaceUpdate
from app.services.cleanup import delete_expired_guest_spaces
from app.services.ownership import get_owned_space

router = APIRouter(prefix="/spaces", tags=["spaces"])


@router.post("", response_model=Space, status_code=201)
async def create_space(
    body: SpaceCreate,
    user_id: str = Depends(get_current_user_id),
    is_guest: bool = Depends(get_current_user_is_guest),
):
    def _insert():
        return (
            supabase.table("spaces")
            .insert(
                {
                    "user_id": user_id,
                    "name": body.name,
                    "instructions": body.instructions,
                    "is_guest": is_guest,
                }
            )
            .execute()
        )

    result = await run_query(_insert)
    return result.data[0]


@router.get("", response_model=list[Space])
async def list_spaces(user_id: str = Depends(get_current_user_id)):
    await delete_expired_guest_spaces(user_id)

    def _query():
        return (
            supabase.table("spaces")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )

    result = await run_query(_query)
    return result.data


@router.get("/{space_id}", response_model=Space)
async def get_space(space_id: str, user_id: str = Depends(get_current_user_id)):
    return await get_owned_space(space_id, user_id)


@router.patch("/{space_id}", response_model=Space)
async def update_space(space_id: str, body: SpaceUpdate, user_id: str = Depends(get_current_user_id)):
    await get_owned_space(space_id, user_id)
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        return await get_owned_space(space_id, user_id)

    def _update():
        return supabase.table("spaces").update(updates).eq("id", space_id).execute()

    result = await run_query(_update)
    return result.data[0]


@router.delete("/{space_id}", status_code=204)
async def delete_space(space_id: str, user_id: str = Depends(get_current_user_id)):
    await get_owned_space(space_id, user_id)

    def _delete():
        return supabase.table("spaces").delete().eq("id", space_id).execute()

    await run_query(_delete)
