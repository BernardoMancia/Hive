import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';

export default function EmptyChat() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const floatLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: true,
        }),
      ])
    );
    floatLoop.current = loop;
    loop.start();

    return () => {
      floatLoop.current?.stop();
    };
  }, []);

  return (
    <View style={styles.flipWrapper}>
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
          {'Be the first to send a message\nand start the buzz!'}
        </Text>

        <View style={styles.hexRow}>
          <Text style={styles.hexLeft}>⬡</Text>
          <Text style={styles.hexCenter}>⬡</Text>
          <Text style={styles.hexRight}>⬡</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flipWrapper: {
    flex: 1,
    transform: [{ scaleY: -1 }],
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  emoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  title: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  hexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hexLeft: {
    fontSize: 16,
    color: Colors.textMuted,
    opacity: 0.3,
  },
  hexCenter: {
    fontSize: 22,
    color: Colors.primary,
    opacity: 0.5,
  },
  hexRight: {
    fontSize: 16,
    color: Colors.textMuted,
    opacity: 0.3,
  },
});
