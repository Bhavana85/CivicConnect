'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Building, Shield, User, Loader2, LogIn, UserPlus, Eye, EyeOff, Landmark } from 'lucide-react';
import { login, register } from '@/lib/api';
import toast from 'react-hot-toast';

type Role   = 'citizen' | 'government' | 'admin';
type Screen = 'login' | 'signup';

const ROLES = {
  citizen:    { label: 'Citizen',    icon: <User     size={16} />, accent: '#2563eb', idLabel: 'Email Address',            idType: 'email', idPlaceholder: 'you@example.com'       },
  admin:      { label: 'Admin',      icon: <Shield   size={16} />, accent: '#7c3aed', idLabel: 'Admin Email',              idType: 'email', idPlaceholder: 'admin@civicconnect.gov' },
  government: { label: 'Government', icon: <Building size={16} />, accent: '#0891b2', idLabel: 'Ward / Jurisdiction No.',   idType: 'text',  idPlaceholder: 'e.g. 73'               },
};

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [screen,     setScreen]     = useState<Screen>('login');
  const [role,       setRole]       = useState<Role>('citizen');
  const [identifier, setIdentifier] = useState('');
  const [password,   setPassword]   = useState('');
  const [fullName,   setFullName]   = useState('');
  const [phone,      setPhone]      = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [loading,    setLoading]    = useState(false);

  // Already logged in → go home
  useEffect(() => {
    if (localStorage.getItem('cc_token')) router.replace('/');
  }, [router]);

  const reset = () => { setIdentifier(''); setPassword(''); setFullName(''); setPhone(''); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login({ identifier, password, roleType: role });
      localStorage.setItem('cc_token',     res.data.token);
      localStorage.setItem('cc_user_role', res.data.user.role);
      localStorage.setItem('cc_user_name', res.data.user.full_name || '');
      document.documentElement.setAttribute('data-theme', res.data.user.role);
      toast.success(`Welcome, ${res.data.user.full_name || 'User'}!`);
      router.replace('/');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid credentials.');
    } finally { setLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await register({ full_name: fullName, email: identifier, phone, password });
      localStorage.setItem('cc_token',     res.data.token);
      localStorage.setItem('cc_user_role', res.data.user.role);
      localStorage.setItem('cc_user_name', res.data.user.full_name || '');
      document.documentElement.setAttribute('data-theme', res.data.user.role);
      toast.success('Account created! Welcome');
      router.replace('/');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed.');
    } finally { setLoading(false); }
  };

  const cfg = ROLES[role];

  /* ── shared input style ── */
  const input = (extra?: React.CSSProperties): React.CSSProperties => ({
    width: '100%', boxSizing: 'border-box', padding: '11px 14px',
    border: '1.5px solid #e2e8f0', borderRadius: 10,
    fontSize: '0.9rem', outline: 'none', background: '#f8fafc',
    transition: 'border-color 0.2s, background 0.2s', ...extra,
  });

  const focus = (accent: string) => (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = accent; e.target.style.background = 'white';
  };
  const blur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f2d5c 0%, #1a4fa0 60%, #1e40af 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>

      {/* Brand */}
      <div className="animate-fade-in-up" style={{ textAlign: 'center', marginBottom: 28, color: 'white' }}>
        <div style={{
          width: 60, height: 60, background: 'linear-gradient(135deg,#f59e0b,#fbbf24)',
          borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.8rem', margin: '0 auto 14px', boxShadow: '0 6px 20px rgba(245,158,11,0.45)',
        }}><Landmark size={32} color="#0f172a" /></div>
        <div style={{ fontWeight: 900, fontSize: '1.5rem', letterSpacing: '-0.02em' }}>CivicConnect</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginTop: 2 }}>ನಾಗರಿಕ ಸಂಪರ್ಕ</div>
      </div>

      {/* Card */}
      <div className="animate-fade-in-up" style={{
        background: 'white', borderRadius: 24, width: '100%', maxWidth: 440,
        overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.35)',
      }}>

        {/* Screen Tabs: Sign In | Create Account — only for citizens */}
        {role === 'citizen' ? (
          <div style={{ display: 'flex', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            {(['login', 'signup'] as Screen[]).map(s => (
              <button key={s} onClick={() => { setScreen(s); reset(); }} style={{
                flex: 1, padding: '14px', border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.83rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                color: screen === s ? '#1a4fa0' : '#94a3b8',
                background: screen === s ? 'white' : 'transparent',
                borderBottom: screen === s ? '2.5px solid #1a4fa0' : '2.5px solid transparent',
                transition: 'all 0.2s',
              }}>
                {s === 'login' ? <LogIn size={15} /> : <UserPlus size={15} />}
                {s === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
            fontWeight: 700, fontSize: '0.85rem', color: cfg.accent,
          }}>
            <LogIn size={15} />
            Sign In as {cfg.label}
          </div>
        )}

        <div style={{ padding: '28px 32px 32px' }}>

          {/* ── SIGN IN ── */}
          {screen === 'login' && (
            <>
              {/* Role selector */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
                {(Object.keys(ROLES) as Role[]).map(r => (
                  <button key={r} onClick={() => { setRole(r); setIdentifier(''); if (r !== 'citizen') setScreen('login'); }} style={{
                    flex: 1, padding: '9px 4px', border: `1.5px solid ${role === r ? ROLES[r].accent : '#e2e8f0'}`,
                    borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.72rem',
                    color: role === r ? ROLES[r].accent : '#94a3b8',
                    background: role === r ? `${ROLES[r].accent}12` : 'white',
                    transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  }}>
                    {ROLES[r].icon}
                    {ROLES[r].label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={lbl}>{cfg.idLabel}</label>
                  <input required type={cfg.idType} value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder={cfg.idPlaceholder}
                    style={input()} onFocus={focus(cfg.accent)} onBlur={blur} />
                </div>
                <div style={{ position: 'relative' }}>
                  <label style={lbl}>Password</label>
                  <input required type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={input({ paddingRight: 44 })} onFocus={focus(cfg.accent)} onBlur={blur} />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={eyeBtn}>
                    {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                <button type="submit" disabled={loading} style={{ ...btn, background: cfg.accent, boxShadow: `0 4px 14px ${cfg.accent}40`, marginTop: 4 }}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
                  {loading ? 'Signing in…' : `Sign in as ${cfg.label}`}
                </button>
              </form>
            </>
          )}

          {/* ── SIGN UP (citizens only) ── */}
          {screen === 'signup' && role === 'citizen' && (
            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Full Name</label>
                <input required type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar" style={input()} onFocus={focus('#2563eb')} onBlur={blur} />
              </div>
              <div>
                <label style={lbl}>Email Address</label>
                <input required type="email" value={identifier} onChange={e => setIdentifier(e.target.value)}
                  placeholder="you@example.com" style={input()} onFocus={focus('#2563eb')} onBlur={blur} />
              </div>
              <div>
                <label style={lbl}>Phone Number</label>
                <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="+91 98765 43210" style={input()} onFocus={focus('#2563eb')} onBlur={blur} />
              </div>
              <div style={{ position: 'relative' }}>
                <label style={lbl}>Password</label>
                <input required type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  style={input({ paddingRight: 44 })} onFocus={focus('#2563eb')} onBlur={blur} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={eyeBtn}>
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <button type="submit" disabled={loading} style={{ ...btn, background: '#2563eb', boxShadow: '0 4px 14px rgba(37,99,235,0.35)', marginTop: 6 }}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Back to home */}
      <button onClick={() => router.push('/')} style={{
        marginTop: 20, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none',
        cursor: 'pointer', fontSize: '0.82rem', textDecoration: 'underline',
      }}>← Back to home</button>
    </div>
  );
}

/* ── Style tokens ── */
const lbl: React.CSSProperties = {
  display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151',
  marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em',
};
const btn: React.CSSProperties = {
  width: '100%', padding: '13px', color: 'white', border: 'none', borderRadius: 12,
  fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s',
};
const eyeBtn: React.CSSProperties = {
  position: 'absolute', right: 13, bottom: 12,
  background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex',
};
