import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';

interface PeerStatusProps {
  peerCount: number;
}

export default function PeerStatus({ peerCount }: PeerStatusProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const hexagons = Array.from({ length: Math.min(peerCount, 8) }, (_, i) => i);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.hexGrid}>
        {hexagons.map((_, i) => (
          <View
            key={i}
            style={[
              styles.hexagon,
              {
                backgroundColor: i === 0 ? Colors.primary : Colors.primary + '60',
                transform: [{ rotate: '30deg' }],
              },
            ]}
          />
        ))}
      </View>
      <Text style={styles.text}>
        {peerCount} {peerCount === 1 ? 'peer online' : 'peers online'}
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
  },
  hexagon: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  text: {
    ...Typography.small,
    color: Colors.primaryLight,
  },
});
