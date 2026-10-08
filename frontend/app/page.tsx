'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import Navbar from '@/components/Navbar';
import AdminAnalyticsCharts from '@/components/AdminAnalyticsCharts';
import {
  getUsers,
  deleteUser,
  getReports,
  verifyReport,
  updateReportStatus,
  normalizeStatus,
  getAvailableTransitions,
  VALID_WORKFLOW_STATUSES,
  Report,
  ReportStatus,
  ReportStatusHistory,
  updateReportPriority,
  ComplaintPriority,
  VALID_PRIORITIES,
  PRIORITY_CONFIG,
  PRIORITY_ORDER,
  getAnalyticsDashboardData,
  AnalyticsData,
  AnalyticsFilters,
  AnalyticsSummary,
} from '@/lib/api';
import toast from 'react-hot-toast';
import {
  MapPin,
  BarChart2,
  MessageSquare,
  Bell,
  Inbox,
  Check,
  CheckCircle,
  CheckCircle2,
  Users,
  Landmark,
  Camera,
  Shield,
  Search,
  Video,
  Play,
  Pause,
  XCircle,
  Clock,
  Send,
  UserCheck,
  Loader2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Edit3,
  Filter,
  RefreshCw,
  X,
  FileText,
  AlertTriangle,
  ArrowUpDown,
} from 'lucide-react';

const FEATURES: { icon: React.ReactNode, title: string, desc: string, href: string, color: string }[] = [
  { icon: <MapPin size={24} />, title: 'Report an Issue',         desc: 'Spot a pothole, broken streetlight, or garbage pileup? Pin it on the map and notify your ward officials instantly.',                       href: '/report',  color: '#ef4444' },
  { icon: <BarChart2 size={24} />, title: 'Budget Transparency',     desc: 'Track how your tax money is being spent. View department-wise allocations, expenditures, and utilization rates in real time.',              href: '/budget',  color: '#1a4fa0' },
  { icon: <MessageSquare size={24} />, title: 'Community Forum',          desc: 'Join ward-level discussions, upvote issues that matter, and collaborate with fellow citizens to drive civic change.',                      href: '/forum',   color: '#10b981' },
  { icon: <Bell size={24} />, title: 'Local Alerts & Advisories', desc: 'Stay informed about road closures, weather warnings, water supply disruptions, and civic events happening in your area.',                href: '/alerts',  color: '#f59e0b' },
  { icon: <Inbox size={24} />, title: 'Citizen Hub',              desc: 'Your one-stop civic dashboard — verify your residency, view your profile, and access all government services in one place.',              href: '/hub',     color: '#8b5cf6' },
];

const STATS: { valueKey: string, label: string, icon: React.ReactNode, value: string }[] = [
  { valueKey: 'home.stats_reports_val', label: 'home.stats_reports', icon: <MapPin size={24} />, value: '12,847' },
  { valueKey: 'home.stats_resolved_val', label: 'home.stats_resolved', icon: <CheckCircle size={24} />, value: '9,204'  },
  { valueKey: 'home.stats_users_val', label: 'home.stats_users', icon: <Users size={24} />, value: '38,500' },
];

