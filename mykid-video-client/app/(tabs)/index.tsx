import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, StyleSheet, TextInput, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WebView } from 'react-native-webview';

function getWsUrl() {
  const envUrl = process.env.EXPO_PUBLIC_WS_URL as string | undefined;
  return envUrl || 'ws://localhost:4000';
}

export default function ClientScreen() {
  const [code, setCode] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'joined' | 'error'>('idle');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const wsRef = useRef<WebSocket | null>(null);

  const canJoin = useMemo(() => /^\d{6}$/.test(code), [code]);

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

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Client</ThemedText>
      <ThemedText style={styles.label}>Enter Secret Code (6 digits)</ThemedText>
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
      {videoUrl ? (
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.label}>Playing:</ThemedText>
          <ThemedText numberOfLines={1}>{videoUrl}</ThemedText>
          <WebView style={{ flex: 1, marginTop: 8 }} source={{ uri: videoUrl }} allowsFullscreenVideo />
        </View>
      ) : (
        <ThemedText style={styles.hint}>Waiting for a YouTube URL from controller…</ThemedText>
      )}
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
