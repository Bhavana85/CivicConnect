'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useTranslation } from 'react-i18next';
import { getAlerts } from '@/lib/api';
import { Bell, Loader, CheckCircle, Clock, Construction, CloudRain, PartyPopper, AlertTriangle, Megaphone } from 'lucide-react';

// Fallback mock data
const MOCK_ALERTS = [
  {
    id: '1', alert_type: 'road_closure',
    title_en: 'Road Closure: MG Road', title_kn: 'ರಸ್ತೆ ಮುಚ್ಚಿದೆ: ಎಂ.ಜಿ. ರಸ್ತೆ',
    body_en: 'MG Road between Trinity Circle and Halasuru Gate is closed for metro rail work from April 18–25, 2026. Use Residency Road as alternate route.',
    body_kn: 'ಏಪ್ರಿಲ್ 18–25, 2026 ರ ತನಕ ಮೆಟ್ರೋ ಕೆಲಸಕ್ಕಾಗಿ ಟ್ರಿನಿಟಿ ಸರ್ಕಲ್ ಮತ್ತು ಹಲಸೂರು ಗೇಟ್ ನಡುವಿನ ಎಂ.ಜಿ. ರಸ್ತೆ ಮುಚ್ಚಲಾಗಿದೆ.',
    severity: 'warning', expires_at: 'April 25, 2026', ward_numbers: [42, 43, 44], icon: <Construction size={24} />,
  },
  {
    id: '2', alert_type: 'weather',
    title_en: 'Heavy Rain Advisory', title_kn: 'ಭಾರಿ ಮಳೆ ಎಚ್ಚರಿಕೆ',
    body_en: 'IMD has issued a Yellow Alert for heavy rainfall in Bengaluru. Citizens are advised to avoid low-lying areas and subways.',
    body_kn: 'ಬೆಂಗಳೂರಿನಲ್ಲಿ ಭಾರಿ ಮಳೆಗಾಗಿ IMD ಹಳದಿ ಎಚ್ಚರಿಕೆ ನೀಡಿದೆ. ನಾಗರಿಕರು ತಗ್ಗು ಪ್ರದೇಶಗಳನ್ನು ತಪ್ಪಿಸಬೇಕು.',
    severity: 'warning', expires_at: 'April 19, 2026', ward_numbers: null, icon: <CloudRain size={24} />,
  },
  {
    id: '3', alert_type: 'event',
    title_en: 'Rajyotsava Parade — Road Restrictions', title_kn: 'ರಾಜ್ಯೋತ್ಸವ ಮೆರವಣಿಗೆ — ರಸ್ತೆ ನಿರ್ಬಂಧ',
    body_en: 'Several roads around Vidhana Soudha will have restricted access on November 1 from 8 AM to 2 PM for the Karnataka Rajyotsava Day parade.',
    body_kn: 'ಕರ್ನಾಟಕ ರಾಜ್ಯೋತ್ಸವ ಮೆರವಣಿಗೆಗಾಗಿ ನವೆಂಬರ್ 1 ರಂದು ಬೆಳಿಗ್ಗೆ 8 ರಿಂದ ಮಧ್ಯಾಹ್ನ 2 ರ ತನಕ ವಿಧಾನ ಸೌಧ ಸುತ್ತ ರಸ್ತೆ ನಿರ್ಬಂಧ.',
    severity: 'info', expires_at: 'November 1, 2026', ward_numbers: [1, 2, 3], icon: <PartyPopper size={24} />,
  },
];

const ALERT_ICONS: Record<string, React.ReactNode> = {
  road_closure: <Construction size={24} />, weather: <CloudRain size={24} />, event: <PartyPopper size={24} />, emergency: <AlertTriangle size={24} />,
};

const SEVERITY_STYLES: Record<string, { border: string; bg: string; badge: string; badgeText: string }> = {
  info:     { border: '#3b82f6', bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)', badge: '#dbeafe', badgeText: '#1e40af' },
  warning:  { border: '#f59e0b', bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)', badge: '#fef3c7', badgeText: '#92400e' },
  critical: { border: '#ef4444', bg: 'linear-gradient(135deg, #fff1f2, #fee2e2)', badge: '#fee2e2', badgeText: '#991b1b' },
};

export default function AlertsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'kn' ? 'kn' : 'en';
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await getAlerts();
        const data = res.data.alerts;
        if (data && data.length > 0) {
          setAlerts(data.map((a: any) => ({
            ...a,
            icon: ALERT_ICONS[a.alert_type] || <Megaphone size={24} />,
          })));
        } else {
          setAlerts(MOCK_ALERTS);
        }
      } catch {
        setAlerts(MOCK_ALERTS);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  return (
    <>
      <Navbar />
      <div className="page-container" style={{ paddingTop: 24, paddingBottom: 48 }}>
        <div className="page-header animate-fade-in-up">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={28} /> {t('alerts.title')}
          </h1>
          <p className="page-subtitle">{t('alerts.subtitle')}</p>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Loader size={16} className="animate-spin" /> {t('common.loading')}
          </div>
        ) : alerts.length === 0 ? (
          <div className="civic-card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="animate-float-slow" style={{ fontSize: '2.5rem', marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
              <CheckCircle size={48} color="#10b981" />
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 500 }}>{t('alerts.noAlerts')}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {alerts.map((alert, i) => {
              const s = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;
              const expiresStr = alert.expires_at
                ? (typeof alert.expires_at === 'string' && alert.expires_at.includes('T')
                    ? new Date(alert.expires_at).toLocaleDateString()
                    : alert.expires_at)
                : null;
              return (
                <div
                  key={alert.id}
                  className="animate-fade-in-up"
                  style={{
                    background: s.bg,
                    border: `1.5px solid ${s.border}`,
                    borderLeft: `5px solid ${s.border}`,
                    borderRadius: 12,
                    padding: '20px 24px',
                    animationDelay: `${i * 100}ms`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ color: s.border, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{alert.icon}</span>
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                          {lang === 'kn' ? (alert.title_kn || alert.title_en) : alert.title_en}
                        </h3>
                        <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                          <span className="badge" style={{ background: s.badge, color: s.badgeText }}>
                            {t(`alerts.severity.${alert.severity}`)}
                          </span>
                          <span className="badge badge-pending">
                            {t(`alerts.type.${alert.alert_type}`)}
                          </span>
                          {alert.ward_numbers && (
                            <span className="badge" style={{ background: '#f1f5f9', color: '#475569' }}>
                              Wards: {Array.isArray(alert.ward_numbers) ? alert.ward_numbers.join(', ') : alert.ward_numbers}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {expiresStr && (
                      <div style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> {t('alerts.expires')}: {expiresStr}
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, marginLeft: 52 }}>
                    {lang === 'kn' ? (alert.body_kn || alert.body_en) : alert.body_en}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
