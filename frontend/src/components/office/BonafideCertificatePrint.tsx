import React from 'react';
import { Printer, X } from 'lucide-react';
import styles from './BonafideCertificatePrint.module.css';

export interface BonafidePrintData {
  school_name?: string;
  cert_title?: string;
  student_id: string; // Std_ID
  aadhaar_number: string; // Adhaar
  full_name: string; // Full_Name
  from_date: string; // From
  to_date: string; // To
  in_year: string; // In_Year
  std: string; // Std
  dob_in_number: string; // DOB_In_Number
  dob_in_word: string; // DOB_in_Word
  birth_place: string; // Birth_Place
  reg_no: string; // Reg_No
  caste: string; // Cast
  issue_date: string; // Date
  application_number?: string;
  issued_certificate_number?: string;
  purpose?: string;
}

interface Props {
  data: BonafidePrintData;
  onClose: () => void;
}

export const BonafideCertificatePrint: React.FC<Props> = ({ data, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.actionBar}>
        <div className={styles.actionBarTitle}>
          <span>बोनाफाइड प्रमाणपत्र (Bonafide Certificate)</span>
          {data.application_number && (
            <span style={{ fontSize: '0.85rem', opacity: 0.8, marginLeft: '8px' }}>
              [{data.application_number}]
            </span>
          )}
        </div>
        <div className={styles.actionButtons}>
          <button className={styles.btnPrint} onClick={handlePrint}>
            <Printer size={16} /> Print Certificate
          </button>
          <button className={styles.btnClose} onClick={onClose}>
            <X size={16} /> Close
          </button>
        </div>
      </div>

      <div className={styles.certificate}>
        <div className={styles.borderWrapper}>
          {/* Top Header */}
          <div>
            <div className={styles.header}>
              <h1 className={styles.schoolName}>
                {data.school_name || 'शाळा - हिंदकेसरी मारुती माने विद्यालय, कवठेपिरान'}
              </h1>
              <h2 className={styles.certTitle}>
                {data.cert_title || 'बोना फाईड सर्टिफिकेट'}
              </h2>
            </div>

            {/* Student ID & Aadhaar Fields */}
            <div className={styles.idSection}>
              <div className={styles.idRow}>
                <span className={styles.idLabel}>स्टूडंट आय. डी.</span>
                <div className={styles.idBox}>
                  <span className={styles.field}>{data.student_id || '—'}</span>
                </div>
              </div>
              <div className={styles.idRow}>
                <span className={styles.idLabel}>आधारकार्ड क्र.</span>
                <div className={styles.idBox}>
                  <span className={styles.field}>{data.aadhaar_number || '—'}</span>
                </div>
              </div>
            </div>

            {/* Certificate Body Text */}
            <div className={styles.content}>
              <p>
                प्रमाणपत्र देण्यात येते की,{' '}
                <span className={styles.field}>{data.full_name || '—'}</span>
              </p>
              <p>
                दि. <span className={styles.field}>{data.from_date || '—'}</span> ते{' '}
                <span className={styles.field}>{data.to_date || '—'}</span> पर्यंत या
                विद्यालयाचा प्रामाणिक विद्यार्थी आहे / होता. तो सन{' '}
                <span className={styles.field}>{data.in_year || '—'}</span> .या वर्षी{' '}
                <span className={styles.field}>{data.std || '—'}</span> वी इयत्तेमध्ये शिक्षण
                घेत आहे.
              </p>
              <p>
                या विद्यालयाच्या नोंदणी बुकातून त्याची जन्मतारीख{' '}
                <span className={styles.field}>{data.dob_in_number || '—'}</span> (अंकी)
                अक्षरी <span className={styles.field}>{data.dob_in_word || '—'}</span> ही
                आहे. जन्मस्थळ <span className={styles.field}>{data.birth_place || '—'}</span>{' '}
                नोंदणी नंबर <span className={styles.field}>{data.reg_no || '—'}</span>
              </p>
              <p>
                प्रमाणे त्याची जात <span className={styles.field}>{data.caste || '—'}</span>{' '}
                आहे. माझ्या माहितीनुसार त्याची वर्तवणूक चांगली आहे.
              </p>
            </div>
          </div>

          {/* Footer / Signature */}
          <div className={styles.footer}>
            <div className={styles.dateSection}>दि. {data.issue_date || '—'}</div>
            <div className={styles.signature}>
              <div className={styles.signatureSpace}></div>
              <div>मुख्याध्यापक</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
