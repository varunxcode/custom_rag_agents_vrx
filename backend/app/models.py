from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class SpaceCreate(BaseModel):
    name: str
    instructions: str = ""


class SpaceUpdate(BaseModel):
    name: str | None = None
    instructions: str | None = None


class Space(BaseModel):
    id: str
    user_id: str
    name: str
    instructions: str
    is_guest: bool = False
    created_at: datetime


class Document(BaseModel):
    id: str
    space_id: str
    file_url: str
    filename: str
    status: Literal["pending", "processing", "ready", "failed"]
    created_at: datetime


class ChatCreate(BaseModel):
    title: str = "New Chat"


class Chat(BaseModel):
    id: str
    space_id: str
    title: str
    created_at: datetime


class MessageCreate(BaseModel):
    content: str


class Message(BaseModel):
    id: str
    chat_id: str
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime
