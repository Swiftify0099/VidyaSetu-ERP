import { Bell, Search, Sun, Moon, Globe, ChevronDown, User, Settings, LogOut, Key, Menu, CheckCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import communicationService, { CommLog } from '../services/communicationService';
import styles from './Topbar.module.css';

interface SearchResult {
  id: number;
  label: string;
  sub: string;
  url: string;
  type: string;
}
interface SearchResults {
  query: string;
  total: number;
  results: Record<string, SearchResult[]>;
}

const TYPE_ICONS: Record<string, string> = {
  student: '🎓', teacher: '👨‍🏫', book: '📚',
  receipt: '🧾', default: '🔍',
};

export default function Topbar({
  sidebarCollapsed,
  onToggleMobileMenu,
}: {
  sidebarCollapsed: boolean;
  onToggleMobileMenu?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [notifications, setNotifications] = useState<CommLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load user notifications
  const loadNotifications = useCallback(async () => {
    try {
      const logs = await communicationService.getMyNotifications();
      setNotifications(logs);
    } catch {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = async (id: number) => {
    try {
      await communicationService.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await communicationService.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSearchResults(null);
      setSearchOpen(false);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await api.get('/search', { params: { q: q.trim() } });
      setSearchResults(res.data?.data ?? null);
      setSearchOpen(true);
    } catch {
      setSearchResults(null);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(val), 400);
  };

  const handleResultClick = (url: string) => {
    setSearchQuery('');
    setSearchResults(null);
    setSearchOpen(false);
    navigate(url);
  };

  const currentLang = (i18n.language || 'mr').startsWith('mr') ? 'mr' : 'en';

  const selectLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('vidyasetu_lang', lang);
    document.documentElement.lang = lang;
    setLangOpen(false);
  };

  const allResults = searchResults
    ? Object.values(searchResults.results).flat()
    : [];

  return (
    <header
      className={styles.topbar}
      style={{ left: sidebarCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)' }}
    >
      {/* Mobile Drawer Trigger Button */}
      <button
        className={styles.mobileMenuBtn}
        onClick={onToggleMobileMenu}
        aria-label="Open navigation menu"
      >
        <Menu size={18} />
      </button>

      {/* Global Search */}
      <div className={styles.searchWrap} ref={searchRef}>
        <Search size={15} className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder={`${t('common.search')} students, teachers, books...`}
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={() => allResults.length > 0 && setSearchOpen(true)}
          id="global-search"
          autoComplete="off"
        />
        {searchLoading && <span className={styles.searchSpinner} />}

        {/* Search Results Dropdown */}
        {searchOpen && searchResults && (
          <div className={styles.searchDropdown}>
            {allResults.length === 0 ? (
              <div className={styles.searchEmpty}>
                No results found for "<strong>{searchResults.query}</strong>"
              </div>
            ) : (
              <>
                <div className={styles.searchHeader}>
                  {searchResults.total} result{searchResults.total !== 1 ? 's' : ''} for "{searchResults.query}"
                </div>
                {Object.entries(searchResults.results).map(([category, items]) =>
                  items.length > 0 ? (
                    <div key={category}>
                      <div className={styles.searchCategory}>
                        {TYPE_ICONS[category] ?? '📋'} {category.charAt(0).toUpperCase() + category.slice(1)}
                      </div>
                      {items.map(item => (
                        <button
                          key={`${item.type}-${item.id}`}
                          className={styles.searchResult}
                          onClick={() => handleResultClick(item.url)}
                        >
                          <span className={styles.resultIcon}>
                            {TYPE_ICONS[item.type] ?? '🔍'}
                          </span>
                          <span className={styles.resultText}>
                            <span className={styles.resultLabel}>{item.label}</span>
                            <span className={styles.resultSub}>{item.sub}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className={styles.controls}>
        {/* Language Selection Dropdown */}
        <div className={styles.langWrap} ref={langRef}>
          <button
            className={styles.iconBtn}
            onClick={() => setLangOpen(v => !v)}
            title="Select Language / भाषा निवडा"
            id="lang-toggle-btn"
          >
            <Globe size={17} />
            <span className={styles.iconBtnLabel}>
              {currentLang === 'mr' ? 'मराठी' : 'EN'}
            </span>
            <ChevronDown size={12} style={{ opacity: 0.7 }} />
          </button>

          {langOpen && (
            <div className={styles.langDropdown}>
              <button
                className={`${styles.langOption} ${currentLang === 'mr' ? styles.langOptionActive : ''}`}
                onClick={() => selectLanguage('mr')}
              >
                <span className={styles.langFlag}>🇮🇳</span>
                <span>मराठी (Marathi)</span>
                {currentLang === 'mr' && <CheckCheck size={14} className={styles.checkIcon} />}
              </button>
              <button
                className={`${styles.langOption} ${currentLang === 'en' ? styles.langOptionActive : ''}`}
                onClick={() => selectLanguage('en')}
              >
                <span className={styles.langFlag}>🇬🇧</span>
                <span>English</span>
                {currentLang === 'en' && <CheckCheck size={14} className={styles.checkIcon} />}
              </button>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          className={styles.iconBtn}
          onClick={toggleTheme}
          title={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
          id="theme-toggle-btn"
        >
          {resolvedTheme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
        </button>

        {/* Notifications Center */}
        <div className={styles.notifWrap} ref={notifRef}>
          <button
            className={styles.iconBtn}
            onClick={() => setNotifOpen(v => !v)}
            title="Notifications Center"
            id="notifications-btn"
          >
            <Bell size={17} />
            {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>

          {notifOpen && (
            <div className={styles.notifDropdown}>
              <div className={styles.notifHeader}>
                <span className={styles.notifTitle}>
                  🔔 Notifications {unreadCount > 0 && `(${unreadCount})`}
                </span>
                {unreadCount > 0 && (
                  <button className={styles.markAllBtn} onClick={handleMarkAllRead}>
                    <CheckCheck size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    Mark all read
                  </button>
                )}
              </div>

              <div className={styles.notifList}>
                {notifications.length === 0 ? (
                  <div className={styles.notifEmpty}>
                    No notifications yet. You are all caught up! ✨
                  </div>
                ) : (
                  notifications.map(n => (
                    <button
                      key={n.id}
                      className={`${styles.notifItem} ${!n.is_read ? styles.notifUnread : ''}`}
                      onClick={() => handleMarkRead(n.id)}
                    >
                      <div className={styles.notifMeta}>
                        <span className={`${styles.notifBadge} ${n.channel === 'firebase_fcm' ? styles.notifBadgeFCM : n.channel === 'sms' ? styles.notifBadgeSMS : styles.notifBadgeNotice}`}>
                          {n.channel === 'firebase_fcm' ? '🔥 FCM PUSH' : n.channel?.toUpperCase()}
                        </span>
                        <span>{n.sent_at ? new Date(n.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
                      </div>
                      <div className={styles.notifSubject}>{n.subject || n.recipient_name || 'System Notification'}</div>
                      <div className={styles.notifBody}>{n.message_body}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className={styles.profileWrap} ref={profileRef}>
          <button
            className={styles.profileBtn}
            onClick={() => setProfileOpen(v => !v)}
            id="profile-menu-btn"
          >
            <div className={styles.avatar}>
              {user?.photo_path
                ? <img src={`${import.meta.env.VITE_STORAGE_URL}/${user.photo_path}`} alt={user.full_name} />
                : <span>{user?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}</span>
              }
            </div>
            <div className={styles.profileInfo}>
              <span className={styles.profileName}>{user?.full_name}</span>
              <span className={styles.profileRole}>{user?.roles?.[0]?.name}</span>
            </div>
            <ChevronDown size={14} className={`${styles.chevron} ${profileOpen ? styles.chevronOpen : ''}`} />
          </button>

          {profileOpen && (
            <div className={styles.dropdown}>
              {/* Header */}
              <div className={styles.dropdownHeader}>
                <div className={styles.dropdownAvatar}>
                  {user?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                </div>
                <div>
                  <p className={styles.dropdownName}>{user?.full_name}</p>
                  <p className={styles.dropdownEmail}>{user?.email || user?.mobile || user?.username}</p>
                </div>
              </div>
              <div className={styles.dropdownDivider} />

              <button className={styles.dropdownItem} onClick={() => { navigate('/profile'); setProfileOpen(false); }}>
                <User size={15} /> {t('nav.profile')}
              </button>
              <button className={styles.dropdownItem} onClick={() => { navigate('/settings'); setProfileOpen(false); }}>
                <Settings size={15} /> {t('nav.settings')}
              </button>
              <button className={styles.dropdownItem} onClick={() => { navigate('/auth/change-password'); setProfileOpen(false); }}>
                <Key size={15} /> {t('auth.change_password')}
              </button>

              <div className={styles.dropdownDivider} />

              <button
                className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                onClick={() => { setProfileOpen(false); logout(); }}
              >
                <LogOut size={15} /> {t('auth.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
