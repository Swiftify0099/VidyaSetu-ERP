/**
 * VidyaSetu ERP — QR Scan Center Page (Phase 8)
 * ================================================
 * Generate and manage QR codes for:
 *  - Student ID cards (with Printable Badge Preview)
 *  - Library book tracking
 *  - Attendance marking via QR
 *  - Fee payment verification
 */
import { useState, useCallback, useEffect } from 'react';
import { QrCode, Search, Download, Copy, CheckCircle, Book, GraduationCap, CreditCard, CalendarCheck, Printer, User } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { PageHeader, StatusBadge } from '../../components/shared';
import styles from './QRScanCenterPage.module.css';

// ── Types ─────────────────────────────────────────────────────
type QRType = 'student' | 'library' | 'attendance' | 'fee';

interface QRRecord {
  id: number;
  type: QRType;
  reference_id: number;
  reference_code: string;
  label: string;
  sub_label?: string;
  qr_data: string;
  qr_image_url?: string;
  generated_at: string;
  is_active: boolean;
}

interface ScanResult {
  type: QRType;
  found: boolean;
  data?: Record<string, unknown>;
  message: string;
}

interface EntitySuggestion {
  id: number;
  code: string;
  label: string;
  sub: string;
}

const TYPE_CONFIG: Record<QRType, { icon: React.ReactNode; label: string; color: string; desc: string }> = {
  student:    { icon: <GraduationCap size={20} />, label: 'Student ID', color: '#4f46e5', desc: 'Generate QR for student identity card' },
  library:    { icon: <Book size={20} />,          label: 'Library Book', color: '#059669', desc: 'Track books with QR codes' },
  attendance: { icon: <CalendarCheck size={20} />, label: 'Attendance QR', color: '#d97706', desc: 'Mark attendance by scanning QR' },
  fee:        { icon: <CreditCard size={20} />,    label: 'Fee Receipt', color: '#7c3aed', desc: 'Verify fee payment via QR' },
};

