import React, { useContext } from 'react';
import { Button, StyleSheet, TextInput, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ClientContext } from '@/contexts/client-context';

export default function ConnectScreen() {
  const { code, setCode, status, canJoin, connect } = useContext(ClientContext);

  const handleCodeChange = (text: string) => {
    setCode(text.replace(/[^0-9]/g, '').slice(0, 6));
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Connect to Controller</ThemedText>

      <View style={styles.formContainer}>
        <ThemedText style={styles.label}>Enter Secret Code (6 digits)</ThemedText>
        <TextInput
          value={code}
          onChangeText={handleCodeChange}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="123456"
          style={styles.input}
        />

        <View style={styles.buttonContainer}>
          <Button
            title={status === 'joined' ? 'Connected' : status === 'connecting' ? 'Connecting...' : 'Connect'}
            onPress={connect}
            disabled={!canJoin || status === 'connecting'}
          />
        </View>

        <View style={styles.statusContainer}>
          <ThemedText style={styles.statusLabel}>Status:</ThemedText>
          <ThemedText style={[styles.status, getStatusColor(status)]}>{getStatusText(status)}</ThemedText>
        </View>
      </View>

      <View style={styles.infoContainer}>
        <ThemedText style={styles.infoTitle}>How to Connect:</ThemedText>
        <ThemedText style={styles.infoStep}>1. Make sure your controller is running</ThemedText>
        <ThemedText style={styles.infoStep}>2. Enter the 6-digit code shown on controller</ThemedText>
        <ThemedText style={styles.infoStep}>3. Tap "Connect" to pair devices</ThemedText>
        <ThemedText style={styles.infoStep}>4. Switch to Video tab to watch</ThemedText>
      </View>
    </ThemedView>
  );
}

function getStatusText(status: string): string {
  switch (status) {
    case 'idle': return 'Ready to connect';
    case 'connecting': return 'Connecting...';
    case 'joined': return 'Connected successfully';
    case 'error': return 'Connection failed';
    default: return status;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'joined': return { color: '#10b981' };
    case 'error': return { color: '#ef4444' };
    case 'connecting': return { color: '#f59e0b' };
    default: return { color: '#6b7280' };
  }
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  formContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 2,
    fontWeight: '600',
  },
  buttonContainer: {
    marginTop: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  statusLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  infoContainer: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1e40af',
  },
  infoStep: {
    fontSize: 14,
    marginBottom: 6,
    paddingLeft: 8,
    opacity: 0.8,
  },
});
