'use client';

import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isKannada = mounted ? i18n.language === 'kn' : false;

  const toggle = () => {
    const next = isKannada ? 'en' : 'kn';
    i18n.changeLanguage(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('civicconnect_lang', next);
      document.documentElement.lang = next;
    }
  };

  return (
    <button
      id="language-toggle"
      suppressHydrationWarning
      onClick={toggle}
      title={isKannada ? 'Switch to English' : 'ಕನ್ನಡಕ್ಕೆ ಬದಲಿಸಿ'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 14px',
        borderRadius: 20,
        border: '1.5px solid rgba(255,255,255,0.4)',
        background: 'rgba(255,255,255,0.15)',
        color: 'white',
        fontWeight: 700,
        fontSize: '0.82rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
        backdropFilter: 'blur(8px)',
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.28)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)'; }}
    >
      <span style={{ display: 'flex', alignItems: 'center' }}><Globe size={16} /></span>
      {isKannada ? 'English' : 'ಕನ್ನಡ'}
    </button>
  );
}
