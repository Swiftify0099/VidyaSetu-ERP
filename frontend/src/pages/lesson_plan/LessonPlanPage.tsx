/**
 * VidyaSetu ERP — Lesson Plan Page (Phase 3)
 * ============================================
 * Teacher creates monthly lesson plans and fills daily teaching diary.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable } from '../../components/shared/DataTable';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Modal } from '../../components/shared/Modal';
import { EmptyState } from '../../components/shared/EmptyState';
import type { TableColumn } from '../../types';
import styles from './LessonPlanPage.module.css';

interface LessonPlan {
  id: number; teacher_name: string; standard: string; division: string;
  subject_name: string; academic_year: string; month: number;
  chapter_name: string; planned_periods: number; completed_periods: number;
  status: string; topics_planned: string;
}
interface DiaryEntry {
  id: number; diary_date: string; standard: string; division: string;
  subject_name: string; topic_covered: string; students_present?: number;
  class_participation?: string; homework_given: boolean; remedial_needed: boolean;
}

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CUR_YEAR = '2025-2026';

const TABS = ['Lesson Plans', 'Teaching Diary'] as const;
type Tab = typeof TABS[number];

export default function LessonPlanPage() {
  const [tab, setTab] = useState<Tab>('Lesson Plans');
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [diary, setDiary] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showDiaryModal, setShowDiaryModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [planForm, setPlanForm] = useState({
    standard: '', division: '', subject_name: '', subject_name_marathi: '',
    academic_year: CUR_YEAR, month: new Date().getMonth() + 1,
    chapter_name: '', chapter_name_marathi: '', topics_planned: '',
    learning_objectives: '', teaching_methods: '', resources_required: '',
    planned_periods: 0, remarks: '',
  });

  const [diaryForm, setDiaryForm] = useState({
    standard: '', division: '', subject_name: '', academic_year: CUR_YEAR,
    diary_date: new Date().toISOString().split('T')[0], period_number: '',
    topic_covered: '', teaching_method_used: '', students_present: '',
    class_participation: '', homework_given: false, homework_description: '',
    difficulties_observed: '', remedial_needed: false,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, d] = await Promise.all([
        api.get('/lesson-plans', { params: { academic_year: CUR_YEAR } }),
        api.get('/lesson-plans/diary', { params: { academic_year: CUR_YEAR } }),
      ]);
      setPlans(p.data?.data ?? []);
      setDiary(d.data?.data ?? []);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/lesson-plans', { ...planForm, month: Number(planForm.month) });
      toast.success('Lesson plan created!');
      setShowPlanModal(false);
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed to create');
    } finally { setSaving(false); }
  };

  const handleCreateDiary = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/lesson-plans/diary', {
        ...diaryForm,
        period_number: diaryForm.period_number ? Number(diaryForm.period_number) : null,
        students_present: diaryForm.students_present ? Number(diaryForm.students_present) : null,
      });
      toast.success('Diary entry saved!');
      setShowDiaryModal(false);
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleSubmitPlan = async (id: number) => {
    try {
      await api.post(`/lesson-plans/${id}/submit`);
      toast.success('Lesson plan submitted for approval!');
      fetchData();
    } catch { toast.error('Submit failed'); }
  };

  const handleDeletePlan = async (id: number) => {
    if (!confirm('Delete this lesson plan?')) return;
    try {
      await api.delete(`/lesson-plans/${id}`);
      toast.success('Deleted');
      fetchData();
    } catch { toast.error('Delete failed'); }
  };

  const planCols: TableColumn<LessonPlan>[] = [
    { key: 'subject_name', header: 'Subject', sortable: true, render: (v, row) => (
      <div><div className={styles.subject}>{String(v)}</div>
        <div className={styles.classDiv}>Std {row.standard}-{row.division}</div>
      </div>
    )},
    { key: 'chapter_name', header: 'Chapter' },
    { key: 'month', header: 'Month', render: (v) => MONTHS[Number(v)] },
    { key: 'planned_periods', header: 'Periods', align: 'center', render: (_, row) => (
      <div className={styles.periods}>
        <span className={styles.completed}>{row.completed_periods}</span>
        <span className={styles.slash}>/</span>
        <span>{row.planned_periods}</span>
      </div>
    )},
    { key: 'status', header: 'Status', render: (v) => <StatusBadge status={String(v)} /> },
    { key: 'id', header: 'Actions', align: 'center', render: (_, row) => (
      <div className={styles.actionGroup}>
        {row.status === 'draft' && (
          <button className={`${styles.xbtn} ${styles.info}`} onClick={() => handleSubmitPlan(row.id)}>Submit</button>
        )}
        {row.status === 'draft' && (
          <button className={`${styles.xbtn} ${styles.danger}`} onClick={() => handleDeletePlan(row.id)}>Delete</button>
        )}
      </div>
    )},
  ];

  const diaryCols: TableColumn<DiaryEntry>[] = [
    { key: 'diary_date', header: 'Date', sortable: true, render: (v) => new Date(String(v)).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) },
    { key: 'subject_name', header: 'Subject', render: (v, row) => (
      <div><div className={styles.subject}>{String(v)}</div>
        <div className={styles.classDiv}>Std {row.standard}-{row.division}</div>
      </div>
    )},
    { key: 'topic_covered', header: 'Topic Covered' },
    { key: 'students_present', header: 'Attendance', align: 'center', render: (v) => <span>{v != null ? String(v) : '—'}</span> },
    { key: 'class_participation', header: 'Participation', render: (v) => v ? <StatusBadge status={String(v)} variant={v === 'excellent' ? 'success' : v === 'good' ? 'info' : v === 'average' ? 'warning' : 'danger'} size="sm" /> : <span>—</span> },
    { key: 'homework_given', header: 'HW', align: 'center', render: (v) => v ? '✅' : '—' },
    { key: 'remedial_needed', header: 'Remedial', align: 'center', render: (v) => v ? '⚠️' : '—' },
  ];

  const fieldClass = styles.inp;
  const labelClass = styles.lbl;

  return (
    <div className={styles.page}>
      <PageHeader
        icon="📖"
        title="Lesson Plans & Teaching Diary"
        subtitle="Create monthly lesson plans and maintain daily teaching records"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Lesson Plans' }]}
        actions={
          <div className={styles.headerBtns}>
            <button className={styles.secondaryBtn} onClick={() => setShowDiaryModal(true)}>+ Diary Entry</button>
            <button className={styles.primaryBtn} onClick={() => setShowPlanModal(true)}>+ Lesson Plan</button>
          </div>
        }
      />

      <div className={styles.tabs}>
        {TABS.map(t => (
          <button key={t} className={`${styles.tab} ${tab === t ? styles.activeTab : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Lesson Plans' && (
        <div className={styles.tableCard}>
          {plans.length === 0 && !loading
            ? <EmptyState icon="📖" title="No lesson plans yet" description="Create your first monthly lesson plan" size="lg" action={<button className={styles.primaryBtn} onClick={() => setShowPlanModal(true)}>+ Create Plan</button>} />
            : <DataTable columns={planCols} data={plans} loading={loading} keyExtractor={(r) => r.id} emptyMessage="No plans found" />
          }
        </div>
      )}

      {tab === 'Teaching Diary' && (
        <div className={styles.tableCard}>
          {diary.length === 0 && !loading
            ? <EmptyState icon="📓" title="No diary entries yet" description="Record what you taught today" size="lg" action={<button className={styles.primaryBtn} onClick={() => setShowDiaryModal(true)}>+ Add Entry</button>} />
            : <DataTable columns={diaryCols} data={diary} loading={loading} keyExtractor={(r) => r.id} emptyMessage="No diary entries" />
          }
        </div>
      )}

      {/* Create Lesson Plan Modal */}
      <Modal isOpen={showPlanModal} onClose={() => setShowPlanModal(false)} title="Create Lesson Plan" size="lg"
             footer={<>
               <button className={styles.cancelBtn} onClick={() => setShowPlanModal(false)}>Cancel</button>
               <button className={styles.primaryBtn} onClick={handleCreatePlan} disabled={saving}>{saving ? 'Saving...' : 'Create Plan'}</button>
             </>}>
        <form className={styles.form} onSubmit={handleCreatePlan}>
          <div className={styles.grid3}>
            <div className={styles.fg}><label className={labelClass}>Standard *</label>
              <select className={fieldClass} required value={planForm.standard} onChange={e => setPlanForm(f => ({ ...f, standard: e.target.value }))}>
                <option value="">Select</option>
                {['1','2','3','4','5','6','7','8','9','10','11','12'].map(s => <option key={s} value={s}>{s}</option>)}
              </select></div>
            <div className={styles.fg}><label className={labelClass}>Division *</label>
              <select className={fieldClass} required value={planForm.division} onChange={e => setPlanForm(f => ({ ...f, division: e.target.value }))}>
                <option value="">Select</option>
                {['A','B','C','D','E'].map(d => <option key={d} value={d}>{d}</option>)}
              </select></div>
            <div className={styles.fg}><label className={labelClass}>Month *</label>
              <select className={fieldClass} required value={planForm.month} onChange={e => setPlanForm(f => ({ ...f, month: Number(e.target.value) }))}>
                {MONTHS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select></div>
          </div>
          <div className={styles.grid2}>
            <div className={styles.fg}><label className={labelClass}>Subject *</label>
              <input className={fieldClass} required value={planForm.subject_name} onChange={e => setPlanForm(f => ({ ...f, subject_name: e.target.value }))} placeholder="e.g. Mathematics" /></div>
            <div className={styles.fg}><label className={labelClass}>Subject (Marathi)</label>
              <input className={fieldClass} value={planForm.subject_name_marathi} onChange={e => setPlanForm(f => ({ ...f, subject_name_marathi: e.target.value }))} placeholder="e.g. गणित" /></div>
          </div>
          <div className={styles.grid2}>
            <div className={styles.fg}><label className={labelClass}>Chapter Name *</label>
              <input className={fieldClass} required value={planForm.chapter_name} onChange={e => setPlanForm(f => ({ ...f, chapter_name: e.target.value }))} placeholder="Chapter title" /></div>
            <div className={styles.fg}><label className={labelClass}>Planned Periods</label>
              <input type="number" className={fieldClass} value={planForm.planned_periods} min={0}
                onChange={e => setPlanForm(f => ({ ...f, planned_periods: Number(e.target.value) }))} /></div>
          </div>
          <div className={styles.fg}><label className={labelClass}>Topics Planned *</label>
            <textarea className={styles.ta} required rows={3} value={planForm.topics_planned}
              onChange={e => setPlanForm(f => ({ ...f, topics_planned: e.target.value }))}
              placeholder="List topics to be covered this month..." /></div>
          <div className={styles.fg}><label className={labelClass}>Learning Objectives</label>
            <textarea className={styles.ta} rows={2} value={planForm.learning_objectives}
              onChange={e => setPlanForm(f => ({ ...f, learning_objectives: e.target.value }))}
              placeholder="What students should learn by end of month..." /></div>
          <div className={styles.grid2}>
            <div className={styles.fg}><label className={labelClass}>Teaching Methods</label>
              <input className={fieldClass} value={planForm.teaching_methods} onChange={e => setPlanForm(f => ({ ...f, teaching_methods: e.target.value }))} placeholder="lecture, activity, experiment..." /></div>
            <div className={styles.fg}><label className={labelClass}>Resources Required</label>
              <input className={fieldClass} value={planForm.resources_required} onChange={e => setPlanForm(f => ({ ...f, resources_required: e.target.value }))} placeholder="textbook, charts, projector..." /></div>
          </div>
        </form>
      </Modal>

      {/* Teaching Diary Modal */}
      <Modal isOpen={showDiaryModal} onClose={() => setShowDiaryModal(false)} title="Add Diary Entry" size="lg"
             footer={<>
               <button className={styles.cancelBtn} onClick={() => setShowDiaryModal(false)}>Cancel</button>
               <button className={styles.primaryBtn} onClick={handleCreateDiary} disabled={saving}>{saving ? 'Saving...' : 'Save Entry'}</button>
             </>}>
        <form className={styles.form} onSubmit={handleCreateDiary}>
          <div className={styles.grid3}>
            <div className={styles.fg}><label className={labelClass}>Standard *</label>
              <select className={fieldClass} required value={diaryForm.standard} onChange={e => setDiaryForm(f => ({ ...f, standard: e.target.value }))}>
                <option value="">Select</option>
                {['1','2','3','4','5','6','7','8','9','10','11','12'].map(s => <option key={s} value={s}>{s}</option>)}
              </select></div>
            <div className={styles.fg}><label className={labelClass}>Division *</label>
              <select className={fieldClass} required value={diaryForm.division} onChange={e => setDiaryForm(f => ({ ...f, division: e.target.value }))}>
                <option value="">Select</option>
                {['A','B','C','D','E'].map(d => <option key={d} value={d}>{d}</option>)}
              </select></div>
            <div className={styles.fg}><label className={labelClass}>Date *</label>
              <input type="date" className={fieldClass} required value={diaryForm.diary_date}
                onChange={e => setDiaryForm(f => ({ ...f, diary_date: e.target.value }))} /></div>
          </div>
          <div className={styles.grid2}>
            <div className={styles.fg}><label className={labelClass}>Subject *</label>
              <input className={fieldClass} required value={diaryForm.subject_name} onChange={e => setDiaryForm(f => ({ ...f, subject_name: e.target.value }))} placeholder="Subject name" /></div>
            <div className={styles.fg}><label className={labelClass}>Period No.</label>
              <input type="number" className={fieldClass} value={diaryForm.period_number} min={1}
                onChange={e => setDiaryForm(f => ({ ...f, period_number: e.target.value }))} /></div>
          </div>
          <div className={styles.fg}><label className={labelClass}>Topic Covered *</label>
            <input className={fieldClass} required value={diaryForm.topic_covered}
              onChange={e => setDiaryForm(f => ({ ...f, topic_covered: e.target.value }))} placeholder="What was taught today" /></div>
          <div className={styles.grid2}>
            <div className={styles.fg}><label className={labelClass}>Students Present</label>
              <input type="number" className={fieldClass} value={diaryForm.students_present} min={0}
                onChange={e => setDiaryForm(f => ({ ...f, students_present: e.target.value }))} /></div>
            <div className={styles.fg}><label className={labelClass}>Class Participation</label>
              <select className={fieldClass} value={diaryForm.class_participation}
                onChange={e => setDiaryForm(f => ({ ...f, class_participation: e.target.value }))}>
                <option value="">Select</option>
                {['excellent','good','average','poor'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
              </select></div>
          </div>
          <div className={styles.checkRow}>
            <label><input type="checkbox" checked={diaryForm.homework_given}
              onChange={e => setDiaryForm(f => ({ ...f, homework_given: e.target.checked }))} /> Homework Given</label>
            <label><input type="checkbox" checked={diaryForm.remedial_needed}
              onChange={e => setDiaryForm(f => ({ ...f, remedial_needed: e.target.checked }))} /> Remedial Needed</label>
          </div>
          {diaryForm.homework_given && (
            <div className={styles.fg}><label className={labelClass}>Homework Description</label>
              <textarea className={styles.ta} rows={2} value={diaryForm.homework_description}
                onChange={e => setDiaryForm(f => ({ ...f, homework_description: e.target.value }))}
                placeholder="Describe the homework assigned" /></div>
          )}
          {diaryForm.remedial_needed && (
            <div className={styles.fg}><label className={labelClass}>Difficulties Observed</label>
              <textarea className={styles.ta} rows={2} value={diaryForm.difficulties_observed}
                onChange={e => setDiaryForm(f => ({ ...f, difficulties_observed: e.target.value }))}
                placeholder="Which topics were difficult, which students struggled..." /></div>
          )}
        </form>
      </Modal>
    </div>
  );
}
