import React, { useState, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Colors } from '../theme/colors';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type MediaViewerProps = {
  visible: boolean;
  uri: string;
  type: 'image' | 'video';
  senderName?: string;
  timestamp?: number;
  onClose: () => void;
};

export default function MediaViewer({ visible, uri, type, senderName, timestamp, onClose }: MediaViewerProps) {
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<Video>(null);

  const timeStr = timestamp
    ? new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '';

  const handleClose = useCallback(() => {
    videoRef.current?.stopAsync().catch(() => {});
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose} statusBarTranslucent>
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.95)" />
      <View style={s.overlay}>
        <View style={s.header}>
          <TouchableOpacity onPress={handleClose} style={s.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={s.closeIcon}>✕</Text>
          </TouchableOpacity>
          <View style={s.headerInfo}>
            {senderName ? <Text style={s.senderName} numberOfLines={1}>{senderName}</Text> : null}
            {timeStr ? <Text style={s.timeText}>{timeStr}</Text> : null}
          </View>
          <View style={{ width: 44 }} />
        </View>

        <View style={s.mediaContainer}>
          {type === 'video' ? (
            <Video
              ref={videoRef}
              source={{ uri }}
              style={s.video}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              useNativeControls
              isLooping={false}
              onLoadStart={() => setLoading(true)}
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)}
            />
          ) : (
            <Image
              source={{ uri }}
              style={s.image}
              resizeMode="contain"
              onLoadStart={() => setLoading(true)}
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)}
            />
          )}
          {loading && (
            <View style={s.loaderOverlay}>
              <ActivityIndicator size="large" color={Colors.neon} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 40 : 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 10,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  senderName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  timeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  mediaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_W,
    height: SCREEN_H * 0.75,
  },
  video: {
    width: SCREEN_W,
    height: SCREEN_H * 0.65,
    backgroundColor: '#000',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
