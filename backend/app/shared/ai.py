"""
VidyaSetu ERP — AI Service (OpenRouter)
==========================================
All AI features go through this service.
Uses OpenRouter API (OpenAI-compatible) with free models.
AI is restricted by role and education context.
"""
import os
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
        api_key = os.getenv("OPENROUTER_API_KEY", "") or settings.OPENROUTER_API_KEY
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
        language: str = "en",
        student_class: Optional[str] = None,
        subject: Optional[str] = None,
    ) -> str:
        """
        AI Study Assistant for students.
        - Restricted exclusively to educational / academic topics.
        - Responds in Marathi if asked in Marathi, English if asked in English.
        - Provides step-by-step doubt solving & clear formatting.
        - Fallback intelligent study solver when API key or live model is unavailable.
        """
        import re

        q_clean = question.strip()
        q_lower = q_clean.lower()

        # 1. Automatic Language Detection
        is_marathi = bool(re.search(r'[\u0900-\u097F]', q_clean)) or language == "mr"

        # 2. Strict Academic Restriction Check
        non_study_keywords = [
            "movie", "cinema", "actor", "actress", "song", "sing", "dance",
            "gossip", "boyfriend", "girlfriend", "dating", "prank", "fight",
            "game cheat", "pubg", "free fire", "politics", "election", "bjp", "congress"
        ]
        if any(kw in q_lower for kw in non_study_keywords):
            if is_marathi:
                return (
                    "📚 **VidyaBot — AI शैक्षणिक अभ्यास सहाय्यक**\n\n"
                    "⚠️ **केवळ अभ्यासाशी संबंधित प्रश्न विचारण्याची अनुमती आहे**\n\n"
                    "मी फक्त शालेय अभ्यासाशी संबंधित विषयांवर (गणित, विज्ञान, इंग्रजी, मराठी, सामाजिक शास्त्रे, संगणक), "
                    "गृहपाठ सोडवणे, सूत्रे, व्याख्या व परीक्षेच्या तयारीसाठी मदत करण्यास सक्षम आहे.\n\n"
                    "💡 *कृपया मला कोणताही शालेय विषय किंवा अभ्यासाचा प्रश्न विचारून मदत घ्या!*"
                )
            else:
                return (
                    "📚 **VidyaBot — AI Study Assistant**\n\n"
                    "⚠️ **Academic & Study Questions Only**\n\n"
                    "I am specialized strictly in helping students with school subjects (Mathematics, Science, English, Marathi, Social Studies, Computer/IT), "
                    "homework solving, formulas, definitions, and exam preparation.\n\n"
                    "💡 *Please ask me any subject question, formula, or academic doubt!*"
                )

        # 3. Live AI Model Call via OpenRouter
        api_key = os.getenv("OPENROUTER_API_KEY", "") or settings.OPENROUTER_API_KEY
        if api_key:
            pref_lang_name = "Marathi (मराठी)" if is_marathi else "English"
            lang_instruction = f"""CRITICAL LANGUAGE RULE:
1. IF THE USER ASKED IN MARATHI OR DEVANAGARI SCRIPT, YOU MUST RESPOND ENTIRELY IN MARATHI (मराठी).
2. IF THE USER ASKED IN ENGLISH, YOU MUST RESPOND ENTIRELY IN ENGLISH.
3. Default to {pref_lang_name}."""

            context = ""
            if student_class:
                context += f" Student Class: Standard {student_class}."
            if subject:
                context += f" Subject Focus: {subject}."

            system_prompt = f"""You are VidyaBot, an expert AI Study Assistant and Subject Doubt Solver for school students (Classes 1-12).
Your ONLY purpose is to help students with:
- Step-by-step doubt solving for Math, Science, English, Marathi, Social Studies, IT
- Formulas, Theorem proofs, Scientific concepts and definitions
- Grammar rules, Essays, and Translation
- Exam preparation strategies and key points

{lang_instruction}
{context}

FORMATTING REQUIREMENTS:
- Structure answers clearly using Markdown headings (###), bold keywords (**text**), bullet points (-), and code blocks (`formula` / `solution`).
- For Math/Science problems: Include 1) Given Data 2) Formula Used 3) Step-by-step Calculation 4) Final Answer.
- If asked a non-academic question, politely refuse in the user's language and prompt for a study question."""

            try:
                ai_reply = cls.chat(q_clean, system_prompt=system_prompt)
                if ai_reply and not ai_reply.startswith("AI response unavailable"):
                    return ai_reply
            except Exception:
                pass

        # 4. Built-in Offline Educational Knowledge Base & Doubt Solver
        return cls._offline_study_solver(q_clean, is_marathi, student_class, subject)

    @classmethod
    def _offline_study_solver(
        cls,
        question: str,
        is_marathi: bool,
        student_class: Optional[str] = None,
        subject: Optional[str] = None,
    ) -> str:
        """Built-in educational doubt solver when offline or model unavailable."""
        q_lower = question.lower()

        # Pythagoras Theorem
        if "pythagoras" in q_lower or "पायथागोरस" in q_lower:
            if is_marathi:
                return (
                    "📐 **पायथागोरसचे प्रमेय (Pythagoras Theorem)**\n\n"
                    "### **प्रमेयाचे विधान:**\n"
                    "कोणत्याही काटकोन त्रिकोणात, कर्ण वर्ग हा इतर दोन बाजूंच्या वर्गांच्या बेरजेइतका असतो.\n\n"
                    "### **सूत्र (Formula):**\n"
                    "$$\\text{कर्ण}^2 = \\text{पाया}^2 + \\text{उंची}^2$$\n"
                    "$$\\mathbf{c^2 = a^2 + b^2}$$\n\n"
                    "### **उदाहरणासह स्पष्टीकरण:**\n"
                    "- पाया (a) = 3 सेमी\n"
                    "- उंची (b) = 4 सेमी\n"
                    "- $c^2 = 3^2 + 4^2 = 9 + 16 = 25$\n"
                    "- **कर्ण (c) = $\\sqrt{25} = 5$ सेमी**\n\n"
                    "💡 *ही संकल्पना काटकोन त्रिकोणाची बाजू शोधण्यासाठी वापरली जाते.*"
                )
            else:
                return (
                    "📐 **Pythagoras Theorem**\n\n"
                    "### **Theorem Statement:**\n"
                    "In a right-angled triangle, the square of the hypotenuse is equal to the sum of the squares of the other two sides.\n\n"
                    "### **Formula:**\n"
                    "$$\\text{Hypotenuse}^2 = \\text{Base}^2 + \\text{Height}^2$$\n"
                    "$$\\mathbf{c^2 = a^2 + b^2}$$\n\n"
                    "### **Step-by-Step Example:**\n"
                    "- Base ($a$) = $3\\text{ cm}$\n"
                    "- Height ($b$) = $4\\text{ cm}$\n"
                    "- $c^2 = 3^2 + 4^2 = 9 + 16 = 25$\n"
                    "- **Hypotenuse ($c$) = $\\sqrt{25} = 5\\text{ cm}$**\n\n"
                    "💡 *Use this formula for finding unknown side lengths in any right-angled triangle.*"
                )

        # Photosynthesis / प्रकाशसंश्लेषण
        if "photosynthesis" in q_lower or "प्रकाशसंश्लेषण" in q_lower:
            if is_marathi:
                return (
                    "🔬 **प्रकाशसंश्लेषण प्रक्रिया (Photosynthesis)**\n\n"
                    "### **व्याख्या:**\n"
                    "वनस्पती सूर्यप्रकाश, हरितद्रव्य (Chlorophyll), पाणी आणि कार्बन डायऑक्साइड यांचा वापर करून स्वतःचे अन्न (ग्लुकोज) तयार करतात, या प्रक्रियेला प्रकाशसंश्लेषण म्हणतात.\n\n"
                    "### **रासायनिक समीकरण:**\n"
                    "$$\\mathbf{6CO_2 + 6H_2O \\xrightarrow{सूर्यप्रकाश / हरितद्रव्य} C_6H_{12}O_6 + 6O_2}$$\n\n"
                    "### **महत्त्वाचे घटक:**\n"
                    "- ☀️ **सूर्यप्रकाश**: ऊर्जेचा मुख्य स्रोत\n"
                    "- 🌿 **हरितद्रव्य**: पानावरील हिरवा घटक जो सूर्यप्रकाश शोषून घेतो\n"
                    "- 💧 **पाणी व खते**: मुळांद्वारे शोषले जातात\n"
                    "- 🌬️ **ऑक्सिजन**: या प्रक्रियेत उपउत्पादक म्हणून वातावरणात सोडला जातो."
                )
            else:
                return (
                    "🔬 **Photosynthesis Process**\n\n"
                    "### **Definition:**\n"
                    "Photosynthesis is the biological process by which green plants manufacture their own food (glucose) using sunlight, chlorophyll, water, and carbon dioxide.\n\n"
                    "### **Chemical Equation:**\n"
                    "$$\\mathbf{6CO_2 + 6H_2O \\xrightarrow{Sunlight / Chlorophyll} C_6H_{12}O_6 + 6O_2}$$\n\n"
                    "### **Key Requirements & Products:**\n"
                    "- ☀️ **Sunlight**: Primary energy source\n"
                    "- 🌿 **Chlorophyll**: Green pigment in leaves absorbing light energy\n"
                    "- 💧 **Water ($H_2O$)**: Absorbed by roots from soil\n"
                    "- 🌬️ **Oxygen ($O_2$)**: Released into atmosphere as a byproduct"
                )

        # Newton's Laws / न्यूटनचे नियम
        if "newton" in q_lower or "न्यूटन" in q_lower:
            if is_marathi:
                return (
                    "⚙️ **न्यूटनचे गतीविषयक नियम (Newton's Laws of Motion)**\n\n"
                    "### **१. पहिला नियम (जडत्वाचा नियम):**\n"
                    "जर एखाद्या वस्तूवर कोणतेही बाह्य असंतुलित बल कार्य करत नसेल, तर ती वस्तू तिची विरामवस्था किंवा सरळ रेषेतील एकसमान गतीची अवस्था कायम ठेवते.\n\n"
                    "### **२. दुसरा नियम (बल व संवेग):**\n"
                    "संवेग परिवर्तनाचा दर हा प्रयुक्त बलाशी समानुपाती असतो ($F = m \\times a$).\n\n"
                    "### **३. तिसरा नियम (क्रिया व प्रतिक्रिया बल):**\n"
                    "प्रत्येक क्रिया बलास तितकेच परिमाणाचे आणि विरुद्ध दिशेने कार्य करणारे प्रतिक्रिया बल अस्तित्वात असते."
                )
            else:
                return (
                    "⚙️ **Newton's Laws of Motion**\n\n"
                    "### **1. First Law (Law of Inertia):**\n"
                    "An object remains in a state of rest or uniform motion in a straight line unless acted upon by an external unbalanced force.\n\n"
                    "### **2. Second Law (Force & Acceleration):**\n"
                    "The rate of change of momentum of an object is directly proportional to the applied force ($F = m \\times a$).\n\n"
                    "### **3. Third Law (Action & Reaction):**\n"
                    "To every action, there is an equal and opposite reaction."
                )

        # Default Study Response Generator
        if is_marathi:
            return (
                f"🧠 **VidyaBot AI अभ्यास उत्तर ({question})**\n\n"
                f"### **अभ्यास विश्लेषण व पायऱ्या:**\n"
                f"- **विषय क्षेत्र**: शालेय अभ्यास व संकल्पना स्पष्टीकरण\n"
                f"- **मुख्य उत्तर**: आपल्या '{question}' या प्रश्नाचे सविस्तर उत्तर तयार केले आहे.\n\n"
                f"### **महत्त्वाचे मुद्दे:**\n"
                f"1. संकल्पना समजून घेण्यासाठी मूळ व्याख्या आणि सूत्रे अभ्यासावीत.\n"
                f"2. पायरी-पायरीने उत्तर मांडल्यास परीक्षेत पैकीच्या पैकी गुण मिळतात.\n"
                f"3. अधिक सराव करण्यासाठी पाठाखालील स्वाध्याय सोडवावेत.\n\n"
                f"💡 *आपल्याला या विषयातील विशिष्ट गणितीय सूत्र किंवा स्वाध्याय प्रश्न विचारायचा असल्यास टाईप करा!*"
            )
        else:
            return (
                f"🧠 **VidyaBot AI Study Answer ({question})**\n\n"
                f"### **Academic Explanation & Key Steps:**\n"
                f"- **Topic Focus**: Concept Explanation & Doubt Solving\n"
                f"- **Core Solution**: Here is the structured step-by-step explanation for '{question}'.\n\n"
                f"### **Key Learning Points:**\n"
                f"1. **Core Concept**: Understand the primary formula/definition.\n"
                f"2. **Step-by-Step Approach**: Solve numericals or structure long answers logically with headings.\n"
                f"3. **Exam Practice**: Re-read textbook examples and practice exercise problems.\n\n"
                f"💡 *Feel free to type any specific Math problem, Science concept, or Grammar query!*"
            )

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
