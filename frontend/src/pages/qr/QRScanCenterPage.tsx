/**
 * VidyaSetu ERP — QR Scan Center Page (Phase 8)
 * ================================================
 * Generate and manage QR codes for:
 *  - Student ID cards
 *  - Library book tracking
 *  - Attendance marking via QR
 *  - Fee payment verification
 */
import { useState, useCallback } from 'react';
import { QrCode, Search, Download, RefreshCw, Copy, CheckCircle, Book, GraduationCap, CreditCard, CalendarCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { PageHeader, SearchBar, EmptyState, StatusBadge } from '../../components/shared';
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

  // ── Generate QR ───────────────────────────────────────────
  const generateQR = useCallback(async () => {
    if (!referenceId.trim()) {
      toast.error('Please enter the reference ID');
      return;
    }
    setGenerating(true);
    try {
      const res = await api.post('/qr/generate', {
        type: activeType,
        reference_id: Number(referenceId),
      });
      const data = res.data?.data;
      setGeneratedQR(data);
      setRecentQRs(prev => [data, ...prev.slice(0, 9)]);
      toast.success('QR Code generated!');
    } catch {
      toast.error('Failed to generate QR code');
    } finally { setGenerating(false); }
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
                onClick={() => { setActiveType(type); setGeneratedQR(null); setReferenceId(''); }}
              >
                <span style={{ color: activeType === type ? c.color : 'var(--color-text-secondary)' }}>
                  {c.icon}
                </span>
                <span className={styles.typeCardLabel}>{c.label}</span>
              </button>
            ))}
          </div>

          <p className={styles.typeDesc}>{cfg.desc}</p>

          {/* Reference Input */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              {activeType === 'student' ? 'Student ID' :
               activeType === 'library' ? 'Book ID / Accession No.' :
               activeType === 'attendance' ? 'Class ID (Standard-Division)' :
               'Receipt ID'}
            </label>
            <div className={styles.inputRow}>
              <input
                className={styles.formInput}
                value={referenceId}
                onChange={e => setReferenceId(e.target.value)}
                placeholder={
                  activeType === 'student' ? 'e.g. 1042' :
                  activeType === 'library' ? 'e.g. 5501' :
                  activeType === 'attendance' ? 'e.g. 8-A' :
                  'e.g. 2300'
                }
                onKeyDown={e => e.key === 'Enter' && generateQR()}
              />
              <button
                className={styles.generateBtn}
                style={{ backgroundColor: cfg.color }}
                onClick={generateQR}
                disabled={generating}
              >
                {generating ? '...' : 'Generate'}
              </button>
            </div>
          </div>

          {/* Generated QR Display */}
          {generatedQR && (
            <div className={styles.qrResult}>
              {generatedQR.qr_image_url ? (
                <img
                  src={generatedQR.qr_image_url}
                  alt="QR Code"
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
                <p className={styles.qrCode}>{generatedQR.reference_code}</p>
              </div>
              <div className={styles.qrActions}>
                <button className={styles.qrActionBtn} onClick={copyQRData}>
                  {copied ? <CheckCircle size={14} color="#059669" /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy Data'}
                </button>
                <button className={styles.qrActionBtn} onClick={downloadQR}>
                  <Download size={14} /> Download PNG
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Panel: Scan / Verify ────────────────────── */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>
            <Search size={18} /> Verify / Scan QR
          </h2>
          <p className={styles.typeDesc}>
            Paste or type the QR code data to verify and look up the associated record.
          </p>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>QR Code Data</label>
            <textarea
              className={`${styles.formInput} ${styles.textarea}`}
              rows={4}
              placeholder="Paste QR code data or scan output here..."
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
                const qcfg = TYPE_CONFIG[qr.type];
                return (
                  <div key={i} className={styles.recentItem}>
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
