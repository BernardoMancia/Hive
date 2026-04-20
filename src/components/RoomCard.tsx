import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { ChatRoom } from '../types';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';

interface RoomCardProps {
  room: ChatRoom;
  peerCount: number;
  onPress: () => void;
  index: number;
}

export default function RoomCard({ room, peerCount, onPress, index }: RoomCardProps) {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={[
          styles.card,
          room.isAdult && styles.adultCard,
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: room.color + '20' }]}>
          <Text style={styles.icon}>{room.icon}</Text>
        </View>
        
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{room.name}</Text>
            {room.isAdult && (
              <View style={styles.adultBadge}>
                <Text style={styles.adultBadgeText}>+18</Text>
              </View>
            )}
          </View>
          <Text style={styles.description} numberOfLines={1}>
            {room.description}
          </Text>
        </View>
        
        <View style={styles.peerSection}>
          {peerCount > 0 && (
            <View style={styles.peerBadge}>
              <View style={styles.peerDot} />
              <Text style={styles.peerCount}>{peerCount}</Text>
            </View>
          )}
          <Text style={styles.chevron}>›</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  adultCard: {
    borderColor: Colors.adultGlow,
    backgroundColor: 'rgba(229, 57, 53, 0.04)',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  icon: {
    fontSize: 24,
  },
  info: {
    flex: 1,
    marginRight: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  name: {
    ...Typography.bodyBold,
    color: Colors.text,
  },
  description: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  adultBadge: {
    backgroundColor: Colors.adult,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  adultBadgeText: {
    ...Typography.badge,
    color: '#FFFFFF',
  },
  peerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  peerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.onlineGlow,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  peerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.online,
    marginRight: 5,
  },
  peerCount: {
    ...Typography.captionBold,
    color: Colors.online,
  },
  chevron: {
    fontSize: 22,
    color: Colors.textMuted,
    fontWeight: '300',
  },
});
