import { useState, useEffect, useCallback, Fragment } from 'react';
import {
  CalendarDays, Plus, RefreshCw, Check, X, BookOpen,
  Clock, Pencil, Trash2, LayoutGrid, User, Tag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import timetableService, {
  Subject, PeriodConfig, WeeklyTimetable, TimetableCell, TeacherTimetableCell,
} from '../../services/timetableService';
import api from '../../services/api';
import styles from './TimetablePage.module.css';

type Section = 'timetable' | 'teacher' | 'subjects' | 'periods';

const STANDARDS = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const DIVISIONS  = ['','A','B','C','D'];
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const CURRENT_AY = 1;

const SUBJECT_TYPES = ['theory','practical','activity','language','co-curricular'];
const PERIOD_TYPES  = ['class','break','lunch','assembly','sports','library'];

const SUBJECT_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316',
  '#f59e0b','#10b981','#14b8a6','#3b82f6','#06b6d4',
];

const bg = (hex: string | undefined) =>
  hex ? `${hex}22` : 'var(--color-surface-2)';

export default function TimetablePage() {
  const [section, setSection] = useState<Section>('timetable');

  // Class timetable
  const [selStd, setSelStd] = useState('8');
  const [selDiv, setSelDiv] = useState('A');
  const [timetable, setTimetable] = useState<WeeklyTimetable | null>(null);
  const [loadingTT, setLoadingTT] = useState(false);

  // Edit cell modal
  const [editCell, setEditCell] = useState<{ day: number; period: TimetableCell } | null>(null);
  const [cellSubject, setCellSubject] = useState('');
  const [cellTeacher, setCellTeacher] = useState('');
  const [cellRoom, setCellRoom] = useState('');
  const [savingCell, setSavingCell] = useState(false);

  // Teachers list
  const [teachersList, setTeachersList] = useState<Array<{ id: number; user_id?: number; full_name?: string; designation?: string }>>([]);

  // Teacher timetable
  const [teacherId, setTeacherId] = useState('');
  const [teacherTT, setTeacherTT] = useState<TeacherTimetableCell[]>([]);
  const [loadingTeacher, setLoadingTeacher] = useState(false);

  // Subjects
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [newSubject, setNewSubject] = useState({ name: '', name_marathi: '', code: '', subject_type: 'theory', color: SUBJECT_COLORS[0], applicable_standards: 'All' });
  const [savingSubject, setSavingSubject] = useState(false);

  // Periods
  const [periods, setPeriods] = useState<PeriodConfig[]>([]);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [newPeriod, setNewPeriod] = useState({ period_number: 1, period_name: '', start_time: '', end_time: '', duration_minutes: 45, period_type: 'class', sort_order: 0, academic_year_id: CURRENT_AY });
  const [savingPeriod, setSavingPeriod] = useState(false);

  const loadTeachersList = useCallback(async () => {
    try {
      const res = await api.get('/teachers');
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data)) setTeachersList(data);
    } catch {}
  }, []);

  const loadSubjects = useCallback(async () => {
    try { setSubjects(await timetableService.getSubjects()); } catch {}
  }, []);

  const loadPeriods = useCallback(async () => {
    try { setPeriods(await timetableService.getPeriods(CURRENT_AY)); } catch {}
  }, []);

  useEffect(() => { loadSubjects(); loadPeriods(); loadTeachersList(); }, [loadSubjects, loadPeriods, loadTeachersList]);

  const loadTimetable = useCallback(async () => {
    setLoadingTT(true); setTimetable(null);
    try { setTimetable(await timetableService.getClassTimetable(selStd, selDiv || undefined, CURRENT_AY)); }
    catch { toast.error('Failed to load timetable.'); }
    finally { setLoadingTT(false); }
  }, [selStd, selDiv]);

  useEffect(() => { if (section === 'timetable') loadTimetable(); }, [section, loadTimetable]);

  const openEditCell = (day: number, period: TimetableCell) => {
    if (period.period_type !== 'class') return;
    setEditCell({ day, period });
    setCellSubject(String(period.subject_id || ''));
    setCellTeacher(String(period.teacher_id || ''));
    setCellRoom(period.room || '');
  };

  const saveCell = async () => {
    if (!editCell) return;
    setSavingCell(true);
    try {
      await timetableService.upsertEntry({
        standard: selStd,
        division: selDiv || undefined,
        day_of_week: editCell.day,
        period_id: editCell.period.period_id,
        subject_id: cellSubject ? Number(cellSubject) : undefined,
        teacher_id: cellTeacher ? Number(cellTeacher) : undefined,
        room: cellRoom || undefined,
        academic_year_id: CURRENT_AY,
      });
      toast.success('Period updated!');
      setEditCell(null);
      loadTimetable();
    } catch { toast.error('Failed to save.'); }
    finally { setSavingCell(false); }
  };

  const clearCell = async () => {
    if (!editCell?.period.entry_id) { setEditCell(null); return; }
    try {
      await timetableService.deleteEntry(editCell.period.entry_id);
      toast.success('Period cleared.'); setEditCell(null); loadTimetable();
    } catch { toast.error('Failed.'); }
  };

  const loadTeacherTT = async () => {
    if (!teacherId) return;
    setLoadingTeacher(true);
    try { setTeacherTT(await timetableService.getTeacherTimetable(Number(teacherId), CURRENT_AY)); }
    catch { toast.error('Not found.'); }
    finally { setLoadingTeacher(false); }
  };

  const seedPeriods = async () => {
    try {
      const count = await timetableService.seedPeriods(CURRENT_AY);
      toast.success(`${count} periods seeded!`); loadPeriods();
    } catch { toast.error('Failed.'); }
  };

  const saveSubject = async () => {
    if (!newSubject.name) { toast.error('Name required.'); return; }
    setSavingSubject(true);
    try {
      if (editSubject) { await timetableService.updateSubject(editSubject.id, newSubject); toast.success('Subject updated!'); }
      else { await timetableService.createSubject(newSubject); toast.success('Subject added!'); }
      setShowSubjectModal(false); setEditSubject(null);
      setNewSubject({ name:'', name_marathi:'', code:'', subject_type:'theory', color:SUBJECT_COLORS[0], applicable_standards:'All' });
      loadSubjects();
    } catch { toast.error('Failed.'); }
    finally { setSavingSubject(false); }
  };

  const deleteSubject = async (id: number) => {
    if (!confirm('Delete this subject?')) return;
    try { await timetableService.deleteSubject(id); toast.success('Deleted.'); loadSubjects(); }
    catch { toast.error('Failed.'); }
  };

  const savePeriod = async () => {
    if (!newPeriod.period_name || !newPeriod.start_time || !newPeriod.end_time) {
      toast.error('All fields required.'); return;
    }
    setSavingPeriod(true);
    try {
      await timetableService.createPeriod(newPeriod);
      toast.success('Period added!');
      setShowPeriodModal(false);
      setNewPeriod({ period_number:1, period_name:'', start_time:'', end_time:'', duration_minutes:45, period_type:'class', sort_order:0, academic_year_id:CURRENT_AY });
      loadPeriods();
    } catch { toast.error('Failed.'); }
    finally { setSavingPeriod(false); }
  };

  // Build teacher grid from flat cells
  const teacherGrid: Record<number, Record<string, TeacherTimetableCell>> = {};
  teacherTT.forEach(c => {
    if (!teacherGrid[c.day_number]) teacherGrid[c.day_number] = {};
    teacherGrid[c.day_number][c.period_name] = c;
  });

  const classPeriods = timetable?.periods.filter(p => p.period_type === 'class') || [];
  const allPeriods = timetable?.periods || [];

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Timetable Management</h1>
          <p className={styles.pageSub}>वेळापत्रक · Weekly Class Schedule</p>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabBar}>
        {([
          { id: 'timetable', label: 'Class Timetable', icon: <LayoutGrid size={14}/> },
          { id: 'teacher',   label: 'Teacher View',   icon: <User size={14}/> },
          { id: 'subjects',  label: 'Subjects',       icon: <BookOpen size={14}/> },
          { id: 'periods',   label: 'Period Config',  icon: <Clock size={14}/> },
        ] as const).map(t => (
          <button key={t.id} className={`${styles.tab} ${section === t.id ? styles.tabActive : ''}`}
            onClick={() => setSection(t.id as Section)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── CLASS TIMETABLE ──────────────────────────────── */}
      {section === 'timetable' && (
        <div className={styles.ttContent}>
          <div className={styles.toolbar}>
            <div className={styles.stdTabs}>
              {STANDARDS.map(s => (
                <button key={s} className={`${styles.stdTab} ${selStd===s?styles.stdTabActive:''}`}
                  onClick={() => setSelStd(s)}>Std {s}</button>
              ))}
            </div>
            <div className={styles.divTabs}>
              {DIVISIONS.map(d => (
                <button key={d||'all'} className={`${styles.divTab} ${selDiv===d?styles.divTabActive:''}`}
                  onClick={() => setSelDiv(d)}>{d||'All'}</button>
              ))}
            </div>
            <button className={styles.iconBtn} onClick={loadTimetable}><RefreshCw size={14}/></button>
          </div>

          {loadingTT ? (
            <div className={styles.loadingSkel}/>
          ) : !timetable ? (
            <div className={styles.emptyState}><CalendarDays size={64}/><p>No timetable data</p></div>
          ) : (
            <div className={styles.ttGridWrap}>
              <div className={styles.ttGrid} style={{ '--cols': allPeriods.length + 1 } as React.CSSProperties}>
                {/* Header row */}
                <div className={styles.ttHeaderCell}>Day / Period</div>
                {allPeriods.map(p => (
                  <div key={p.id} className={`${styles.ttHeaderCell} ${p.period_type !== 'class' ? styles.ttBreakHeader : ''}`}>
                    <div className={styles.phName}>{p.period_name}</div>
                    <div className={styles.phTime}>{p.start_time}–{p.end_time}</div>
                  </div>
                ))}

                {/* Data rows */}
                {timetable.days.map(day => (
                  <Fragment key={`day-row-${day.day_number}`}>
                    <div key={`d${day.day_number}`} className={styles.ttDayCell}>{day.day_name}</div>
                    {day.periods.map(cell => {
                      const isBreak = cell.period_type !== 'class';
                      return (
                        <div key={`${day.day_number}-${cell.period_id}`}
                          className={`${styles.ttCell} ${isBreak ? styles.ttBreakCell : ''} ${cell.subject_id ? styles.ttFilledCell : styles.ttEmptyCell}`}
                          style={cell.subject_color ? { background: bg(cell.subject_color), borderLeft: `3px solid ${cell.subject_color}` } : {}}
                          onClick={() => !isBreak && openEditCell(day.day_number, cell)}>
                          {isBreak ? (
                            <span className={styles.breakLabel}>{cell.period_type}</span>
                          ) : cell.subject_id ? (
                            <>
                              <div className={styles.cellSubject}>{cell.subject_name}</div>
                              {cell.subject_name_marathi && <div className={styles.cellSubjectMr}>{cell.subject_name_marathi}</div>}
                              {cell.teacher_name && <div className={styles.cellTeacher}>{cell.teacher_name.split(' ').slice(-1)[0]}</div>}
                              {cell.room && <div className={styles.cellRoom}>🏫 {cell.room}</div>}
                            </>
                          ) : (
                            <div className={styles.emptyCell}>
                              <Plus size={14} className={styles.plusIcon}/>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </Fragment>
                ))}
              </div>

              {/* Legend */}
              <div className={styles.legend}>
                {subjects.filter(s => s.color).map(s => (
                  <div key={s.id} className={styles.legendItem}>
                    <div className={styles.legendDot} style={{ background: s.color! }}/>
                    <span>{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TEACHER VIEW ─────────────────────────────────── */}
      {section === 'teacher' && (
        <div className={styles.teacherContent}>
          <div className={styles.toolbar}>
            <select className={styles.searchInput} value={teacherId} onChange={e => setTeacherId(e.target.value)}>
              <option value="">-- Select Teacher --</option>
              {teachersList.map(t => (
                <option key={t.id} value={t.id}>
                  {t.full_name || `Teacher #${t.id}`} {t.designation ? `(${t.designation})` : ''}
                </option>
              ))}
            </select>
            <input className={styles.searchInput} type="number" placeholder="or Teacher ID..."
              value={teacherId} onChange={e => setTeacherId(e.target.value)}
              onKeyDown={e => e.key==='Enter' && loadTeacherTT()}/>
            <button className={styles.addBtn} onClick={loadTeacherTT}><User size={14}/> Load Timetable</button>
            {loadingTeacher && <span className={styles.spin2}/>}
          </div>

          {teacherTT.length === 0 ? (
            <div className={styles.emptyState}><User size={64}/><p>Select or enter teacher ID and click Load to view their weekly schedule.</p></div>
          ) : (
            <div className={styles.teacherGrid}>
              <table className={styles.table}>
                <thead><tr>
                  <th>Period</th>
                  {DAYS.map(d => <th key={d}>{d}</th>)}
                </tr></thead>
                <tbody>
                  {Array.from(new Set(teacherTT.map(c => c.period_name))).map(pName => (
                    <tr key={pName} className={styles.tr}>
                      <td className={styles.periodNameCell}>{pName}</td>
                      {DAYS.map((_, i) => {
                        const cell = teacherGrid[i+1]?.[pName];
                        return (
                          <td key={i} className={cell ? styles.teacherCell : ''}>
                            {cell ? (
                              <div className={styles.teacherCellInner}>
                                <div className={styles.tcClass}>Std {cell.standard}{cell.division}</div>
                                <div className={styles.tcSubject}>{cell.subject_name}</div>
                                {cell.room && <div className={styles.tcRoom}>{cell.room}</div>}
                              </div>
                            ) : <span className={styles.freeCell}>Free</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── SUBJECTS ─────────────────────────────────────── */}
      {section === 'subjects' && (
        <div className={styles.subjectsContent}>
          <div className={styles.toolbar}>
            <span className={styles.muted}>{subjects.length} subjects</span>
            <button className={styles.iconBtn} onClick={loadSubjects}><RefreshCw size={14}/></button>
            <button className={styles.addBtn} onClick={() => { setEditSubject(null); setNewSubject({ name:'', name_marathi:'', code:'', subject_type:'theory', color:SUBJECT_COLORS[0], applicable_standards:'All' }); setShowSubjectModal(true); }}><Plus size={15}/> Add Subject</button>
          </div>

          <div className={styles.subjectGrid}>
            {subjects.map(s => (
              <div key={s.id} className={styles.subjectCard} style={{ borderLeft: `4px solid ${s.color || 'var(--color-border)'}` }}>
                <div className={styles.subjectCardTop}>
                  <div className={styles.subjectDot} style={{ background: s.color || 'var(--color-border)' }}/>
                  <div>
                    <div className={styles.subjectName}>{s.name}</div>
                    {s.name_marathi && <div className={styles.subjectNameMr}>{s.name_marathi}</div>}
                  </div>
                </div>
                <div className={styles.subjectMeta}>
                  {s.code && <span className={styles.codeTag}>{s.code}</span>}
                  <span className={styles.typeTag}>{s.subject_type}</span>
                  {s.applicable_standards && <span className={styles.stdTag}>Std: {s.applicable_standards}</span>}
                </div>
                <div className={styles.subjectActions}>
                  <button className={styles.miniBtn} onClick={() => {
                    setEditSubject(s);
                    setNewSubject({ name:s.name, name_marathi:s.name_marathi||'', code:s.code||'', subject_type:s.subject_type, color:s.color||SUBJECT_COLORS[0], applicable_standards:s.applicable_standards||'All' });
                    setShowSubjectModal(true);
                  }}><Pencil size={11}/></button>
                  <button className={`${styles.miniBtn} ${styles.miniBtnDanger}`} onClick={() => deleteSubject(s.id)}><Trash2 size={11}/></button>
                </div>
              </div>
            ))}
            {subjects.length === 0 && <div className={styles.emptyMsg}>No subjects added yet.</div>}
          </div>
        </div>
      )}

      {/* ── PERIOD CONFIG ────────────────────────────────── */}
      {section === 'periods' && (
        <div className={styles.periodsContent}>
          <div className={styles.toolbar}>
            <span className={styles.muted}>{periods.length} periods configured</span>
            <button className={styles.iconBtn} onClick={loadPeriods}><RefreshCw size={14}/></button>
            <button className={styles.seedBtn} onClick={seedPeriods}><CalendarDays size={14}/> Seed Default (8-Period)</button>
            <button className={styles.addBtn} onClick={() => setShowPeriodModal(true)}><Plus size={15}/> Add Period</button>
          </div>

          <div className={styles.periodList}>
            {periods.map(p => (
              <div key={p.id} className={`${styles.periodItem} ${p.period_type !== 'class' ? styles.periodBreak : ''}`}>
                <div className={styles.periodNum}>#{p.period_number}</div>
                <div className={styles.periodInfo}>
                  <div className={styles.periodName}>{p.period_name}</div>
                  <div className={styles.periodTime}>{p.start_time} – {p.end_time} · {p.duration_minutes} min</div>
                </div>
                <span className={`${styles.pTag} ${p.period_type==='class'?styles.pTagClass:p.period_type==='break'||p.period_type==='lunch'?styles.pTagBreak:styles.pTagOther}`}>
                  {p.period_type}
                </span>
              </div>
            ))}
            {periods.length === 0 && (
              <div className={styles.emptyState}><Clock size={48}/><p>No periods configured. Click "Seed Default" to add a standard 8-period school day.</p></div>
            )}
          </div>
        </div>
      )}

      {/* ════ Edit Cell Modal ════ */}
      {editCell && (
        <div className={styles.overlay} onClick={() => setEditCell(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {DAYS[editCell.day-1]} · {editCell.period.period_name}
                <span className={styles.modalSub}> Std {selStd}{selDiv}</span>
              </h3>
              <button className={styles.modalClose} onClick={() => setEditCell(null)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mf}>
                <label className={styles.ml}>Subject</label>
                <select className={styles.mi} value={cellSubject} onChange={e => setCellSubject(e.target.value)}>
                  <option value="">-- Free Period --</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}{s.name_marathi ? ` (${s.name_marathi})` : ''}</option>)}
                </select>
              </div>
              <div className={styles.mf}>
                <label className={styles.ml}>Assigned Teacher</label>
                <select className={styles.mi} value={cellTeacher} onChange={e => setCellTeacher(e.target.value)}>
                  <option value="">-- Select Teacher --</option>
                  {teachersList.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.full_name || `Teacher #${t.id}`} {t.designation ? `(${t.designation})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.mf}>
                <label className={styles.ml}>Room / Lab</label>
                <input className={styles.mi} value={cellRoom} onChange={e => setCellRoom(e.target.value)} placeholder="e.g. Room 12, Computer Lab"/>
              </div>
            </div>
            <div className={styles.modalFooter}>
              {editCell.period.entry_id && (
                <button className={styles.clearBtn} onClick={clearCell}><Trash2 size={13}/> Clear</button>
              )}
              <button className={styles.cancelBtn} onClick={() => setEditCell(null)}>Cancel</button>
              <button className={styles.submitBtn} onClick={saveCell} disabled={savingCell}>
                {savingCell ? <span className={styles.spin}/> : <Check size={14}/>} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ Subject Modal ════ */}
      {showSubjectModal && (
        <div className={styles.overlay} onClick={() => setShowSubjectModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editSubject ? 'Edit Subject' : 'Add Subject'}</h3>
              <button className={styles.modalClose} onClick={() => setShowSubjectModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mf}><label className={styles.ml}>Name *</label><input className={styles.mi} value={newSubject.name} onChange={e=>setNewSubject(p=>({...p,name:e.target.value}))} placeholder="e.g. Mathematics"/></div>
              <div className={styles.mf}><label className={styles.ml}>Marathi Name</label><input className={styles.mi} value={newSubject.name_marathi} onChange={e=>setNewSubject(p=>({...p,name_marathi:e.target.value}))} placeholder="गणित"/></div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Code</label><input className={styles.mi} value={newSubject.code} onChange={e=>setNewSubject(p=>({...p,code:e.target.value}))} placeholder="MATH"/></div>
                <div className={styles.mf}><label className={styles.ml}>Type</label>
                  <select className={styles.mi} value={newSubject.subject_type} onChange={e=>setNewSubject(p=>({...p,subject_type:e.target.value}))}>
                    {SUBJECT_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.mf}><label className={styles.ml}>Applicable Standards</label><input className={styles.mi} value={newSubject.applicable_standards} onChange={e=>setNewSubject(p=>({...p,applicable_standards:e.target.value}))} placeholder="All or 1,2,3"/></div>
              <div className={styles.mf}>
                <label className={styles.ml}>Color</label>
                <div className={styles.colorPicker}>
                  {SUBJECT_COLORS.map(c => (
                    <button key={c} className={`${styles.colorSwatch} ${newSubject.color===c?styles.colorSwatchActive:''}`}
                      style={{ background: c }} onClick={() => setNewSubject(p=>({...p,color:c}))}/>
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowSubjectModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={saveSubject} disabled={savingSubject}>{savingSubject?<span className={styles.spin}/>:<Check size={14}/>} <span>{editSubject?'Update':'Add'}</span></button>
            </div>
          </div>
        </div>
      )}

      {/* ════ Period Modal ════ */}
      {showPeriodModal && (
        <div className={styles.overlay} onClick={() => setShowPeriodModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Add Period</h3>
              <button className={styles.modalClose} onClick={() => setShowPeriodModal(false)}><X size={16}/></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Period #</label><input type="number" className={styles.mi} value={newPeriod.period_number} onChange={e=>setNewPeriod(p=>({...p,period_number:Number(e.target.value)}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Sort Order</label><input type="number" className={styles.mi} value={newPeriod.sort_order} onChange={e=>setNewPeriod(p=>({...p,sort_order:Number(e.target.value)}))}/></div>
              </div>
              <div className={styles.mf}><label className={styles.ml}>Period Name *</label><input className={styles.mi} value={newPeriod.period_name} onChange={e=>setNewPeriod(p=>({...p,period_name:e.target.value}))} placeholder="e.g. Period 1 / Lunch Break"/></div>
              <div className={styles.mfRow}>
                <div className={styles.mf}><label className={styles.ml}>Start Time *</label><input type="time" className={styles.mi} value={newPeriod.start_time} onChange={e=>setNewPeriod(p=>({...p,start_time:e.target.value}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>End Time *</label><input type="time" className={styles.mi} value={newPeriod.end_time} onChange={e=>setNewPeriod(p=>({...p,end_time:e.target.value}))}/></div>
                <div className={styles.mf}><label className={styles.ml}>Duration (min)</label><input type="number" className={styles.mi} value={newPeriod.duration_minutes} onChange={e=>setNewPeriod(p=>({...p,duration_minutes:Number(e.target.value)}))}/></div>
              </div>
              <div className={styles.mf}><label className={styles.ml}>Type</label>
                <select className={styles.mi} value={newPeriod.period_type} onChange={e=>setNewPeriod(p=>({...p,period_type:e.target.value}))}>
                  {PERIOD_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowPeriodModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={savePeriod} disabled={savingPeriod}>{savingPeriod?<span className={styles.spin}/>:<Check size={14}/>} <span>Add Period</span></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
