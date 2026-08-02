import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, CheckCircle, XCircle, Clock, RefreshCw, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import studentService, { Student, AttendanceRecord } from '../../services/studentService';
import styles from './AttendancePage.module.css';

const STANDARDS = ['1','2','3','4','5','6','7','8','9','10','11','12'];
type AttStatus = 'present' | 'absent' | 'late' | 'half_day';

interface AttendanceRow extends Student {
  currentStatus: AttStatus;
}

export default function AttendancePage() {
  const { t } = useTranslation();

  const [students, setStudents] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedStd, setSelectedStd] = useState('');
  const [selectedDiv, setSelectedDiv] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalLoaded, setTotalLoaded] = useState(0);

  const loadStudents = async () => {
    if (!selectedStd) { toast.error('Please select a standard first.'); return; }
    setLoading(true);
    try {
      const res = await studentService.getList({
        standard: selectedStd,
        division: selectedDiv || undefined,
        status: 'active',
        per_page: 100,
      });
      setStudents(res.items.map(s => ({ ...s, currentStatus: 'present' })));
      setTotalLoaded(res.meta.total);
    } catch {
      toast.error('Failed to load students.');
    } finally {
      setLoading(false);
    }
  };

  const setStatus = (studentId: number, status: AttStatus) => {
    setStudents(prev =>
      prev.map(s => s.id === studentId ? { ...s, currentStatus: status } : s)
    );
  };

  const markAll = (status: AttStatus) => {
    setStudents(prev => prev.map(s => ({ ...s, currentStatus: status })));
  };

  const saveAttendance = async () => {
    if (students.length === 0) { toast.error('No students loaded.'); return; }
    setSaving(true);
    try {
      const records: AttendanceRecord[] = students.map(s => ({
        student_id: s.id,
        status: s.currentStatus,
      }));

      const count = await studentService.markAttendanceBulk({
        attendance_date: selectedDate,
        standard: selectedStd,
        division: selectedDiv || undefined,
        period: 'full_day',
        records,
      });

      toast.success(`✅ Attendance saved for ${count} students.`);
    } catch {
      toast.error('Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  const presentCount = students.filter(s => s.currentStatus === 'present').length;
  const absentCount = students.filter(s => s.currentStatus === 'absent').length;
  const lateCount = students.filter(s => s.currentStatus === 'late').length;

  const statusConfig: Record<AttStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    present:  { label: 'Present', cls: styles.present,  icon: <CheckCircle size={14}/> },
    absent:   { label: 'Absent',  cls: styles.absent,   icon: <XCircle size={14}/> },
    late:     { label: 'Late',    cls: styles.late,     icon: <Clock size={14}/> },
    half_day: { label: 'Half',    cls: styles.halfDay,  icon: <Clock size={14}/> },
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Attendance</h1>
          <p className={styles.pageSub}>उपस्थिती नोंद · Mark daily class attendance</p>
        </div>
      </div>

      {/* Selector Bar */}
      <div className={styles.selectorBar}>
        <div className={styles.selectorGroup}>
          <CalendarDays size={15} className={styles.selectorIcon} />
          <input
            type="date"
            className={styles.selectorInput}
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>
        <select
          className={styles.selectorSelect}
          value={selectedStd}
          onChange={e => setSelectedStd(e.target.value)}
        >
          <option value="">Select Standard</option>
          {STANDARDS.map(s => <option key={s} value={s}>Standard {s}</option>)}
        </select>
        <input
          className={styles.selectorSmall}
          placeholder="Division"
          value={selectedDiv}
          onChange={e => setSelectedDiv(e.target.value.toUpperCase())}
          maxLength={2}
        />
        <button
          className={styles.loadBtn}
          onClick={loadStudents}
          disabled={!selectedStd || loading}
        >
          {loading ? <RefreshCw size={15} className={styles.spin} /> : <RefreshCw size={15} />}
          <span>{loading ? 'Loading...' : 'Load Students'}</span>
        </button>
      </div>

      {students.length > 0 && (
        <>
          {/* Stats */}
          <div className={styles.statsRow}>
            <div className={`${styles.statPill} ${styles.pillPresent}`}>
              <CheckCircle size={14} /> Present: <strong>{presentCount}</strong>
            </div>
            <div className={`${styles.statPill} ${styles.pillAbsent}`}>
              <XCircle size={14} /> Absent: <strong>{absentCount}</strong>
            </div>
            <div className={`${styles.statPill} ${styles.pillLate}`}>
              <Clock size={14} /> Late: <strong>{lateCount}</strong>
            </div>
            <div className={styles.statPill}>
              Total: <strong>{students.length}</strong>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className={styles.bulkActions}>
            <span className={styles.bulkLabel}>Mark All:</span>
            <button className={styles.bulkBtn} onClick={() => markAll('present')}>✅ All Present</button>
            <button className={`${styles.bulkBtn} ${styles.bulkBtnDanger}`} onClick={() => markAll('absent')}>❌ All Absent</button>
          </div>

          {/* Student Grid */}
          <div className={styles.studentGrid}>
            {students.map((student, idx) => (
              <div key={student.id} className={`${styles.studentCard} ${styles[student.currentStatus]}`}>
                <div className={styles.cardTop}>
                  <div className={styles.rollNo}>{student.roll_number || idx + 1}</div>
                  <div className={styles.studentInfo}>
                    <span className={styles.sName}>{student.full_name}</span>
                    <span className={styles.sGr}>{student.gr_number}</span>
                  </div>
                </div>
                <div className={styles.statusBtns}>
                  {(Object.entries(statusConfig) as [AttStatus, typeof statusConfig[AttStatus]][]).map(([status, cfg]) => (
                    <button
                      key={status}
                      className={`${styles.statusBtn} ${student.currentStatus === status ? styles[`statusBtn_${status}`] : ''}`}
                      onClick={() => setStatus(student.id, status)}
                      title={cfg.label}
                    >
                      {cfg.icon}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Save Button */}
          <div className={styles.saveBar}>
            <div className={styles.saveInfo}>
              <strong>Std {selectedStd}{selectedDiv ? `-${selectedDiv}` : ''}</strong> ·{' '}
              {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <button
              className={styles.saveBtn}
              onClick={saveAttendance}
              disabled={saving}
              id="save-attendance-btn"
            >
              {saving ? <span className={styles.spinner} /> : <Save size={16} />}
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </>
      )}

      {!loading && students.length === 0 && selectedStd && (
        <div className={styles.emptyState}>
          <CheckCircle size={48} />
          <p>No students found for Std {selectedStd}{selectedDiv ? `-${selectedDiv}` : ''}</p>
        </div>
      )}

      {!selectedStd && (
        <div className={styles.emptyState}>
          <CalendarDays size={48} />
          <p>Select a standard to load students</p>
        </div>
      )}
    </div>
  );
}
