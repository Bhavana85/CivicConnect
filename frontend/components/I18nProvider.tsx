'use client';

import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  // Track language so we can pass it down, but DO NOT use key= on the provider
  // react-i18next handles re-renders internally via useTranslation subscription
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Restore saved language preference
    const saved = localStorage.getItem('civicconnect_lang');
    if (saved && saved !== i18n.language) {
      i18n.changeLanguage(saved);
    }
    
    // Set theme based on role
    const role = localStorage.getItem('cc_user_role') || 'citizen';
    document.documentElement.setAttribute('data-theme', role);
    
    setReady(true);
  }, []);

  // Render immediately to avoid flash — translations update reactively via hooks
  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
}
