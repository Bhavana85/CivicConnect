'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { LogOut, Home, MapPin, BarChart2, Inbox, MessageSquare, Bell, Landmark, ClipboardList } from 'lucide-react';

const NAV_LINKS = [
  { key: 'nav.home',       href: '/',           icon: <Home size={16} />,          citizenOnly: false, hideForGov: false },
  { key: 'nav.report',     href: '/report',     icon: <MapPin size={16} />,         citizenOnly: true,  hideForGov: false },
  { key: 'nav.complaints', href: '/complaints', icon: <ClipboardList size={16} />,  citizenOnly: true,  hideForGov: false },
  { key: 'nav.budget',     href: '/budget',     icon: <BarChart2 size={16} />,      citizenOnly: false, hideForGov: false },
  { key: 'nav.hub',        href: '/hub',        icon: <Inbox size={16} />,          citizenOnly: false, hideForGov: false },
  { key: 'nav.forum',      href: '/forum',      icon: <MessageSquare size={16} />,  citizenOnly: false, hideForGov: false },
  { key: 'nav.alerts',     href: '/alerts',     icon: <Bell size={16} />,           citizenOnly: false, hideForGov: false },
];

export default function Navbar() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    setUserRole(localStorage.getItem('cc_user_role') || '');
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('cc_token');
    localStorage.removeItem('cc_user_role');
    localStorage.removeItem('cc_user_name');
    document.documentElement.setAttribute('data-theme', 'citizen');
    router.replace('/login');
  };

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        background: scrolled
          ? 'rgba(var(--color-primary-dark-rgb), 0.97)'
          : 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
        backdropFilter: 'blur(16px)',
        boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.25)' : 'none',
        transition: 'all 0.3s ease',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div
        className="page-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 64,
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                boxShadow: '0 2px 8px rgba(245,158,11,0.4)',
              }}
            >
              <Landmark size={20} color="white" />
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 800, fontSize: '1rem', lineHeight: 1.2 }}>
                CivicConnect
              </div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.65rem', fontWeight: 500 }}>
                ನಾಗರಿಕ ಸಂಪರ್ಕ
              </div>
            </div>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="desktop-nav">
          {mounted && NAV_LINKS
            .filter(link => {
              if (link.hideForGov && userRole === 'government') return false;
              if (link.citizenOnly && userRole !== 'citizen') return false;
              return true;
            })
            .map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 12px',
                  borderRadius: 8,
                  color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                  background: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.1)';
                    (e.currentTarget as HTMLAnchorElement).style.color = 'white';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                    (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.7)';
                  }
                }}
              >
                <span style={{ fontSize: '0.9rem' }}>{link.icon}</span>
                {t(link.key)}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LanguageSwitcher />
          <button
            id="logout-btn"
            onClick={handleLogout}
            title="Logout"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.85)',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.3)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.5)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)';
            }}
          >
            <LogOut size={14} />
            Logout
          </button>
          {/* Mobile menu button */}
          <button
            id="mobile-menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: 6,
              fontSize: '1.4rem',
            }}
            className="mobile-menu-btn"
            aria-label="Toggle menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mounted && menuOpen && (
        <div
          style={{
            background: 'var(--color-primary-dark)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            padding: '12px 16px 20px',
          }}
          className="mobile-menu"
        >
          {NAV_LINKS
            .filter(link => {
              if (link.hideForGov && userRole === 'government') return false;
              if (link.citizenOnly && userRole !== 'citizen') return false;
              return true;
            })
            .map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  borderRadius: 8,
                  color: isActive ? 'white' : 'rgba(255,255,255,0.75)',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                  background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                  marginBottom: 4,
                }}
              >
                {link.icon} {t(link.key)}
              </Link>
            );
          })}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}
