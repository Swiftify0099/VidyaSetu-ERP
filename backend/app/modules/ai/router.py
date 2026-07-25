"""
VidyaSetu ERP — AI Module API Router
======================================
Comprehensive AI features endpoints.
"""
from fastapi import APIRouter, Depends, status, HTTPException

from app.core.dependencies import AuthUser, DBSession, require_permission
from app.modules.ai.schemas import (
    AIChatRequest, AIVoiceRequest, HomeworkAIRequest,
    QuestionPaperAIRequest, LessonPlanAIRequest,
    StudentAnalysisAIRequest, PerformancePredictionAIRequest,
)
from app.modules.ai.service import AIModuleService
from app.shared.responses import APIResponse

router = APIRouter(prefix="/ai", tags=["AI Module"])


@router.post("/chat", response_model=APIResponse)
async def ai_chat(
    body: AIChatRequest,
    current_user: AuthUser,
    db: DBSession,
):
    """AI Study Assistant Chatbot."""
    reply = AIModuleService.chat_study_assistant(
        db, current_user.user_id, body.message, body.language, body.student_class, body.subject
    )
    return APIResponse.ok(data={"reply": reply}, message="AI response generated.")


@router.post("/voice", response_model=APIResponse)
async def ai_voice(
    body: AIVoiceRequest,
    current_user: AuthUser,
    db: DBSession,
):
    """AI Voice Assistant query processor."""
    reply = AIModuleService.process_voice_command(db, current_user.user_id, body.transcript, body.language)
    return APIResponse.ok(data={"reply": reply}, message="Voice prompt processed.")


@router.post("/homework", response_model=APIResponse)
async def ai_homework(
    body: HomeworkAIRequest,
    current_user: AuthUser,
    db: DBSession,
):
    """Generate homework assignment via AI."""
    homework = AIModuleService.generate_homework(
        db, current_user.user_id, body.subject, body.topic, body.class_level, body.num_questions, body.language
    )
    return APIResponse.ok(data={"content": homework}, message="Homework created successfully.")


@router.post("/question-paper", response_model=APIResponse)
async def ai_question_paper(
    body: QuestionPaperAIRequest,
    current_user: AuthUser,
    db: DBSession,
):
    """Generate question paper via AI."""
    paper = AIModuleService.generate_question_paper(
        db, current_user.user_id, body.subject, body.class_level, body.exam_title, body.total_marks, body.topics, body.language
    )
    return APIResponse.ok(data={"question_paper": paper}, message="Question paper generated.")


@router.post("/lesson-plan", response_model=APIResponse)
async def ai_lesson_plan(
    body: LessonPlanAIRequest,
    current_user: AuthUser,
    db: DBSession,
):
    """Generate lesson plan via AI."""
    plan = AIModuleService.generate_lesson_plan(
        db, current_user.user_id, body.subject, body.topic, body.class_level, body.duration_minutes, body.language
    )
    return APIResponse.ok(data={"lesson_plan": plan}, message="Lesson plan generated.")


@router.post("/student-analysis", response_model=APIResponse)
async def ai_student_analysis(
    body: StudentAnalysisAIRequest,
    current_user: AuthUser,
    db: DBSession,
):
    """Generate student strength and improvement analysis via AI."""
    try:
        analysis = AIModuleService.analyze_student(db, current_user.user_id, body.student_id)
        return APIResponse.ok(data=analysis, message="Student analysis generated.")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/performance-prediction", response_model=APIResponse)
async def ai_performance_prediction(
    body: PerformancePredictionAIRequest,
    current_user: AuthUser,
    db: DBSession,
):
    """Predict student exam performance via AI."""
    try:
        pred = AIModuleService.predict_performance(db, current_user.user_id, body.student_id)
        return APIResponse.ok(data=pred, message="Performance prediction generated.")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
