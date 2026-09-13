'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, MessageCircle, ThumbsUp, CheckCircle, Clock, AlertTriangle, Send, ChevronDown, ChevronUp, AlertCircle, Lightbulb, Droplets, HardHat, Trash2, Check, X, Loader, User, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { getComments, addComment, likeIssue, updateReportStatus } from '../lib/api';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  pothole: <AlertCircle size={14} />, streetlight: <Lightbulb size={14} />, water: <Droplets size={14} />, sewage: <HardHat size={14} />, garbage: <Trash2 size={14} />, other: <MapPin size={14} />,
};

const CATEGORY_IMAGES: Record<string, string> = {
  pothole: 'https://images.unsplash.com/photo-1594818898109-44704f1098e3?auto=format&fit=crop&w=800&q=80',
  streetlight: 'https://images.unsplash.com/photo-1617953141700-ace986f13467?auto=format&fit=crop&w=800&q=80',
  water: 'https://images.unsplash.com/photo-1583245177184-4ab53e73e26c?auto=format&fit=crop&w=800&q=80',
  sewage: 'https://images.unsplash.com/photo-1621451537084-482c73073a0f?auto=format&fit=crop&w=800&q=80',
  garbage: 'https://images.unsplash.com/photo-1604187351574-c75ca79f5807?auto=format&fit=crop&w=800&q=80',
  other: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80',
};

const STATUS_CONFIG: Record<string, { bg: string; color: string; icon: React.ReactNode; label: string }> = {
  pending:      { bg: '#eff6ff', color: '#1d4ed8', icon: <Loader size={14} />, label: 'Submitted' },
  in_progress:  { bg: '#dbeafe', color: '#1e40af', icon: <Loader size={14} />, label: 'In Progress' },
  resolved:     { bg: '#d1fae5', color: '#065f46', icon: <Check size={14} />,  label: 'Resolved' },
  rejected:     { bg: '#fee2e2', color: '#991b1b', icon: <X size={14} />,      label: 'Rejected' },
  SUBMITTED:    { bg: '#eff6ff', color: '#1d4ed8', icon: <Loader size={14} />, label: 'Submitted' },
  UNDER_REVIEW: { bg: '#fffbeb', color: '#b45309', icon: <Loader size={14} />, label: 'Under Review' },
  VERIFIED:     { bg: '#ecfeff', color: '#0e7490', icon: <Check size={14} />,  label: 'Verified' },
  ASSIGNED:     { bg: '#faf5ff', color: '#7e22ce', icon: <Check size={14} />,  label: 'Assigned' },
  IN_PROGRESS:  { bg: '#dbeafe', color: '#1e40af', icon: <Loader size={14} />, label: 'In Progress' },
  RESOLVED:     { bg: '#d1fae5', color: '#065f46', icon: <Check size={14} />,  label: 'Resolved' },
  REJECTED:     { bg: '#fee2e2', color: '#991b1b', icon: <X size={14} />,      label: 'Rejected' },
};

const PRIORITY_BADGE_CONFIG: Record<
  string,
  { bg: string; color: string; border: string; label: string; icon: React.ReactNode }
