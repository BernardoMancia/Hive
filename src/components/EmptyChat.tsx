import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';

export default function EmptyChat() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
        <Text style={styles.emoji}>🐝</Text>
      </Animated.View>
      <Text style={styles.title}>The hive is quiet...</Text>
      <Text style={styles.subtitle}>
        Be the first to send a message and{'\n'}
        start the buzz!
      </Text>
      <View style={styles.hexRow}>
        <Text style={styles.hex}>⬡</Text>
        <Text style={[styles.hex, styles.hexMid]}>⬡</Text>
        <Text style={styles.hex}>⬡</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  title: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  hexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hex: {
    fontSize: 18,
    color: Colors.primaryGlow,
    opacity: 0.4,
  },
  hexMid: {
    fontSize: 22,
    color: Colors.primary,
    opacity: 0.6,
  },
});
