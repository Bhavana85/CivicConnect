'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import { useTranslation } from 'react-i18next';
import IssueCard from '@/components/IssueCard';
import ProfileSetup from '@/components/ProfileSetup';
import { getReports, getForumPosts, upvoteForumPost, createForumPost, getForumReplies } from '@/lib/api';
import toast from 'react-hot-toast';
import { MapPin, MessageSquare, Building2, Edit3, Loader2, Send, ThumbsUp, Users, Hash, ArrowRight, Video } from 'lucide-react';

type Tab = 'issues' | 'discussions';

export default function ForumPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('issues');
  const [issues, setIssues] = useState<any[]>([]);
  const [forumPosts, setForumPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [showNewPost, setShowNewPost] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [userRole, setUserRole] = useState('citizen');
  const [userWard, setUserWard] = useState<number | null>(null);
  const [selectedWard, setSelectedWard] = useState<number | 'all'>('all');
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [replies, setReplies] = useState<Record<string, any[]>>({});
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replySubmitting, setReplySubmitting] = useState<string | null>(null);
  const [showCommunityGate, setShowCommunityGate] = useState(false);
  const [communityInput, setCommunityInput] = useState('');

  const fetchData = useCallback(async (overrideWard?: number | 'all') => {
    setIsLoading(true);
    const wardToFetch = overrideWard !== undefined ? overrideWard : selectedWard;
    try {
      const res = await getReports();
      let reports = res.data.reports || [];
      if (wardToFetch !== 'all') reports = reports.filter((r: any) => r.ward_number === wardToFetch);
      const sorted = reports.sort((a: any, b: any) => (b.upvotes || 0) - (a.upvotes || 0));
      setIssues(sorted);
    } catch {
      setIssues([]);
    }
    try {
      const res = await getForumPosts(wardToFetch === 'all' ? undefined : wardToFetch);
      const sorted = (res.data.posts || []).sort((a: any, b: any) => (b.upvotes || 0) - (a.upvotes || 0));
      setForumPosts(sorted);
    } catch {
      setForumPosts([]);
    }
    setIsLoading(false);
  }, [selectedWard]);

  useEffect(() => {
    setMounted(true);
    const isSetup = localStorage.getItem('cc_user_name');
    if (!isSetup) setShowProfileSetup(true);
    
    const role = localStorage.getItem('cc_user_role') || 'citizen';
    setUserRole(role);
    const wardStr = localStorage.getItem('cc_user_ward');
    const ward = wardStr ? parseInt(wardStr) : null;
    setUserWard(ward);
    
    if (role === 'citizen' && !ward) {
      setShowCommunityGate(true);
    } else if (role === 'citizen' && ward) {
      setSelectedWard(ward);
      fetchData(ward);
    } else {
      fetchData('all');
    }
  }, [fetchData]);

  const handleJoinCommunity = () => {
    const ward = parseInt(communityInput.trim());
    if (!ward || ward < 1 || ward > 250) {
      toast.error('Please enter a valid ward number (1–250)');
      return;
    }
    localStorage.setItem('cc_user_ward', String(ward));
    setUserWard(ward);
    setSelectedWard(ward);
    setShowCommunityGate(false);
    fetchData(ward);
    toast.success(`Welcome to Ward ${ward} Community!`);
  };

  const toggleComments = async (postId: string) => {
    const newSet = new Set(openComments);
    if (newSet.has(postId)) {
      newSet.delete(postId);
    } else {
      newSet.add(postId);
      // Fetch replies if not already loaded
      if (!replies[postId]) {
        try {
          const res = await getForumReplies(postId);
          setReplies(prev => ({ ...prev, [postId]: res.data.replies || [] }));
        } catch {
          setReplies(prev => ({ ...prev, [postId]: [] }));
        }
      }
    }
    setOpenComments(newSet);
  };

  const handleReplySubmit = async (postId: string) => {
    const text = replyTexts[postId]?.trim();
    if (!text) return;
    setReplySubmitting(postId);
    try {
      await createForumPost({ body: text, parent_id: parseInt(postId) });
      // Refresh replies
      const res = await getForumReplies(postId);
      setReplies(prev => ({ ...prev, [postId]: res.data.replies || [] }));
      // Update reply_count on the post
      setForumPosts(prev => prev.map(p =>
        String(p.id) === postId ? { ...p, reply_count: (p.reply_count || 0) + 1 } : p
      ));
      setReplyTexts(prev => ({ ...prev, [postId]: '' }));
      toast.success('Reply added!');
    } catch {
      toast.error('Please login to reply.');
    } finally {
      setReplySubmitting(null);
    }
  };

  const handleUpvote = async (postId: string) => {
    if (likedPosts.has(postId)) return;
    try {
      const res = await upvoteForumPost(postId);
      setForumPosts(prev => prev.map(p =>
        String(p.id) === postId ? { ...p, upvotes: res.data.upvotes } : p
      ));
      setLikedPosts(prev => new Set(prev).add(postId));
      toast.success('Thanks for your support!');
    } catch {
      toast.error('Please login to upvote.');
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBody.trim()) return;
    setPostSubmitting(true);
    try {
      await createForumPost({ 
        title: newTitle.trim() || undefined, 
        body: newBody.trim(),
        ward_number: selectedWard !== 'all' ? selectedWard : (userWard || undefined)
      });
      setShowNewPost(false);
      setNewTitle('');
      setNewBody('');
      toast.success('Post published!');
      fetchData();
    } catch {
      toast.error('Failed to create post. Please login.');
    } finally {
      setPostSubmitting(false);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const tabs = [
    { key: 'issues' as Tab, label: <span style={{display:'flex', alignItems:'center', gap:6}}><MapPin size={16} /> Reported Issues</span>, count: issues.length },
    { key: 'discussions' as Tab, label: <span style={{display:'flex', alignItems:'center', gap:6}}><MessageSquare size={16} /> Discussions</span>, count: forumPosts.length },
  ];

  return (
    <>
      <Navbar />
      {showProfileSetup && <ProfileSetup onComplete={() => setShowProfileSetup(false)} />}

      {/* ── Community Join Gate for Citizens ── */}
      {mounted && showCommunityGate && userRole === 'citizen' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'linear-gradient(135deg, #0f2d5c 0%, #1a4fa0 60%, #1e40af 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}>
          <div className="animate-fade-in-up" style={{
            background: 'white', borderRadius: 24, padding: '40px 36px',
            maxWidth: 460, width: '100%',
            boxShadow: '0 32px 80px rgba(0,0,0,0.35)',
            textAlign: 'center',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 8px 24px rgba(37,99,235,0.35)',
            }}>
              <Users size={36} color="white" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              Join Your Community
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#64748b', marginBottom: 28, lineHeight: 1.6 }}>
              Enter your ward number to join your local community forum. You'll see issues and discussions from your neighborhood.
            </p>

            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: 'block', fontSize: '0.78rem', fontWeight: 700,
                color: '#475569', marginBottom: 8, textTransform: 'uppercase',
                letterSpacing: '0.05em', textAlign: 'left',
              }}>Ward / Community Number</label>
              <div style={{ position: 'relative' }}>
                <Hash size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="number"
                  min={1}
                  max={250}
                  placeholder="e.g. 73"
                  value={communityInput}
                  onChange={(e) => setCommunityInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleJoinCommunity(); }}
                  style={{
                    width: '100%', padding: '14px 16px 14px 42px',
                    borderRadius: 12, border: '2px solid #e2e8f0',
                    fontSize: '1.1rem', fontWeight: 600, outline: 'none',
                    background: '#f8fafc', transition: 'border-color 0.2s, background 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.background = 'white'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; }}
                  autoFocus
                />
              </div>
            </div>

            <button
              onClick={handleJoinCommunity}
              disabled={!communityInput.trim()}
              style={{
                width: '100%', padding: '14px', borderRadius: 12,
                border: 'none', background: '#2563eb', color: 'white',
                fontSize: '0.95rem', fontWeight: 700, cursor: communityInput.trim() ? 'pointer' : 'not-allowed',
                opacity: communityInput.trim() ? 1 : 0.5,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
                transition: 'all 0.2s',
              }}
            >
              Join Community <ArrowRight size={18} />
            </button>

            <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Popular wards:</span>
              {[42, 68, 73, 150].map(w => (
                <button
                  key={w}
                  onClick={() => { setCommunityInput(String(w)); }}
                  style={{
                    padding: '3px 12px', borderRadius: 16,
                    border: '1px solid #e2e8f0', background: communityInput === String(w) ? '#eff6ff' : 'white',
                    color: communityInput === String(w) ? '#2563eb' : '#64748b',
                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Ward {w}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="page-container" style={{ paddingTop: 24, paddingBottom: 64 }}>
        {/* ── Page Header ── */}
        <div className="page-header animate-fade-in-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, paddingBottom: 28 }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {userRole === 'citizen' && userWard 
                ? <><Building2 size={28} /> Ward {userWard} Community</> 
                : <><Building2 size={28} /> Civic Hub</>}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <p className="page-subtitle" style={{ margin: 0 }}>
                {userRole === 'citizen' && userWard
                  ? `Discuss local issues and connect with your immediate neighbors in Ward ${userWard}.`
                  : t('forum.subtitle', 'View community reports, upvote issues, and join ward discussions')}
              </p>
              {userRole === 'citizen' && userWard && (
                <button 
                  onClick={() => setShowCommunityGate(true)}
                  style={{ 
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.4)', 
                    color: 'white', padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', 
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 
                  }}
                >
                  <Hash size={12} /> Change Ward
                </button>
              )}
            </div>
          </div>
          
          {(userRole === 'admin' || userRole === 'government') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'white', padding: '8px 16px', borderRadius: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>Community:</span>
              <select 
                value={selectedWard}
                onChange={(e) => {
                  const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
                  setSelectedWard(val);
                  fetchData(val);
                }}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">All Communities</option>
                <option value="42">Ward 42</option>
                <option value="68">Ward 68</option>
                <option value="73">Ward 73</option>
                <option value="150">Ward 150</option>
              </select>
            </div>
          )}
          
          {mounted && userRole !== 'admin' && userRole !== 'government' && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {activeTab === 'discussions' && (
                <button 
                  className="btn-accent" 
                  onClick={() => window.open(`/video-call?room=cc-ward${userWard}-townhall`, '_blank')} 
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#f59e0b', color: '#0f172a', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
                >
                  <Video size={16} /> Start Community Call
                </button>
              )}
              <button className="btn-secondary" onClick={() => setShowNewPost(!showNewPost)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Edit3 size={16} /> New Discussion
              </button>
              <button id="new-post-btn" className="btn-primary" onClick={() => window.location.href = '/report'} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={16} /> {t('nav.report', 'Report Issue')}
              </button>
            </div>
          )}
        </div>
      </div>

        {/* ── New Discussion Form ── */}
        {showNewPost && (
          <div className="civic-card animate-fade-in-up" style={{
            padding: 28, marginBottom: 28,
            borderLeft: '4px solid #2563eb',
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Edit3 size={18} /> Start a New Discussion
            </h3>
            <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{
                  display: 'block', fontSize: '0.78rem', fontWeight: 600,
                  color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="What's on your mind?"
                  required
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 10,
                    border: '1.5px solid #e2e8f0', fontSize: '0.9rem', outline: 'none',
                    background: '#f8fafc', transition: 'border-color 0.2s, background 0.2s',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.background = 'white'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block', fontSize: '0.78rem', fontWeight: 600,
                  color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>Details</label>
                <textarea
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Share details about your topic..."
                  required
                  rows={4}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 10,
                    border: '1.5px solid #e2e8f0', fontSize: '0.9rem', outline: 'none',
                    background: '#f8fafc', resize: 'vertical', fontFamily: 'inherit',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.background = 'white'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowNewPost(false)} style={{
                  padding: '10px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0',
                  background: 'white', color: '#64748b', fontWeight: 600, fontSize: '0.85rem',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}>Cancel</button>
                <button type="submit" disabled={postSubmitting} className="btn-primary" style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  opacity: postSubmitting ? 0.7 : 1,
                }}>
                  {postSubmitting ? <><Loader2 size={16} className="animate-spin" /> Posting...</> : <><Send size={16} /> Post Discussion</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Tabs ── */}
        <div style={{
          display: 'flex', gap: 0, marginBottom: 32,
          borderBottom: '2px solid #e2e8f0',
          position: 'sticky', top: 64, background: 'var(--bg-base)',
          zIndex: 10, paddingTop: 4,
        }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '14px 28px', border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.9rem', transition: 'all 0.2s',
              color: activeTab === tab.key ? '#1a4fa0' : '#94a3b8',
              background: activeTab === tab.key ? 'white' : 'transparent',
              borderBottom: activeTab === tab.key ? '2.5px solid #1a4fa0' : '2.5px solid transparent',
              marginBottom: -2,
            }}>
              {tab.label}
              <span style={{
                background: activeTab === tab.key ? '#1a4fa0' : '#e2e8f0',
                color: activeTab === tab.key ? 'white' : '#64748b',
                padding: '2px 10px', borderRadius: 12, fontSize: '0.72rem',
                marginLeft: 8, fontWeight: 700,
              }}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        {isLoading ? (
          <div style={{
            textAlign: 'center', padding: '80px 0', color: '#94a3b8',
            fontSize: '1rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <Loader2 size={48} className="animate-spin" color="#94a3b8" />
            </div>
            {t('common.loading')}
          </div>
        ) : activeTab === 'issues' ? (
          /* ── Issues Feed ── */
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            {issues.length > 0 ? issues.map((issue, i) => (
              <div key={issue.id} style={{ animationDelay: `${i * 80}ms` }} className="animate-fade-in-up">
                <IssueCard issue={{ ...issue, id: String(issue.id) }} />
              </div>
            )) : (
              <div style={{
                textAlign: 'center', padding: '0',
                background: 'white', borderRadius: 16, border: '1px solid #e2e8f0',
                overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
              }}>
                <img 
                  src="https://images.unsplash.com/photo-1517732306149-e8f829eb588a?auto=format&fit=crop&w=800&q=80" 
                  alt="City Community" 
                  style={{ width: '100%', height: 200, objectFit: 'cover' }} 
                />
                <div style={{ padding: '40px 20px' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.2rem', marginBottom: 8 }}>No issues reported yet</div>
                  <div style={{ color: '#64748b', fontSize: '0.95rem' }}>Be the first to report a civic issue in your ward!</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Discussions Feed ── */
          <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {forumPosts.length > 0 ? forumPosts.map((post, i) => {
              const isLiked = likedPosts.has(String(post.id));
              const isExpanded = expandedPost === String(post.id);

              return (
                <div
                  key={post.id}
                  className="animate-fade-in-up"
                  style={{
                    animationDelay: `${i * 80}ms`,
                    background: 'white',
                    borderRadius: 16,
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    transition: 'all 0.25s ease',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.10)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Post header */}
                  <div style={{ padding: '22px 28px 0' }}>
                    {/* Author row */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginBottom: 14,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* Avatar */}
                        <div style={{
                          width: 42, height: 42, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #1a4fa0, #2563eb)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontWeight: 700, fontSize: '0.9rem',
                          flexShrink: 0,
                        }}>
                          {(post.author_name || 'A')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0f172a' }}>
                            {post.author_name || 'Anonymous'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 1 }}>
                            {timeAgo(post.created_at)}
                          </div>
                        </div>
                      </div>
                      {post.ward_number && (
                        <span style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '5px 14px', borderRadius: 20,
                          background: '#eff6ff', color: '#1e40af',
                          fontSize: '0.72rem', fontWeight: 700,
                          letterSpacing: '0.03em',
                        }}>
                          <Building2 size={12} /> Ward {post.ward_number}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 style={{
                      fontSize: '1.1rem', fontWeight: 700, color: '#0f172a',
                      lineHeight: 1.45, marginBottom: 12,
                    }}>
                      {post.title || 'Untitled Discussion'}
                    </h3>

                    {/* Body */}
                    <p style={{
                      fontSize: '0.9rem', color: '#475569', lineHeight: 1.7,
                      marginBottom: 0,
                      ...(isExpanded ? {} : {
                        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                      }),
                    }}>
                      {post.body}
                    </p>

                    {/* Read more toggle */}
                    {post.body && post.body.length > 180 && (
                      <button
                        onClick={() => setExpandedPost(isExpanded ? null : String(post.id))}
                        style={{
                          background: 'none', border: 'none', color: '#2563eb',
                          fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                          padding: '6px 0', display: 'block', marginTop: 4,
                        }}
                      >
                        {isExpanded ? 'Show less ↑' : 'Read more ↓'}
                      </button>
                    )}
                  </div>

                  {/* Actions bar */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 28px 20px',
                    marginTop: 8,
                  }}>
                    {/* Left actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Like button */}
                      <button
                        onClick={() => handleUpvote(String(post.id))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 7,
                          padding: '9px 18px', borderRadius: 10,
                          border: isLiked ? '1.5px solid #2563eb' : '1.5px solid #e2e8f0',
                          background: isLiked ? '#eff6ff' : 'white',
                          color: isLiked ? '#2563eb' : '#64748b',
                          cursor: isLiked ? 'default' : 'pointer',
                          fontSize: '0.84rem', fontWeight: 600,
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isLiked) {
                            e.currentTarget.style.borderColor = '#2563eb';
                            e.currentTarget.style.color = '#2563eb';
                            e.currentTarget.style.background = '#eff6ff';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isLiked) {
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.color = '#64748b';
                            e.currentTarget.style.background = 'white';
                          }
                        }}
                      >
                        <ThumbsUp size={14} /> <span>{post.upvotes || 0}</span>
                      </button>

                      {/* Comment toggle */}
                      <button
                        onClick={() => toggleComments(String(post.id))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 7,
                          padding: '9px 18px', borderRadius: 10,
                          border: openComments.has(String(post.id)) ? '1.5px solid #2563eb' : '1.5px solid #e2e8f0',
                          background: openComments.has(String(post.id)) ? '#eff6ff' : 'white',
                          color: openComments.has(String(post.id)) ? '#2563eb' : '#64748b',
                          cursor: 'pointer',
                          fontSize: '0.84rem', fontWeight: 600,
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!openComments.has(String(post.id))) {
                            e.currentTarget.style.borderColor = '#2563eb';
                            e.currentTarget.style.color = '#2563eb';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!openComments.has(String(post.id))) {
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.color = '#64748b';
                          }
                        }}
                      >
                        <MessageSquare size={14} /> <span>{post.reply_count || 0} {t('forum.replies', 'replies')}</span>
                        <span style={{ fontSize: '0.7rem' }}>{openComments.has(String(post.id)) ? '▲' : '▼'}</span>
                      </button>
                    </div>
                  </div>

                  {/* ── Comments / Replies Section ── */}
                  {openComments.has(String(post.id)) && (
                    <div style={{
                      padding: '20px 28px', background: '#f8fafc',
                      borderTop: '1px solid #e2e8f0',
                    }}>
                      {/* Existing replies */}
                      <div style={{
                        maxHeight: 320, overflowY: 'auto', marginBottom: 16,
                        display: 'flex', flexDirection: 'column', gap: 10,
                      }}>
                        {(!replies[String(post.id)] || replies[String(post.id)].length === 0) ? (
                          <p style={{
                            textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem',
                            padding: '24px 0',
                          }}>
                            No replies yet. Be the first to share your thoughts!
                          </p>
                        ) : (
                          replies[String(post.id)].map((reply: any) => (
                            <div key={reply.id} style={{
                              background: 'white', padding: '14px 16px', borderRadius: 12,
                              border: '1px solid #f1f5f9',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                            }}>
                              <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                marginBottom: 6,
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{
                                    width: 28, height: 28, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #10b981, #34d399)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontWeight: 700, fontSize: '0.65rem',
                                    flexShrink: 0,
                                  }}>
                                    {(reply.author_name || 'C')[0].toUpperCase()}
                                  </div>
                                  <span style={{ fontWeight: 600, fontSize: '0.82rem', color: '#0f172a' }}>
                                    {reply.author_name || 'Citizen'}
                                  </span>
                                </div>
                                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                  {timeAgo(reply.created_at)}
                                </span>
                              </div>
                              <p style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.6, marginLeft: 36 }}>
                                {reply.body}
                              </p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Reply input */}
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <input
                          type="text"
                          value={replyTexts[String(post.id)] || ''}
                          onChange={(e) => setReplyTexts(prev => ({ ...prev, [String(post.id)]: e.target.value }))}
                          placeholder="Write a reply..."
                          disabled={replySubmitting === String(post.id)}
                          style={{
                            flex: 1, padding: '10px 16px', borderRadius: 24,
                            border: '1.5px solid #e2e8f0', background: 'white',
                            fontSize: '0.85rem', color: '#0f172a', outline: 'none',
                            transition: 'border-color 0.2s',
                          }}
                          onFocus={(e) => { e.target.style.borderColor = '#2563eb'; }}
                          onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleReplySubmit(String(post.id));
                            }
                          }}
                        />
                        <button
                          onClick={() => handleReplySubmit(String(post.id))}
                          disabled={replySubmitting === String(post.id) || !(replyTexts[String(post.id)]?.trim())}
                          style={{
                            width: 40, height: 40, borderRadius: '50%',
                            border: 'none', background: '#2563eb', color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: (replySubmitting === String(post.id) || !(replyTexts[String(post.id)]?.trim())) ? 'not-allowed' : 'pointer',
                            opacity: (replySubmitting === String(post.id) || !(replyTexts[String(post.id)]?.trim())) ? 0.5 : 1,
                            transition: 'all 0.2s', flexShrink: 0,
                            fontSize: '1rem',
                          }}
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            }) : (
              <div style={{
                textAlign: 'center', padding: '0',
                background: 'white', borderRadius: 16, border: '1px solid #e2e8f0',
                overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
              }}>
                <img 
                  src="https://images.unsplash.com/photo-1577563908411-5077b6dc7624?auto=format&fit=crop&w=800&q=80" 
                  alt="Community Meeting" 
                  style={{ width: '100%', height: 200, objectFit: 'cover' }} 
                />
                <div style={{ padding: '40px 20px' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.2rem', marginBottom: 8 }}>No discussions yet</div>
                  <div style={{ color: '#64748b', fontSize: '0.95rem' }}>Start a conversation with your community!</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