export default function QRScanCenterPage() {
  const [activeType, setActiveType] = useState<QRType>('student');
  const [referenceId, setReferenceId] = useState('');
  const [generatedQR, setGeneratedQR] = useState<QRRecord | null>(null);
  const [generating, setGenerating] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recentQRs, setRecentQRs] = useState<QRRecord[]>([]);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<EntitySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch search suggestions as user types
  useEffect(() => {
    if (activeType === 'attendance' || !referenceId.trim() || referenceId.length < 1) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/qr/entities/search', {
          params: { type: activeType, q: referenceId }
        });
        setSuggestions(res.data?.data || []);
      } catch {
        setSuggestions([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [activeType, referenceId]);

  // ── Generate QR ───────────────────────────────────────────
  const generateQR = useCallback(async (customRef?: string) => {
    const refToUse = (customRef || referenceId).trim();
    if (!refToUse) {
      toast.error('Please select or enter the Student ID / GR Number');
      return;
    }
    setGenerating(true);
    setShowSuggestions(false);
    try {
      const res = await api.post('/qr/generate', {
        type: activeType,
        reference_id: refToUse,
      });
      const data = res.data?.data;
      setGeneratedQR(data);
      setRecentQRs(prev => [data, ...prev.filter(r => r.id !== data.id).slice(0, 8)]);
      toast.success('QR Code generated successfully!');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || 'Failed to generate QR code';
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  }, [activeType, referenceId]);

  // ── Scan / Verify QR ─────────────────────────────────────
  const verifyScan = useCallback(async () => {
    if (!scanInput.trim()) return;
    setScanning(true);
    setScanResult(null);
    try {
      const res = await api.post('/qr/scan', { qr_data: scanInput.trim() });
      setScanResult(res.data?.data);
    } catch (err: unknown) {
      setScanResult({
        type: 'student',
        found: false,
        message: (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'QR code not recognised',
      });
    } finally { setScanning(false); }
  }, [scanInput]);

  const copyQRData = () => {
    if (!generatedQR) return;
    navigator.clipboard.writeText(generatedQR.qr_data);
    setCopied(true);
    toast.success('QR data copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    if (!generatedQR?.qr_image_url) {
      toast.error('No QR image available');
      return;
    }
    const a = document.createElement('a');
    a.href = generatedQR.qr_image_url;
    a.download = `qr_${generatedQR.type}_${generatedQR.reference_code}.png`;
    a.click();
  };

  const printIDCard = () => {
    window.print();
  };

  const cfg = TYPE_CONFIG[activeType];

  return (
    <div className={styles.page}>
      <PageHeader
        title="QR Scan Center"
        subtitle="Generate, manage and verify QR codes for all school entities — QR व्यवस्थापन"
        actions={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className={styles.badge}>Phase 8</span>
          </div>
        }
      />

      <div className={styles.layout}>
        {/* ── Left Panel: Generate ──────────────────────────── */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>
            <QrCode size={18} /> Generate QR Code
          </h2>

          {/* Type Selector */}
          <div className={styles.typeGrid}>
            {(Object.entries(TYPE_CONFIG) as [QRType, typeof TYPE_CONFIG[QRType]][]).map(([type, c]) => (
              <button
                key={type}
                className={`${styles.typeCard} ${activeType === type ? styles.typeCardActive : ''}`}
                style={activeType === type ? { borderColor: c.color, backgroundColor: `${c.color}12` } : {}}
                onClick={() => {
                  setActiveType(type);
                  setGeneratedQR(null);
                  setReferenceId('');
                  setSuggestions([]);
                }}
              >
                <span style={{ color: activeType === type ? c.color : 'var(--color-text-secondary)' }}>
                  {c.icon}
                </span>
                <span className={styles.typeCardLabel}>{c.label}</span>
              </button>
            ))}
          </div>

          <p className={styles.typeDesc}>{cfg.desc}</p>

          {/* Reference Input with Suggestions */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              {activeType === 'student' ? 'Search Student (Name / GR No / Roll)' :
               activeType === 'library' ? 'Book Title / Accession No' :
               activeType === 'attendance' ? 'Class (Standard-Division)' :
               'Receipt Number'}
            </label>
            <div className={styles.suggestWrapper}>
              <div className={styles.inputRow}>
                <input
                  className={styles.formInput}
                  value={referenceId}
                  onChange={e => {
                    setReferenceId(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder={
                    activeType === 'student' ? 'Search Student name or GR No (e.g. GR2024001)...' :
                    activeType === 'library' ? 'e.g. Mathematics Vol 1 or 5501' :
                    activeType === 'attendance' ? 'e.g. 8-A' :
                    'e.g. REC-2024-001'
                  }
                  onKeyDown={e => e.key === 'Enter' && generateQR()}
                />
                <button
                  className={styles.generateBtn}
                  style={{ backgroundColor: cfg.color }}
                  onClick={() => generateQR()}
                  disabled={generating}
                >
                  {generating ? '...' : 'Generate'}
                </button>
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className={styles.suggestionsBox}>
                  {suggestions.map(s => (
                    <div
                      key={s.id}
                      className={styles.suggestItem}
                      onClick={() => {
                        setReferenceId(s.code || String(s.id));
                        setShowSuggestions(false);
                        generateQR(s.code || String(s.id));
                      }}
                    >
                      <span className={styles.suggestTitle}>{s.label}</span>
                      <span className={styles.suggestSub}>{s.sub}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Generated QR Display */}
          {generatedQR && (
            <div className={styles.qrResult}>
              {generatedQR.qr_image_url ? (
                <img
                  src={generatedQR.qr_image_url}
                  alt="Scannable QR Code"
                  className={styles.qrImage}
                />
              ) : (
                <div className={styles.qrPlaceholder}>
                  <QrCode size={80} color={cfg.color} />
                  <span className={styles.qrPlaceholderText}>QR Code Generated</span>
                </div>
              )}

              <div className={styles.qrMeta}>
                <p className={styles.qrLabel}>{generatedQR.label}</p>
                {generatedQR.sub_label && <p className={styles.qrSub}>{generatedQR.sub_label}</p>}
                <p className={styles.qrCode}>Ref: {generatedQR.reference_code}</p>
              </div>

              <div className={styles.qrActions}>
                <button className={styles.qrActionBtn} onClick={copyQRData}>
                  {copied ? <CheckCircle size={14} color="#059669" /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy Data'}
                </button>
                <button className={styles.qrActionBtn} onClick={downloadQR}>
                  <Download size={14} /> Download PNG
                </button>
                {generatedQR.type === 'student' && (
                  <button className={styles.qrActionBtn} onClick={printIDCard}>
                    <Printer size={14} /> Print ID Card
                  </button>
                )}
              </div>

              {/* Professional Student ID Card Preview Badge */}
              {generatedQR.type === 'student' && (
                <div className={`${styles.idCardContainer} ${styles.printableCard}`}>
                  <div className={styles.idCardHeader}>
                    <span className={styles.idCardSchool}>VidyaSetu Academy</span>
                    <span className={styles.idCardBadge}>Student Pass</span>
                  </div>
                  <div className={styles.idCardBody}>
                    <div className={styles.idCardPhoto}>
                      <User size={40} />
                    </div>
                    <div className={styles.idCardDetails}>
                      <h4 className={styles.idCardName}>{generatedQR.label}</h4>
                      <p className={styles.idCardInfo}>{generatedQR.sub_label}</p>
                      <span className={styles.idCardCode}>GR No: {generatedQR.reference_code}</span>
                    </div>
                  </div>
                  <div className={styles.idCardFooter}>
                    <span style={{ fontSize: '0.68rem', opacity: 0.85 }}>Valid Academic Year 2024-25</span>
                    {generatedQR.qr_image_url && (
                      <img src={generatedQR.qr_image_url} alt="ID QR" className={styles.idCardQR} />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right Panel: Scan / Verify ────────────────────── */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>
            <Search size={18} /> Verify / Scan QR
          </h2>
          <p className={styles.typeDesc}>
            Paste or scan the QR code data string to verify and look up the associated student or entity record.
          </p>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>QR Code Data Payload</label>
            <textarea
              className={`${styles.formInput} ${styles.textarea}`}
              rows={4}
              placeholder="Paste QR code JSON payload or scan output here..."
              value={scanInput}
              onChange={e => setScanInput(e.target.value)}
            />
          </div>

          <button
            className={styles.scanBtn}
            onClick={verifyScan}
            disabled={scanning || !scanInput.trim()}
          >
            {scanning ? '⏳ Verifying...' : '🔍 Verify QR Code'}
          </button>

          {/* Scan Result */}
          {scanResult && (
            <div className={`${styles.scanResult} ${scanResult.found ? styles.scanSuccess : styles.scanError}`}>
              <div className={styles.scanResultIcon}>
                {scanResult.found ? '✅' : '❌'}
              </div>
              <div className={styles.scanResultBody}>
                <p className={styles.scanResultMsg}>{scanResult.message}</p>
                {scanResult.found && scanResult.data && (
                  <div className={styles.scanData}>
                    {Object.entries(scanResult.data).map(([k, v]) => (
                      <div key={k} className={styles.scanDataRow}>
                        <span className={styles.scanDataKey}>{k.replace(/_/g, ' ')}</span>
                        <span className={styles.scanDataVal}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent QRs */}
          {recentQRs.length > 0 && (
            <div className={styles.recentSection}>
              <h3 className={styles.recentTitle}>Recently Generated</h3>
              {recentQRs.map((qr, i) => {
                const qcfg = TYPE_CONFIG[qr.type] || TYPE_CONFIG.student;
                return (
                  <div
                    key={i}
                    className={styles.recentItem}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setGeneratedQR(qr);
                      setActiveType(qr.type);
                    }}
                  >
                    <span style={{ color: qcfg.color }}>{qcfg.icon}</span>
                    <div className={styles.recentMeta}>
                      <span className={styles.recentLabel}>{qr.label}</span>
                      <span className={styles.recentCode}>{qr.reference_code}</span>
                    </div>
                    <StatusBadge status={qr.is_active ? 'active' : 'inactive'} size="sm" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
