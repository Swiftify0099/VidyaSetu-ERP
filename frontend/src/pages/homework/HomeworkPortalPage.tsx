import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen, Plus, Search, Filter, Calendar, Clock, CheckCircle2,
  AlertTriangle, FileText, Send, Sparkles, Download, Trash2,
  Award, Eye, X, RefreshCw, LayoutGrid, List, MessageSquare, ExternalLink, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import homeworkService, { HomeworkItem, HomeworkSubmission } from '../../services/homeworkService';
import styles from './HomeworkPortalPage.module.css';

export default function HomeworkPortalPage() {
  const { user, isSuperAdmin, hasRole } = useAuth();

  const isTeacher = isSuperAdmin() || hasRole('teacher') || hasRole('class_teacher') || hasRole('admin') || user?.roles?.some(r => r.code === 'teacher');
  const isStudent = !isTeacher;

  // Data state
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'pending' | 'submitted' | 'evaluated' | 'overdue'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals state
  const [activeSubmitHw, setActiveSubmitHw] = useState<HomeworkItem | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionAttachment, setSubmissionAttachment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // AI Doubt helper state in submit modal
  const [aiPromptHint, setAiPromptHint] = useState('');
  const [aiResponseText, setAiResponseText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Teacher Assign Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTab, setAssignTab] = useState<'manual' | 'ai'>('manual');
  const [hwForm, setHwForm] = useState({
    standard: '9',
    division: 'A',
    subject: 'Mathematics',
    title: '',
    description: '',
    instructions: '',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    priority: 'Normal',
    max_marks: 20,
    attachment_url: '',
  });
  const [savingHw, setSavingHw] = useState(false);

  // Teacher AI Generator Form
  const [aiForm, setAiForm] = useState({
    subject: 'Mathematics',
    topic: 'Quadratic Equations',
    class_level: '9',
    num_questions: 5,
  });
  const [generatingAi, setGeneratingAi] = useState(false);

  // Teacher Grading Modal
  const [activeGradeHw, setActiveGradeHw] = useState<HomeworkItem | null>(null);
  const [submissionsList, setSubmissionsList] = useState<HomeworkSubmission[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [gradingSubId, setGradingSubId] = useState<number | null>(null);
  const [gradeInput, setGradeInput] = useState({ score: '', remarks: '' });

  // Fetch homework list
  const loadHomework = async () => {
    setRefreshing(true);
    try {
      if (isTeacher) {
        const res = await homeworkService.getTeacherHomework();
        setHomeworkList(res.homework || []);
      } else {
        const res = await homeworkService.getStudentHomework();
        setHomeworkList(res.homework || []);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load homework');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHomework();
  }, [isTeacher]);

  // Derived Statistics
  const stats = useMemo(() => {
    const total = homeworkList.length;
    const pending = homeworkList.filter(h => h.status === 'pending').length;
    const submitted = homeworkList.filter(h => h.status === 'submitted').length;
    const evaluated = homeworkList.filter(h => h.status === 'evaluated').length;
    
    // Check overdue
    const today = new Date().toISOString().split('T')[0];
    const overdue = homeworkList.filter(h => h.status === 'pending' && h.due_date < today).length;

    return { total, pending, submitted, evaluated, overdue };
  }, [homeworkList]);

  // Unique Subjects for Filter Dropdown
  const subjects = useMemo(() => {
    const list = Array.from(new Set(homeworkList.map(h => h.subject))).filter(Boolean);
    return ['ALL', ...list];
  }, [homeworkList]);

  // Filtered List
  const filteredList = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    return homeworkList.filter(item => {
      // Search
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.teacher && item.teacher.toLowerCase().includes(searchQuery.toLowerCase()));

      // Subject Filter
      const matchesSubject = subjectFilter === 'ALL' || item.subject === subjectFilter;

      // Status Filter
      let matchesStatus = true;
      if (statusFilter === 'overdue') {
        matchesStatus = item.status === 'pending' && item.due_date < today;
      } else if (statusFilter !== 'ALL') {
        matchesStatus = item.status === statusFilter;
      }

      return matchesSearch && matchesSubject && matchesStatus;
    });
  }, [homeworkList, searchQuery, subjectFilter, statusFilter]);

  // Handle Student Submit Modal Open
  const handleOpenSubmitModal = (hw: HomeworkItem) => {
    setActiveSubmitHw(hw);
    setSubmissionText(hw.submission_text || '');
    setSubmissionAttachment(hw.submission_attachment_url || '');
    setAiResponseText('');
  };

  // Handle Student Submission Submit
  const handleSubmitSolution = async () => {
    if (!activeSubmitHw) return;
    if (!submissionText.trim() && !submissionAttachment.trim()) {
      toast.error('Please enter solution text or provide an attachment link.');
      return;
    }

    setSubmitting(true);
    try {
      await homeworkService.submitHomework(activeSubmitHw.id, submissionText, submissionAttachment);
      toast.success('Homework submitted successfully! 🚀');
      setActiveSubmitHw(null);
      loadHomework();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // AI Hint / Doubt Solver for Students
  const handleAskAiHint = async () => {
    if (!activeSubmitHw) return;
    setAiLoading(true);
    try {
      const prompt = `Solve hint / guide for: ${activeSubmitHw.title} (${activeSubmitHw.subject}). Question detail: ${activeSubmitHw.description}. Student query: ${aiPromptHint || 'Provide step-by-step guidance'}`;
      const res = await homeworkService.generateAIQuestions({
        subject: activeSubmitHw.subject,
        topic: activeSubmitHw.title,
        num_questions: 1,
      });
      setAiResponseText(res?.response || res?.data || 'Tip: Start by identifying given variables, write out the formula, and simplify equations step by step!');
    } catch {
      setAiResponseText('💡 AI Hint: Breakdown the problem into 3 parts: 1) Note given data, 2) Apply key subject theorem/formula, 3) Verify answer units!');
    } finally {
      setAiLoading(false);
    }
  };

  // Handle Teacher Create Homework Submit
  const handleCreateHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwForm.title || !hwForm.description || !hwForm.due_date) {
      toast.error('Please fill in required fields (Title, Description, Due Date).');
      return;
    }
    setSavingHw(true);
    try {
      await homeworkService.createHomework(hwForm);
      toast.success('Homework assigned successfully! 📚 Notification sent to class.');
      setShowAssignModal(false);
      loadHomework();
      setHwForm({
        standard: '9',
        division: 'A',
        subject: 'Mathematics',
        title: '',
        description: '',
        instructions: '',
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        priority: 'Normal',
        max_marks: 20,
        attachment_url: '',
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to assign homework');
    } finally {
      setSavingHw(false);
    }
  };

  // Handle Teacher AI Homework Question Generator
  const handleGenerateAiHomework = async () => {
    if (!aiForm.topic) {
      toast.error('Please specify a topic for AI generation.');
      return;
    }
    setGeneratingAi(true);
    try {
      const res = await homeworkService.generateAIQuestions(aiForm);
      const generatedText = res?.questions || res?.content || (typeof res === 'string' ? res : JSON.stringify(res, null, 2));

      setHwForm(prev => ({
        ...prev,
        subject: aiForm.subject,
        standard: aiForm.class_level,
        title: `${aiForm.topic} — Homework Assignment`,
        description: typeof generatedText === 'string' ? generatedText : '1. Solve assigned questions\n2. Explain key concepts',
      }));

      setAssignTab('manual');
      toast.success('AI Questions generated! Review and click Assign Homework.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'AI Generation failed');
    } finally {
      setGeneratingAi(false);
    }
  };

  // Handle Teacher Grading Modal Open & Fetch Submissions
  const handleOpenGradeModal = async (hw: HomeworkItem) => {
    setActiveGradeHw(hw);
    setLoadingSubs(true);
    try {
      const res = await homeworkService.getSubmissions(hw.id);
      setSubmissionsList(res.submissions || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to fetch student submissions');
    } finally {
      setLoadingSubs(false);
    }
  };

  // Handle Teacher Score Submission
  const handleGradeStudent = async (studentId: number) => {
    if (!activeGradeHw) return;
    if (!gradeInput.score) {
      toast.error('Please enter a valid score.');
      return;
    }

    setGradingSubId(studentId);
    try {
      await homeworkService.gradeSubmission(activeGradeHw.id, {
        student_id: studentId,
        marks_obtained: parseFloat(gradeInput.score),
        max_marks: activeGradeHw.max_marks || 20,
        teacher_remarks: gradeInput.remarks,
      });

      toast.success('Grade published! Push notification sent to student.');
      setGradeInput({ score: '', remarks: '' });
      // Refresh submissions
      const res = await homeworkService.getSubmissions(activeGradeHw.id);
      setSubmissionsList(res.submissions || []);
      loadHomework();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Grading failed');
    } finally {
      setGradingSubId(null);
    }
  };

  // Handle Delete Homework
  const handleDeleteHomework = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this homework assignment?')) return;
    try {
      await homeworkService.deleteHomework(id);
      toast.success('Homework deleted');
      loadHomework();
    } catch {
      toast.error('Failed to delete homework');
    }
  };

  // Relative Date Calculator
  const renderDueDateBadge = (dueDateStr: string, status: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (status === 'evaluated' || status === 'submitted') {
      return (
        <span className={styles.dueDateBadge} style={{ color: 'var(--color-text-secondary)' }}>
          <Calendar size={13} /> Due: {dueDateStr}
        </span>
      );
    }

    if (diffDays < 0) {
      return (
        <span className={styles.dueDateBadge} style={{ color: 'var(--color-danger)' }}>
          <AlertTriangle size={13} /> Overdue by {Math.abs(diffDays)} {Math.abs(diffDays) === 1 ? 'day' : 'days'}
        </span>
      );
    } else if (diffDays === 0) {
      return (
        <span className={styles.dueDateBadge} style={{ color: '#d97706' }}>
          <Clock size={13} /> Due Today!
        </span>
      );
    } else {
      return (
        <span className={styles.dueDateBadge} style={{ color: 'var(--color-primary)' }}>
          <Clock size={13} /> {diffDays} {diffDays === 1 ? 'day' : 'days'} remaining
        </span>
      );
    }
  };

  return (
    <div className={styles.container}>
      {/* ── Page Header ────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.headerIcon}>
            <BookOpen size={28} />
          </div>
          <div className={styles.headerText}>
            <h1>
              Homework Portal
              <span className={`${styles.roleTag} ${isTeacher ? styles.roleTagTeacher : styles.roleTagStudent}`}>
                {isTeacher ? 'Teacher Workspace' : 'Student Portal'}
              </span>
            </h1>
            <p>Track assignments, submit solutions, generate questions with AI, and review teacher feedback</p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={loadHomework} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>

          {isTeacher && (
            <button className={styles.btnPrimary} onClick={() => setShowAssignModal(true)}>
              <Plus size={18} />
              Assign Homework
            </button>
          )}
        </div>
      </header>

      {/* ── KPI Summary Cards ───────────────────────────────────── */}
      <section className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(79, 70, 229, 0.12)', color: 'var(--color-primary)' }}>
            <BookOpen size={22} />
          </div>
          <div>
            <div className={styles.kpiVal}>{stats.total}</div>
            <div className={styles.kpiLabel}>Total Homework</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#d97706' }}>
            <Clock size={22} />
          </div>
          <div>
            <div className={styles.kpiVal}>{stats.pending}</div>
            <div className={styles.kpiLabel}>Pending Actions</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' }}>
            <Send size={22} />
          </div>
          <div>
            <div className={styles.kpiVal}>{stats.submitted}</div>
            <div className={styles.kpiLabel}>Submitted</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className={styles.kpiVal}>{stats.evaluated}</div>
            <div className={styles.kpiLabel}>Evaluated & Graded</div>
          </div>
        </div>

        {stats.overdue > 0 && (
          <div className={styles.kpiCard} style={{ borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.03)' }}>
            <div className={styles.kpiIcon} style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626' }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <div className={styles.kpiVal} style={{ color: '#dc2626' }}>{stats.overdue}</div>
              <div className={styles.kpiLabel} style={{ color: '#dc2626' }}>Overdue Assignments</div>
            </div>
          </div>
        )}
      </section>

      {/* ── Smart Toolbar & Filters ──────────────────────────────── */}
      <section className={styles.toolbar}>
        <div className={styles.searchGroup}>
          <div className={styles.searchInput}>
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by title, subject, teacher..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className={styles.filterSelect}
            value={subjectFilter}
            onChange={e => setSubjectFilter(e.target.value)}
          >
            {subjects.map(s => (
              <option key={s} value={s}>
                {s === 'ALL' ? 'All Subjects' : s}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.pillsGroup}>
          {(['ALL', 'pending', 'submitted', 'evaluated', 'overdue'] as const).map(st => (
            <button
              key={st}
              className={`${styles.pill} ${statusFilter === st ? styles.activePill : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st === 'ALL' && 'All Statuses'}
              {st === 'pending' && '⏳ Pending'}
              {st === 'submitted' && '📩 Submitted'}
              {st === 'evaluated' && '✅ Evaluated'}
              {st === 'overdue' && '⚠️ Overdue'}
            </button>
          ))}

          <div className={styles.viewToggle}>
            <button
              className={`${styles.toggleBtn} ${viewMode === 'grid' ? styles.activeToggle : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={`${styles.toggleBtn} ${viewMode === 'table' ? styles.activeToggle : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Main Content Grid / Table ────────────────────────────── */}
      {loading ? (
        <div className={styles.emptyState}>
          <RefreshCw size={32} className="animate-spin" />
          <p>Loading homework assignments...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className={styles.emptyState}>
          <BookOpen size={48} />
          <h3>No homework assignments found</h3>
          <p>Try clearing your search query or subject filters.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className={styles.cardsGrid}>
          {filteredList.map(hw => (
            <div key={hw.id} className={styles.hwCard}>
              <div>
                <div className={styles.cardHeader}>
                  <span className={styles.subjectBadge}>
                    📚 {hw.subject} • Std {hw.standard}{hw.division || ''}
                  </span>

                  <div className={styles.statusBadges}>
                    {hw.priority === 'High' && <span className={styles.priorityHigh}>🔥 High</span>}
                    <span
                      className={`${styles.statusBadge} ${
                        hw.status === 'pending'
                          ? styles.statusPending
                          : hw.status === 'submitted'
                          ? styles.statusSubmitted
                          : styles.statusEvaluated
                      }`}
                    >
                      {hw.status === 'pending' && 'Pending'}
                      {hw.status === 'submitted' && 'Submitted'}
                      {hw.status === 'evaluated' && 'Graded'}
                    </span>
                  </div>
                </div>

                <h3 className={styles.cardTitle}>{hw.title}</h3>
                <p className={styles.cardDesc}>{hw.description}</p>
              </div>

              <div>
                <div className={styles.metaRow}>
                  <div className={styles.metaItem}>
                    👨‍🏫 {hw.teacher || 'Class Teacher'}
                  </div>
                  <div className={styles.metaItem}>
                    🎯 Max Marks: {hw.max_marks || 20}
                  </div>
                  <div>{renderDueDateBadge(hw.due_date, hw.status)}</div>
                </div>

                <div className={styles.cardFooter}>
                  {hw.status === 'evaluated' && hw.marks ? (
                    <div className={styles.scorePill}>
                      <Award size={14} /> Score: {hw.marks}
                    </div>
                  ) : (
                    hw.attachment_url && (
                      <a
                        href={hw.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.btnOutline}
                      >
                        <Download size={14} /> Attachment
                      </a>
                    )
                  )}

                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    {isTeacher ? (
                      <>
                        <button
                          className={styles.btnPrimary}
                          style={{ height: '36px', fontSize: 'var(--font-size-xs)' }}
                          onClick={() => handleOpenGradeModal(hw)}
                        >
                          <Eye size={14} /> Submissions & Grade
                        </button>
                        <button
                          className={styles.btnSecondary}
                          style={{ height: '36px', padding: '0 8px', color: 'var(--color-danger)' }}
                          onClick={() => handleDeleteHomework(hw.id)}
                          title="Delete Homework"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : (
                      <button
                        className={styles.btnPrimary}
                        style={{ height: '36px', fontSize: 'var(--font-size-xs)' }}
                        onClick={() => handleOpenSubmitModal(hw)}
                      >
                        <Send size={14} />
                        {hw.status === 'submitted' ? 'View/Resubmit' : hw.status === 'evaluated' ? 'View Result' : 'Submit Homework'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.hwTable}>
            <thead>
              <tr>
                <th>Subject & Class</th>
                <th>Title & Description</th>
                <th>Teacher</th>
                <th>Due Date</th>
                <th>Status / Marks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map(hw => (
                <tr key={hw.id}>
                  <td>
                    <strong>{hw.subject}</strong>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      Std {hw.standard}{hw.division || ''}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>{hw.title}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                      {hw.description.slice(0, 80)}...
                    </div>
                  </td>
                  <td>{hw.teacher}</td>
                  <td>{renderDueDateBadge(hw.due_date, hw.status)}</td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        hw.status === 'pending'
                          ? styles.statusPending
                          : hw.status === 'submitted'
                          ? styles.statusSubmitted
                          : styles.statusEvaluated
                      }`}
                    >
                      {hw.status === 'pending' && 'Pending'}
                      {hw.status === 'submitted' && 'Submitted'}
                      {hw.status === 'evaluated' && `Graded (${hw.marks})`}
                    </span>
                  </td>
                  <td>
                    {isTeacher ? (
                      <button
                        className={styles.btnOutline}
                        onClick={() => handleOpenGradeModal(hw)}
                      >
                        Submissions & Grade
                      </button>
                    ) : (
                      <button
                        className={styles.btnOutline}
                        onClick={() => handleOpenSubmitModal(hw)}
                      >
                        Submit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Student Submission Modal ────────────────────────────── */}
      {activeSubmitHw && (
        <div className={styles.modalOverlay} onClick={() => setActiveSubmitHw(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                <Send size={22} color="var(--color-primary)" /> Submit Homework
              </h2>
              <button className={styles.closeBtn} onClick={() => setActiveSubmitHw(null)}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div>
                <span className={styles.subjectBadge}>
                  {activeSubmitHw.subject} • Std {activeSubmitHw.standard}
                </span>
                <h3 style={{ margin: 'var(--space-2) 0 var(--space-1) 0' }}>{activeSubmitHw.title}</h3>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                  {activeSubmitHw.description}
                </p>
                {activeSubmitHw.instructions && (
                  <div style={{ background: 'var(--color-surface-2)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-xs)', borderLeft: '3px solid var(--color-primary)' }}>
                    <strong>Teacher Instructions:</strong> {activeSubmitHw.instructions}
                  </div>
                )}
              </div>

              {activeSubmitHw.status === 'evaluated' && (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ fontWeight: 'bold', color: '#047857', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={18} /> Teacher Grade: {activeSubmitHw.marks || 'Evaluated'}
                  </div>
                  {activeSubmitHw.teacher_remarks && (
                    <div style={{ fontSize: 'var(--font-size-sm)', marginTop: '4px', color: 'var(--color-text-primary)' }}>
                      Remarks: "{activeSubmitHw.teacher_remarks}"
                    </div>
                  )}
                </div>
              )}

              {/* AI Hint Assistant Callout */}
              <div className={styles.aiCallout}>
                <div className={styles.aiHeader}>
                  <span>✨ Need a hint or formula? Ask VidyaBot AI</span>
                  <button
                    type="button"
                    className={styles.btnAI}
                    style={{ height: '32px', fontSize: 'var(--font-size-xs)' }}
                    onClick={handleAskAiHint}
                    disabled={aiLoading}
                  >
                    <Sparkles size={14} /> {aiLoading ? 'Thinking...' : 'Get AI Hint'}
                  </button>
                </div>
                <input
                  type="text"
                  className={styles.inputField}
                  placeholder="e.g. Give me a hint for Question 2 or formula for this experiment..."
                  value={aiPromptHint}
                  onChange={e => setAiPromptHint(e.target.value)}
                />
                {aiResponseText && (
                  <div style={{ fontSize: 'var(--font-size-xs)', background: 'var(--color-surface)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
                    <strong>VidyaBot Hint:</strong> {aiResponseText}
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Your Solution Text / Answers</label>
                <textarea
                  className={styles.textareaField}
                  rows={5}
                  placeholder="Type your answers, steps, or homework summary here..."
                  value={submissionText}
                  onChange={e => setSubmissionText(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Attachment URL / Google Drive Link (Optional)</label>
                <input
                  type="text"
                  className={styles.inputField}
                  placeholder="https://drive.google.com/file/... or /downloads/my_homework.pdf"
                  value={submissionAttachment}
                  onChange={e => setSubmissionAttachment(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setActiveSubmitHw(null)}>
                Cancel
              </button>
              <button className={styles.btnPrimary} onClick={handleSubmitSolution} disabled={submitting}>
                <Send size={16} /> {submitting ? 'Submitting...' : 'Submit Homework'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Teacher Assign Homework Modal (Manual + AI) ─────────── */}
      {showAssignModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAssignModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                <BookOpen size={22} color="var(--color-primary)" /> Assign New Homework
              </h2>
              <button className={styles.closeBtn} onClick={() => setShowAssignModal(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', padding: '0 var(--space-6)', background: 'var(--color-surface-2)', gap: 'var(--space-4)' }}>
              <button
                className={styles.pill}
                style={{ borderRadius: '0', border: 'none', borderBottom: assignTab === 'manual' ? '2px solid var(--color-primary)' : 'none', background: 'transparent' }}
                onClick={() => setAssignTab('manual')}
              >
                ✏️ Manual Form
              </button>
              <button
                className={styles.pill}
                style={{ borderRadius: '0', border: 'none', borderBottom: assignTab === 'ai' ? '2px solid #7c3aed' : 'none', background: 'transparent', color: '#7c3aed', fontWeight: 'bold' }}
                onClick={() => setAssignTab('ai')}
              >
                ✨ AI Homework Generator
              </button>
            </div>

            <div className={styles.modalBody}>
              {assignTab === 'ai' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <div className={styles.aiCallout}>
                    <div className={styles.aiHeader}>
                      <span>🤖 AI Homework Question Generator</span>
                    </div>
                    <p style={{ fontSize: 'var(--font-size-xs)', margin: 0, color: 'var(--color-text-secondary)' }}>
                      Automatically generate high-quality homework questions tailored for Indian curriculum standards.
                    </p>

                    <div className={styles.gridTwo}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Subject</label>
                        <select
                          className={styles.inputField}
                          value={aiForm.subject}
                          onChange={e => setAiForm({ ...aiForm, subject: e.target.value })}
                        >
                          <option value="Mathematics">Mathematics</option>
                          <option value="Science & Tech">Science & Tech</option>
                          <option value="English Grammar">English Grammar</option>
                          <option value="Social Studies">Social Studies</option>
                          <option value="Marathi">Marathi</option>
                        </select>
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Standard / Class</label>
                        <select
                          className={styles.inputField}
                          value={aiForm.class_level}
                          onChange={e => setAiForm({ ...aiForm, class_level: e.target.value })}
                        >
                          {['5', '6', '7', '8', '9', '10', '11', '12'].map(c => (
                            <option key={c} value={c}>Class {c}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Topic Name</label>
                      <input
                        type="text"
                        className={styles.inputField}
                        placeholder="e.g. Quadratic Equations, Photosynthesis, Tenses..."
                        value={aiForm.topic}
                        onChange={e => setAiForm({ ...aiForm, topic: e.target.value })}
                      />
                    </div>

                    <button
                      type="button"
                      className={styles.btnAI}
                      onClick={handleGenerateAiHomework}
                      disabled={generatingAi}
                      style={{ justifyContent: 'center' }}
                    >
                      <Sparkles size={18} />
                      {generatingAi ? 'Generating Questions...' : 'Generate & Auto-fill Homework'}
                    </button>
                  </div>
                </div>
              ) : (
                <form id="hwForm" onSubmit={handleCreateHomework} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <div className={styles.gridTwo}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Standard / Class</label>
                      <select
                        className={styles.inputField}
                        value={hwForm.standard}
                        onChange={e => setHwForm({ ...hwForm, standard: e.target.value })}
                      >
                        {['5', '6', '7', '8', '9', '10', '11', '12'].map(c => (
                          <option key={c} value={c}>Std {c}</option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Division</label>
                      <select
                        className={styles.inputField}
                        value={hwForm.division}
                        onChange={e => setHwForm({ ...hwForm, division: e.target.value })}
                      >
                        {['A', 'B', 'C', 'D'].map(d => (
                          <option key={d} value={d}>Division {d}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className={styles.gridTwo}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Subject</label>
                      <input
                        type="text"
                        className={styles.inputField}
                        placeholder="e.g. Mathematics"
                        value={hwForm.subject}
                        onChange={e => setHwForm({ ...hwForm, subject: e.target.value })}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Priority</label>
                      <select
                        className={styles.inputField}
                        value={hwForm.priority}
                        onChange={e => setHwForm({ ...hwForm, priority: e.target.value })}
                      >
                        <option value="Normal">Normal</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High Priority 🔥</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Title</label>
                    <input
                      type="text"
                      className={styles.inputField}
                      placeholder="e.g. Quadratic Equations Exercise 3.2"
                      value={hwForm.title}
                      onChange={e => setHwForm({ ...hwForm, title: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Description & Questions</label>
                    <textarea
                      className={styles.textareaField}
                      rows={4}
                      placeholder="Enter detailed homework instructions and questions..."
                      value={hwForm.description}
                      onChange={e => setHwForm({ ...hwForm, description: e.target.value })}
                    />
                  </div>

                  <div className={styles.gridTwo}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Due Date</label>
                      <input
                        type="date"
                        className={styles.inputField}
                        value={hwForm.due_date}
                        onChange={e => setHwForm({ ...hwForm, due_date: e.target.value })}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Max Marks</label>
                      <input
                        type="number"
                        className={styles.inputField}
                        value={hwForm.max_marks}
                        onChange={e => setHwForm({ ...hwForm, max_marks: parseInt(e.target.value) || 20 })}
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Reference Attachment URL (Optional)</label>
                    <input
                      type="text"
                      className={styles.inputField}
                      placeholder="/downloads/math_ref.pdf"
                      value={hwForm.attachment_url}
                      onChange={e => setHwForm({ ...hwForm, attachment_url: e.target.value })}
                    />
                  </div>
                </form>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setShowAssignModal(false)}>
                Cancel
              </button>
              {assignTab === 'manual' && (
                <button type="submit" form="hwForm" className={styles.btnPrimary} disabled={savingHw}>
                  <BookOpen size={16} /> {savingHw ? 'Assigning...' : 'Publish Homework'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Teacher Evaluation & Grading Hub Modal ──────────────── */}
      {activeGradeHw && (
        <div className={styles.modalOverlay} onClick={() => setActiveGradeHw(null)}>
          <div className={styles.modalContent} style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                <Award size={22} color="var(--color-primary)" /> Submissions & Grading Hub
              </h2>
              <button className={styles.closeBtn} onClick={() => setActiveGradeHw(null)}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div>
                <span className={styles.subjectBadge}>
                  {activeGradeHw.subject} • Std {activeGradeHw.standard}{activeGradeHw.division || ''}
                </span>
                <h3 style={{ margin: 'var(--space-2) 0 var(--space-1) 0' }}>{activeGradeHw.title}</h3>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                  Due: {activeGradeHw.due_date} | Max Marks: {activeGradeHw.max_marks || 20}
                </div>
              </div>

              {loadingSubs ? (
                <div className={styles.emptyState}>
                  <RefreshCw size={24} className="animate-spin" />
                  <p>Loading student submissions...</p>
                </div>
              ) : submissionsList.length === 0 ? (
                <div className={styles.emptyState}>
                  <Send size={36} />
                  <p>No student submissions received yet for this assignment.</p>
                </div>
              ) : (
                <div className={styles.subList}>
                  {submissionsList.map(sub => (
                    <div key={sub.id} className={styles.subCard}>
                      <div className={styles.subCardHeader}>
                        <div className={styles.studentInfo}>
                          👤 {sub.student_name} ({sub.gr_number}) — Roll #{sub.roll_number}
                        </div>
                        <span
                          className={`${styles.statusBadge} ${
                            sub.status === 'evaluated' ? styles.statusEvaluated : styles.statusSubmitted
                          }`}
                        >
                          {sub.status === 'evaluated' ? `Graded (${sub.marks_obtained}/${sub.max_marks})` : 'Submitted'}
                        </span>
                      </div>

                      {sub.submission_text ? (
                        <div style={{ background: 'var(--color-surface)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-xs)' }}>
                          <strong>Solution:</strong> {sub.submission_text}
                        </div>
                      ) : (
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                          No text provided. Check attachment below.
                        </div>
                      )}

                      {sub.attachment_url && (
                        <div style={{ fontSize: 'var(--font-size-xs)' }}>
                          📎 <a href={sub.attachment_url} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>Download Student Attachment</a>
                        </div>
                      )}

                      {/* Score Input Box */}
                      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', marginTop: 'var(--space-2)', paddingTop: 'var(--space-2)', borderTop: '1px dashed var(--color-border)' }}>
                        <div style={{ width: '120px' }}>
                          <input
                            type="number"
                            step="0.5"
                            className={styles.inputField}
                            placeholder={`Score (/${activeGradeHw.max_marks || 20})`}
                            defaultValue={sub.marks_obtained !== null && sub.marks_obtained !== undefined ? sub.marks_obtained : ''}
                            onChange={e => setGradeInput({ ...gradeInput, score: e.target.value })}
                          />
                        </div>

                        <div style={{ flex: 1 }}>
                          <input
                            type="text"
                            className={styles.inputField}
                            placeholder="Teacher feedback / remarks..."
                            defaultValue={sub.teacher_remarks || ''}
                            onChange={e => setGradeInput({ ...gradeInput, remarks: e.target.value })}
                          />
                        </div>

                        <button
                          className={styles.btnPrimary}
                          style={{ height: '42px', fontSize: 'var(--font-size-xs)' }}
                          onClick={() => handleGradeStudent(sub.student_id)}
                          disabled={gradingSubId === sub.student_id}
                        >
                          <CheckCircle2 size={14} />
                          {gradingSubId === sub.student_id ? 'Saving...' : 'Save Grade'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setActiveGradeHw(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
