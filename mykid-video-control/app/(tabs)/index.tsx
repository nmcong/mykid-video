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
  const wsRef = useRef<WebSocket | null>(null);

  const canJoin = useMemo(() => /^\d{6}$/.test(code), [code]);
  const canSend = useMemo(() => status === 'joined' && url.trim().length > 0, [status, url]);

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
      <Button title="Send to Client" onPress={sendPlay} disabled={!canSend} />
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
