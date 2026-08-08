/**
 * VidyaSetu ERP — AI Hub & Assistant Page (Phase 5)
 * ====================================================
 * Unified AI Studio:
 *  1. AI Study Assistant & Voice Chat
 *  2. Homework AI Generator
 *  3. Question Paper AI Generator
 *  4. Lesson Planner AI
 *  5. Student Analysis & Performance Predictor
 */
import React, { useState } from 'react';
import { Bot, Mic, BookOpen, FileText, Sparkles, TrendingUp, Send, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { PageHeader } from '../../components/shared';
import { FormattedText } from '../../components/shared/FormattedText';
import styles from './AIAssistantPage.module.css';

type AITab = 'chat' | 'homework' | 'question_paper' | 'lesson_plan' | 'analysis';

interface Message {
  sender: 'user' | 'bot';
  text: string;
  time?: string;
}

export default function AIAssistantPage() {
  const [activeTab, setActiveTab] = useState<AITab>('chat');

  // ── Chat State ───────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: 'नमस्कार! Me VidyaBot aahe. I am your AI Study Assistant for Hindkesri Maruti Mane Vidyalay. Ask me any question related to science, math, history, Marathi, English, or homework!',
    },
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [chatLang, setChatLang] = useState<'mr' | 'en'>('mr');
  const [loadingChat, setLoadingChat] = useState(false);

  // ── Homework Generator State ─────────────────────────────
  const [hwSubject, setHwSubject] = useState('Science');
  const [hwTopic, setHwTopic] = useState('Photosynthesis');
  const [hwClass, setHwClass] = useState('Std 8');
  const [hwLang, setHwLang] = useState<'mr' | 'en'>('en');
  const [hwResult, setHwResult] = useState('');
  const [loadingHw, setLoadingHw] = useState(false);

  // ── Question Paper State ────────────────────────────────
  const [qpSubject, setQpSubject] = useState('Mathematics');
  const [qpClass, setQpClass] = useState('Std 10');
  const [qpTitle, setQpTitle] = useState('First Semester Unit Test');
  const [qpMarks, setQpMarks] = useState(50);
  const [qpResult, setQpResult] = useState('');
  const [loadingQp, setLoadingQp] = useState(false);

  // ── Lesson Plan State ───────────────────────────────────
  const [lpSubject, setLpSubject] = useState('Marathi');
  const [lpTopic, setLpTopic] = useState('व्याकरण — विभक्ती व काळ');
  const [lpClass, setLpClass] = useState('Std 9');
  const [lpResult, setLpResult] = useState('');
  const [loadingLp, setLoadingLp] = useState(false);

  // ── Analysis & Prediction State ─────────────────────────
  const [studentId, setStudentId] = useState('1');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [predictionResult, setPredictionResult] = useState<any>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const [copied, setCopied] = useState(false);

  // ── Handlers ─────────────────────────────────────────────
  const handleSendChat = async () => {
    if (!inputMsg.trim() || loadingChat) return;
    const userText = inputMsg.trim();
    setInputMsg('');
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setLoadingChat(true);

    try {
      const res = await api.post('/ai/chat', {
        message: userText,
        language: chatLang,
      });
      const reply = res.data?.data?.reply || 'No response generated.';
      setMessages(prev => [...prev, { sender: 'bot', text: reply }]);
    } catch {
      toast.error('AI Service timeout or error');
      setMessages(prev => [...prev, { sender: 'bot', text: 'Error connecting to AI. Please try again.' }]);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleGenerateHomework = async () => {
    setLoadingHw(true);
    setHwResult('');
    try {
      const res = await api.post('/ai/homework', {
        subject: hwSubject,
        topic: hwTopic,
        class_level: hwClass,
        num_questions: 5,
        language: hwLang,
      });
      setHwResult(res.data?.data?.content || '');
      toast.success('Homework assignment generated!');
    } catch {
      toast.error('Failed to generate homework');
    } finally {
      setLoadingHw(false);
    }
  };

  const handleGenerateQuestionPaper = async () => {
    setLoadingQp(true);
    setQpResult('');
    try {
      const res = await api.post('/ai/question-paper', {
        subject: qpSubject,
        class_level: qpClass,
        exam_title: qpTitle,
        total_marks: qpMarks,
        language: 'en',
      });
      setQpResult(res.data?.data?.question_paper || '');
      toast.success('Question paper generated!');
    } catch {
      toast.error('Failed to generate question paper');
    } finally {
      setLoadingQp(false);
    }
  };

  const handleGenerateLessonPlan = async () => {
    setLoadingLp(true);
    setLpResult('');
    try {
      const res = await api.post('/ai/lesson-plan', {
        subject: lpSubject,
        topic: lpTopic,
        class_level: lpClass,
        duration_minutes: 45,
        language: 'mr',
      });
      setLpResult(res.data?.data?.lesson_plan || '');
      toast.success('Lesson plan created!');
    } catch {
      toast.error('Failed to generate lesson plan');
    } finally {
      setLoadingLp(false);
    }
  };

  const handleAnalyzeStudent = async () => {
    if (!studentId) return;
    setLoadingAnalysis(true);
    try {
      const [resAna, resPred] = await Promise.all([
        api.post('/ai/student-analysis', { student_id: Number(studentId) }),
        api.post('/ai/performance-prediction', { student_id: Number(studentId) }),
      ]);
      setAnalysisResult(resAna.data?.data);
      setPredictionResult(resPred.data?.data);
      toast.success('Student analysis complete!');
    } catch {
      toast.error('Failed to analyze student');
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="VidyaSetu AI Studio"
        subtitle="Empower Students & Teachers with OpenRouter & Gemini Educational AI — कृत्रिम बुद्धिमत्ता सहाय्यक"
      />

      {/* Navigation Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'chat' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <Bot size={18} /> AI Study Assistant
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'homework' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('homework')}
        >
          <BookOpen size={18} /> Homework AI
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'question_paper' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('question_paper')}
        >
          <FileText size={18} /> Question Paper AI
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'lesson_plan' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('lesson_plan')}
        >
          <Sparkles size={18} /> Lesson Planner AI
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'analysis' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('analysis')}
        >
          <TrendingUp size={18} /> Student Analysis & Forecast
        </button>
      </div>

      <div className={styles.container}>
        {/* ── TAB 1: CHAT ASSISTANT ────────────────────────────── */}
        {activeTab === 'chat' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>AI Study Assistant & Voice Chat</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className={styles.label}>Language:</span>
                <select
                  className={styles.input}
                  value={chatLang}
                  onChange={e => setChatLang(e.target.value as 'mr' | 'en')}
                  style={{ width: '120px', padding: '6px 12px' }}
                >
                  <option value="mr">मराठी (Marathi)</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <div className={styles.chatWindow}>
              <div className={styles.messages}>
                {messages.map((m, idx) => (
                  <div key={idx} className={m.sender === 'user' ? styles.msgUser : styles.msgBot}>
                    {m.sender === 'user' ? m.text : <FormattedText text={m.text} />}
                  </div>
                ))}
                {loadingChat && <div className={styles.msgBot}>VidyaBot is thinking... 🧠</div>}
              </div>

              <div className={styles.chatInputRow}>
                <input
                  className={styles.input}
                  placeholder={chatLang === 'mr' ? 'आपला प्रश्न येथे टाका...' : 'Ask your academic doubt here...'}
                  value={inputMsg}
                  onChange={e => setInputMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                />
                <button className={styles.sendBtn} onClick={handleSendChat} disabled={loadingChat || !inputMsg.trim()}>
                  <Send size={16} /> Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: HOMEWORK AI ───────────────────────────────── */}
        {activeTab === 'homework' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Generate Homework Assignment</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Subject</label>
                <input className={styles.input} value={hwSubject} onChange={e => setHwSubject(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Topic</label>
                <input className={styles.input} value={hwTopic} onChange={e => setHwTopic(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Class Level</label>
                <input className={styles.input} value={hwClass} onChange={e => setHwClass(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Output Language</label>
                <select className={styles.input} value={hwLang} onChange={e => setHwLang(e.target.value as 'mr' | 'en')}>
                  <option value="en">English</option>
                  <option value="mr">मराठी</option>
                </select>
              </div>
            </div>

            <button className={styles.sendBtn} onClick={handleGenerateHomework} disabled={loadingHw}>
              <Sparkles size={16} /> {loadingHw ? 'Generating...' : 'Generate Assignment'}
            </button>

            {hwResult && (
              <div>
                <div className={styles.resultBox}><FormattedText text={hwResult} /></div>
                <div className={styles.actionRow}>
                  <button className={styles.tabBtn} onClick={() => copyToClipboard(hwResult)}>
                    {copied ? <Check size={16} color="#059669" /> : <Copy size={16} />} Copy Text
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: QUESTION PAPER AI ─────────────────────────── */}
        {activeTab === 'question_paper' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Generate Examination Question Paper</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Exam Title</label>
                <input className={styles.input} value={qpTitle} onChange={e => setQpTitle(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Subject</label>
                <input className={styles.input} value={qpSubject} onChange={e => setQpSubject(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Class Level</label>
                <input className={styles.input} value={qpClass} onChange={e => setQpClass(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Total Marks</label>
                <input type="number" className={styles.input} value={qpMarks} onChange={e => setQpMarks(Number(e.target.value))} />
              </div>
            </div>

            <button className={styles.sendBtn} onClick={handleGenerateQuestionPaper} disabled={loadingQp}>
              <Sparkles size={16} /> {loadingQp ? 'Creating Paper...' : 'Generate Question Paper'}
            </button>

            {qpResult && (
              <div>
                <div className={styles.resultBox}><FormattedText text={qpResult} /></div>
                <div className={styles.actionRow}>
                  <button className={styles.tabBtn} onClick={() => copyToClipboard(qpResult)}>
                    {copied ? <Check size={16} color="#059669" /> : <Copy size={16} />} Copy Paper
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: LESSON PLANNER AI ─────────────────────────── */}
        {activeTab === 'lesson_plan' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Generate Lesson Plan</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Subject</label>
                <input className={styles.input} value={lpSubject} onChange={e => setLpSubject(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Chapter / Topic</label>
                <input className={styles.input} value={lpTopic} onChange={e => setLpTopic(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Class Level</label>
                <input className={styles.input} value={lpClass} onChange={e => setLpClass(e.target.value)} />
              </div>
            </div>

            <button className={styles.sendBtn} onClick={handleGenerateLessonPlan} disabled={loadingLp}>
              <Sparkles size={16} /> {loadingLp ? 'Creating Plan...' : 'Generate Lesson Plan'}
            </button>

            {lpResult && (
              <div>
                <div className={styles.resultBox}><FormattedText text={lpResult} /></div>
                <div className={styles.actionRow}>
                  <button className={styles.tabBtn} onClick={() => copyToClipboard(lpResult)}>
                    {copied ? <Check size={16} color="#059669" /> : <Copy size={16} />} Copy Lesson Plan
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 5: STUDENT ANALYSIS & FORECAST ──────────────── */}
        {activeTab === 'analysis' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Student Diagnostic Analysis & Forecast</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Student ID</label>
                <input className={styles.input} value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="e.g. 1" />
              </div>
            </div>

            <button className={styles.sendBtn} onClick={handleAnalyzeStudent} disabled={loadingAnalysis}>
              <TrendingUp size={16} /> {loadingAnalysis ? 'Analyzing...' : 'Analyze & Predict'}
            </button>

            {analysisResult && (
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700' }}>
                  Analysis for {analysisResult.full_name} ({analysisResult.standard}-{analysisResult.division})
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
                  Attendance: <strong>{analysisResult.attendance_percentage}%</strong>
                </p>

                <div className={styles.resultBox}><FormattedText text={analysisResult.analysis} /></div>

                {predictionResult && (
                  <div className={styles.resultBox} style={{ marginTop: '16px', backgroundColor: '#eef2ff', borderColor: '#c7d2fe' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#3730a3', marginBottom: '8px' }}>🔮 Performance Forecast</h4>
                    <p><strong>Predicted Range:</strong> {predictionResult.predicted_grade_range}</p>
                    <p><strong>Risk Level:</strong> {predictionResult.risk_level}</p>
                    <div style={{ marginTop: '8px' }}><FormattedText text={predictionResult.ai_insights} /></div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
