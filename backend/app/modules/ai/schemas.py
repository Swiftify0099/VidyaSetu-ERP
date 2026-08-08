"""
VidyaSetu ERP — AI Module Schemas
====================================
"""
from typing import Optional, List
from pydantic import BaseModel, Field


class AIChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    language: str = Field(default="mr", pattern="^(mr|en)$")
    student_class: Optional[str] = None
    subject: Optional[str] = None


class AIVoiceRequest(BaseModel):
    transcript: str = Field(..., min_length=1)
    language: str = Field(default="mr", pattern="^(mr|en)$")


class HomeworkAIRequest(BaseModel):
    subject: str = Field(..., min_length=1)
    topic: str = Field(..., min_length=1)
    class_level: str = Field(..., min_length=1)
    num_questions: int = Field(default=5, ge=1, le=20)
    language: str = Field(default="en", pattern="^(mr|en)$")


class QuestionPaperAIRequest(BaseModel):
    subject: str = Field(..., min_length=1)
    class_level: str = Field(..., min_length=1)
    exam_title: str = Field(default="Unit Test")
    total_marks: int = Field(default=50, ge=10, le=100)
    topics: List[str] = Field(default_factory=list)
    language: str = Field(default="en", pattern="^(mr|en)$")


class LessonPlanAIRequest(BaseModel):
    subject: str = Field(..., min_length=1)
    topic: str = Field(..., min_length=1)
    class_level: str = Field(..., min_length=1)
    duration_minutes: int = Field(default=45, ge=15, le=120)
    language: str = Field(default="en", pattern="^(mr|en)$")


class StudentAnalysisAIRequest(BaseModel):
    student_id: int = Field(..., ge=1)


class PerformancePredictionAIRequest(BaseModel):
    student_id: int = Field(..., ge=1)
    exam_id: Optional[int] = None
