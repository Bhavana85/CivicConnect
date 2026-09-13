'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import { getReports, Report, ReportStatus, ReportStatusHistory, normalizeStatus } from '@/lib/api';
import {
  ClipboardList,
  Clock,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  MapPin,
  Calendar,
  ThumbsUp,
  Image as ImageIcon,
  ArrowRight,
  ChevronDown,
  UserCheck,
  Search,
  Send,
  Shield,
  FileText,
  Building,
  Check,
  X,
  Copy,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

type StatusFilter = 'all' | ReportStatus;
type PriorityFilter = 'all' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

const PRIORITY_BADGE_CONFIG: Record<
  string,
  { bg: string; color: string; border: string; label: string; icon: React.ReactNode }
> = {
  CRITICAL: { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', label: 'Critical', icon: <AlertTriangle size={12} /> },
  HIGH:     { bg: '#ffedd5', color: '#c2410c', border: '#fed7aa', label: 'High',     icon: <AlertTriangle size={12} /> },
  MEDIUM:   { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'Medium',   icon: <Clock size={12} /> },
  LOW:      { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', label: 'Low',      icon: <CheckCircle size={12} /> },
};

const PRIORITY_ORDER: Record<string, number> = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
};

interface StatusConfigItem {
  bg: string;
  color: string;
  borderColor: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}

const STATUS_CONFIG: Record<string, StatusConfigItem> = {
  SUBMITTED: {
    bg: '#eff6ff',
    color: '#1d4ed8',
    borderColor: '#bfdbfe',
    icon: <Send size={14} />,
    label: 'Submitted',
    description: 'Your complaint has been successfully registered and logged in the municipal system.',
  },
  UNDER_REVIEW: {
    bg: '#fffbeb',
    color: '#b45309',
    borderColor: '#fde68a',
    icon: <Search size={14} />,
    label: 'Under Review',
    description: 'Ward officials are reviewing the report details, verifying location and assessing severity.',
  },
  VERIFIED: {
    bg: '#ecfeff',
    color: '#0e7490',
    borderColor: '#a5f3fc',
    icon: <CheckCircle2 size={14} />,
    label: 'Verified',
    description: 'The issue has been validated by municipal authorities as a genuine civic problem.',
  },
  ASSIGNED: {
    bg: '#faf5ff',
    color: '#7e22ce',
    borderColor: '#e9d5ff',
    icon: <UserCheck size={14} />,
    label: 'Assigned',
    description: 'Work order has been generated and dispatched to the designated department team.',
  },
  IN_PROGRESS: {
    bg: '#dbeafe',
    color: '#1e40af',
    borderColor: '#93c5fd',
    icon: <Loader2 size={14} className="animate-spin" />,
    label: 'In Progress',
    description: 'Remediation crew is actively on-site conducting repair and maintenance work.',
  },
  RESOLVED: {
    bg: '#ecfdf5',
    color: '#047857',
    borderColor: '#a7f3d0',
    icon: <CheckCircle size={14} />,
    label: 'Resolved',
    description: 'Issue has been fully resolved. Photographic and field inspection proof recorded.',
  },
  REJECTED: {
    bg: '#fef2f2',
    color: '#b91c1c',
    borderColor: '#fecaca',
    icon: <XCircle size={14} />,
    label: 'Rejected',
    description: 'Complaint could not be processed (deemed duplicate, invalid, or out-of-jurisdiction).',
  },
};

// Fallback for legacy or unknown statuses
const DEFAULT_STATUS_CONFIG: StatusConfigItem = STATUS_CONFIG.SUBMITTED;

const STANDARD_WORKFLOW_STEPS: { status: ReportStatus; label: string; icon: React.ReactNode }[] = [
  { status: 'SUBMITTED',    label: 'Submitted',    icon: <Send size={14} /> },
  { status: 'UNDER_REVIEW', label: 'Under Review', icon: <Search size={14} /> },
  { status: 'VERIFIED',     label: 'Verified',     icon: <CheckCircle2 size={14} /> },
  { status: 'ASSIGNED',     label: 'Assigned',     icon: <UserCheck size={14} /> },
  { status: 'IN_PROGRESS',  label: 'In Progress',  icon: <Loader2 size={14} /> },
  { status: 'RESOLVED',     label: 'Resolved',     icon: <CheckCircle size={14} /> },
];

const REJECTED_WORKFLOW_STEPS: { status: ReportStatus; label: string; icon: React.ReactNode }[] = [
  { status: 'SUBMITTED',    label: 'Submitted',    icon: <Send size={14} /> },
  { status: 'UNDER_REVIEW', label: 'Under Review', icon: <Search size={14} /> },
  { status: 'REJECTED',     label: 'Rejected',     icon: <XCircle size={14} /> },
];

const CATEGORY_IMAGES: Record<string, string> = {
  pothole: 'https://images.unsplash.com/photo-1594818898109-44704f1098e3?auto=format&fit=crop&w=800&q=80',
  streetlight: 'https://images.unsplash.com/photo-1617953141700-ace986f13467?auto=format&fit=crop&w=800&q=80',
  water: 'https://images.unsplash.com/photo-1583245177184-4ab53e73e26c?auto=format&fit=crop&w=800&q=80',
  sewage: 'https://images.unsplash.com/photo-1621451537084-482c73073a0f?auto=format&fit=crop&w=800&q=80',
  garbage: 'https://images.unsplash.com/photo-1604187351574-c75ca79f5807?auto=format&fit=crop&w=800&q=80',
  other: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80',
};

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Report[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [sortBy, setSortBy] = useState<'date' | 'priority'>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [expandedId, setExpandedId] = useState<number | string | null>(null);

  const fetchComplaints = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const res = await getReports();
      const allReports: Report[] = res.data.reports || [];
      const userName = localStorage.getItem('cc_user_name') || '';
      
      // Filter to only the current user's reports (or demo user #2)
      const myReports = allReports.filter((r: any) =>
        r.reporter_name === userName || r.user_id === 2
      );

      setComplaints(
        myReports.sort(
          (a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
    } catch {
      setComplaints([]);
    }
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchComplaints();

    // Auto-refresh every 12 seconds so status updates are reflected continuously
    const interval = setInterval(() => {
      fetchComplaints(true);
    }, 12000);
    return () => clearInterval(interval);
  }, [fetchComplaints]);

  const copyComplaintId = (e: React.MouseEvent, idFormatted: string) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(idFormatted);
      toast.success(`Copied ${idFormatted} to clipboard!`, { id: 'copy-id' });
    }
  };

  const filtered = complaints
    .filter(c => {
      const matchesFilter = filter === 'all' || normalizeStatus(c.status) === filter;
      if (!matchesFilter) return false;
      const pUpper = (c.priority || 'MEDIUM').toUpperCase();
      const matchesPriority = priorityFilter === 'all' || pUpper === priorityFilter;
      if (!matchesPriority) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const formattedId = `cc-${String(c.id).toLowerCase()}`;
      return (
        c.title?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q) ||
        c.address_text?.toLowerCase().includes(q) ||
        formattedId.includes(q) ||
        String(c.id).toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'priority') {
        const orderA = PRIORITY_ORDER[(a.priority || 'MEDIUM').toUpperCase()] || 3;
        const orderB = PRIORITY_ORDER[(b.priority || 'MEDIUM').toUpperCase()] || 3;
        if (orderA !== orderB) return orderA - orderB;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const priorityCounts: Record<string, number> = {
    all: complaints.length,
    CRITICAL: complaints.filter(c => (c.priority || 'MEDIUM').toUpperCase() === 'CRITICAL').length,
    HIGH: complaints.filter(c => (c.priority || 'MEDIUM').toUpperCase() === 'HIGH').length,
    MEDIUM: complaints.filter(c => (c.priority || 'MEDIUM').toUpperCase() === 'MEDIUM').length,
    LOW: complaints.filter(c => (c.priority || 'MEDIUM').toUpperCase() === 'LOW').length,
  };

  const counts: Record<string, number> = {
    all: complaints.length,
    SUBMITTED: complaints.filter(c => normalizeStatus(c.status) === 'SUBMITTED').length,
    UNDER_REVIEW: complaints.filter(c => normalizeStatus(c.status) === 'UNDER_REVIEW').length,
    VERIFIED: complaints.filter(c => normalizeStatus(c.status) === 'VERIFIED').length,
    ASSIGNED: complaints.filter(c => normalizeStatus(c.status) === 'ASSIGNED').length,
    IN_PROGRESS: complaints.filter(c => normalizeStatus(c.status) === 'IN_PROGRESS').length,
    RESOLVED: complaints.filter(c => normalizeStatus(c.status) === 'RESOLVED').length,
    REJECTED: complaints.filter(c => normalizeStatus(c.status) === 'REJECTED').length,
  };

  const activeCount =
    counts.SUBMITTED + counts.UNDER_REVIEW + counts.VERIFIED + counts.ASSIGNED + counts.IN_PROGRESS;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
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

  const filterTabs: { key: StatusFilter; label: string; color: string; icon: React.ReactNode }[] = [
    { key: 'all',          label: 'All Complaints', color: '#475569', icon: <ClipboardList size={14} /> },
    { key: 'SUBMITTED',    label: 'Submitted',      color: '#1d4ed8', icon: <Send size={14} /> },
    { key: 'UNDER_REVIEW', label: 'Under Review',   color: '#b45309', icon: <Search size={14} /> },
    { key: 'VERIFIED',     label: 'Verified',       color: '#0e7490', icon: <CheckCircle2 size={14} /> },
    { key: 'ASSIGNED',     label: 'Assigned',       color: '#7e22ce', icon: <UserCheck size={14} /> },
    { key: 'IN_PROGRESS',  label: 'In Progress',    color: '#1e40af', icon: <Loader2 size={14} /> },
    { key: 'RESOLVED',     label: 'Resolved',       color: '#047857', icon: <CheckCircle size={14} /> },
    { key: 'REJECTED',     label: 'Rejected',       color: '#b91c1c', icon: <XCircle size={14} /> },
  ];

  if (!mounted) return null;

  return (
    <>
      <Navbar />
      <div className="page-container" style={{ paddingTop: 24, paddingBottom: 64 }}>
        {/* Header */}
        <div className="animate-fade-in-up" style={{ paddingBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1
                style={{
                  fontSize: '1.85rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 6,
                }}
              >
                <ClipboardList size={28} color="#2563eb" /> My Complaints
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>
                Track the end-to-end status workflow and resolution timeline of your civic reports.
              </p>
            </div>

            <a
              href="/report"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: 'white',
                padding: '10px 18px',
                borderRadius: 10,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
                boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
              }}
            >
              <MapPin size={16} /> File New Complaint
            </a>
          </div>
        </div>

        {/* Stats Summary Cards */}
        <div
          className="animate-fade-in-up"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginBottom: 28,
          }}
        >
          {[
            { label: 'Total Filed', value: counts.all, color: '#2563eb', bg: '#eff6ff' },
            { label: 'In Progress / Active', value: activeCount, color: '#f59e0b', bg: '#fffbeb' },
            { label: 'Resolved', value: counts.RESOLVED, color: '#10b981', bg: '#ecfdf5' },
            { label: 'Rejected', value: counts.REJECTED, color: '#ef4444', bg: '#fef2f2' },
          ].map(s => (
            <div
              key={s.label}
              style={{
                background: s.bg,
                borderRadius: 14,
                padding: '18px 16px',
                textAlign: 'center',
                border: `1px solid ${s.color}25`,
              }}
            >
              <div style={{ fontSize: '1.7rem', fontWeight: 900, color: s.color }}>{s.value}</div>
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: s.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginTop: 2,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Search & Actions Bar */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            marginBottom: 16,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 260,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={17}
              color="#94a3b8"
              style={{ position: 'absolute', left: 14, pointerEvents: 'none' }}
            />
            <input
              type="text"
              placeholder="Search complaints by Title, Category, Location, or ID (e.g. #CC-10)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 38px 10px 42px',
                borderRadius: 12,
                border: '1.5px solid #cbd5e1',
                fontSize: '0.88rem',
                outline: 'none',
                background: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                style={{
                  position: 'absolute',
                  right: 12,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: 2,
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            onClick={() => fetchComplaints(false)}
            disabled={isLoading || isRefreshing}
            title="Refresh complaint list and statuses"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              borderRadius: 12,
              border: '1.5px solid #e2e8f0',
              background: 'white',
              color: '#475569',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <RefreshCw
              size={15}
              className={isRefreshing || isLoading ? 'animate-spin' : ''}
              color="#2563eb"
            />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 24,
            overflowX: 'auto',
            paddingBottom: 6,
          }}
        >
          {filterTabs.map(f => {
            const isSelected = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 20,
                  border: isSelected ? `2px solid ${f.color}` : '1.5px solid #e2e8f0',
                  background: isSelected ? `${f.color}15` : 'white',
                  color: isSelected ? f.color : '#64748b',
                  fontWeight: isSelected ? 800 : 600,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                }}
              >
                {f.icon} {f.label}
                <span
                  style={{
                    background: isSelected ? f.color : '#e2e8f0',
                    color: isSelected ? 'white' : '#64748b',
                    padding: '1px 7px',
                    borderRadius: 10,
                    fontSize: '0.7rem',
                    fontWeight: 800,
                  }}
                >
                  {counts[f.key] || 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Priority Filter & Sorting Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 24,
            padding: '12px 16px',
            background: '#f8fafc',
            borderRadius: 14,
            border: '1px solid #e2e8f0',
          }}
        >
          {/* Priority filter pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginRight: 4 }}>
              Priority:
            </span>
            {[
              { key: 'all', label: 'All', color: '#475569', bg: '#f1f5f9' },
              { key: 'CRITICAL', label: 'Critical', color: '#991b1b', bg: '#fee2e2' },
              { key: 'HIGH', label: 'High', color: '#c2410c', bg: '#ffedd5' },
              { key: 'MEDIUM', label: 'Medium', color: '#1d4ed8', bg: '#eff6ff' },
              { key: 'LOW', label: 'Low', color: '#475569', bg: '#f1f5f9' },
            ].map(p => {
              const isSelected = priorityFilter === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => setPriorityFilter(p.key as PriorityFilter)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 16,
                    border: isSelected ? `2px solid ${p.color}` : '1px solid #cbd5e1',
                    background: isSelected ? p.bg : 'white',
                    color: isSelected ? p.color : '#64748b',
                    fontSize: '0.74rem',
                    fontWeight: isSelected ? 800 : 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {p.label}
                  <span
                    style={{
                      background: isSelected ? p.color : '#e2e8f0',
                      color: isSelected ? 'white' : '#64748b',
                      padding: '0 6px',
                      borderRadius: 10,
                      fontSize: '0.68rem',
                      fontWeight: 800,
                    }}
                  >
                    {priorityCounts[p.key] || 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sort By Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b' }}>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'priority')}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#334155',
                background: 'white',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="date">Most Recent</option>
              <option value="priority">Priority (Critical First)</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
            <div>Loading your complaints...</div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filtered.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: '#f8fafc',
              borderRadius: 16,
              border: '1.5px dashed #cbd5e1',
            }}
          >
            <ClipboardList size={48} color="#94a3b8" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              {filter === 'all' ? 'No complaints filed yet' : `No complaints with status "${filter.replace('_', ' ')}"`}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: 20 }}>
              {filter === 'all'
                ? 'Report a civic problem like a pothole, broken streetlight, or garbage to track it here.'
                : 'Select "All Complaints" to see all your submitted issues.'}
            </p>
            {filter === 'all' && (
              <a
                href="/report"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 20px',
                  background: '#2563eb',
                  color: 'white',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                }}
              >
                <MapPin size={16} /> Report an Issue Now
              </a>
            )}
          </div>
        )}

        {/* Complaints List */}
        {!isLoading && filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filtered.map((c, idx) => {
              const normStatus = normalizeStatus(c.status);
              const st = STATUS_CONFIG[normStatus] || DEFAULT_STATUS_CONFIG;
              const isExpanded = expandedId === c.id;
              const photoUrl = c.photo_url || CATEGORY_IMAGES[c.category] || CATEGORY_IMAGES.other;
              const complaintIdFormatted = `#CC-${String(c.id).slice(0, 8).toUpperCase()}`;

              // Determine timeline steps
              const isRejected = normStatus === 'REJECTED';
              const timelineSteps = isRejected ? REJECTED_WORKFLOW_STEPS : STANDARD_WORKFLOW_STEPS;
              const currentStepIdx = timelineSteps.findIndex(s => s.status === normStatus);

              return (
                <div
                  key={c.id}
                  className="animate-fade-in-up"
                  style={{
                    background: 'white',
                    borderRadius: 16,
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    boxShadow: isExpanded ? '0 8px 24px rgba(0,0,0,0.06)' : '0 2px 10px rgba(0,0,0,0.03)',
                    transition: 'all 0.3s',
                    animationDelay: `${idx * 50}ms`,
                  }}
                >
                  {/* Card Header */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '16px 20px',
                      cursor: 'pointer',
                      borderLeft: `5px solid ${st.color}`,
                      background: isExpanded ? '#fafbfc' : 'white',
                    }}
                  >
                    {/* Thumbnail */}
                    <div
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 12,
                        overflow: 'hidden',
                        flexShrink: 0,
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <img
                        src={photoUrl}
                        alt={c.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = CATEGORY_IMAGES.other;
                        }}
                      />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span
                          onClick={(e) => copyComplaintId(e, complaintIdFormatted)}
                          title="Click to copy Complaint ID"
                          style={{
                            background: '#f1f5f9',
                            color: '#334155',
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            fontFamily: 'monospace',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            border: '1px solid #e2e8f0',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#e2e8f0')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                        >
                          <Copy size={11} color="#64748b" /> {complaintIdFormatted}
                        </span>
                        <h3
                          style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            margin: 0,
                          }}
                        >
                          {c.title}
                        </h3>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          fontSize: '0.76rem',
                          color: '#64748b',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={13} color="#94a3b8" /> {timeAgo(c.created_at)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={13} color="#94a3b8" /> {c.address_text?.split(',')[0] || 'Bengaluru'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, textTransform: 'capitalize' }}>
                          <Building size={13} color="#94a3b8" /> {c.category?.replace('_', ' ')}
                        </span>
                        {c.upvotes > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <ThumbsUp size={13} color="#94a3b8" /> {c.upvotes}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Priority Badge */}
                    {(() => {
                      const pKey = (c.priority || 'MEDIUM').toUpperCase();
                      const pCfg = PRIORITY_BADGE_CONFIG[pKey] || PRIORITY_BADGE_CONFIG.MEDIUM;
                      return (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '6px 12px',
                            borderRadius: 20,
                            background: pCfg.bg,
                            color: pCfg.color,
                            border: `1px solid ${pCfg.border}`,
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {pCfg.icon} {pCfg.label} Priority
                        </div>
                      );
                    })()}

                    {/* Status Badge */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 14px',
                        borderRadius: 20,
                        background: st.bg,
                        color: st.color,
                        border: `1px solid ${st.borderColor}`,
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {st.icon} {st.label}
                    </div>

                    {/* Expand Chevron */}
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isExpanded ? '#e2e8f0' : '#f8fafc',
                        transition: 'all 0.2s',
                        flexShrink: 0,
                      }}
                    >
                      <ChevronDown
                        size={16}
                        color="#64748b"
                        style={{
                          transition: 'transform 0.3s',
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Expanded View */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: '24px 20px',
                        borderTop: '1px solid #f1f5f9',
                        background: 'white',
                      }}
                    >
                      {/* Section 1: Visual Status Timeline / Stepper */}
                      <div
                        style={{
                          background: '#f8fafc',
                          borderRadius: 14,
                          padding: '20px',
                          border: '1px solid #e2e8f0',
                          marginBottom: 24,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 20,
                          }}
                        >
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Resolution Workflow Progress
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {(() => {
                              const pKey = (c.priority || 'MEDIUM').toUpperCase();
                              const pCfg = PRIORITY_BADGE_CONFIG[pKey] || PRIORITY_BADGE_CONFIG.MEDIUM;
                              return (
                                <div
                                  style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: pCfg.color,
                                    background: pCfg.bg,
                                    padding: '3px 10px',
                                    borderRadius: 12,
                                    border: `1px solid ${pCfg.border}`,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  {pCfg.icon} Priority: {pCfg.label}
                                </div>
                              );
                            })()}
                            <div
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: st.color,
                                background: st.bg,
                                padding: '3px 10px',
                                borderRadius: 12,
                                border: `1px solid ${st.borderColor}`,
                              }}
                            >
                              Current Stage: {st.label}
                            </div>
                          </div>
                        </div>

                        {/* Visual Progress Stepper */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            position: 'relative',
                            overflowX: 'auto',
                            padding: '10px 4px 6px',
                          }}
                        >
                          {timelineSteps.map((step, sIdx) => {
                            const isCompleted = sIdx < currentStepIdx;
                            const isCurrent = sIdx === currentStepIdx;
                            const isPending = sIdx > currentStepIdx;

                            let circleBg = '#f1f5f9';
                            let circleBorder = '#cbd5e1';
                            let iconColor = '#94a3b8';
                            let labelColor = '#94a3b8';

                            if (isCompleted) {
                              circleBg = '#059669';
                              circleBorder = '#059669';
                              iconColor = 'white';
                              labelColor = '#0f172a';
                            } else if (isCurrent) {
                              if (step.status === 'REJECTED') {
                                circleBg = '#dc2626';
                                circleBorder = '#dc2626';
                                iconColor = 'white';
                                labelColor = '#dc2626';
                              } else {
                                circleBg = '#2563eb';
                                circleBorder = '#2563eb';
                                iconColor = 'white';
                                labelColor = '#2563eb';
                              }
                            }

                            return (
                              <div
                                key={step.status}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  flex: 1,
                                  minWidth: 80,
                                  position: 'relative',
                                  textAlign: 'center',
                                }}
                              >
                                {/* Connecting Bar */}
                                {sIdx > 0 && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      top: 15,
                                      right: '50%',
                                      width: '100%',
                                      height: 3,
                                      background: sIdx <= currentStepIdx ? (isRejected && sIdx === currentStepIdx ? '#dc2626' : '#059669') : '#e2e8f0',
                                      zIndex: 1,
                                      transition: 'background 0.3s',
                                    }}
                                  />
                                )}

                                {/* Step Circle */}
                                <div
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    background: circleBg,
                                    border: `2px solid ${circleBorder}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: iconColor,
                                    zIndex: 2,
                                    boxShadow: isCurrent ? `0 0 0 4px ${step.status === 'REJECTED' ? '#fee2e2' : '#dbeafe'}` : 'none',
                                    transition: 'all 0.3s',
                                  }}
                                >
                                  {isCompleted ? <Check size={14} strokeWidth={3} /> : step.icon}
                                </div>

                                {/* Step Label */}
                                <div
                                  style={{
                                    fontSize: '0.74rem',
                                    fontWeight: isCurrent ? 800 : (isCompleted ? 700 : 600),
                                    color: labelColor,
                                    marginTop: 8,
                                    lineHeight: 1.2,
                                  }}
                                >
                                  {step.label}
                                </div>

                                <div
                                  style={{
                                    fontSize: '0.65rem',
                                    color: isCurrent ? labelColor : '#94a3b8',
                                    fontWeight: 500,
                                    marginTop: 2,
                                  }}
                                >
                                  {isCompleted ? 'Completed' : (isCurrent ? 'In Stage' : 'Upcoming')}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Status Description Banner */}
                        <div
                          style={{
                            marginTop: 18,
                            padding: '12px 16px',
                            background: st.bg,
                            borderRadius: 10,
                            border: `1px solid ${st.borderColor}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                          }}
                        >
                          <div style={{ color: st.color, flexShrink: 0 }}>{st.icon}</div>
                          <div style={{ fontSize: '0.82rem', color: st.color, lineHeight: 1.5 }}>
                            <strong>{st.label}:</strong> {st.description}
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Complete Status History Log */}
                      <div style={{ marginBottom: 24 }}>
                        <h4
                          style={{
                            fontSize: '0.9rem',
                            fontWeight: 800,
                            color: '#0f172a',
                            marginBottom: 14,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <Clock size={16} color="#2563eb" /> Complete Status History Log
                        </h4>

                        {(!c.status_history || c.status_history.length === 0) ? (
                          <div
                            style={{
                              padding: '16px',
                              background: '#f8fafc',
                              borderRadius: 10,
                              color: '#64748b',
                              fontSize: '0.82rem',
                            }}
                          >
                            No previous status transitions recorded yet.
                          </div>
                        ) : (
                          <div
                            style={{
                              borderLeft: '2px solid #e2e8f0',
                              marginLeft: 14,
                              paddingLeft: 20,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 16,
                            }}
                          >
                            {c.status_history.map((h: ReportStatusHistory, hIdx: number) => {
                              const histNorm = normalizeStatus(h.new_status);
                              const hConfig = STATUS_CONFIG[histNorm] || DEFAULT_STATUS_CONFIG;
                              const isLatest = hIdx === (c.status_history?.length || 1) - 1;

                              return (
                                <div
                                  key={h.id || hIdx}
                                  style={{
                                    position: 'relative',
                                    background: isLatest ? '#f8fafc' : 'white',
                                    padding: '12px 16px',
                                    borderRadius: 10,
                                    border: isLatest ? `1.5px solid ${hConfig.borderColor}` : '1px solid #e2e8f0',
                                  }}
                                >
                                  {/* Timeline Node Bullet */}
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: -27,
                                      top: 14,
                                      width: 12,
                                      height: 12,
                                      borderRadius: '50%',
                                      background: hConfig.color,
                                      border: '2px solid white',
                                      boxShadow: '0 0 0 2px #e2e8f0',
                                    }}
                                  />

                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: 10,
                                      marginBottom: 4,
                                      flexWrap: 'wrap',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <span
                                        style={{
                                          padding: '3px 8px',
                                          borderRadius: 12,
                                          fontSize: '0.72rem',
                                          fontWeight: 800,
                                          background: hConfig.bg,
                                          color: hConfig.color,
                                          border: `1px solid ${hConfig.borderColor}`,
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 4,
                                        }}
                                      >
                                        {hConfig.icon} {hConfig.label}
                                      </span>
                                      {isLatest && (
                                        <span
                                          style={{
                                            fontSize: '0.68rem',
                                            fontWeight: 700,
                                            color: '#059669',
                                            background: '#ecfdf5',
                                            padding: '2px 6px',
                                            borderRadius: 8,
                                          }}
                                        >
                                          Current Status
                                        </span>
                                      )}
                                    </div>

                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                      {formatDateTime(h.changed_at)}
                                    </div>
                                  </div>

                                  {/* Remark */}
                                  {h.remark && (
                                    <div
                                      style={{
                                        fontSize: '0.84rem',
                                        color: '#334155',
                                        margin: '6px 0',
                                        lineHeight: 1.5,
                                      }}
                                    >
                                      &ldquo;{h.remark}&rdquo;
                                    </div>
                                  )}

                                  {/* Changed By Role */}
                                  <div
                                    style={{
                                      fontSize: '0.72rem',
                                      color: '#64748b',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4,
                                    }}
                                  >
                                    <Shield size={12} color="#94a3b8" />
                                    Updated by: <strong>{sanitizeRole(h.changed_by_role)}</strong>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Section 3: Complaint Meta & Photos */}
                      <div>
                        <h4
                          style={{
                            fontSize: '0.9rem',
                            fontWeight: 800,
                            color: '#0f172a',
                            marginBottom: 12,
                          }}
                        >
                          Complaint Details & Media
                        </h4>

                        <p
                          style={{
                            fontSize: '0.88rem',
                            color: '#475569',
                            lineHeight: 1.7,
                            marginBottom: 16,
                          }}
                        >
                          {c.description || 'No additional description provided.'}
                        </p>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                            gap: 12,
                            marginBottom: 16,
                          }}
                        >
                          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 10 }}>
                            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Category</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', textTransform: 'capitalize' }}>{c.category?.replace('_', ' ')}</div>
                          </div>
                          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 10 }}>
                            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Ward</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Ward {c.ward_number || 'BBMP Central'}</div>
                          </div>
                          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 10 }}>
                            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Assigned Department</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{c.assigned_to || 'Assigned to Ward Zone'}</div>
                          </div>
                          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 10 }}>
                            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Filed On</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{formatDateTime(c.created_at)}</div>
                          </div>
                        </div>

                        {/* Location */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 8,
                            background: '#f8fafc',
                            padding: '10px 14px',
                            borderRadius: 10,
                            marginBottom: 16,
                          }}
                        >
                          <MapPin size={15} color="#2563eb" style={{ marginTop: 2, flexShrink: 0 }} />
                          <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                            {c.address_text || 'Location coordinates recorded on municipal map'}
                          </div>
                        </div>

                        {/* Photos */}
                        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                          <div style={{ flex: '1 1 220px' }}>
                            <div
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                color: '#64748b',
                                textTransform: 'uppercase',
                                marginBottom: 6,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <ImageIcon size={12} /> Complaint Photo
                            </div>
                            <div
                              style={{
                                borderRadius: 12,
                                overflow: 'hidden',
                                height: 170,
                                background: '#f1f5f9',
                                border: '1px solid #e2e8f0',
                              }}
                            >
                              <img
                                src={photoUrl}
                                alt="Complaint Evidence"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = CATEGORY_IMAGES.other;
                                }}
                              />
                            </div>
                          </div>

                          {normStatus === 'RESOLVED' && c.after_photo_url && (
                            <div style={{ flex: '1 1 220px' }}>
                              <div
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: '#059669',
                                  textTransform: 'uppercase',
                                  marginBottom: 6,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <CheckCircle size={12} /> Resolution Evidence
                              </div>
                              <div
                                style={{
                                  borderRadius: 12,
                                  overflow: 'hidden',
                                  height: 170,
                                  background: '#f1f5f9',
                                  border: '1px solid #a7f3d0',
                                }}
                              >
                                <img
                                  src={c.after_photo_url}
                                  alt="Resolved Proof"
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
