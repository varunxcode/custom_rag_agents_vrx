from app.db import run_query, supabase


async def get_relevant_chunks(space_id: str, query_embedding: list[float], k: int = 5) -> list[str]:
    def _query():
        return supabase.rpc(
            "match_chunks",
            {
                "query_embedding": query_embedding,
                "match_space_id": space_id,
                "match_count": k,
            },
        ).execute()

    result = await run_query(_query)
    return [row["content"] for row in result.data]
