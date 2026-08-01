import { Bell, Search, Sun, Moon, Globe, ChevronDown, User, Settings, LogOut, Key, Menu, CheckCheck, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import notificationService, { AppNotification } from '../services/notificationService';
import communicationService from '../services/communicationService';
import { useNotifications } from '../hooks/useNotifications';
import { handleNotificationClick } from '../utils/notificationUtils';
import styles from './Topbar.module.css';

// Module-level flag: only log FCM tokens once per browser session
let _fcmTokensLogged = false;

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

  const {
    notifications,
    unreadCount,
    permission: notifPermission,
    requestPermission: requestNotifPermission,
    markAsRead,
    markAllAsRead: handleMarkAllRead,
  } = useNotifications();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Log all FCM tokens grouped by role — once per browser session
  useEffect(() => {
    if (_fcmTokensLogged) return;
    _fcmTokensLogged = true;
    (async () => {
      try {
        const tokens = await communicationService.getAllFcmTokens();
        const grouped: Record<string, typeof tokens> = {};
        tokens.forEach(t => {
          if (!grouped[t.role]) grouped[t.role] = [];
          grouped[t.role].push(t);
        });
        console.group('%c🔥 VidyaSetu — FCM Token Registry (%d users)', 'color:#f97316;font-weight:bold;font-size:14px', tokens.length);
        Object.entries(grouped).forEach(([role, list]) => {
          console.group(`%c${role} (${list.length})`, 'color:#6366f1;font-weight:bold');
          console.table(list.map(t => ({
            Name:       t.name,
            Identifier: t.identifier,
            'FCM Token': t.fcm_token ?? `[No token — Topic: ${t.topic}]`,
            Topic:      t.topic,
          })));
          console.groupEnd();
        });
        console.groupEnd();
      } catch {
        console.warn('[VidyaSetu] Could not load FCM token registry');
      }
    })();
  }, []);

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

  const handleNotifClick = async (notif: AppNotification) => {
    try {
      await notificationService.markClicked(notif.id);
    } catch { /* fire-and-forget */ }
    await markAsRead(notif.id);
    setNotifOpen(false);
    if (notif.action_url) {
      handleNotificationClick(notif.action_url, (path) => navigate(path));
    }
  };

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
            onClick={async () => {
              if (notifPermission !== 'granted') {
                await requestNotifPermission();
              }
              setNotifOpen((v) => !v);
            }}
            title={notifPermission !== 'granted' ? 'Click to enable push notifications' : 'Notifications Center'}
            id="notifications-btn"
          >
            <Bell size={17} />
            {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
            {notifPermission === 'default' && (
              <span title="Click to enable notifications" style={{
                position: 'absolute', top: 4, right: 4,
                width: 7, height: 7, borderRadius: '50%',
                background: '#f59e0b', border: '1.5px solid var(--color-surface)',
                pointerEvents: 'none',
              }} />
            )}
          </button>

          {notifOpen && (
            <div className={styles.notifDropdown}>
              <div className={styles.notifHeader}>
                <span className={styles.notifTitle}>
                  🔔 Notifications {unreadCount > 0 && `(${unreadCount})`}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {unreadCount > 0 && (
                    <button className={styles.markAllBtn} onClick={handleMarkAllRead}>
                      <CheckCheck size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      Mark all read
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.notifList}>
                {notifications.length === 0 ? (
                  <div className={styles.notifEmpty}>
                    No notifications yet. You are all caught up! ✨
                  </div>
                ) : (
                  notifications.slice(0, 10).map(n => (
                    <button
                      key={n.id}
                      className={`${styles.notifItem} ${!n.is_read ? styles.notifUnread : ''}`}
                      onClick={() => handleNotifClick(n)}
                    >
                      {/* Priority dot */}
                      <span style={{
                        display: 'inline-block',
                        width: 7, height: 7, borderRadius: '50%',
                        marginRight: 6, flexShrink: 0, marginTop: 2,
                        background: n.priority === 'critical' ? '#ef4444'
                          : n.priority === 'high' ? '#f59e0b'
                          : n.priority === 'medium' ? '#3b82f6'
                          : '#9ca3af',
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className={styles.notifMeta}>
                          <span className={`${styles.notifBadge} ${styles.notifBadgeNotice}`}>
                            {notificationService.getCategoryIcon(n.category)} {n.category}
                          </span>
                          <span>{notificationService.formatRelativeTime(n.created_at)}</span>
                        </div>
                        <div className={styles.notifSubject}>{n.title}</div>
                        <div className={styles.notifBody}>{n.body}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* View All link */}
              <div style={{ borderTop: '1px solid var(--color-border)', padding: '0.5rem 0.75rem' }}>
                <button
                  id="notif-view-all-btn"
                  onClick={() => { setNotifOpen(false); navigate('/notifications'); }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '0.4rem',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-primary)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <ExternalLink size={13} /> View All Notifications
                </button>
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
