"""
VidyaSetu ERP — AI Module Models
===================================
Database models for AI audit logs and request history.
"""
from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime

from app.database.base import Base


class AILog(Base):
    """
    Log of all AI module interactions (chat, homework, lesson plans, voice, analysis).
    """
    __tablename__ = "ai_logs"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True, nullable=False)

    user_id = Column(Integer, nullable=False, index=True)
    feature = Column(String(50), nullable=False, index=True)  # chat, voice, homework, question_paper, lesson_plan, student_analysis, prediction
    prompt = Column(Text, nullable=False)
    response = Column(Text, nullable=True)

    model_used = Column(String(100), nullable=True)
    tokens_used = Column(Integer, default=0, nullable=False)
    status = Column(String(20), default="success", nullable=False)  # success, error

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
