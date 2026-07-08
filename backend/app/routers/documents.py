import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile

from app.auth import get_current_user_id
from app.config import settings
from app.db import run_query, supabase
from app.models import Document
from app.services.ingestion import process_document
from app.services.ownership import get_owned_space

router = APIRouter(tags=["documents"])

ALLOWED_EXTENSIONS = (".txt", ".md", ".pdf")


@router.post("/spaces/{space_id}/documents", response_model=Document, status_code=201)
async def upload_document(
    space_id: str,
    file: UploadFile,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
):
    await get_owned_space(space_id, user_id)

    if not file.filename.lower().endswith(ALLOWED_EXTENSIONS):
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.filename}")

    file_bytes = await file.read()
    storage_path = f"{space_id}/{uuid.uuid4()}_{file.filename}"

    def _upload():
        return supabase.storage.from_(settings.documents_bucket).upload(
            storage_path, file_bytes, {"content-type": file.content_type or "application/octet-stream"}
        )

    await run_query(_upload)

    def _insert():
        return (
            supabase.table("documents")
            .insert(
                {
                    "space_id": space_id,
                    "file_url": storage_path,
                    "filename": file.filename,
                    "status": "pending",
                }
            )
            .execute()
        )

    result = await run_query(_insert)
    document = result.data[0]

    background_tasks.add_task(process_document, document["id"], file_bytes, file.filename)

    return document


@router.get("/spaces/{space_id}/documents", response_model=list[Document])
async def list_documents(space_id: str, user_id: str = Depends(get_current_user_id)):
    await get_owned_space(space_id, user_id)

    def _query():
        return (
            supabase.table("documents")
            .select("*")
            .eq("space_id", space_id)
            .order("created_at", desc=True)
            .execute()
        )

    result = await run_query(_query)
    return result.data


@router.delete("/documents/{document_id}", status_code=204)
async def delete_document(document_id: str, user_id: str = Depends(get_current_user_id)):
    def _query():
        return (
            supabase.table("documents")
            .select("*, spaces!inner(user_id)")
            .eq("id", document_id)
            .eq("spaces.user_id", user_id)
            .execute()
        )

    result = await run_query(_query)
    if not result.data:
        raise HTTPException(status_code=404, detail="Document not found")
    document = result.data[0]

    def _remove_file():
        return supabase.storage.from_(settings.documents_bucket).remove([document["file_url"]])

    await run_query(_remove_file)

    def _delete():
        return supabase.table("documents").delete().eq("id", document_id).execute()

    await run_query(_delete)
