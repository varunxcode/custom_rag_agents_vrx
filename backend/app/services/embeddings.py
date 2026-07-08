from google import genai
from google.genai import types

from app.config import settings

_client = genai.Client(api_key=settings.google_api_key)

# Matches the `vector(768)` column in sql/schema.sql. gemini-embedding-001
# defaults to 3072-dim output but supports MRL truncation via output_dimensionality.
_EMBED_CONFIG = types.EmbedContentConfig(output_dimensionality=768)


async def embed_text(text: str) -> list[float]:
    result = await _client.aio.models.embed_content(
        model=settings.gemini_embed_model,
        contents=text,
        config=_EMBED_CONFIG,
    )
    return result.embeddings[0].values


async def embed_batch(texts: list[str]) -> list[list[float]]:
    result = await _client.aio.models.embed_content(
        model=settings.gemini_embed_model,
        contents=texts,
        config=_EMBED_CONFIG,
    )
    return [e.values for e in result.embeddings]
