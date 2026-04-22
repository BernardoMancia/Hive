import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';

interface PeerStatusProps {
  peerCount: number;
  isConnected?: boolean;
}

export default function PeerStatus({ peerCount, isConnected = true }: PeerStatusProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(peerCount);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (peerCount === prevCount.current) return;
    prevCount.current = peerCount;

    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.15,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [peerCount]);

  const hexagons = useMemo(
    () => Array.from({ length: Math.min(peerCount, 6) }, (_, i) => i),
    [peerCount]
  );

  const dotColor = !isConnected
    ? Colors.offline
    : peerCount > 0
    ? Colors.online
    : Colors.textMuted;

  const statusText = !isConnected
    ? 'offline'
    : peerCount === 0
    ? 'no peers'
    : `${peerCount} ${peerCount === 1 ? 'peer' : 'peers'}`;

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ scale: pulseAnim }] },
      ]}
    >
      <View style={styles.hexGrid}>
        {hexagons.length > 0 ? (
          hexagons.map((_, i) => (
            <View
              key={i}
              style={[
                styles.hexagon,
                {
                  backgroundColor: i === 0 ? Colors.primary : `${Colors.primary}60`,
                  transform: [{ rotate: '30deg' }],
                },
              ]}
            />
          ))
        ) : (
          <View style={[styles.offlineDot, { backgroundColor: dotColor }]} />
        )}
      </View>
      <Text style={[styles.text, { color: !isConnected ? Colors.offline : Colors.primaryLight }]}>
        {statusText}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: Colors.primaryGlow,
  },
  hexGrid: {
    flexDirection: 'row',
    marginRight: 8,
    gap: 2,
    alignItems: 'center',
  },
  hexagon: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  offlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    ...Typography.small,
  },
});
