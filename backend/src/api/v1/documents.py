"""Documents API — CRUD + AI-powered note generation."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.document_service import DocumentService
from src.domain.models.user import User
from src.domain.schemas.common import ApiResponse, PaginatedResponse
from src.domain.schemas.document import (
    CreateNoteRequest,
    GenerateNoteRequest,
    NoteOut,
)
from src.infra.database import get_db
from src.infra.security import get_current_user

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("", response_model=ApiResponse[PaginatedResponse[NoteOut]])
async def list_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all documents for the current user, newest first."""
    result = await DocumentService.list_documents(
        db, str(user.id), page=page, page_size=page_size
    )
    return {"data": result}


@router.get("/{doc_id}", response_model=ApiResponse[NoteOut])
async def get_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get a single document by ID."""
    doc = await DocumentService.get_document(db, str(user.id), doc_id)
    return {"data": doc}


@router.post("", response_model=ApiResponse[NoteOut], status_code=201)
async def create_document(
    body: CreateNoteRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Manually create a new document."""
    doc = await DocumentService.create_document(
        db,
        str(user.id),
        title=body.title,
        content=body.content,
        tag=body.tag,
    )
    return {"data": doc}


@router.delete("/{doc_id}", status_code=204)
async def delete_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a document."""
    await DocumentService.delete_document(db, str(user.id), doc_id)


@router.post("/generate", response_model=ApiResponse[NoteOut], status_code=201)
async def generate_note(
    body: GenerateNoteRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generate a structured note from chat messages using AI."""
    doc = await DocumentService.generate_from_chat(db, str(user.id), body)
    return {"data": doc}
