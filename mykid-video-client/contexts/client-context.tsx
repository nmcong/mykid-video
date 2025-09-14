import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';

interface ClientContextValue {
  code: string;
  setCode: (code: string) => void;
  status: 'idle' | 'connecting' | 'joined' | 'error';
  videoUrl: string;
  videoId: string;
  canJoin: boolean;
  connect: () => void;
  isPlaying: boolean;
  playbackSpeed: number;
  autoPlay: boolean;
  peerStatus?: { clientPresent: boolean; controlPresent: boolean };
}

export const ClientContext = createContext<ClientContextValue>({
  code: '',
  setCode: () => {},
  status: 'idle',
  videoUrl: '',
  videoId: '',
  canJoin: false,
  connect: () => {},
  isPlaying: true,
  playbackSpeed: 1,
  autoPlay: true,
  peerStatus: { clientPresent: false, controlPresent: false },
});

function getWsUrl() {
  const envUrl = process.env.EXPO_PUBLIC_WS_URL as string | undefined;
  return envUrl || 'ws://localhost:4000';
}

function extractYouTubeVideoId(inputUrl: string): string | null {
  try {
    const url = String(inputUrl).trim();
    const patterns: RegExp[] = [
      /(?:v=)([\w-]{6,})/i, // watch?v=
      /youtu\.be\/([\w-]{6,})/i, // youtu.be/
      /youtube\.com\/embed\/([\w-]{6,})/i, // /embed/
      /youtube\.com\/shorts\/([\w-]{6,})/i, // /shorts/
      /youtube\.com\/live\/([\w-]{6,})/i, // /live/
    ];
    for (const re of patterns) {
      const m = url.match(re);
      if (m && m[1]) return m[1];
    }
    return null;
  } catch {
    return null;
  }
}

interface ClientProviderProps {
  children: React.ReactNode;
}

export function ClientProvider({ children }: ClientProviderProps) {
  const [code, setCode] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'joined' | 'error'>('idle');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoId, setVideoId] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [autoPlay, setAutoPlay] = useState<boolean>(true);
  const [peerStatus, setPeerStatus] = useState<{ clientPresent: boolean; controlPresent: boolean }>({ clientPresent: false, controlPresent: false });
  const wsRef = useRef<WebSocket | null>(null);

  const canJoin = /^\d{6}$/.test(code);

  const connect = useCallback(() => {
    if (!canJoin) return;
    try { wsRef.current?.close(); } catch {}
    setStatus('connecting');
    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', role: 'client', code }));
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data));
        if (msg?.type === 'joined') {
          setStatus('joined');
        } else if (msg?.type === 'play' && typeof msg.url === 'string') {
          setVideoUrl(msg.url);
          const id = extractYouTubeVideoId(msg.url);
          setVideoId(id || '');
          setAutoPlay(true); // Auto-play new videos
        } else if (msg?.type === 'control') {
          // Handle playback controls from controller
          if (msg.action === 'pause') {
            setIsPlaying(false);
          } else if (msg.action === 'resume') {
            setIsPlaying(true);
          } else if (msg.action === 'speed' && typeof msg.speed === 'number') {
            // Ensure speed is within reasonable bounds (0.25x to 2x)
            const speed = Math.max(0.25, Math.min(2, msg.speed));
            setPlaybackSpeed(speed);
          } else if (msg.action === 'stop') {
            setIsPlaying(false);
            setAutoPlay(false);
          } else if (msg.action === 'seek' && typeof msg.seconds === 'number') {
            try {
              const ev = new CustomEvent('client-video-seek', { detail: { seconds: Number(msg.seconds) } });
              // @ts-expect-error custom event dispatch in RN web/DOM
              window.dispatchEvent(ev);
            } catch {}
          }
        } else if (msg?.type === 'peer_status') {
          setPeerStatus({ clientPresent: !!msg.clientPresent, controlPresent: !!msg.controlPresent });
        } else if (msg?.type === 'error') {
          setStatus('error');
        }
      } catch {}
    };
    ws.onerror = () => setStatus('error');
    ws.onclose = () => {
      if (status !== 'error') setStatus('idle');
    };
  }, [code, canJoin, status]);

  useEffect(() => {
    return () => {
      try { wsRef.current?.close(); } catch {}
    };
  }, []);

  const value: ClientContextValue = {
    code,
    setCode,
    status,
    videoUrl,
    videoId,
    canJoin,
    connect,
    isPlaying,
    playbackSpeed,
    autoPlay,
    peerStatus,
  };

  return (
    <ClientContext.Provider value={value}>
      {children}
    </ClientContext.Provider>
  );
}