export default function Home() {
  const { t } = useTranslation();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  // GSAP parallax refs
  const parallaxSectionRef = useRef<HTMLDivElement>(null);
  const bgLayerRef = useRef<HTMLDivElement>(null);
  const cardsLayerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('cc_token');
    setIsLoggedIn(!!token);
    setUserName(localStorage.getItem('cc_user_name') || '');
    setUserRole(localStorage.getItem('cc_user_role') || '');
    setIsMounted(true);
  }, []);

  // GSAP ScrollTrigger parallax
  useEffect(() => {
    if (!isMounted || !isLoggedIn || userRole === 'admin') return;

    let ctx: any;
    const initGSAP = async () => {
      try {
        const gsapModule = await import('gsap');
        const scrollTriggerModule = await import('gsap/ScrollTrigger');
        const gsap = gsapModule.default || gsapModule.gsap;
        const ScrollTrigger = scrollTriggerModule.default || scrollTriggerModule.ScrollTrigger;
        gsap.registerPlugin(ScrollTrigger);

        if (!parallaxSectionRef.current || !bgLayerRef.current || !cardsLayerRef.current) return;

        ctx = gsap.context(() => {
          // Each card flies in from below with stagger as you scroll
          cardRefs.current.forEach((card, i) => {
            if (!card) return;
            gsap.fromTo(card,
              { y: 180 + (i * 40), opacity: 0, scale: 0.85, rotateX: 8 },
              {
                y: 0, opacity: 1, scale: 1, rotateX: 0,
                duration: 1,
                ease: 'power3.out',
                scrollTrigger: {
                  trigger: card,
                  start: 'top 100%',
                  end: 'top 55%',
                  scrub: 0.5,
                }
              }
            );
          });

        }, parallaxSectionRef);
      } catch (err) {
        console.warn('GSAP not available:', err);
      }
    };

    initGSAP();

    return () => {
      if (ctx) ctx.revert();
    };
  }, [isMounted, isLoggedIn, userRole]);

  // Pre-render landing page during SSR to avoid white flash before hydration
  if (!isMounted) {
    return <LoggedOutLanding router={router} t={t} />;
  }

  // ─── LOGGED OUT: Landing Page ───────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <LoggedOutLanding router={router} t={t} />
    );
  }

  // ─── LOGGED IN: Admin Dashboard ─────────────────────────────────────────────
  if (userRole === 'admin') {
    return <AdminDashboard />;
  }

  // ─── LOGGED IN: Dashboard ───────────────────────────────────────────────────
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section style={{
          position: 'relative',
          color: 'white',
          padding: '72px 0 88px',
          overflow: 'hidden',
          backgroundColor: '#0f172a',
        }}>
          {/* Ambient Video Background for Logged-in Hero */}
          <video
            autoPlay
            loop
            muted
            playsInline
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.35,
              zIndex: 0,
              pointerEvents: 'none',
            }}
            src="/videos/city_bg_video.mp4"
          />

          {/* Fallback Gradient Overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, rgba(15,45,92,0.85) 0%, rgba(26,79,160,0.72) 60%, rgba(37,99,235,0.75) 100%)',
              zIndex: 1,
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'absolute', top: -80, right: -80, width: 420, height: 420, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', zIndex: 2 }} />
          <div style={{ position: 'absolute', bottom: -60, left: -60, width: 320, height: 320, borderRadius: '50%', background: 'rgba(245,158,11,0.07)', zIndex: 2 }} />

          <div className="page-container" style={{ position: 'relative', zIndex: 3, textAlign: 'center' }}>
            <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.2rem)', fontWeight: 900, lineHeight: 1.18, marginBottom: 14, letterSpacing: '-0.03em' }}>
              Welcome back{userName ? ', ' + userName.split(' ')[0] : ''}!
            </h1>
            <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.75, marginBottom: 36, maxWidth: 520, margin: '0 auto 36px' }}>
              Your community dashboard is ready. Report issues, track budgets, and engage with your ward.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              {userRole !== 'government' && (
                <Link href="/report" className="btn-accent" style={{ padding: '13px 26px', fontSize: '0.95rem' }}>
                  <MapPin size={18} /> Report an Issue
                </Link>
              )}
              {userRole === 'government' && (
                <Link href="/budget" className="btn-accent" style={{ padding: '13px 26px', fontSize: '0.95rem' }}>
                  <BarChart2 size={18} /> Manage Budget
                </Link>
              )}
              <Link href="/forum" className="btn-secondary" style={{ padding: '13px 26px', fontSize: '0.95rem', borderColor: 'rgba(255,255,255,0.4)', color: 'white' }}>
                <MessageSquare size={18} /> Community Forum
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section style={{ background: 'white', borderBottom: '1px solid #e2e8f0' }}>
          <div className="page-container">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0 }}>
              {STATS.map((s, i) => (
                <div key={s.label} className="animate-fade-in-up" style={{
                  padding: '24px', textAlign: 'center',
                  borderRight: i < 2 ? '1px solid #e2e8f0' : 'none',
                  animationDelay: `${i * 100}ms`,
                }}>
                  <div className="icon-float" style={{ fontSize: '1.4rem', marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1a4fa0' }}>{s.value}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Cards — GSAP ScrollTrigger Parallax */}
        <section
          ref={parallaxSectionRef}
          style={{
            position: 'relative',
            padding: 0,
            background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 30%, #1a4fa0 60%, #2563eb 100%)',
            minHeight: '200vh',
          }}
        >
          {/* ── Background Layer — STICKY at viewport center ── */}
          <div
            ref={bgLayerRef}
            style={{
              position: 'sticky',
              top: 0,
              height: '100vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          >
            {/* Main "CivicConnect" text */}
            <div style={{
              fontSize: 'clamp(3.5rem, 10vw, 8rem)',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 40%, #fcd34d 70%, #fef08a 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1,
              userSelect: 'none',
              textAlign: 'center',
              filter: 'drop-shadow(0 4px 20px rgba(245,158,11,0.3))',
            }}>
              CivicConnect
            </div>
            {/* Kannada subtitle */}
            <div style={{
              fontSize: 'clamp(1.8rem, 5vw, 3.5rem)',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              color: 'rgba(255,255,255,0.15)',
              lineHeight: 1,
              userSelect: 'none',
              marginTop: 12,
              textAlign: 'center',
            }}>
              ನಾಗರಿಕ ಸಂಪರ್ಕ
            </div>
            {/* Decorative rings */}
            <div style={{
              position: 'absolute',
              width: 420, height: 420, borderRadius: '50%',
              border: '2px solid rgba(245,158,11,0.08)',
              top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            }} />
            <div style={{
              position: 'absolute',
              width: 600, height: 600, borderRadius: '50%',
              border: '1.5px solid rgba(255,255,255,0.05)',
              top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            }} />
            <div style={{
              position: 'absolute',
              width: 800, height: 800, borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.03)',
              top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            }} />
            {/* Glowing orbs */}
            <div style={{
              position: 'absolute', top: '20%', left: '15%',
              width: 200, height: 200, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)',
            }} />
            <div style={{
              position: 'absolute', bottom: '15%', right: '10%',
              width: 280, height: 280, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
            }} />
          </div>

          {/* ── Foreground Layer (cards scroll over the stuck background) ── */}
          <div
            ref={cardsLayerRef}
            style={{
              position: 'relative',
              zIndex: 1,
              marginTop: '-50vh',
              paddingBottom: 120,
            }}
          >
            <div className="page-container">
              <div style={{ textAlign: 'center', marginBottom: 48 }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginBottom: 10 }}>
                  Everything you need to engage with your city
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>Built for Bengaluru's 1.2 crore citizens — in English and ಕನ್ನಡ</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640, margin: '0 auto' }}>
                {FEATURES.filter(f => !(userRole === 'government' && f.href === '/report')).map((f, i) => (
                  <Link
                    key={f.href}
                    href={f.href}
                    ref={(el: HTMLAnchorElement | null) => { cardRefs.current[i] = el; }}
                    style={{
                      padding: 28, textDecoration: 'none', color: 'inherit',
                      display: 'block',
                      opacity: 0,
                      background: 'white',
                      borderRadius: 18,
                      border: `2px solid rgba(255,255,255,0.4)`,
                      borderTop: `3px solid ${f.color}`,
                      boxShadow: `0 4px 20px rgba(0,0,0,0.1)`,
                      transition: 'border-color 0.4s ease, box-shadow 0.4s ease, transform 0.35s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = f.color;
                      e.currentTarget.style.boxShadow = `0 0 15px ${f.color}40, 0 0 30px ${f.color}20, 0 8px 30px rgba(0,0,0,0.12)`;
                      e.currentTarget.style.transform = 'translateY(-4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{
                      width: 50, height: 50, borderRadius: 14, background: `${f.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.4rem', marginBottom: 14,
                    }}>{f.icon}</div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 6, color: '#0f172a' }}>{f.title}</h3>
                    <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.65 }}>{f.desc}</p>
                    <div style={{ marginTop: 14, fontSize: '0.78rem', fontWeight: 700, color: f.color }}>
                      {t('common.learnMore', 'Learn More')} →
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ background: 'var(--color-primary-dark)', color: 'rgba(255,255,255,0.6)', padding: '28px 0', textAlign: 'center', fontSize: '0.82rem' }}>
          <div className="page-container">
            <div style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Landmark size={14} /> CivicConnect — ನಾಗರಿಕ ಸಂಪರ್ಕ
            </div>
            <div>Bengaluru, Karnataka · BBMP · {new Date().getFullYear()}</div>
          </div>
        </footer>
      </main>
    </>
  );
}

/* ── Logged-out Landing with Alternating Video Background ── */
function LoggedOutLanding({ router, t }: { router: any; t: any }) {
  const [activeVideo, setActiveVideo] = useState(0); // 0 = city, 1 = cleaning
  const [isPlaying, setIsPlaying] = useState(true);
  const cityVideoRef = useRef<HTMLVideoElement>(null);
  const cleaningVideoRef = useRef<HTMLVideoElement>(null);

  // Guarantee muted autoplay across all browsers
  useEffect(() => {
    [cityVideoRef.current, cleaningVideoRef.current].forEach(v => {
      if (v) {
        v.defaultMuted = true;
        v.muted = true;
        v.play().catch(() => {});
      }
    });
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveVideo(prev => (prev === 0 ? 1 : 0));
    }, 10000); // Switch every 10 seconds
    return () => clearInterval(interval);
  }, [isPlaying]);

  const togglePlay = () => {
    const next = !isPlaying;
    setIsPlaying(next);
    [cityVideoRef.current, cleaningVideoRef.current].forEach(v => {
      if (v) {
        if (next) v.play().catch(() => {});
        else v.pause();
      }
    });
  };

  const selectVideo = (idx: number) => {
    setActiveVideo(idx);
    const target = idx === 0 ? cityVideoRef.current : cleaningVideoRef.current;
    if (target && isPlaying) {
      target.play().catch(() => {});
    }
  };

  const videoStyle = (isActive: boolean): React.CSSProperties => ({
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: isActive ? 1 : 0,
    transition: 'opacity 1.5s ease-in-out',
    pointerEvents: 'none',
    zIndex: 0,
  });

  return (
    <div style={{
      minHeight: '100vh', position: 'relative', color: 'white',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* ── Background Videos ── */}
      <video
        ref={cityVideoRef}
        key="city"
        autoPlay
        loop
        muted
        playsInline
        style={videoStyle(activeVideo === 0)}
        src="/videos/city_bg_video.mp4"
      />
      <video
        ref={cleaningVideoRef}
        key="cleaning"
        autoPlay
        loop
        muted
        playsInline
        style={videoStyle(activeVideo === 1)}
        src="/videos/cleaning_bg_video.mp4"
      />

      {/* Dark overlay for readability */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        background: 'linear-gradient(135deg, rgba(15,45,92,0.82) 0%, rgba(26,79,160,0.75) 60%, rgba(30,64,175,0.8) 100%)',
        zIndex: 1,
      }} />

      {/* Video Switcher Controls in Bottom-Right Corner */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          borderRadius: 30,
          padding: '4px 10px',
          fontSize: '0.72rem',
          color: 'white',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fbbf24', fontWeight: 800 }}>
          <Video size={13} /> Video:
        </span>
        <button
          onClick={() => selectVideo(0)}
          style={{
            background: activeVideo === 0 ? '#2563eb' : 'transparent',
            border: 'none',
            color: 'white',
            borderRadius: 12,
            padding: '3px 8px',
            fontSize: '0.7rem',
            fontWeight: activeVideo === 0 ? 800 : 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          City
        </button>
        <button
          onClick={() => selectVideo(1)}
          style={{
            background: activeVideo === 1 ? '#2563eb' : 'transparent',
            border: 'none',
            color: 'white',
            borderRadius: 12,
            padding: '3px 8px',
            fontSize: '0.7rem',
            fontWeight: activeVideo === 1 ? 800 : 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          Drive
        </button>
        <button
          onClick={togglePlay}
          title={isPlaying ? 'Pause Background Video' : 'Play Background Video'}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'white',
            borderRadius: '50%',
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            marginLeft: 2,
          }}
        >
          {isPlaying ? <Pause size={9} /> : <Play size={9} />}
        </button>
      </div>

      {/* Top Bar */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px', position: 'relative', zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="animate-float-slow" style={{
            width: 42, height: 42, background: 'linear-gradient(135deg,#f59e0b,#fbbf24)',
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.3rem', boxShadow: '0 4px 16px rgba(245,158,11,0.4)',
          }}>
            <Landmark size={24} color="#0f172a" />
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>CivicConnect</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>ನಾಗರಿಕ ಸಂಪರ್ಕ</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LanguageSwitcher />
          <button
            onClick={() => router.push('/login')}
            style={{
              padding: '9px 22px', background: 'rgba(255,255,255,0.15)',
              border: '1.5px solid rgba(255,255,255,0.35)', borderRadius: 10,
              color: 'white', fontWeight: 700, fontSize: '0.87rem', cursor: 'pointer',
              backdropFilter: 'blur(8px)', transition: 'all 0.2s', letterSpacing: '0.01em',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.25)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.6)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.35)';
            }}
          >
            Sign In / Register
          </button>
        </div>
      </header>

      {/* Hero Content */}
      <main style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 40px 80px', position: 'relative', zIndex: 2,
      }}>
        <div style={{ textAlign: 'center', maxWidth: 780, position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-block', background: 'rgba(245,158,11,0.2)',
            border: '1px solid rgba(245,158,11,0.4)', borderRadius: 20,
            padding: '5px 18px', fontSize: '0.75rem', fontWeight: 700,
            color: '#fbbf24', marginBottom: 28, letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            🇮🇳 Bengaluru, Karnataka — BBMP
          </div>

          <h1 style={{
            fontSize: 'clamp(2.4rem, 5.5vw, 4rem)',
            fontWeight: 900, lineHeight: 1.15,
            marginBottom: 22, letterSpacing: '-0.03em',
            textShadow: '0 2px 20px rgba(0,0,0,0.3)',
          }}>
            {t('home.hero_title')}
          </h1>

          <p style={{
            fontSize: 'clamp(0.95rem, 1.8vw, 1.15rem)',
            color: 'rgba(255,255,255,0.8)', lineHeight: 1.8,
            maxWidth: 580, margin: '0 auto 48px',
            textShadow: '0 1px 8px rgba(0,0,0,0.2)',
          }}>
            {t('home.hero_subtitle')}
          </p>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
            {STATS.map(s => (
              <div key={s.label} className="hover-float" style={{
                background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(16px)',
                borderRadius: 14, padding: '16px 24px',
                border: '1px solid rgba(255,255,255,0.18)', textAlign: 'center', minWidth: 120,
              }}>
                <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontWeight: 900, fontSize: '1.5rem', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{t(s.label)}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={() => router.push('/login')}
            style={{
              padding: '16px 44px', background: 'linear-gradient(135deg,#f59e0b,#fbbf24)',
              color: '#0f172a', border: 'none', borderRadius: 14,
              fontWeight: 900, fontSize: '1rem', cursor: 'pointer',
              boxShadow: '0 8px 28px rgba(245,158,11,0.45)',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-6px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 36px rgba(245,158,11,0.55)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 28px rgba(245,158,11,0.45)'; }}
          >
            {t('home.cta_start')} →
          </button>
        </div>
      </main>

      <footer style={{
        textAlign: 'center', padding: '16px 40px',
        color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        position: 'relative', zIndex: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
      }}>
        <Landmark size={14} /> CivicConnect · Bengaluru, Karnataka · {new Date().getFullYear()}
      </footer>
    </div>
  );
}

/* ── Admin Dashboard Component ── */
const ADMIN_STATUS_CONFIG: Record<
  string,
  { bg: string; color: string; border: string; label: string; icon: React.ReactNode }
> = {
  SUBMITTED:    { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'Submitted',    icon: <Send size={13} /> },
  UNDER_REVIEW: { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: 'Under Review', icon: <Search size={13} /> },
  VERIFIED:     { bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc', label: 'Verified',     icon: <CheckCircle2 size={13} /> },
  ASSIGNED:     { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff', label: 'Assigned',     icon: <UserCheck size={13} /> },
  IN_PROGRESS:  { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd', label: 'In Progress',  icon: <Loader2 size={13} className="animate-spin" /> },
  RESOLVED:     { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', label: 'Resolved',     icon: <CheckCircle size={13} /> },
  REJECTED:     { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', label: 'Rejected',     icon: <XCircle size={13} /> },
};

function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [unverifiedReports, setUnverifiedReports] = useState<any[]>([]);
  const [approvalThreshold, setApprovalThreshold] = useState(5);
  const [loading, setLoading] = useState(true);

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [analyticsFilters, setAnalyticsFilters] = useState<AnalyticsFilters>({});

  // Analytics filter UI state
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Workflow & Priority management state
  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | ComplaintPriority>('all');
  const [sortByPriority, setSortByPriority] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkflowReport, setSelectedWorkflowReport] = useState<Report | null>(null);
  const [targetNextStatus, setTargetNextStatus] = useState<string>('');
  const [workflowRemark, setWorkflowRemark] = useState('');
  const [workflowAssignee, setWorkflowAssignee] = useState('');
  const [workflowAfterPhoto, setWorkflowAfterPhoto] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Priority update state in modal
  const [selectedPriority, setSelectedPriority] = useState<ComplaintPriority>('MEDIUM');
  const [priorityRemark, setPriorityRemark] = useState('');
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);

  useEffect(() => {
    fetchData();
    fetchAnalytics();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, reportsRes] = await Promise.all([
        getUsers(),
        getReports(),
      ]);
      setUsers(usersRes.data.users || []);

      const reports: Report[] = reportsRes.data.reports || [];
      setAllReports(reports);

      // Filter reports to only show unverified ones that are not rejected
      const pending = reports.filter(
        (r: any) => !r.is_verified && normalizeStatus(r.status) !== 'REJECTED'
      );
      setUnverifiedReports(pending);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // ─── Analytics Fetch ──────────────────────────────────────────────────────────
  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const res = await getAnalyticsDashboardData(analyticsFilters);
      setAnalyticsData(res.data);
    } catch (err: any) {
      setAnalyticsError(err?.message || 'Failed to load analytics');
      setAnalyticsData(null);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const applyAnalyticsFilters = () => {
    const filters: AnalyticsFilters = {
      category: filterCategory !== 'all' ? filterCategory : null,
      priority: filterPriority !== 'all' ? filterPriority : null,
      status: filterStatus !== 'all' ? filterStatus : null,
      department: filterDepartment !== 'all' ? filterDepartment : null,
      start_date: startDate || null,
      end_date: endDate || null,
    };
    setAnalyticsFilters(filters);
    fetchAnalytics();
  };

  const resetAnalyticsFilters = () => {
    setFilterCategory('all');
    setFilterDepartment('all');
    setFilterPriority('all');
    setFilterStatus('all');
    setStartDate('');
    setEndDate('');
    setAnalyticsFilters({});
    fetchAnalytics();
  };

  const applyDatePreset = (preset: '7d' | '30d' | '90d' | 'month' | 'all') => {
    const today = new Date();
    if (preset === '7d') {
      setStartDate(new Date(today.getTime() - 7 * 86400000).toISOString().slice(0, 10));
      setEndDate('');
    } else if (preset === '30d') {
      setStartDate(new Date(today.getTime() - 30 * 86400000).toISOString().slice(0, 10));
      setEndDate('');
    } else if (preset === '90d') {
      setStartDate(new Date(today.getTime() - 90 * 86400000).toISOString().slice(0, 10));
      setEndDate('');
    } else if (preset === 'month') {
      setStartDate(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10));
      setEndDate('');
    } else {
      setStartDate('');
      setEndDate('');
    }
    // Note: applyAnalyticsFilters will be called manually or via filter change
  };

  const handleRemoveUser = async (id: number) => {
    if (!confirm('Are you sure you want to remove this user for misleading the government?')) return;
    try {
      await deleteUser(id);
      toast.success('User removed successfully.');
      fetchData();
    } catch (err) {
      toast.error('Failed to remove user');
    }
  };

  const handleVerifyReport = async (id: number, isValid: boolean) => {
    try {
      await verifyReport(id, isValid);
      toast.success(isValid ? 'Report approved & verified.' : 'Report marked rejected.');
      fetchData();
    } catch (err) {
      toast.error('Failed to verify report');
    }
  };

  const openWorkflowModal = (report: Report) => {
    const currentStatus = normalizeStatus(report.status);
    const transitions = getAvailableTransitions(currentStatus);
    setSelectedWorkflowReport(report);
    setTargetNextStatus(transitions[0] || '');
    setWorkflowRemark('');
    setWorkflowAssignee(report.assigned_to || '');
    setWorkflowAfterPhoto(report.after_photo_url || '');
    setSelectedPriority((report.priority as ComplaintPriority) || 'MEDIUM');
    setPriorityRemark('');
  };

  const handleUpdateWorkflow = async () => {
    if (!selectedWorkflowReport || !targetNextStatus) {
      toast.error('Please select a target status transition.');
      return;
    }
    setIsUpdatingStatus(true);
    try {
      await updateReportStatus(
        selectedWorkflowReport.id,
        targetNextStatus,
        workflowRemark.trim() || undefined,
        workflowAssignee.trim() || undefined,
        workflowAfterPhoto.trim() || undefined
      );
      toast.success(`Complaint #${selectedWorkflowReport.id} transitioned to ${targetNextStatus}`);
      setSelectedWorkflowReport(null);
      await fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to update complaint status.';
      toast.error(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleUpdatePriority = async () => {
    if (!selectedWorkflowReport || !selectedPriority) return;
    setIsUpdatingPriority(true);
    try {
      const res = await updateReportPriority(
        selectedWorkflowReport.id,
        selectedPriority,
        priorityRemark.trim() || undefined
      );
      toast.success(`Complaint #${selectedWorkflowReport.id} priority set to ${selectedPriority}`);
      if (res.data?.report) {
        setSelectedWorkflowReport(res.data.report);
      }
      setPriorityRemark('');
      await fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to update complaint priority.';
      toast.error(msg);
    } finally {
      setIsUpdatingPriority(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const sanitizeRole = (role?: string) => {
    if (!role) return 'Municipal Authority';
    const r = role.toLowerCase();
    if (r === 'citizen') return 'Citizen';
    if (r === 'admin') return 'Municipal Administrator';
    if (r === 'government') return 'Ward Officer';
    return 'Civic Official';
  };

  // Priority counts for statistics cards
  const priorityCounts: Record<ComplaintPriority, number> = {
    CRITICAL: allReports.filter(r => (r.priority || 'MEDIUM') === 'CRITICAL').length,
    HIGH: allReports.filter(r => (r.priority || 'MEDIUM') === 'HIGH').length,
    MEDIUM: allReports.filter(r => (r.priority || 'MEDIUM') === 'MEDIUM').length,
    LOW: allReports.filter(r => (r.priority || 'MEDIUM') === 'LOW').length,
  };

  // Filter complaints
  const filteredReports = allReports.filter(r => {
    const norm = normalizeStatus(r.status);
    const matchesStatus = statusFilter === 'all' || norm === statusFilter;
    const matchesPriority = priorityFilter === 'all' || (r.priority || 'MEDIUM') === priorityFilter;
    const matchesSearch =
      !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.address_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(r.id).includes(searchQuery);
    return matchesStatus && matchesPriority && matchesSearch;
  });

  // Sort complaints (supports sorting Critical first)
  const displayReports = [...filteredReports];
  if (sortByPriority) {
    displayReports.sort((a, b) => {
      const pA = PRIORITY_ORDER[a.priority || 'MEDIUM'] || 99;
      const pB = PRIORITY_ORDER[b.priority || 'MEDIUM'] || 99;
      if (pA !== pB) return pA - pB;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  const complaintCounts: Record<string, number> = {
    all: allReports.length,
    SUBMITTED: allReports.filter(r => normalizeStatus(r.status) === 'SUBMITTED').length,
    UNDER_REVIEW: allReports.filter(r => normalizeStatus(r.status) === 'UNDER_REVIEW').length,
    VERIFIED: allReports.filter(r => normalizeStatus(r.status) === 'VERIFIED').length,
    ASSIGNED: allReports.filter(r => normalizeStatus(r.status) === 'ASSIGNED').length,
    IN_PROGRESS: allReports.filter(r => normalizeStatus(r.status) === 'IN_PROGRESS').length,
    RESOLVED: allReports.filter(r => normalizeStatus(r.status) === 'RESOLVED').length,
    REJECTED: allReports.filter(r => normalizeStatus(r.status) === 'REJECTED').length,
  };

  return (
    <>
      <Navbar />
      <main className="page-container" style={{ padding: '36px 0 64px' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              marginBottom: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: '#0f172a',
            }}
          >
            <Shield size={32} color="#1a4fa0" /> Admin Control Center
          </h1>
          <p style={{ color: '#64748b', fontSize: '1.05rem', margin: 0 }}>
            Manage civic complaint workflow lifecycles, review field verifications, and maintain platform integrity.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
            <div>Loading administrative dashboard data...</div>
          </div>
        ) : (
          <>
            {/* SECTION 1: Advanced Complaint Status Workflow Management */}
            <div className="civic-card" style={{ padding: 24, marginBottom: 40 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                    <RefreshCw size={20} color="#2563eb" /> Complaint Workflow & Lifecycle Management
                  </h2>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0' }}>
                    Enforce state machine transitions, record official remarks, and audit complaint timelines.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="text"
                    placeholder="Search by title, ID, ward..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      width: 220,
                    }}
                  />
                  <button
                    onClick={() => fetchData()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      padding: '7px 12px',
                      borderRadius: 8,
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    <RefreshCw size={14} /> Refresh
                  </button>
                </div>
              </div>

              {/* Priority Statistics Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
                {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as ComplaintPriority[]).map((pKey) => {
                  const conf = PRIORITY_CONFIG[pKey];
                  const count = priorityCounts[pKey] || 0;
                  const isSelected = priorityFilter === pKey;
                  return (
                    <div
                      key={pKey}
                      onClick={() => setPriorityFilter(isSelected ? 'all' : pKey)}
                      style={{
                        background: isSelected ? conf.bg : '#ffffff',
                        border: `1.5px solid ${isSelected ? conf.color : conf.border}`,
                        borderRadius: 12,
                        padding: '14px 16px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? `0 4px 12px ${conf.color}25` : '0 1px 3px rgba(0,0,0,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: conf.color, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 5 }}>
                          {pKey === 'CRITICAL' && <AlertTriangle size={12} />}
                          {conf.label} Priority
                        </div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: conf.color, marginTop: 4, lineHeight: 1 }}>
                          {count}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          padding: '3px 8px',
                          borderRadius: 8,
                          background: isSelected ? conf.color : conf.bg,
                          color: isSelected ? 'white' : conf.color,
                          fontWeight: 800,
                          border: `1px solid ${conf.border}`,
                        }}
                      >
                        {isSelected ? 'Active' : 'Filter'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Status Filter Badges */}
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, marginBottom: 12 }}>
                {[
                  { key: 'all',          label: 'All Complaints', color: '#475569' },
                  { key: 'SUBMITTED',    label: 'Submitted',      color: '#1d4ed8' },
                  { key: 'UNDER_REVIEW', label: 'Under Review',   color: '#b45309' },
                  { key: 'VERIFIED',     label: 'Verified',       color: '#0e7490' },
                  { key: 'ASSIGNED',     label: 'Assigned',       color: '#7e22ce' },
                  { key: 'IN_PROGRESS',  label: 'In Progress',    color: '#1e40af' },
                  { key: 'RESOLVED',     label: 'Resolved',       color: '#047857' },
                  { key: 'REJECTED',     label: 'Rejected',       color: '#b91c1c' },
                ].map((st) => {
                  const isSelected = statusFilter === st.key;
                  return (
                    <button
                      key={st.key}
                      onClick={() => setStatusFilter(st.key as any)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 20,
                        border: isSelected ? `2px solid ${st.color}` : '1px solid #e2e8f0',
                        background: isSelected ? `${st.color}15` : 'white',
                        color: isSelected ? st.color : '#64748b',
                        fontSize: '0.76rem',
                        fontWeight: isSelected ? 800 : 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {st.label}
                      <span
                        style={{
                          background: isSelected ? st.color : '#e2e8f0',
                          color: isSelected ? 'white' : '#64748b',
                          padding: '1px 6px',
                          borderRadius: 10,
                          fontSize: '0.68rem',
                          fontWeight: 800,
                        }}
                      >
                        {complaintCounts[st.key] || 0}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Priority Filter and Sort Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginRight: 2 }}>
                    Priority:
                  </span>
                  <button
                    onClick={() => setPriorityFilter('all')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 16,
                      border: priorityFilter === 'all' ? '2px solid #475569' : '1px solid #e2e8f0',
                      background: priorityFilter === 'all' ? '#f1f5f9' : 'white',
                      color: priorityFilter === 'all' ? '#0f172a' : '#64748b',
                      fontSize: '0.74rem',
                      fontWeight: priorityFilter === 'all' ? 800 : 600,
                      cursor: 'pointer',
                    }}
                  >
                    All ({allReports.length})
                  </button>
                  {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as ComplaintPriority[]).map((pKey) => {
                    const conf = PRIORITY_CONFIG[pKey];
                    const isSelected = priorityFilter === pKey;
                    return (
                      <button
                        key={pKey}
                        onClick={() => setPriorityFilter(isSelected ? 'all' : pKey)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 16,
                          border: isSelected ? `2px solid ${conf.color}` : `1px solid ${conf.border}`,
                          background: isSelected ? conf.bg : 'white',
                          color: conf.color,
                          fontSize: '0.74rem',
                          fontWeight: isSelected ? 800 : 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {pKey === 'CRITICAL' && <AlertTriangle size={11} />}
                        {conf.label} ({priorityCounts[pKey] || 0})
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setSortByPriority(!sortByPriority)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: sortByPriority ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                    background: sortByPriority ? '#eff6ff' : 'white',
                    color: sortByPriority ? '#1d4ed8' : '#475569',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <ArrowUpDown size={13} />
                  {sortByPriority ? 'Sorted: Critical First' : 'Sort by Priority'}
                </button>
              </div>

              {/* Complaints Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 14px', fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>ID</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>Complaint Title</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>Category & Ward</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>Priority</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>Current Status</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>Audit Trail</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayReports.map((r) => {
                      const norm = normalizeStatus(r.status);
                      const stConf = ADMIN_STATUS_CONFIG[norm] || ADMIN_STATUS_CONFIG.SUBMITTED;
                      const transitions = getAvailableTransitions(norm);
                      const historyCount = r.status_history?.length || 1;
                      const pKey = (r.priority || 'MEDIUM') as ComplaintPriority;
                      const pConf = PRIORITY_CONFIG[pKey] || PRIORITY_CONFIG.MEDIUM;

                      return (
                        <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px', fontFamily: 'monospace', fontWeight: 800, fontSize: '0.78rem', color: '#64748b' }}>
                            #CC-{String(r.id).slice(0, 8).toUpperCase()}
                          </td>
                          <td style={{ padding: '14px', maxWidth: 260 }}>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>{r.title}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {r.address_text || 'Bengaluru'}
                            </div>
                          </td>
                          <td style={{ padding: '14px', fontSize: '0.82rem' }}>
                            <div style={{ textTransform: 'capitalize', fontWeight: 600, color: '#334155' }}>
                              {r.category.replace('_', ' ')}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              Ward {r.ward_number || 'BBMP Central'}
                            </div>
                          </td>
                          <td style={{ padding: '14px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                background: pConf.bg,
                                color: pConf.color,
                                border: `1px solid ${pConf.border}`,
                                padding: '3px 8px',
                                borderRadius: 12,
                                fontSize: '0.72rem',
                                fontWeight: 800,
                              }}
                            >
                              {pKey === 'CRITICAL' && <AlertTriangle size={11} />}
                              {pConf.label}
                            </span>
                          </td>
                          <td style={{ padding: '14px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                background: stConf.bg,
                                color: stConf.color,
                                border: `1px solid ${stConf.border}`,
                                padding: '4px 10px',
                                borderRadius: 14,
                                fontSize: '0.75rem',
                                fontWeight: 800,
                              }}
                            >
                              {stConf.icon} {stConf.label}
                            </span>
                            {r.assigned_to && (
                              <div style={{ fontSize: '0.7rem', color: '#7e22ce', fontWeight: 600, marginTop: 4 }}>
                                Assigned: {r.assigned_to}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '14px', fontSize: '0.78rem', color: '#64748b' }}>
                            <span
                              style={{
                                background: '#f1f5f9',
                                padding: '3px 8px',
                                borderRadius: 8,
                                fontWeight: 700,
                                color: '#475569',
                              }}
                            >
                              {historyCount} {historyCount === 1 ? 'log' : 'logs'}
                            </span>
                          </td>
                          <td style={{ padding: '14px' }}>
                            <button
                              onClick={() => openWorkflowModal(r)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                background: '#2563eb',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: 8,
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              <Edit3 size={13} /> Update Status
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {displayReports.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                          No complaints match the selected filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Workflow Transition Modal */}
            {selectedWorkflowReport && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(15, 23, 42, 0.65)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    background: 'white',
                    borderRadius: 16,
                    maxWidth: 680,
                    width: '100%',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Modal Header */}
                  <div
                    style={{
                      padding: '20px 24px',
                      borderBottom: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#f8fafc',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.75rem', color: '#64748b', background: '#e2e8f0', padding: '2px 8px', borderRadius: 6 }}>
                          #CC-{String(selectedWorkflowReport.id).slice(0, 8).toUpperCase()}
                        </span>
                        <span style={{ fontSize: '0.75rem', textTransform: 'capitalize', color: '#475569', fontWeight: 600 }}>
                          {selectedWorkflowReport.category.replace('_', ' ')}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        {selectedWorkflowReport.title}
                      </h3>
                    </div>

                    <button
                      onClick={() => setSelectedWorkflowReport(null)}
                      style={{
                        background: '#e2e8f0',
                        border: 'none',
                        borderRadius: 8,
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <X size={16} color="#475569" />
                    </button>
                  </div>

                  {/* Modal Content */}
                  <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Current Status Banner */}
                    {(() => {
                      const currentNorm = normalizeStatus(selectedWorkflowReport.status);
                      const currentConf = ADMIN_STATUS_CONFIG[currentNorm] || ADMIN_STATUS_CONFIG.SUBMITTED;
                      const transitions = getAvailableTransitions(currentNorm);

                      return (
                        <>
                          <div
                            style={{
                              background: currentConf.bg,
                              border: `1.5px solid ${currentConf.border}`,
                              borderRadius: 12,
                              padding: '14px 18px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: currentConf.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Current Status
                              </div>
                              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: currentConf.color, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                {currentConf.icon} {currentConf.label}
                              </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Filed By</div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                                {selectedWorkflowReport.reporter_name || 'Citizen'}
                              </div>
                            </div>
                          </div>

                          {/* Transition Form */}
                          <div style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
                              Select Next Valid Status Transition
                            </div>

                            {transitions.length === 0 ? (
                              <div style={{ padding: 12, background: '#fffbeb', borderRadius: 8, color: '#b45309', fontSize: '0.82rem' }}>
                                No further forward transitions configured from {currentConf.label}.
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                                {transitions.map((nextSt) => {
                                  const nextConf = ADMIN_STATUS_CONFIG[nextSt] || ADMIN_STATUS_CONFIG.SUBMITTED;
                                  const isSelected = targetNextStatus === nextSt;

                                  return (
                                    <button
                                      key={nextSt}
                                      type="button"
                                      onClick={() => setTargetNextStatus(nextSt)}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '9px 16px',
                                        borderRadius: 10,
                                        border: isSelected ? `2px solid ${nextConf.color}` : '1.5px solid #cbd5e1',
                                        background: isSelected ? nextConf.bg : 'white',
                                        color: isSelected ? nextConf.color : '#334155',
                                        fontWeight: isSelected ? 800 : 600,
                                        fontSize: '0.82rem',
                                        cursor: 'pointer',
                                        boxShadow: isSelected ? `0 2px 8px ${nextConf.color}25` : 'none',
                                      }}
                                    >
                                      {nextConf.icon} Transition to: <strong>{nextConf.label}</strong>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Department Assignment (if applicable) */}
                            {(targetNextStatus === 'ASSIGNED' || targetNextStatus === 'IN_PROGRESS') && (
                              <div style={{ marginBottom: 14 }}>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                                  Assigned Department / Team:
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. BBMP Road Infrastructure Unit #3, BESCOM Maintenance Wing"
                                  value={workflowAssignee}
                                  onChange={(e) => setWorkflowAssignee(e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: 8,
                                    border: '1px solid #cbd5e1',
                                    fontSize: '0.85rem',
                                  }}
                                />
                              </div>
                            )}

                            {/* Resolution Photo URL (if resolving) */}
                            {targetNextStatus === 'RESOLVED' && (
                              <div style={{ marginBottom: 14 }}>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#047857', marginBottom: 4 }}>
                                  Resolution Proof Photo URL (Optional):
                                </label>
                                <input
                                  type="text"
                                  placeholder="https://... (Resolution evidence photo URL)"
                                  value={workflowAfterPhoto}
                                  onChange={(e) => setWorkflowAfterPhoto(e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: 8,
                                    border: '1px solid #cbd5e1',
                                    fontSize: '0.85rem',
                                  }}
                                />
                              </div>
                            )}

                            {/* Admin Remark Input */}
                            <div>
                              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                                Official Remark / Reason for Transition:
                              </label>
                              <textarea
                                rows={3}
                                placeholder="Enter details about this workflow update (e.g. Field inspection confirmed pothole; Repair unit dispatched to site)..."
                                value={workflowRemark}
                                onChange={(e) => setWorkflowRemark(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  borderRadius: 8,
                                  border: '1px solid #cbd5e1',
                                  fontSize: '0.85rem',
                                  resize: 'vertical',
                                }}
                              />
                            </div>
                          </div>

                          {/* Priority Update Panel */}
                          <div style={{ background: '#faf5ff', padding: 18, borderRadius: 12, border: '1px solid #e9d5ff' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#6b21a8', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <AlertTriangle size={15} /> Update Complaint Priority
                            </div>

                            {/* Current Priority Badge */}
                            {(() => {
                              const cp = (selectedWorkflowReport.priority || 'MEDIUM') as ComplaintPriority;
                              const cpConf = PRIORITY_CONFIG[cp] || PRIORITY_CONFIG.MEDIUM;
                              return (
                                <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#64748b' }}>
                                  Current:
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: cpConf.bg, color: cpConf.color, border: `1px solid ${cpConf.border}`, padding: '2px 8px', borderRadius: 10, fontWeight: 800, fontSize: '0.72rem' }}>
                                    {cp === 'CRITICAL' && <AlertTriangle size={10} />}
                                    {cpConf.label}
                                  </span>
                                </div>
                              );
                            })()}

                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                              {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as ComplaintPriority[]).map((pKey) => {
                                const pConf = PRIORITY_CONFIG[pKey];
                                const isSelected = selectedPriority === pKey;
                                return (
                                  <button
                                    key={pKey}
                                    type="button"
                                    onClick={() => setSelectedPriority(pKey)}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      padding: '7px 14px',
                                      borderRadius: 10,
                                      border: isSelected ? `2px solid ${pConf.color}` : `1.5px solid ${pConf.border}`,
                                      background: isSelected ? pConf.bg : 'white',
                                      color: pConf.color,
                                      fontWeight: isSelected ? 800 : 600,
                                      fontSize: '0.8rem',
                                      cursor: 'pointer',
                                      boxShadow: isSelected ? `0 2px 8px ${pConf.color}25` : 'none',
                                    }}
                                  >
                                    {pKey === 'CRITICAL' && <AlertTriangle size={12} />}
                                    {pConf.label}
                                  </button>
                                );
                              })}
                            </div>

                            <input
                              type="text"
                              placeholder="Optional remark for priority change..."
                              value={priorityRemark}
                              onChange={(e) => setPriorityRemark(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '7px 12px',
                                borderRadius: 8,
                                border: '1px solid #d8b4fe',
                                fontSize: '0.82rem',
                                background: 'white',
                              }}
                            />
                          </div>

                          {/* Complete Status History Log */}
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Clock size={15} color="#2563eb" /> Complete Complaint History & Audit Trail
                            </div>

                            {(!selectedWorkflowReport.status_history || selectedWorkflowReport.status_history.length === 0) ? (
                              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, color: '#64748b', fontSize: '0.8rem' }}>
                                No prior transition records found.
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
                                {selectedWorkflowReport.status_history.map((h: ReportStatusHistory, idx: number) => {
                                  const hNorm = normalizeStatus(h.new_status);
                                  const hConf = ADMIN_STATUS_CONFIG[hNorm] || ADMIN_STATUS_CONFIG.SUBMITTED;

                                  return (
                                    <div
                                      key={h.id || idx}
                                      style={{
                                        background: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: 8,
                                        padding: '8px 12px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 2,
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                        <span
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            padding: '2px 8px',
                                            borderRadius: 10,
                                            fontSize: '0.72rem',
                                            fontWeight: 800,
                                            background: hConf.bg,
                                            color: hConf.color,
                                          }}
                                        >
                                          {hConf.icon} {hConf.label}
                                        </span>
                                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                          {formatDateTime(h.changed_at)}
                                        </span>
                                      </div>

                                      {h.remark && (
                                        <div style={{ fontSize: '0.78rem', color: '#334155', marginTop: 2 }}>
                                          &ldquo;{h.remark}&rdquo;
                                        </div>
                                      )}

                                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                        Updated by: <strong>{sanitizeRole(h.changed_by_role)}</strong>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Modal Actions */}
                  <div
                    style={{
                      padding: '16px 24px',
                      borderTop: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 12,
                      background: '#f8fafc',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedWorkflowReport(null)}
                      disabled={isUpdatingStatus || isUpdatingPriority}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        background: 'white',
                        color: '#475569',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleUpdatePriority}
                      disabled={isUpdatingPriority || !selectedPriority}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 16px',
                        borderRadius: 8,
                        border: '1.5px solid #7c3aed',
                        background: isUpdatingPriority ? '#ede9fe' : 'white',
                        color: '#6b21a8',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: isUpdatingPriority ? 'not-allowed' : 'pointer',
                        opacity: isUpdatingPriority ? 0.6 : 1,
                      }}
                    >
                      {isUpdatingPriority ? (
                        <>
                          <Loader2 size={13} className="animate-spin" /> Saving Priority...
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={13} /> Save Priority
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleUpdateWorkflow}
                      disabled={isUpdatingStatus || !targetNextStatus}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 18px',
                        borderRadius: 8,
                        border: 'none',
                        background: '#2563eb',
                        color: 'white',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        cursor: isUpdatingStatus || !targetNextStatus ? 'not-allowed' : 'pointer',
                        opacity: isUpdatingStatus || !targetNextStatus ? 0.6 : 1,
                      }}
                    >
                      {isUpdatingStatus ? (
                        <>
                          <Loader2 size={14} className="animate-spin" /> Saving Transition...
                        </>
                      ) : (
                        <>
                          <Check size={14} /> Apply Status Transition
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: Pending Issue Verifications (Preserved from original code) */}
            <div className="civic-card" style={{ padding: 24, overflowX: 'auto', marginBottom: 40 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Search size={20} color="#1a4fa0" /> Pending Issue Verifications
                  {unverifiedReports.length > 0 && (
                    <span style={{ background: '#ef4444', color: 'white', fontSize: '0.75rem', padding: '2px 8px', borderRadius: 12 }}>
                      {unverifiedReports.length}
                    </span>
                  )}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>
                  <label>Approval Threshold:</label>
                  <input
                    type="number"
                    min="1"
                    value={approvalThreshold}
                    onChange={(e) => setApprovalThreshold(parseInt(e.target.value) || 1)}
                    style={{ width: 50, padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', textAlign: 'center' }}
                  />
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Issue</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Description</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Reports</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {unverifiedReports.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '16px 16px', fontWeight: 600 }}>
                        <div style={{ color: '#0f172a' }}>{r.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2, textTransform: 'capitalize' }}>
                          {r.category.replace('_', ' ')}
                        </div>
                      </td>
                      <td style={{ padding: '16px 16px', color: '#475569', fontSize: '0.9rem', maxWidth: 300 }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {r.description}
                        </div>
                        {r.photo_url && (
                          <a href={r.photo_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                            <Camera size={12} /> View Photo
                          </a>
                        )}
                      </td>
                      <td style={{ padding: '16px 16px', color: '#64748b' }}>
                        <div style={{ fontWeight: 700, color: (r.report_count || 1) >= approvalThreshold ? '#10b981' : '#f59e0b', fontSize: '1.1rem' }}>
                          {r.report_count || 1} / {approvalThreshold}
                        </div>
                        <div style={{ fontSize: '0.75rem' }}>Users</div>
                      </td>
                      <td style={{ padding: '16px 16px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button 
                            onClick={() => handleVerifyReport(r.id, true)} 
                            disabled={(r.report_count || 1) < approvalThreshold}
                            title={(r.report_count || 1) < approvalThreshold ? `Requires ${approvalThreshold} reports to approve` : ''}
                            style={{
                              background: (r.report_count || 1) >= approvalThreshold ? '#10b981' : '#94a3b8', 
                              color: 'white', border: 'none', padding: '6px 14px',
                              borderRadius: 6, cursor: (r.report_count || 1) >= approvalThreshold ? 'pointer' : 'not-allowed', 
                              fontSize: '0.8rem', fontWeight: 'bold'
                            }}
                          >
                            Approve
                          </button>
                          <button onClick={() => { if(confirm('Reject this issue as misinformation?')) handleVerifyReport(r.id, false); }} style={{
                            background: '#ef4444', color: 'white', border: 'none', padding: '6px 14px',
                            borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold'
                          }}>
                            Reject
                          </button>
                          <button onClick={() => {
                            toast.success(`SMS sent to Citizen with joining link!`);
                            window.open(`/video-call?room=cc-report-${r.id}-${Date.now()}`, '_blank');
                          }} style={{
                            background: '#8b5cf6', color: 'white', border: 'none', padding: '6px 14px',
                            borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold',
                            display: 'flex', alignItems: 'center', gap: 4
                          }}>
                            <Video size={14} /> Call
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {unverifiedReports.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <CheckCircle size={16} /> No issues pending verification.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* SECTION: Administrative Insights & Analytics */}
            <div className="civic-card" style={{ padding: 24, marginBottom: 40 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                    <BarChart2 size={20} color="#2563eb" /> Administrative Insights & Analytics
                  </h2>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0' }}>
                    Key performance indicators, trend analysis, and descriptive insights for civic operations.
                  </p>
                </div>
              </div>

              {/* KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
                {(() => {
                  const s = analyticsData?.summary;
                  if (!s) return [];
                  const total = s.total;
                  const active = s.active;
                  const resolved = s.resolved;
                  const critical = s.critical;
                  const resolutionRate = total > 0 ? s.resolutionRate : 0;
                  const avgResolutionHours = s.avgResolutionHours;
                  const formatAvgTime = (hours: number | null) => {
                    if (hours == null) return { value: 'N/A', unit: '', context: 'No resolved complaints yet' };
                    if (hours >= 24) return { value: (hours / 24).toFixed(1), unit: 'days', context: 'From submission to resolution' };
                    return { value: hours.toFixed(1), unit: 'hrs', context: 'From submission to resolution' };
                  };
                  const avgTime = formatAvgTime(avgResolutionHours);
                  return [
                    { title: 'Total Complaints', value: total.toLocaleString(), unit: '', context: total === 0 ? 'No complaints registered' : 'All registered civic issues' },
                    { title: 'Active Complaints', value: active.toLocaleString(), unit: '', context: total === 0 ? 'No active backlog' : 'Pending, in review & in-progress' },
                    { title: 'Resolved Complaints', value: resolved.toLocaleString(), unit: '', context: total === 0 ? '0 issues closed' : 'Successfully completed' },
                    { title: 'Critical Complaints', value: critical.toLocaleString(), unit: '', context: total === 0 ? 'No critical issues' : critical > 0 ? 'Requires immediate action' : 'Zero critical hazards' },
                    { title: 'Resolution Rate', value: `${resolutionRate}`, unit: '%', context: total === 0 ? 'No complaints to calculate' : `${resolved} of ${total} resolved` },
                    { title: 'Avg Resolution Time', value: avgTime.value, unit: avgTime.unit, context: avgTime.context },
                  ].map((kpi, idx) => (
                    <div key={idx} className="civic-card" style={{ padding: '20px 24px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{kpi.title}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                        <span style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{kpi.value}</span>
                        {kpi.unit && <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>{kpi.unit}</span>}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: 1.4 }}>{kpi.context}</div>
                    </div>
                  ));
                })()}
              </div>

              {/* Filter Bar */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', marginBottom: 24, padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 160 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Category</label>
                  <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); applyAnalyticsFilters(); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem', background: 'white' }}>
                    <option value="all">All Categories</option>
                    <option value="pothole">Pothole & Roads</option>
                    <option value="streetlight">Streetlight</option>
                    <option value="water">Water Supply</option>
                    <option value="sewage">Sewage & Drainage</option>
                    <option value="garbage">Solid Waste</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 180 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Department</label>
                  <select value={filterDepartment} onChange={(e) => { setFilterDepartment(e.target.value); applyAnalyticsFilters(); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem', background: 'white' }}>
                    <option value="all">All Departments</option>
                    {(() => {
                      const depts = analyticsData?.byDepartment || [];
                      return depts.map(d => <option key={d.department} value={d.department}>{d.department} ({d.count})</option>);
                    })()}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Priority</label>
                  <select value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value); applyAnalyticsFilters(); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem', background: 'white' }}>
                    <option value="all">All Priorities</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 160 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Status</label>
                  <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); applyAnalyticsFilters(); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem', background: 'white' }}>
                    <option value="all">All Statuses</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="VERIFIED">Verified</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>End Date</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={() => { applyDatePreset('7d'); setTimeout(applyAnalyticsFilters, 0); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: 'white', fontSize: '0.75rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>Last 7 days</button>
                  <button onClick={() => { applyDatePreset('30d'); setTimeout(applyAnalyticsFilters, 0); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: 'white', fontSize: '0.75rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>Last 30 days</button>
                  <button onClick={() => { applyDatePreset('90d'); setTimeout(applyAnalyticsFilters, 0); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: 'white', fontSize: '0.75rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>Last 90 days</button>
                  <button onClick={() => { applyDatePreset('month'); setTimeout(applyAnalyticsFilters, 0); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: 'white', fontSize: '0.75rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>This Month</button>
                  <button onClick={() => { applyDatePreset('all'); setTimeout(applyAnalyticsFilters, 0); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: 'white', fontSize: '0.75rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>All Time</button>
                  <button onClick={resetAnalyticsFilters} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ef4444', background: '#fef2f2', fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', cursor: 'pointer' }}>
                    <RefreshCw size={12} style={{ marginRight: 4 }} /> Reset
                  </button>
                </div>
              </div>

              {/* Charts */}
              <AdminAnalyticsCharts data={analyticsData} loading={analyticsLoading} error={analyticsError} />

            </div>

            {/* SECTION 3: Registered Users (Preserved from original code) */}
            <div className="civic-card" style={{ padding: 24, overflowX: 'auto' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={20} color="#1a4fa0" /> Registered Users
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Name</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Email</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Role</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '16px 16px', fontWeight: 500 }}>{u.full_name}</td>
                      <td style={{ padding: '16px 16px', color: '#64748b' }}>{u.email}</td>
                      <td style={{ padding: '16px 16px' }}>
                        <span style={{
                          background: u.role === 'admin' ? '#fef08a' : (u.role === 'government' ? '#bfdbfe' : '#dcfce3'),
                          color: u.role === 'admin' ? '#854d0e' : (u.role === 'government' ? '#1e40af' : '#166534'),
                          padding: '4px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700,
                          textTransform: 'uppercase'
                        }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '16px 16px' }}>
                        {u.role !== 'admin' && (
                          <button onClick={() => handleRemoveUser(u.id)} style={{
                            background: '#ef4444', color: 'white', border: 'none', padding: '6px 14px',
                            borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#dc2626'}
                          onMouseLeave={e => e.currentTarget.style.background = '#ef4444'}
                          >
                            Remove User
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No registered users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </>
  );
}
