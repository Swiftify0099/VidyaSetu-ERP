import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User, Shield, Key, Sliders, Mail, Phone, Calendar,
  CheckCircle2, Laptop, ExternalLink, Save, Eye, EyeOff,
  Sun, Moon, Globe, Award, Sparkles, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import authService from '../../services/authService';
import styles from './ProfilePage.module.css';

type Tab = 'general' | 'security' | 'roles' | 'preferences';

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab: Tab = (searchParams.get('tab') as Tab) || 'general';

  const setTab = (tab: Tab) => {
    setSearchParams({ tab });
  };

  // ── General Profile Edit State ──────────────────────────────
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setMobile(user.mobile || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Full name is required');
      return;
    }
    try {
      setIsUpdatingProfile(true);
      await authService.updateMyProfile({
        full_name: fullName.trim(),
        mobile: mobile.trim() || undefined,
        email: email.trim() || undefined,
      });
      await refreshUser();
      toast.success(t('common.success') || 'Profile updated successfully!');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // ── Change Password State ──────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Current password is required');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      setIsChangingPassword(true);
      await authService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('vidyasetu_lang', lang);
    toast.success(`Language set to ${lang === 'mr' ? 'मराठी' : 'English'}`);
  };

  const primaryRole = user?.roles?.[0]?.code || '';

  return (
    <div className={styles.container}>
      {/* ── Hero Profile Header ───────────────────────────────── */}
      <div className={styles.heroCard}>
        <div className={styles.heroLeft}>
          <div className={styles.avatarWrapper}>
            <div className={styles.avatar}>
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>
          <div className={styles.heroInfo}>
            <h1>
              {user?.full_name || user?.username}
              <CheckCircle2 size={18} color="var(--color-primary)" />
            </h1>
            <div className={styles.heroMeta}>
              <span className={styles.metaItem}>
                <strong>@{user?.username}</strong>
              </span>
              {user?.employee_id && (
                <span className={styles.metaItem}>
                  Emp ID: {user.employee_id}
                </span>
              )}
              {user?.gr_number && (
                <span className={styles.metaItem}>
                  GR No: {user.gr_number}
                </span>
              )}
              {user?.mobile && (
                <span className={styles.metaItem}>
                  <Phone size={13} /> {user.mobile}
                </span>
              )}
              {user?.email && (
                <span className={styles.metaItem}>
                  <Mail size={13} /> {user.email}
                </span>
              )}
            </div>
            <div className={styles.roleBadges}>
              {user?.roles?.map(r => (
                <span key={r.id || r.code} className={styles.roleBadge}>
                  <Shield size={11} /> {r.name || r.code}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.heroRight}>
          {user?.last_login && (
            <div className={styles.lastLogin}>
              <Calendar size={12} className="inline mr-1" />
              Last login: {new Date(user.last_login).toLocaleDateString()} {new Date(user.last_login).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs Navigation ────────────────────────────────────── */}
      <div className={styles.tabsContainer}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'general' ? styles.tabBtnActive : ''}`}
          onClick={() => setTab('general')}
        >
          <User size={16} /> {t('nav.profile') || 'General Profile'}
        </button>

        <button
          className={`${styles.tabBtn} ${activeTab === 'security' ? styles.tabBtnActive : ''}`}
          onClick={() => setTab('security')}
        >
          <Key size={16} /> Security & Password
        </button>

        <button
          className={`${styles.tabBtn} ${activeTab === 'roles' ? styles.tabBtnActive : ''}`}
          onClick={() => setTab('roles')}
        >
          <Shield size={16} /> Roles & Portals
        </button>

        <button
          className={`${styles.tabBtn} ${activeTab === 'preferences' ? styles.tabBtnActive : ''}`}
          onClick={() => setTab('preferences')}
        >
          <Sliders size={16} /> Preferences
        </button>
      </div>

      {/* ── Tab Content ────────────────────────────────────────── */}
      <div className={styles.tabContent}>
        {/* 1. GENERAL TAB */}
        {activeTab === 'general' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>
                  <User size={18} color="var(--color-primary)" /> Personal Information
                </h3>
                <p className={styles.cardSubtitle}>
                  Update your contact information and display details.
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Full Name</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Username</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={user?.username || ''}
                    disabled
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Mobile Number</label>
                  <input
                    type="tel"
                    className={styles.formInput}
                    placeholder="10-digit mobile number"
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Email Address</label>
                  <input
                    type="email"
                    className={styles.formInput}
                    placeholder="name@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>

                {user?.employee_id && (
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Employee ID</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={user.employee_id}
                      disabled
                    />
                  </div>
                )}

                {user?.gr_number && (
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>GR Number</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={user.gr_number}
                      disabled
                    />
                  </div>
                )}
              </div>

              <div className={styles.formActions}>
                <button
                  type="submit"
                  className={styles.primaryBtn}
                  disabled={isUpdatingProfile}
                >
                  <Save size={15} />
                  {isUpdatingProfile ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 2. SECURITY TAB */}
        {activeTab === 'security' && (
          <>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.cardTitle}>
                    <Key size={18} color="var(--color-primary)" /> Change Account Password
                  </h3>
                  <p className={styles.cardSubtitle}>
                    Ensure your account stays secure by using a strong password with at least 6 characters.
                  </p>
                </div>
              </div>

              <form onSubmit={handleChangePassword}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Current Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showCurrent ? 'text' : 'password'}
                        className={styles.formInput}
                        placeholder="Enter current password"
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        style={{ position: 'absolute', right: 10, top: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}
                      >
                        {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>New Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showNew ? 'text' : 'password'}
                        className={styles.formInput}
                        placeholder="At least 6 characters"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        style={{ position: 'absolute', right: 10, top: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}
                      >
                        {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Confirm New Password</label>
                    <input
                      type="password"
                      className={styles.formInput}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button
                    type="submit"
                    className={styles.primaryBtn}
                    disabled={isChangingPassword}
                  >
                    <Save size={15} />
                    {isChangingPassword ? 'Updating Password...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>

            {/* Device Security Shortcut */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.cardTitle}>
                    <Laptop size={18} color="var(--color-primary)" /> Trusted Devices & Sessions
                  </h3>
                  <p className={styles.cardSubtitle}>
                    Manage all browsers and mobile devices currently authorized to access this account.
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => navigate('/security/devices')}
                >
                  <ExternalLink size={14} /> View Active Devices
                </button>
              </div>
            </div>
          </>
        )}

        {/* 3. ROLES & PORTALS TAB */}
        {activeTab === 'roles' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>
                  <Shield size={18} color="var(--color-primary)" /> Assigned Roles & Portals
                </h3>
                <p className={styles.cardSubtitle}>
                  View system access privileges and launch role-specific modules.
                </p>
              </div>
            </div>

            <div style={{ marginBottom: 'var(--space-5)' }}>
              <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
                Your Active Roles
              </h4>
              <div className={styles.roleBadges}>
                {user?.roles?.map(r => (
                  <span key={r.id || r.code} className={styles.roleBadge} style={{ padding: '6px 14px', fontSize: 'var(--font-size-sm)' }}>
                    <Shield size={14} /> {r.name} ({r.code})
                  </span>
                ))}
              </div>
            </div>

            {/* Role Portal Quick Links */}
            <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
              Quick Portal Shortcuts
            </h4>
            <div className={styles.shortcutGrid}>
              {(primaryRole === 'teacher' || primaryRole === 'class_teacher') && (
                <div
                  className={styles.shortcutCard}
                  onClick={() => navigate('/teacher-portal?tab=profile')}
                >
                  <div className={styles.shortcutLeft}>
                    <div className={styles.shortcutIcon}>
                      <Award size={18} />
                    </div>
                    <div>
                      <div className={styles.shortcutTitle}>Teacher Academic Profile</div>
                      <div className={styles.shortcutDesc}>Qualifications, experience & schedule</div>
                    </div>
                  </div>
                  <ExternalLink size={14} color="var(--color-text-tertiary)" />
                </div>
              )}

              {primaryRole === 'student' && (
                <div
                  className={styles.shortcutCard}
                  onClick={() => navigate('/student-portal?tab=idcard')}
                >
                  <div className={styles.shortcutLeft}>
                    <div className={styles.shortcutIcon}>
                      <Award size={18} />
                    </div>
                    <div>
                      <div className={styles.shortcutTitle}>Student ID Card & Profile</div>
                      <div className={styles.shortcutDesc}>Digital ID and student portfolio</div>
                    </div>
                  </div>
                  <ExternalLink size={14} color="var(--color-text-tertiary)" />
                </div>
              )}

              {primaryRole === 'parent' && (
                <div
                  className={styles.shortcutCard}
                  onClick={() => navigate('/parent-portal')}
                >
                  <div className={styles.shortcutLeft}>
                    <div className={styles.shortcutIcon}>
                      <Award size={18} />
                    </div>
                    <div>
                      <div className={styles.shortcutTitle}>Parent Portal</div>
                      <div className={styles.shortcutDesc}>Track student performance & fees</div>
                    </div>
                  </div>
                  <ExternalLink size={14} color="var(--color-text-tertiary)" />
                </div>
              )}

              <div
                className={styles.shortcutCard}
                onClick={() => navigate('/dashboard')}
              >
                <div className={styles.shortcutLeft}>
                  <div className={styles.shortcutIcon}>
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <div className={styles.shortcutTitle}>Main Dashboard</div>
                    <div className={styles.shortcutDesc}>Return to primary working view</div>
                  </div>
                </div>
                <ExternalLink size={14} color="var(--color-text-tertiary)" />
              </div>
            </div>

            {/* Permissions list */}
            {user?.permissions && user.permissions.length > 0 && (
              <div style={{ marginTop: 'var(--space-6)' }}>
                <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
                  Granted Capabilities ({user.permissions.length})
                </h4>
                <div className={styles.permissionsList}>
                  {user.permissions.map(p => (
                    <span key={p} className={styles.permissionTag}>
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. PREFERENCES TAB */}
        {activeTab === 'preferences' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>
                  <Sliders size={18} color="var(--color-primary)" /> Application Preferences
                </h3>
                <p className={styles.cardSubtitle}>
                  Customize your language and appearance settings.
                </p>
              </div>
            </div>

            <div className={styles.prefGroup}>
              <div className={styles.prefInfo}>
                <h4>
                  <Globe size={15} className="inline mr-1" /> Language / भाषा
                </h4>
                <p>Select your preferred application display language.</p>
              </div>
              <div className={styles.btnGroup}>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${i18n.language === 'mr' ? styles.toggleBtnActive : ''}`}
                  onClick={() => handleLanguageChange('mr')}
                >
                  मराठी
                </button>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${i18n.language === 'en' ? styles.toggleBtnActive : ''}`}
                  onClick={() => handleLanguageChange('en')}
                >
                  English
                </button>
              </div>
            </div>

            <div className={styles.prefGroup}>
              <div className={styles.prefInfo}>
                <h4>
                  {resolvedTheme === 'dark' ? <Moon size={15} className="inline mr-1" /> : <Sun size={15} className="inline mr-1" />}
                  Theme & Appearance
                </h4>
                <p>Choose between light mode, dark mode, or system default.</p>
              </div>
              <div className={styles.btnGroup}>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${theme === 'light' ? styles.toggleBtnActive : ''}`}
                  onClick={() => setTheme('light')}
                >
                  <Sun size={14} /> Light
                </button>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${theme === 'dark' ? styles.toggleBtnActive : ''}`}
                  onClick={() => setTheme('dark')}
                >
                  <Moon size={14} /> Dark
                </button>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${theme === 'system' ? styles.toggleBtnActive : ''}`}
                  onClick={() => setTheme('system')}
                >
                  <Laptop size={14} /> System
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