> = {
  CRITICAL: { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', label: 'Critical', icon: <AlertTriangle size={12} /> },
  HIGH:     { bg: '#ffedd5', color: '#c2410c', border: '#fed7aa', label: 'High',     icon: <AlertCircle size={12} /> },
  MEDIUM:   { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'Medium',   icon: <Clock size={12} /> },
  LOW:      { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', label: 'Low',      icon: <CheckCircle size={12} /> },
};

interface IssueCardProps {
  issue: {
    id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    priority?: string;
    address_text: string;
    photo_url: string;
    after_photo_url?: string;
    upvotes: number;
    created_at: string;
    reporter_name?: string;
  };
}

export default function IssueCard({ issue }: IssueCardProps) {
  const { t } = useTranslation();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [likes, setLikes] = useState(issue.upvotes || 0);
  const [hasLiked, setHasLiked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isHovered, setIsHovered] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [localIssue, setLocalIssue] = useState(issue);
  const [resolveModal, setResolveModal] = useState(false);
  const [afterPhotoUrl, setAfterPhotoUrl] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    setUserRole(localStorage.getItem('cc_user_role') || '');
    setLocalIssue(issue);
  }, [issue]);

  const fetchComments = async () => {
    try {
      const res = await getComments(issue.id);
      setComments(res.data.comments || []);
    } catch (err) {
      console.error('Failed to load comments');
    }
  };

  useEffect(() => {
    if (showComments) {
      fetchComments();
    }
  }, [showComments, localIssue.id]);

  const handleLike = async () => {
    if (hasLiked) return;
    try {
      await likeIssue(localIssue.id);
      setLikes(prev => prev + 1);
      setHasLiked(true);
      toast.success('Thanks for your support!');
    } catch (err) {
      toast.error('Please login to upvote.');
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await addComment(localIssue.id, newComment);
      setNewComment('');
      fetchComments();
      toast.success('Comment added');
    } catch (err) {
      toast.error('Please login to comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!afterPhotoUrl.trim()) {
      toast.error('Please provide an image URL');
      return;
    }
    setIsResolving(true);
    try {
      const res = await updateReportStatus(
        parseInt(localIssue.id),
        'RESOLVED',
        'Issue resolved on site with photo proof.',
        undefined,
        afterPhotoUrl
      );
      setLocalIssue({ ...localIssue, status: 'RESOLVED', after_photo_url: afterPhotoUrl });
      setResolveModal(false);
      setAfterPhotoUrl('');
      toast.success('Issue marked as resolved!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to resolve issue');
    } finally {
      setIsResolving(false);
    }
  };

  const normStatus = localIssue.status?.toUpperCase() === 'PENDING' ? 'SUBMITTED' : (localIssue.status?.toUpperCase() || 'SUBMITTED');
  const statusCfg = STATUS_CONFIG[normStatus] || STATUS_CONFIG[localIssue.status] || STATUS_CONFIG.SUBMITTED;
  const displayPhoto = localIssue.photo_url || CATEGORY_IMAGES[localIssue.category] || CATEGORY_IMAGES.other;

  return (
    <div
      style={{
        background: 'white',
        borderRadius: 16,
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        marginBottom: 24,
        transition: 'all 0.25s ease',
        boxShadow: isHovered
          ? '0 8px 30px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)'
          : '0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.03)',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Header ── */}
      <div style={{
        padding: '20px 24px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Status + Category row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 12px', borderRadius: 20,
              fontSize: '0.72rem', fontWeight: 700,
              background: statusCfg.bg, color: statusCfg.color,
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              {statusCfg.icon} {statusCfg.label}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 20,
              fontSize: '0.72rem', fontWeight: 600,
              background: '#f1f5f9', color: '#64748b',
              textTransform: 'capitalize',
            }}>
              {CATEGORY_ICONS[localIssue.category] || <MapPin size={14} />} {localIssue.category}
            </span>
            {(() => {
              const pKey = (localIssue.priority || 'MEDIUM').toUpperCase();
              const pCfg = PRIORITY_BADGE_CONFIG[pKey] || PRIORITY_BADGE_CONFIG.MEDIUM;
              return (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px', borderRadius: 20,
                  fontSize: '0.72rem', fontWeight: 700,
                  background: pCfg.bg, color: pCfg.color, border: `1px solid ${pCfg.border}`,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  {pCfg.icon} {pCfg.label}
                </span>
              );
            })()}
          </div>

          {/* Title */}
          <h3 style={{
            fontSize: '1.05rem', fontWeight: 700, color: '#0f172a',
            lineHeight: 1.4, marginBottom: 8,
          }}>
            {localIssue.title}
          </h3>

          {/* Location + Reporter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: '0.8rem', color: '#64748b',
            }}>
              <MapPin size={14} style={{ color: '#94a3b8' }} />
              {localIssue.address_text || 'Location not provided'}
            </span>
            {localIssue.reporter_name && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: '0.8rem', color: '#64748b',
              }}>
                <User size={14} /> {localIssue.reporter_name}
              </span>
            )}
          </div>
        </div>

        {/* Date */}
        <div style={{
          fontSize: '0.75rem', color: '#94a3b8', textAlign: 'right',
          whiteSpace: 'nowrap', flexShrink: 0, marginTop: 4,
        }}>
          {timeAgo(localIssue.created_at)}
        </div>
      </div>

      {/* ── Image / Before-After ── */}
      {displayPhoto && (
        <div style={{ position: 'relative', width: '100%', height: 260, background: '#f1f5f9', overflow: 'hidden' }}>
          {localIssue.status === 'resolved' && localIssue.after_photo_url ? (
            <div
              style={{ position: 'absolute', inset: 0, userSelect: 'none', overflow: 'hidden', cursor: 'ew-resize' }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
                setSliderPosition((x / rect.width) * 100);
              }}
              onTouchMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const touch = e.touches[0];
                const x = Math.max(0, Math.min(touch.clientX - rect.left, rect.width));
                setSliderPosition((x / rect.width) * 100);
              }}
            >
              <img src={localIssue.after_photo_url} alt="After" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(16,185,129,0.85)', color: 'white', padding: '3px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, backdropFilter: 'blur(4px)' }}>AFTER</div>

              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', width: `${sliderPosition}%` }}>
                <img src={displayPhoto} alt="Before" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', maxWidth: 'none' }} />
                <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(15,23,42,0.6)', color: 'white', padding: '3px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, backdropFilter: 'blur(4px)' }}>BEFORE</div>
              </div>

              <div style={{
                position: 'absolute', top: 0, bottom: 0, width: 3,
                background: 'white', left: `${sliderPosition}%`, cursor: 'ew-resize',
                boxShadow: '0 0 10px rgba(0,0,0,0.4)',
              }}>
                <div style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  width: 32, height: 32, background: 'white', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>⟷</span>
                </div>
              </div>
            </div>
          ) : (
            <img src={displayPhoto} alt="Issue" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </div>
      )}

      {/* ── Description ── */}
      <div style={{ padding: '20px 24px' }}>
        <p style={{
          fontSize: '0.88rem', color: '#374151', lineHeight: 1.7,
          marginBottom: 20,
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {localIssue.description}
        </p>

        {/* ── Actions Bar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 16, borderTop: '1px solid #f1f5f9',
        }}>
          {/* Left: Like + Comment buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Like button */}
            <button
              onClick={handleLike}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 10,
                border: hasLiked ? '1.5px solid #2563eb' : '1.5px solid #e2e8f0',
                background: hasLiked ? '#eff6ff' : 'white',
                color: hasLiked ? '#2563eb' : '#64748b',
                cursor: hasLiked ? 'default' : 'pointer',
                fontSize: '0.82rem', fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!hasLiked) {
                  e.currentTarget.style.borderColor = '#2563eb';
                  e.currentTarget.style.color = '#2563eb';
                  e.currentTarget.style.background = '#eff6ff';
                }
              }}
              onMouseLeave={(e) => {
                if (!hasLiked) {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.color = '#64748b';
                  e.currentTarget.style.background = 'white';
                }
              }}
              title="Upvote this issue"
            >
              <ThumbsUp size={16} style={{ fill: hasLiked ? '#2563eb' : 'none' }} />
              <span>{likes}</span>
            </button>

            {/* Comment toggle */}
            <button
              onClick={() => setShowComments(!showComments)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 10,
                border: showComments ? '1.5px solid #2563eb' : '1.5px solid #e2e8f0',
                background: showComments ? '#eff6ff' : 'white',
                color: showComments ? '#2563eb' : '#64748b',
                cursor: 'pointer',
                fontSize: '0.82rem', fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!showComments) {
                  e.currentTarget.style.borderColor = '#2563eb';
                  e.currentTarget.style.color = '#2563eb';
                }
              }}
              onMouseLeave={(e) => {
                if (!showComments) {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.color = '#64748b';
                }
              }}
            >
              <MessageCircle size={16} />
              <span>{t('forum.comments', 'Comments')}</span>
              {showComments ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* Right: Government Actions */}
          {(userRole === 'government' || userRole === 'admin') && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  toast.success(`SMS sent to Citizen with joining link!`);
                  window.open(`/video-call?room=cc-report-${localIssue.id}-${Date.now()}`, '_blank');
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 10,
                  border: 'none', background: '#8b5cf6', color: 'white',
                  cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#7c3aed'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#8b5cf6'; }}
              >
                <Video size={16} />
                <span>Call</span>
              </button>

              {localIssue.status !== 'resolved' && (
                <button
                  onClick={() => setResolveModal(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 10,
                    border: 'none', background: '#10b981', color: 'white',
                    cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                    transition: 'background 0.2s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#059669'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#10b981'; }}
                >
                  <CheckCircle size={16} />
                  <span>Resolve</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Comments Section ── */}
      {showComments && (
        <div style={{
          padding: '20px 24px', background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
        }}>
          <div style={{
            maxHeight: 280, overflowY: 'auto', marginBottom: 16,
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {comments.length === 0 ? (
              <p style={{
                textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem',
                padding: '24px 0',
              }}>
                No comments yet. Be the first to share your thoughts!
              </p>
            ) : (
              comments.map((c) => (
                <div key={c.id} style={{
                  background: 'white', padding: '14px 16px', borderRadius: 12,
                  border: '1px solid #f1f5f9',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 6,
                  }}>
                    <span style={{ fontWeight: 600, fontSize: '0.82rem', color: '#0f172a' }}>
                      <User size={12} style={{marginRight: 4}} /> {c.author_name || 'Citizen'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.6 }}>{c.body}</p>
                </div>
              ))
            )}
          </div>

          {/* Comment input */}
          <form onSubmit={handleCommentSubmit} style={{
            display: 'flex', gap: 10, alignItems: 'center',
          }}>
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              disabled={isSubmitting}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 24,
                border: '1.5px solid #e2e8f0', background: 'white',
                fontSize: '0.85rem', color: '#0f172a', outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#2563eb'; }}
              onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
            />
            <button
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              style={{
                width: 40, height: 40, borderRadius: '50%',
                border: 'none', background: '#2563eb', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: isSubmitting || !newComment.trim() ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || !newComment.trim() ? 0.5 : 1,
                transition: 'all 0.2s',
                flexShrink: 0,
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* ── Resolve Modal ── */}
      {resolveModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: 'white', padding: 28, borderRadius: 16,
            width: '90%', maxWidth: 480, boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={20} color="#10b981" /> Resolve Issue
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: 20 }}>
              Upload a photograph showing the resolved issue as proof of completion.
            </p>
            <form onSubmit={handleResolve}>
              {/* File Upload Area */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                  Upload Resolution Photo
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
                          setAfterPhotoUrl(ev.target?.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  }}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.background = '#f0fdf4'; }}
                  onDragLeave={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.background = '#f9fafb'; }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.background = '#f9fafb';
                    const file = e.dataTransfer.files[0];
                    if (file && file.type.startsWith('image/')) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        setAfterPhotoUrl(ev.target?.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  style={{
                    border: '2px dashed #d1d5db', borderRadius: 12,
                    padding: afterPhotoUrl ? '8px' : '32px 20px',
                    textAlign: 'center', cursor: 'pointer',
                    background: '#f9fafb', transition: 'all 0.2s',
                  }}
                >
                  {afterPhotoUrl ? (
                    <div style={{ position: 'relative' }}>
                      <img
                        src={afterPhotoUrl}
                        alt="Resolution preview"
                        style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 8 }}
                      />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setAfterPhotoUrl(''); }}
                        style={{
                          position: 'absolute', top: 8, right: 8,
                          width: 28, height: 28, borderRadius: '50%',
                          background: 'rgba(0,0,0,0.6)', color: 'white',
                          border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1rem', fontWeight: 700,
                        }}
                      >×</button>
                      <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
                        ✓ Photo ready — click to change
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: '2rem', marginBottom: 8, color: '#94a3b8' }}>
                        <MapPin size={36} />
                      </div>
                      <div style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem', marginBottom: 4 }}>
                        Click to upload or drag & drop
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                        JPG, PNG, WEBP up to 10MB
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* OR divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>OR PASTE URL</span>
                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              </div>

              {/* URL fallback */}
              <div style={{ marginBottom: 20 }}>
                <input
                  type="url"
                  placeholder="https://example.com/resolved-photo.jpg"
                  value={afterPhotoUrl.startsWith('data:') ? '' : afterPhotoUrl}
                  onChange={(e) => setAfterPhotoUrl(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    border: '1.5px solid #e2e8f0', fontSize: '0.9rem', outline: 'none',
                    background: '#f9fafb',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#10b981'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => { setResolveModal(false); setAfterPhotoUrl(''); }}
                  style={{
                    padding: '8px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0',
                    background: 'white', color: '#64748b', fontWeight: 600, fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResolving || !afterPhotoUrl.trim()}
                  style={{
                    padding: '8px 20px', borderRadius: 8, border: 'none',
                    background: '#10b981', color: 'white', fontWeight: 600, fontSize: '0.85rem',
                    cursor: (isResolving || !afterPhotoUrl.trim()) ? 'not-allowed' : 'pointer',
                    opacity: (isResolving || !afterPhotoUrl.trim()) ? 0.6 : 1,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <CheckCircle size={16} />
                  {isResolving ? 'Resolving...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
