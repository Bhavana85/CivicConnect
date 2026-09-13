'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useTranslation } from 'react-i18next';
import { createReport, getReports, updateReportStatus } from '@/lib/api';
import toast from 'react-hot-toast';
import { MapPin, Search, Crosshair, ClipboardList, Send, Loader, CheckCircle, Clock, ThumbsUp, User, AlertCircle, Lightbulb, Droplets, HardHat, Trash2, Shield } from 'lucide-react';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer  = dynamic(() => import('react-leaflet').then((m) => m.MapContainer),  { ssr: false });
const TileLayer     = dynamic(() => import('react-leaflet').then((m) => m.TileLayer),     { ssr: false });
const Marker        = dynamic(() => import('react-leaflet').then((m) => m.Marker),        { ssr: false });
const Popup         = dynamic(() => import('react-leaflet').then((m) => m.Popup),         { ssr: false });
// @ts-ignore — useMapEvents is a hook, not a component; dynamic() typing mismatch is expected
const useMapEvents  = dynamic(() => import('react-leaflet').then((m) => ({ default: m.useMapEvents })), { ssr: false }) as any;

// Bengaluru center
const BENGALURU_CENTER: [number, number] = [12.9716, 77.5946];
const DEFAULT_ZOOM = 13;

const CATEGORIES = ['pothole', 'streetlight', 'water', 'sewage', 'garbage', 'other'] as const;

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  pothole: <AlertCircle size={14} />, streetlight: <Lightbulb size={14} />, water: <Droplets size={14} />, sewage: <HardHat size={14} />, garbage: <Trash2 size={14} />, other: <MapPin size={14} />,
};

const STATUS_STYLES: Record<string, { bg: string; color: string; label?: string }> = {
  pending:      { bg: '#eff6ff', color: '#1d4ed8', label: 'Submitted' },
  in_progress:  { bg: '#dbeafe', color: '#1e40af', label: 'In Progress' },
  resolved:     { bg: '#d1fae5', color: '#065f46', label: 'Resolved' },
  rejected:     { bg: '#fee2e2', color: '#991b1b', label: 'Rejected' },
  SUBMITTED:    { bg: '#eff6ff', color: '#1d4ed8', label: 'Submitted' },
  UNDER_REVIEW: { bg: '#fffbeb', color: '#b45309', label: 'Under Review' },
  VERIFIED:     { bg: '#ecfeff', color: '#0e7490', label: 'Verified' },
  ASSIGNED:     { bg: '#faf5ff', color: '#7e22ce', label: 'Assigned' },
  IN_PROGRESS:  { bg: '#dbeafe', color: '#1e40af', label: 'In Progress' },
  RESOLVED:     { bg: '#ecfdf5', color: '#047857', label: 'Resolved' },
  REJECTED:     { bg: '#fef2f2', color: '#b91c1c', label: 'Rejected' },
};

interface LatLng { lat: number; lng: number; }

interface StoreReport {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  lat: number;
  lng: number;
  address_text: string;
  address?: string;
  ward_number: number | null;
  upvotes: number;
  photo_url: string | null;
  after_photo_url?: string | null;
  is_verified?: boolean;
  reporter_name: string;
  created_at: string;
  updated_at: string;
}

