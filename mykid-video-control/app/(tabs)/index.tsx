import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Button, StyleSheet, TextInput, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

function getWsUrl() {
  const envUrl = process.env.EXPO_PUBLIC_WS_URL as string | undefined;
  return envUrl || 'ws://localhost:4000';
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default function ControlScreen() {
  const [code, setCode] = useState<string>(generateCode());
  const [url, setUrl] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'joined' | 'error'>('idle');
  const [peer, setPeer] = useState<{ clientPresent: boolean; controlPresent: boolean }>({ clientPresent: false, controlPresent: false });
  const wsRef = useRef<WebSocket | null>(null);

  const isValidYouTube = useCallback((u: string) => !!extractYouTubeVideoId(u), []);
  const canJoin = useMemo(() => /^\d{6}$/.test(code), [code]);
  const canSend = useMemo(() => status === 'joined' && isValidYouTube(url), [status, url, isValidYouTube]);

  const connect = useCallback(() => {
    if (!canJoin) return;
    try {
      wsRef.current?.close();
    } catch {}
    setStatus('connecting');
    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', role: 'control', code }));
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data));
        if (msg?.type === 'joined') {
          setStatus('joined');
        } else if (msg?.type === 'peer_status') {
          setPeer({ clientPresent: !!msg.clientPresent, controlPresent: !!msg.controlPresent });
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

  const sendPlay = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || status !== 'joined') return;
    ws.send(JSON.stringify({ type: 'play', url: url.trim() }));
  }, [status, url]);

  const sendPause = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || status !== 'joined') return;
    ws.send(JSON.stringify({ type: 'pause' }));
  }, [status]);

  const sendResume = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || status !== 'joined') return;
    ws.send(JSON.stringify({ type: 'resume' }));
  }, [status]);

  const setSpeed = useCallback((speed: number) => {
    const ws = wsRef.current;
    if (!ws || status !== 'joined') return;
    ws.send(JSON.stringify({ type: 'speed', speed }));
  }, [status]);

  const sendStop = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || status !== 'joined') return;
    ws.send(JSON.stringify({ type: 'stop' }));
  }, [status]);

  const sendSeek = useCallback((seconds: number) => {
    const ws = wsRef.current;
    if (!ws || status !== 'joined') return;
    ws.send(JSON.stringify({ type: 'seek', seconds }));
  }, [status]);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Controller</ThemedText>
      <ThemedText style={styles.label}>Secret Code (6 digits)</ThemedText>
      <TextInput
        value={code}
        onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="123456"
        style={styles.input}
      />
      <View style={styles.row}>
        <Button title={status === 'joined' ? 'Paired' : 'Pair'} onPress={connect} disabled={!canJoin || status === 'connecting'} />
        <ThemedText style={styles.status}>{status}</ThemedText>
      </View>

      <View style={styles.divider} />

      <ThemedText style={styles.label}>YouTube URL</ThemedText>
      <TextInput
        value={url}
        onChangeText={setUrl}
        placeholder="https://www.youtube.com/watch?v=..."
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
      {!isValidYouTube(url) && url.length > 0 && (
        <ThemedText style={{ color: '#ef4444' }}>Invalid YouTube link</ThemedText>
      )}
      <Button title="Send to Client" onPress={sendPlay} disabled={!canSend} />
      <View style={styles.row}>
        <Button title="Pause" onPress={sendPause} disabled={!peer.clientPresent || status !== 'joined'} />
        <Button title="Resume" onPress={sendResume} disabled={!peer.clientPresent || status !== 'joined'} />
        <Button title="Stop" onPress={sendStop} disabled={!peer.clientPresent || status !== 'joined'} />
      </View>
      <View style={styles.row}>
        <Button title="0.5x" onPress={() => setSpeed(0.5)} disabled={!peer.clientPresent || status !== 'joined'} />
        <Button title="1x" onPress={() => setSpeed(1)} disabled={!peer.clientPresent || status !== 'joined'} />
        <Button title="1.5x" onPress={() => setSpeed(1.5)} disabled={!peer.clientPresent || status !== 'joined'} />
        <Button title="2x" onPress={() => setSpeed(2)} disabled={!peer.clientPresent || status !== 'joined'} />
      </View>
      <View style={styles.row}>
        <Button title="Seek -10s" onPress={() => sendSeek(-10)} disabled={!peer.clientPresent || status !== 'joined'} />
        <Button title="Seek +10s" onPress={() => sendSeek(10)} disabled={!peer.clientPresent || status !== 'joined'} />
      </View>
      <ThemedText style={styles.hint}>
        {peer.clientPresent ? 'Client connected' : 'Client not connected'} • {peer.controlPresent ? 'Control connected' : 'Control not connected'}
      </ThemedText>
      <ThemedText style={styles.hint}>Share the code with the client device to pair.</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    opacity: 0.8,
  },
  status: {
    textTransform: 'capitalize',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginVertical: 8,
  },
  hint: {
    opacity: 0.7,
  },
});

function extractYouTubeVideoId(inputUrl: string): string | null {
  try {
    const url = String(inputUrl).trim();
    const patterns: RegExp[] = [
      /(?:v=)([\w-]{6,})/i,
      /youtu\.be\/([\w-]{6,})/i,
      /youtube\.com\/embed\/([\w-]{6,})/i,
      /youtube\.com\/shorts\/([\w-]{6,})/i,
      /youtube\.com\/live\/([\w-]{6,})/i,
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
