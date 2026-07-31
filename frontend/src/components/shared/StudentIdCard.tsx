import React, { useState } from 'react';
import { UserCheck, Printer, RefreshCw, Shield } from 'lucide-react';
import styles from './StudentIdCard.module.css';

export interface StudentIdCardProps {
  idCardData?: any;
  profileData?: any;
}

export const StudentIdCard: React.FC<StudentIdCardProps> = ({ idCardData, profileData }) => {
  const p = idCardData || profileData || {};

  // Interactive Card States
  const [isFlipped, setIsFlipped] = useState(false);
  const [themeColor, setThemeColor] = useState('#1e3a8a'); // Default Navy Blue

  // Extract Real Data from API Response
  const schoolName = (p.school_name || "HINDKESRI MARUTI MANE VIDYALAY").toUpperCase();
  const schoolTagline = p.academic_year ? `AY ${p.academic_year} • Official Digital ID` : "Excellence & Character";
  const studentName = p.full_name || "Student Name";
  const grade = p.standard ? `Std ${p.standard}${p.division ? ` - Div ${p.division}` : ''}` : "Class N/A";
  const studentId = p.gr_number || p.admission_number || "GR-0000";
  const bloodGroup = p.blood_group || "O Positive (O+)";
  const dob = p.dob ? new Date(p.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : "—";
  const phone = p.father_mobile || p.mobile || "—";
  
  // Photo URL with fallback
  const rawPhoto = p.photo_path;
  const photoUrl = rawPhoto
    ? (rawPhoto.startsWith('http') ? rawPhoto : `${import.meta.env.VITE_STORAGE_URL || ''}/${rawPhoto}`)
    : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&crop=faces';

  const guardian = p.father_name || p.mother_name_full || "Parent / Guardian";
  const expiry = `31 MAY ${new Date().getFullYear() + 1}`;
  const address = p.address_line1 || (p.village ? `${p.village}, ${p.district || 'Maharashtra'}` : "Maharashtra, India");
  const schoolPhone = p.school_phone || "02362-000000";

  // Clean ID for Barcode rendering
  const cleanId = (studentId || 'GR0000').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.idCardStudio}>
      {/* Top Toolbar Header */}
      <header className={`${styles.studioHeader} ${styles.noPrint}`}>
        <div className={styles.headerBrand}>
          <div className={styles.brandIcon}>
            <UserCheck size={22} />
          </div>
          <div>
            <h2 className={styles.headerTitle}>Student Digital Identity Card</h2>
            <p className={styles.headerSubtitle}>Official CR80 PVC Print-Ready Standard</p>
          </div>
        </div>

        <div className={styles.headerActions}>
          {/* Theme Color Selector */}
          <div className={styles.themeSelector}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginRight: '0.25rem' }}>Theme:</span>
            <button
              onClick={() => setThemeColor('#1e3a8a')}
              className={styles.colorSwatch}
              style={{ backgroundColor: '#1e3a8a', boxShadow: themeColor === '#1e3a8a' ? '0 0 0 2px #ffffff, 0 0 0 4px #1e3a8a' : 'none' }}
              title="Navy Blue"
            />
            <button
              onClick={() => setThemeColor('#831843')}
              className={styles.colorSwatch}
              style={{ backgroundColor: '#831843', boxShadow: themeColor === '#831843' ? '0 0 0 2px #ffffff, 0 0 0 4px #831843' : 'none' }}
              title="Burgundy"
            />
            <button
              onClick={() => setThemeColor('#064e3b')}
              className={styles.colorSwatch}
              style={{ backgroundColor: '#064e3b', boxShadow: themeColor === '#064e3b' ? '0 0 0 2px #ffffff, 0 0 0 4px #064e3b' : 'none' }}
              title="Forest Green"
            />
            <button
              onClick={() => setThemeColor('#0f172a')}
              className={styles.colorSwatch}
              style={{ backgroundColor: '#0f172a', boxShadow: themeColor === '#0f172a' ? '0 0 0 2px #ffffff, 0 0 0 4px #0f172a' : 'none' }}
              title="Dark Slate"
            />
          </div>

          <button onClick={() => setIsFlipped(!isFlipped)} className={styles.btnFlip}>
            <RefreshCw size={15} />
            Flip Card (Front / Back)
          </button>

          <button onClick={handlePrint} className={styles.btnPrint}>
            <Printer size={15} />
            Print Official ID
          </button>
        </div>
      </header>

      {/* Main Centered Workspace Stage */}
      <div className={styles.workspaceGrid}>
        
        <div className={`${styles.cardStage} ${styles.printArea}`}>
          
          {/* Lanyard Holder Graphic */}
          <div className={`${styles.lanyardHolder} ${styles.noPrint}`}>
            <div className={styles.lanyardTop}></div>
            <div className={styles.lanyardClip}>
              <div className={styles.lanyardSlot}></div>
            </div>
          </div>

          {/* 3D Card Flip Container */}
          <div className={styles.cardContainer} onClick={() => setIsFlipped(!isFlipped)}>
            <div className={`${styles.cardInner} ${isFlipped ? styles.cardInnerFlipped : ''}`}>
              
              {/* ── FRONT FACE ────────────────────────────────────────── */}
              <div className={`${styles.cardFace} ${styles.cardFront}`}>
                <div className={styles.pvcOverlay}></div>

                {/* Top Header Banner */}
                <div
                  style={{
                    backgroundColor: themeColor,
                    padding: '0.75rem 1rem',
                    color: '#ffffff',
                    position: 'relative',
                    transition: 'background-color 0.3s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '2.5rem',
                        height: '2.5rem',
                        backgroundColor: '#ffffff',
                        borderRadius: '9999px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '2px solid #f59e0b',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                      }}
                    >
                      <Shield size={22} color="#1e3a8a" />
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <h3
                        className={styles.schoolTitleFont}
                        style={{
                          margin: 0,
                          fontSize: '0.825rem',
                          fontWeight: 700,
                          letterSpacing: '0.025em',
                          lineHeight: 1.2,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {schoolName}
                      </h3>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '9px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: '#fcd34d',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {schoolTagline}
                      </p>
                    </div>
                  </div>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', backgroundColor: '#f59e0b' }}></div>
                </div>

                {/* Main Body Content */}
                <div style={{ padding: '0.75rem 1rem', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', zIndex: 10 }}>
                  
                  {/* Photo Container */}
                  <div style={{ position: 'relative', margin: '0.25rem 0' }}>
                    <img
                      src={photoUrl}
                      alt={studentName}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/300x300/e2e8f0/0f172a?text=Student+Photo';
                      }}
                      style={{
                        width: '6rem',
                        height: '7rem',
                        objectFit: 'cover',
                        borderRadius: '0.375rem',
                        border: '2px solid #cbd5e1',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                        backgroundColor: '#f1f5f9',
                      }}
                    />
                    
                    {/* Security Hologram Seal */}
                    <div className={styles.hologramSeal}>
                      VALID
                    </div>
                  </div>

                  {/* Name & Grade Badge */}
                  <h4 style={{ margin: '0.25rem 0 0', fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                    {studentName}
                  </h4>
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '0.125rem 0.625rem',
                      borderRadius: '9999px',
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#1e3a8a',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      marginTop: '0.25rem',
                      marginBottom: '0.5rem',
                    }}
                  >
                    {grade}
                  </div>

                  {/* Details Grid */}
                  <div
                    style={{
                      width: '100%',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      padding: '0.5rem 0.625rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.375rem 0.5rem',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Student ID / GR</span>
                      <span style={{ fontWeight: 800, color: '#0f172a', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{studentId}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Blood Group</span>
                      <span style={{ fontWeight: 900, color: '#dc2626', display: 'block' }}>{bloodGroup}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Date of Birth</span>
                      <span style={{ fontWeight: 700, color: '#1e293b', display: 'block' }}>{dob}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Emergency Phone</span>
                      <span style={{ fontWeight: 700, color: '#1e293b', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{phone}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div style={{ padding: '0.5rem 1rem', backgroundColor: '#f1f5f9', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ textAlign: 'left' }}>
                    <div className={styles.barcodeFont}>{cleanId}</div>
                    <div style={{ fontSize: '8px', color: '#64748b', fontWeight: 500 }}>Official Identification Barcode</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#1e293b', textDecoration: 'underline' }}>Dr. A. Robertson</div>
                    <div style={{ fontSize: '7.5px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Principal Signature</div>
                  </div>
                </div>
              </div>

              {/* ── BACK FACE ─────────────────────────────────────────── */}
              <div className={`${styles.cardFace} ${styles.cardBack}`}>
                <div className={styles.pvcOverlay}></div>

                {/* Top Header */}
                <div
                  style={{
                    backgroundColor: themeColor,
                    padding: '0.625rem 1rem',
                    color: '#ffffff',
                    transition: 'background-color 0.3s ease',
                  }}
                >
                  <h4 style={{ margin: 0, fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                    Terms & Campus Guidelines
                  </h4>
                </div>

                {/* Back Content */}
                <div style={{ padding: '0.875rem 1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '0.75rem', color: '#334155' }}>
                  
                  {/* Guidelines Box */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '10px', lineHeight: 1.4, color: '#475569' }}>
                    <p style={{ margin: 0, fontWeight: 500 }}>
                      1. This card is official property of <strong style={{ color: '#0f172a' }}>{schoolName}</strong> and must be produced upon demand by campus authorities.
                    </p>
                    <p style={{ margin: 0 }}>2. Loss of card must be reported immediately to the administration office.</p>
                    <p style={{ margin: 0 }}>3. Non-transferable. Misuse is subject to disciplinary action.</p>
                  </div>

                  {/* Address & Guardian Info */}
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.625rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '10px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>
                      Residential Address & Guardian
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Guardian:</span>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{guardian}</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block' }}>Address:</span>
                      <span style={{ fontWeight: 500, color: '#1e293b', display: 'block', lineHeight: 1.3 }}>{address}</span>
                    </div>
                  </div>

                  {/* Verification & QR Code */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', paddingTop: '0.25rem', borderTop: '1px solid #e2e8f0' }}>
                    <div>
                      <div style={{ fontSize: '9px', fontWeight: 700, color: '#0f172a' }}>School Administration Office</div>
                      <div style={{ fontSize: '8px', color: '#64748b', lineHeight: 1.3 }}>
                        Ph: {schoolPhone}<br />
                        Email: admin@vidyasetu.edu
                      </div>
                    </div>

                    {/* Crisp SVG QR Code */}
                    <div style={{ width: '3rem', height: '3rem', backgroundColor: '#0f172a', padding: '0.25rem', borderRadius: '0.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg viewBox="0 0 24 24" fill="white" style={{ width: '100%', height: '100%' }}>
                        <path d="M2,2H10V10H2V2M4,4V8H8V4H4M11,2H13V4H11V2M14,2H22V10H14V2M16,4V8H20V4H16M2,11H4V13H2V11M6,11H10V13H6V11M11,11H13V13H11V11M14,11H16V13H14V11M18,11H20V13H18V11M2,14H10V22H2V14M4,16V20H8V16H4M11,14H13V18H11V14M14,14H18V16H14V14M20,14H22V18H20V14M11,19H13V22H11V19M14,18H16V22H14V18M18,19H22V21H18V19Z"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Back Footer Expiry */}
                <div style={{ padding: '0.375rem 1rem', backgroundColor: '#f1f5f9', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '9px', fontWeight: 700, color: '#475569' }}>
                  Valid Through: <span style={{ color: '#0f172a' }}>{expiry}</span>
                </div>
              </div>

            </div>
          </div>

          <p className={`${styles.noPrint}`} style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1rem', textAlign: 'center' }}>
            💡 Click on card or press <strong>"Flip Card"</strong> to rotate view.
          </p>
        </div>

      </div>
    </div>
  );
};

export default StudentIdCard;
