'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { ArrowLeft, Video } from 'lucide-react';

function VideoCallContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const room = searchParams.get('room');
  const [userName, setUserName] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Grab the user name if they are logged in so we can pass it to Jitsi
    const storedName = localStorage.getItem('cc_user_name') || 'Citizen';
    setUserName(storedName);
  }, []);

  if (!mounted) return null;

  if (!room) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 20 }}>Invalid Video Call Room</h1>
        <p style={{ color: '#64748b', marginBottom: 30 }}>No room identifier was provided in the URL.</p>
        <button onClick={() => router.back()} className="btn-secondary">Go Back</button>
      </div>
    );
  }

  // Construct Jitsi Meet URL with some config options
  // userInfo parameter allows pre-filling the display name
  const jitsiUrl = `https://meet.jit.si/${encodeURIComponent(room)}#userInfo.displayName="${encodeURIComponent(userName)}"&config.prejoinPageEnabled=true`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a' }}>
      <div style={{ 
        padding: '12px 24px', 
        background: '#1e293b', 
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'white' }}>
          <Video size={20} color="#3b82f6" />
          <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>CivicConnect Secure Meeting</span>
        </div>
        <button 
          onClick={() => router.back()}
          style={{ 
            display: 'flex', alignItems: 'center', gap: 6, 
            background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
            color: 'white', padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          <ArrowLeft size={16} /> Leave
        </button>
      </div>
      
      <div style={{ flex: 1, width: '100%', position: 'relative' }}>
        <iframe
          src={jitsiUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    </div>
  );
}

export default function VideoCallPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading Secure Room...</div>}>
      <VideoCallContent />
    </Suspense>
  );
}
