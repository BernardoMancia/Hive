import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { ConnectionState } from '../services/connection';

interface ConnectionBannerProps {
  status: ConnectionState;
  onReconnect?: () => void;
}

const STATUS_CONFIG = {
  connected: {
    text: 'Connected to the hive ⬡',
    bg: 'rgba(0, 230, 118, 0.12)',
    color: Colors.online,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    show: false,
  },
  disconnected: {
    text: 'No connection — tap to retry',
    bg: 'rgba(255, 82, 82, 0.12)',
    color: Colors.offline,
    borderColor: 'rgba(255, 82, 82, 0.3)',
    show: true,
  },
  reconnecting: {
    text: 'Reconnecting to peers...',
    bg: 'rgba(255, 214, 0, 0.12)',
    color: Colors.warning,
    borderColor: 'rgba(255, 214, 0, 0.3)',
    show: true,
  },
};

export default function ConnectionBanner({ status, onReconnect }: ConnectionBannerProps) {
  const heightAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const config = STATUS_CONFIG[status];

  useEffect(() => {
    const shouldShow = config.show;
    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue: shouldShow ? 36 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: shouldShow ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [status]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          height: heightAnim,
          opacity: opacityAnim,
          backgroundColor: config.bg,
          borderBottomColor: config.borderColor,
        },
      ]}
    >
      <TouchableOpacity
        onPress={status === 'disconnected' ? onReconnect : undefined}
        activeOpacity={status === 'disconnected' ? 0.7 : 1}
        style={styles.inner}
      >
        <View style={[styles.dot, { backgroundColor: config.color }]} />
        <Text style={[styles.text, { color: config.color }]}>{config.text}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    ...Typography.small,
    fontFamily: 'Inter_600SemiBold',
  },
});
