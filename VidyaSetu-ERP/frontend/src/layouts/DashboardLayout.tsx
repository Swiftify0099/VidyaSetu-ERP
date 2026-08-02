import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileBottomNav from './MobileBottomNav';
import styles from './DashboardLayout.module.css';

export default function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Auto-close mobile menu on route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  return (
    <div className={styles.layout}>
      {/* Mobile Drawer Dark Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          className={styles.backdrop}
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(v => !v)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Viewport */}
      <div
        className={styles.main}
        style={{
          marginLeft: sidebarCollapsed
            ? 'var(--sidebar-collapsed-width)'
            : 'var(--sidebar-width)',
        }}
      >
        <Topbar
          sidebarCollapsed={sidebarCollapsed}
          onToggleMobileMenu={() => setMobileMenuOpen(v => !v)}
        />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>

      {/* Native-feel Mobile Bottom Navigation Bar (≤ 768px) */}
      <MobileBottomNav
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
      />
    </div>
  );
}
