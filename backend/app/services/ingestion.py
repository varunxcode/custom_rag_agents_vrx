import io

from pypdf import PdfReader

from app.db import run_query, supabase
from app.services.embeddings import embed_batch

CHUNK_SIZE_WORDS = 400
CHUNK_OVERLAP_WORDS = 50


def _extract_text(file_bytes: bytes, filename: str) -> str:
    if filename.lower().endswith(".pdf"):
        reader = PdfReader(io.BytesIO(file_bytes))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    return file_bytes.decode("utf-8", errors="ignore")


def _chunk_text(text: str) -> list[str]:
    words = text.split()
    if not words:
        return []
    step = CHUNK_SIZE_WORDS - CHUNK_OVERLAP_WORDS
    chunks = []
    for start in range(0, len(words), step):
        chunk = " ".join(words[start : start + CHUNK_SIZE_WORDS])
        if chunk.strip():
            chunks.append(chunk)
        if start + CHUNK_SIZE_WORDS >= len(words):
            break
    return chunks


async def process_document(document_id: str, file_bytes: bytes, filename: str) -> None:
    def _set_status(status: str):
        return supabase.table("documents").update({"status": status}).eq("id", document_id).execute()

    try:
        await run_query(lambda: _set_status("processing"))

        text = _extract_text(file_bytes, filename)
        chunks = _chunk_text(text)
        if not chunks:
            await run_query(lambda: _set_status("failed"))
            return

        embeddings = await embed_batch(chunks)
        rows = [
            {"document_id": document_id, "content": chunk, "embedding": embedding}
            for chunk, embedding in zip(chunks, embeddings)
        ]

        def _insert():
            return supabase.table("chunks").insert(rows).execute()

        await run_query(_insert)
        await run_query(lambda: _set_status("ready"))
    except Exception:
        await run_query(lambda: _set_status("failed"))
        raise
