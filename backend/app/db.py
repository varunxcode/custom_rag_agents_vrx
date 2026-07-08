from typing import Callable, TypeVar

from starlette.concurrency import run_in_threadpool
from supabase import create_client, Client

from app.config import settings

# Service-role client: bypasses RLS, so every query below must filter by the
# authenticated user's ownership explicitly (see routers/). RLS is still
# enabled in Postgres as defense-in-depth for any future direct client access.
supabase: Client = create_client(settings.supabase_url, settings.supabase_service_role_key)

T = TypeVar("T")


async def run_query(fn: Callable[[], T]) -> T:
    """supabase-py is sync/blocking; hop to a thread so it doesn't stall the event loop
    (which matters here since chat responses are streamed to other concurrent users)."""
    return await run_in_threadpool(fn)
