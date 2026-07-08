from datetime import datetime, timedelta, timezone

from app.config import settings
from app.db import run_query, supabase

GUEST_TTL = timedelta(hours=1)


async def delete_expired_guest_spaces(user_id: str | None = None) -> None:
    cutoff = (datetime.now(timezone.utc) - GUEST_TTL).isoformat()

    def _find_expired():
        query = (
            supabase.table("spaces")
            .select("id")
            .eq("is_guest", True)
            .lt("created_at", cutoff)
        )
        if user_id is not None:
            query = query.eq("user_id", user_id)
        return query.execute()

    expired = await run_query(_find_expired)

    for space in expired.data:
        space_id = space["id"]

        def _list_documents():
            return supabase.table("documents").select("file_url").eq("space_id", space_id).execute()

        documents = await run_query(_list_documents)
        file_paths = [doc["file_url"] for doc in documents.data]
        if file_paths:
            def _remove_files():
                return supabase.storage.from_(settings.documents_bucket).remove(file_paths)

            await run_query(_remove_files)

        def _delete_space():
            return supabase.table("spaces").delete().eq("id", space_id).execute()

        await run_query(_delete_space)
