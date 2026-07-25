"""
VidyaSetu ERP — AI Service (OpenRouter)
==========================================
All AI features go through this service.
Uses OpenRouter API (OpenAI-compatible) with free models.
AI is restricted by role and education context.
"""
from typing import Optional
import httpx

from app.core.config import settings


class AIService:
    """
    Centralized AI service using OpenRouter API via httpx or OpenAI SDK.
    Supports any model available on OpenRouter including free ones.
    """

    @classmethod
    def chat(
        cls,
        user_message: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        conversation_history: Optional[list] = None,
    ) -> str:
        """
        Send a chat message to OpenRouter AI and get a response.
        """
        api_key = settings.OPENROUTER_API_KEY
        if not api_key:
            return "AI service is currently unconfigured. Set OPENROUTER_API_KEY to enable live responses."

        base_url = settings.OPENROUTER_BASE_URL.rstrip('/')
        chosen_model = model or settings.OPENROUTER_MODEL

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        if conversation_history:
            messages.extend(conversation_history)
        messages.append({"role": "user", "content": user_message})

        candidate_models = [
            chosen_model,
            "inclusionai/ling-3.0-flash:free",
            "google/gemma-4-31b-it:free",
            "google/gemini-2.0-flash-lite-preview-02-05:free",
            "nvidia/nemotron-3-nano-30b-a3b:free",
            "openai/gpt-oss-20b:free",
        ]
        # Remove duplicates while preserving order
        unique_models = []
        for m in candidate_models:
            if m and m not in unique_models:
                unique_models.append(m)

        last_error = ""
        with httpx.Client(timeout=30.0) as client:
            for m in unique_models:
                payload = {
                    "model": m,
                    "messages": messages,
                    "max_tokens": max_tokens or settings.OPENROUTER_MAX_TOKENS,
                    "temperature": temperature or settings.OPENROUTER_TEMPERATURE,
                }
                try:
                    resp = client.post(
                        f"{base_url}/chat/completions",
                        headers={
                            "Authorization": f"Bearer {api_key}",
                            "HTTP-Referer": settings.AI_SITE_URL,
                            "X-Title": settings.AI_SITE_NAME,
                            "Content-Type": "application/json",
                        },
                        json=payload,
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        return data["choices"][0]["message"]["content"] or ""
                    else:
                        last_error = f"Model {m} HTTP {resp.status_code}: {resp.text[:100]}"
                except Exception as e:
                    last_error = str(e)[:120]

        return f"AI response unavailable: {last_error}"

    @classmethod
    def study_assistant(
        cls,
        question: str,
        language: str = "mr",
        student_class: Optional[str] = None,
        subject: Optional[str] = None,
    ) -> str:
        """
        AI Study Assistant for students.
        Restricted to educational topics only.
        Supports Marathi and English.
        """
        pref_lang = "Marathi (मराठी)" if language == "mr" else "English"
        lang_instruction = f"""CRITICAL LANGUAGE RULE:
1. ALWAYS DETECT AND RESPOND IN THE EXACT SAME LANGUAGE IN WHICH THE USER ASKED THE QUESTION (e.g. Marathi if asked in Marathi, English if asked in English, Hindi/Hinglish if asked in Hindi/Hinglish).
2. If the user's prompt is very short or language is ambiguous, default to {pref_lang}.
3. Never switch to a different language than the user's query."""

        context = ""
        if student_class:
            context += f" Student is in Class: {student_class}."
        if subject:
            context += f" Subject: {subject}."

        system_prompt = f"""You are VidyaBot, an educational AI assistant for Indian school students.
Your ONLY purpose is to help students with:
- Academic doubts and questions
- Homework help
- Subject explanations
- Definitions and formulas
- Study tips
- Translation between Marathi, Hindi and English
- Chapter summaries
- Question explanations

{lang_instruction}
{context}

STRICT RULES:
1. Only answer educational/academic questions.
2. If asked anything non-educational, politely redirect to studies in the same language.
3. Keep answers clear and appropriate for school students.
4. Structure your response neatly with Markdown headings (###), bold text (**text**), and bullet points (-).
5. Never provide harmful or non-educational content."""

        return cls.chat(question, system_prompt=system_prompt)

    @classmethod
    def generate_homework(
        cls,
        subject: str,
        topic: str,
        class_level: str,
        num_questions: int = 5,
        language: str = "en",
    ) -> str:
        """Generate homework questions for teachers."""
        lang_instruction = "Generate in Marathi." if language == "mr" else "Generate in English."

        system_prompt = f"""You are an experienced Indian school teacher creating homework assignments.
Generate {num_questions} homework questions for:
- Subject: {subject}
- Topic: {topic}
- Class: {class_level}
{lang_instruction}

Format the output clearly with:
1. Question number
2. The question
3. Expected answer format (short/long/numerical)
4. Marks allocation

Ensure questions are appropriate for the class level and cover the topic comprehensively."""

        return cls.chat(
            f"Create homework for {subject}, topic: {topic}, class: {class_level}",
            system_prompt=system_prompt,
        )

    @classmethod
    def generate_lesson_plan(
        cls,
        subject: str,
        topic: str,
        class_level: str,
        duration_minutes: int = 45,
        language: str = "en",
    ) -> str:
        """Generate a lesson plan for teachers."""
        lang_instruction = "Generate in Marathi." if language == "mr" else "Generate in English."

        system_prompt = f"""You are an expert curriculum designer for Indian schools.
Create a detailed lesson plan for:
- Subject: {subject}
- Topic: {topic}
- Class: {class_level}
- Duration: {duration_minutes} minutes
{lang_instruction}

Include:
1. Learning Objectives
2. Materials Required
3. Introduction (5 min)
4. Main Teaching Activity (step by step)
5. Student Activity/Practice
6. Assessment/Questions
7. Homework Suggestion
8. Teaching Methods
Follow NCERT/State Board guidelines."""

        return cls.chat(
            f"Lesson plan for {subject}, {topic}, class {class_level}",
            system_prompt=system_prompt,
        )

    @classmethod
    def is_available(cls) -> bool:
        """Check if AI service is configured."""
        return bool(settings.OPENROUTER_API_KEY)
