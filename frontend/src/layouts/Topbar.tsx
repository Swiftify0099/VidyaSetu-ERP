import { Bell, Search, Sun, Moon, Globe, ChevronDown, User, Settings, LogOut, Key } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
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

export default function Topbar({ sidebarCollapsed }: { sidebarCollapsed: boolean }) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

  const toggleLanguage = () => {
    const newLang = i18n.language === 'mr' ? 'en' : 'mr';
    i18n.changeLanguage(newLang);
    localStorage.setItem('vidyasetu_lang', newLang);
  };

  const allResults = searchResults
    ? Object.values(searchResults.results).flat()
    : [];

  return (
    <header
      className={styles.topbar}
      style={{ left: sidebarCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)' }}
    >
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
        {/* Language Toggle */}
        <button
          className={styles.iconBtn}
          onClick={toggleLanguage}
          title="Toggle Language"
          id="lang-toggle-btn"
        >
          <Globe size={17} />
          <span className={styles.iconBtnLabel}>
            {i18n.language === 'mr' ? 'EN' : 'मर'}
          </span>
        </button>

        {/* Theme Toggle */}
        <button
          className={styles.iconBtn}
          onClick={toggleTheme}
          title={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
          id="theme-toggle-btn"
        >
          {resolvedTheme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
        </button>

        {/* Notifications */}
        <button className={styles.iconBtn} title="Notifications" id="notifications-btn">
          <Bell size={17} />
          <span className={styles.badge}>3</span>
        </button>

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
