import React, {useContext, useEffect, useRef} from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import YoutubePlayer from 'react-native-youtube-iframe';
import { ClientContext } from '@/contexts/client-context';

export default function VideoScreen() {
  const playerRef = useRef<any>(null);
  const { videoId, isPlaying, playbackSpeed, autoPlay } = useContext(ClientContext);
  const screenData = Dimensions.get('screen');

  // Ensure hook order is consistent across renders
  useEffect(() => {
    const handler = (e: any) => {
      const seconds = Number(e?.detail?.seconds || 0);
      if (!playerRef.current || Number.isNaN(seconds)) return;
      try {
        if (seconds >= 0) {
          playerRef.current.seekTo(seconds, true);
        } else {
          // Relative seek when negative seconds are sent
          playerRef.current.getCurrentTime?.().then((cur: number) => {
            const next = Math.max(0, (cur || 0) + seconds);
            playerRef.current.seekTo(next, true);
          }).catch(() => {});
        }
      } catch {}
    };
    try {
      if (typeof window !== 'undefined' && (window as any).addEventListener) {
        window.addEventListener('client-video-seek', handler as any);
        return () => {
          window.removeEventListener('client-video-seek', handler as any);
        };
      }
    } catch {}
    return () => {};
  }, []);

  if (!videoId) {
    return (
      <View style={styles.emptyState}>
        <ThemedText style={styles.emptyTitle}>No Video Playing</ThemedText>
        <ThemedText style={styles.emptyMessage}>
          Connect to a controller and start playing a video to see it here.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.fullScreenContainer}>
      <YoutubePlayer
        ref={playerRef}
        height={screenData.height}
        width={screenData.width}
        play={isPlaying}
        videoId={videoId}
        initialPlayerParams={{
          autoplay: autoPlay,
          controls: false,
          modestbranding: true,
          rel: false,
        }}
        playbackRate={playbackSpeed}
        webViewStyle={styles.fullScreenWebView}
        webViewProps={{
          scrollEnabled: false,
          bounces: false,
          showsHorizontalScrollIndicator: false,
          showsVerticalScrollIndicator: false,
          overScrollMode: 'never',
          contentInsetAdjustmentBehavior: 'never',
          mediaPlaybackRequiresUserAction: false,
          allowsInlineMediaPlayback: true,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 1,
  },
  fullScreenWebView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#000',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.8,
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#fff',
    opacity: 0.6,
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});