export default function ReportIssue() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [pinLocation, setPinLocation] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationMsg, setLocationMsg] = useState('');
  const [category, setCategory] = useState('pothole');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [addressText, setAddressText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [MapLib, setMapLib] = useState<any>(null);
  const [reports, setReports] = useState<StoreReport[]>([]);
  const [userRole, setUserRole] = useState('');
  const [resolvingIssueId, setResolvingIssueId] = useState<number | null>(null);
  const [afterPhotoBase64, setAfterPhotoBase64] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      const res = await getReports();
      setReports(res.data.reports || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    setUserRole(localStorage.getItem('cc_user_role') || '');
    fetchReports();
    // Load leaflet map components only client-side
    Promise.all([
      import('react-leaflet'),
      import('leaflet'),
    ]).then(([rl, L]) => {
      // Fix default marker icon
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
      setMapLib({ rl, L });
    });
  }, [fetchReports]);

  const handleSetLocation = async (lat: number, lng: number) => {
    setPinLocation({ lat, lng });
    setLocating(true);
    setLocationMsg('Fetching address...');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&email=contact@civicconnect.in`);
      const data = await res.json();
      if (data && data.display_name) {
        setAddressText(data.display_name);
        setLocationMsg(t('report.locationSet'));
      } else {
        setAddressText(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        setLocationMsg(t('report.locationSet'));
      }
    } catch (err) {
      setAddressText(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      setLocationMsg(t('report.locationSet'));
    } finally {
      setLocating(false);
    }
  };

  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setLocationMsg('Searching...');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&email=contact@civicconnect.in`);
      const data = await res.json();
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        setPinLocation({ lat, lng });
        setAddressText(result.display_name);
        setLocationMsg(t('report.locationSet'));
      } else {
        toast.error('Location not found.');
        setLocationMsg('');
      }
    } catch (err) {
      toast.error('Search failed.');
      setLocationMsg('');
    } finally {
      setIsSearching(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationMsg(t('report.locationError'));
      return;
    }
    setLocating(true);
    setLocationMsg('Getting location...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleSetLocation(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLocationMsg(t('report.locationError'));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinLocation) { setLocationMsg(t('report.selectLocation')); return; }
    setSubmitting(true);
    try {
      await createReport({
        category,
        title,
        description,
        lat: pinLocation.lat,
        lng: pinLocation.lng,
        address_text: addressText || `${pinLocation.lat.toFixed(4)}, ${pinLocation.lng.toFixed(4)}`,
        photo_url: photoBase64 || undefined,
      });
      toast.success(t('report.success'));
      setSuccessMsg(t('report.success'));
      setTitle('');
      setDescription('');
      setPhotoBase64(null);
      setPinLocation(null);
      setAddressText('');
      setLocationMsg('');
      const fileInput = document.getElementById('report-photo') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      await fetchReports(); // Refresh the reports list
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      const msg = err.response?.data?.error || t('common.error');
      toast.error(msg);
      if (err.response?.status === 401) {
        toast.error('Please login first.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be less than 5MB');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    const sUpper = newStatus.toUpperCase();
    if (sUpper === 'RESOLVED') {
      setResolvingIssueId(id);
      return;
    }
    try {
      await updateReportStatus(id, sUpper, 'Status updated by ward officer');
      toast.success(t('report.statusUpdated', 'Status updated successfully!'));
      fetchReports();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleAfterPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be less than 5MB');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setAfterPhotoBase64(reader.result as string);
    reader.readAsDataURL(file);
  };

  const confirmResolution = async (id: number) => {
    try {
      await updateReportStatus(
        id,
        'RESOLVED',
        'Issue resolved on-site with proof photo recorded by ward officer',
        undefined,
        afterPhotoBase64 || undefined
      );
      toast.success('Issue marked as resolved!');
      setResolvingIssueId(null);
      setAfterPhotoBase64(null);
      fetchReports();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to resolve issue');
    }
  };

  const cancelResolution = () => {
    setResolvingIssueId(null);
    setAfterPhotoBase64(null);
  };

  if (!mounted) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Loader size={16} className="animate-spin" /> {t('common.loading')}
      </div>
    </div>
  );

  const MapSection = MapLib ? (() => {
    const { MapContainer, TileLayer, Marker, Popup, useMapEvents } = MapLib.rl;

    function ClickableMap() {
      const map = useMapEvents({
        click(e: any) { handleSetLocation(e.latlng.lat, e.latlng.lng); },
      });
      
      useEffect(() => {
        if (pinLocation) {
          map.flyTo([pinLocation.lat, pinLocation.lng], map.getZoom() > 14 ? map.getZoom() : 15);
        }
      }, [pinLocation, map]);

      return null;
    }

    return (
      <MapContainer
        center={pinLocation ? [pinLocation.lat, pinLocation.lng] : BENGALURU_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickableMap />
        {/* Existing reports */}
        {reports.filter((r: StoreReport) => r.lat && r.lng).map((r: StoreReport) => (
          <Marker key={r.id} position={[r.lat, r.lng]}>
            <Popup>
              <div style={{ minWidth: 160 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  {CATEGORY_ICONS[r.category]} {r.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 6 }}>{r.address_text || r.address || ''}</div>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    background: STATUS_STYLES[r.status]?.bg,
                    color: STATUS_STYLES[r.status]?.color,
                  }}
                >
                  {t(`report.status.${r.status}`)}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}
        {/* User's pin */}
        {pinLocation && (
          <Marker position={[pinLocation.lat, pinLocation.lng]}>
            <Popup>📍 {t('report.locationSet')}</Popup>
          </Marker>
        )}
      </MapContainer>
    );
  }) : null;

  return (
    <div className="page-container" style={{ paddingTop: 24, paddingBottom: 48 }}>
      {/* Header */}
      <div className="page-header animate-fade-in-up">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MapPin size={28} /> {t('report.title')}
        </h1>
        <p className="page-subtitle">{t('report.subtitle')}</p>
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div
          style={{
            background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
            border: '1px solid #6ee7b7',
            borderRadius: 12,
            padding: '14px 20px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#065f46',
            fontWeight: 600,
            animation: 'fadeInUp 0.4s ease',
          }}
        >
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 24 }}>
        {/* Map Panel */}
        <div
          className="civic-card"
          style={{ padding: 0, overflow: 'hidden', height: 560 }}
        >
          {/* Map header bar */}
          <div
            style={{
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #0f2d5c, #1a4fa0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <form onSubmit={handleSearchLocation} style={{ display: 'flex', gap: 6, flex: 1, marginRight: 16 }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search area or address..."
                style={{
                  flex: 1, padding: '6px 12px', borderRadius: 20, border: 'none',
                  fontSize: '0.85rem', outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={isSearching}
                style={{
                  background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none',
                  borderRadius: 20, padding: '6px 12px', cursor: 'pointer', fontSize: '0.85rem'
                }}
              >
                {isSearching ? <Loader size={14} className="animate-spin" /> : <Search size={14} />}
              </button>
            </form>
            <button
              id="use-my-location-btn"
              onClick={useMyLocation}
              disabled={locating}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 20,
                border: 'none',
                background: locating ? '#94a3b8' : '#f59e0b',
                color: locating ? 'white' : '#1a1a1a',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: locating ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Crosshair size={14} /> {locating ? t('report.locating') : t('report.useLocation')}
            </button>
          </div>

          {/* Map */}
          <div style={{ height: 'calc(100% - 52px)' }}>
            {MapLib ? (
              (() => {
                const { MapContainer, TileLayer, Marker, Popup, useMapEvents } = MapLib.rl;

                function ClickableMap() {
                  useMapEvents({
                    click(e: any) {
                      setPinLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
                      setLocationMsg(t('report.locationSet'));
                    },
                  });
                  return null;
                }

                return (
                  <MapContainer
                    center={pinLocation ? [pinLocation.lat, pinLocation.lng] : BENGALURU_CENTER}
                    zoom={DEFAULT_ZOOM}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <ClickableMap />
                    {reports.map((r) => (
                      <Marker key={r.id} position={[r.lat, r.lng]}>
                        <Popup>
                          <div style={{ minWidth: 170 }}>
                            <div style={{ fontWeight: 700, marginBottom: 4 }}>
                              {CATEGORY_ICONS[r.category] || <MapPin size={14} />} {r.title}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 6 }}>
                              {r.address_text || 'Location reported'}
                            </div>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 12,
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                background: STATUS_STYLES[r.status]?.bg,
                                color: STATUS_STYLES[r.status]?.color,
                              }}
                            >
                              {t(`report.status.${r.status}`)}
                            </span>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                    {pinLocation && (
                      <Marker position={[pinLocation.lat, pinLocation.lng]}>
                        <Popup><MapPin size={14} /> Your report location</Popup>
                      </Marker>
                    )}
                  </MapContainer>
                );
              })()
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                Loading map...
              </div>
            )}
          </div>

          {/* Location hint */}
          {locationMsg && (
            <div
              style={{
                position: 'absolute',
                bottom: 12,
                left: '50%',
                transform: 'translateX(-50%)',
                background: pinLocation ? '#065f46' : '#92400e',
                color: 'white',
                padding: '6px 16px',
                borderRadius: 20,
                fontSize: '0.8rem',
                fontWeight: 600,
                boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
                zIndex: 1000,
                whiteSpace: 'nowrap',
              }}
            >
              {locationMsg}
            </div>
          )}
        </div>

        {/* Form Panel */}
        <form
          onSubmit={handleSubmit}
          className="civic-card animate-fade-in-up delay-100"
          style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20, alignSelf: 'start' }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={20} /> Issue Details
          </h2>

          {/* Category */}
          <div className="form-group">
            <label className="form-label">{t('report.category')}</label>
            <select
              id="report-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="form-input form-select"
              required
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t(`report.categories.${cat}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="form-group">
            <label className="form-label">{t('report.issueTitle')}</label>
            <input
              id="report-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('report.titlePlaceholder')}
              className="form-input"
              required
              maxLength={255}
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">{t('report.description')}</label>
            <textarea
              id="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('report.descriptionPlaceholder')}
              className="form-input"
              rows={4}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Photo */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={16} /> Before Photo (Required)
            </label>
            <div
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e: any) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setPhotoBase64(ev.target?.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                };
                input.click();
              }}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = '#eff6ff'; }}
              onDragLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.background = '#f8fafc';
                const file = e.dataTransfer.files[0];
                if (file && file.type.startsWith('image/')) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    setPhotoBase64(ev.target?.result as string);
                  };
                  reader.readAsDataURL(file);
                }
              }}
              style={{
                border: '2px dashed #cbd5e1', borderRadius: 12,
                padding: photoBase64 ? '8px' : '32px 20px',
                textAlign: 'center', cursor: 'pointer',
                background: '#f8fafc', transition: 'all 0.2s',
                marginBottom: 16,
              }}
            >
              {photoBase64 ? (
                <div style={{ position: 'relative' }}>
                  <img
                    src={photoBase64}
                    alt="Before preview"
                    style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8 }}
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setPhotoBase64(null); }}
                    style={{
                      position: 'absolute', top: 8, right: 8,
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.6)', color: 'white',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1rem', fontWeight: 700,
                    }}
                  >×</button>
                  <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                    ✓ Photo ready — click to change
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '2rem', marginBottom: 8, color: '#94a3b8' }}>
                    <AlertCircle size={36} />
                  </div>
                  <div style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem', marginBottom: 4 }}>
                    Click to upload or drag & drop the 'Before' photo
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                    JPG, PNG, WEBP up to 10MB
                  </div>
                </>
              )}
            </div>

            {/* OR divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>OR PASTE URL</span>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            </div>

            {/* URL fallback */}
            <input
              type="url"
              placeholder="https://example.com/before-photo.jpg"
              value={(photoBase64 && photoBase64.startsWith('data:')) ? '' : (photoBase64 || '')}
              onChange={(e) => setPhotoBase64(e.target.value)}
              className="form-input"
              style={{ background: '#f8fafc' }}
            />
          </div>

          {/* Location indicator */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: pinLocation ? '#d1fae5' : '#f8fafc',
              border: `1.5px solid ${pinLocation ? '#6ee7b7' : '#e2e8f0'}`,
              fontSize: '0.85rem',
              color: pinLocation ? '#065f46' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {pinLocation ? (
              <><CheckCircle size={14} /> {t('report.locationSet')} <span style={{ opacity: 0.7, fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>({addressText || `${pinLocation.lat.toFixed(4)}, ${pinLocation.lng.toFixed(4)}`})</span></>
            ) : (
              <><MapPin size={14} /> {t('report.mapInstruction')}</>
            )}
          </div>

          {/* Automated Prioritization Notice */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              fontSize: '0.78rem',
              color: '#1d4ed8',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              lineHeight: 1.4,
            }}
          >
            <Shield size={16} color="#2563eb" style={{ flexShrink: 0 }} />
            <span>
              <strong>Smart Urgency Triage:</strong> Issues are automatically prioritized based on public safety hazards (e.g. gas leaks and major pipeline bursts are escalated to High/Critical). Routine repairs default to Medium/Low.
            </span>
          </div>

          {/* Submit */}
          <button
            id="submit-report-btn"
            type="submit"
            disabled={submitting}
            className="btn-primary"
            style={{ justifyContent: 'center', padding: '12px', fontSize: '0.95rem', opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? <><Loader size={16} className="animate-spin" /> {t('report.submitting')}</> : <><Send size={16} /> {t('report.submit')}</>}
          </button>
        </form>
      </div>

      {/* Recent Reports List */}
      <div style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={22} /> {t('report.recentReports')}
        </h2>
        {reports.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '40px 20px',
            background: '#f8fafc', borderRadius: 16, border: '1.5px dashed #e2e8f0',
            color: 'var(--text-muted)', fontSize: '0.9rem',
          }}>
            No issues reported yet. Be the first to report an issue! 📍
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {reports.map((r, i) => (
              <div
                key={r.id}
                className="civic-card animate-fade-in-up"
                style={{ padding: 0, overflow: 'hidden', animationDelay: `${i * 80}ms` }}
              >
                {/* Card header with category + status */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 20px', borderBottom: '1px solid #f1f5f9',
                  background: 'linear-gradient(135deg, #f8fafc, #ffffff)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      fontSize: '1.4rem', width: 40, height: 40, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', borderRadius: 12, background: '#f1f5f9',
                    }}>
                      {CATEGORY_ICONS[r.category] || <MapPin size={20} />}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {r.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, textTransform: 'capitalize' }}>
                        {r.category.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                  
                  {userRole === 'government' ? (
                    resolvingIssueId === r.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Upload proof of resolution:</div>
                        <input type="file" accept="image/*" onChange={handleAfterPhotoUpload} style={{ fontSize: '0.8rem' }} />
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                          <button onClick={() => confirmResolution(r.id)} className="btn-primary" style={{ padding: '4px 12px', fontSize: '0.75rem', borderRadius: 4 }}>
                            Confirm
                          </button>
                          <button onClick={cancelResolution} className="btn-secondary" style={{ padding: '4px 12px', fontSize: '0.75rem', borderRadius: 4 }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <select
                        value={r.status.toUpperCase() === 'PENDING' ? 'SUBMITTED' : r.status.toUpperCase()}
                        onChange={(e) => handleStatusChange(r.id, e.target.value)}
                        style={{
                          padding: '4px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700,
                          background: STATUS_STYLES[r.status]?.bg || '#f1f5f9',
                          color: STATUS_STYLES[r.status]?.color || '#64748b',
                          border: '1px solid #cbd5e1', cursor: 'pointer', outline: 'none'
                        }}
                      >
                        <option value="SUBMITTED">Submitted</option>
                        <option value="UNDER_REVIEW">Under Review</option>
                        <option value="VERIFIED">Verified</option>
                        <option value="ASSIGNED">Assigned</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                    )
                  ) : !r.is_verified && r.status.toUpperCase() !== 'REJECTED' ? (
                    <span style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
                      background: '#fffbeb', color: '#b45309',
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      Under Review
                    </span>
                  ) : (
                    <span style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
                      background: STATUS_STYLES[r.status]?.bg || '#f1f5f9',
                      color: STATUS_STYLES[r.status]?.color || '#64748b',
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      {STATUS_STYLES[r.status]?.label || t(`report.status.${r.status}`, r.status)}
                    </span>
                  )}
                </div>

                {/* Card body with details */}
                <div style={{ padding: '16px 20px' }}>
                  {r.description && (
                    <p style={{
                      fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6,
                      marginBottom: 14, maxHeight: 60, overflow: 'hidden',
                    }}>
                      {r.description}
                    </p>
                  )}

                  {/* Photo display */}
                  {r.photo_url && (
                    <div style={{
                      marginBottom: 14, borderRadius: 10, overflow: 'hidden',
                      border: '1px solid #e2e8f0', display: 'flex', gap: 8
                    }}>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <img src={r.photo_url} alt="Before" style={{ width: '100%', height: 160, objectFit: 'cover' }} />
                        {r.after_photo_url && <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem' }}>Before</div>}
                      </div>
                      {r.after_photo_url && (
                        <div style={{ flex: 1, position: 'relative' }}>
                          <img src={r.after_photo_url} alt="After" style={{ width: '100%', height: 160, objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(16,185,129,0.85)', color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem' }}>After</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Meta info row */}
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: 16,
                    fontSize: '0.78rem', color: 'var(--text-muted)',
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={12} /> {r.address_text || `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`}
                    </span>
                    {r.reporter_name && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <User size={12} /> {r.reporter_name}
                      </span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} /> {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    {r.upvotes > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ThumbsUp size={12} /> {r.upvotes} upvotes
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .report-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
