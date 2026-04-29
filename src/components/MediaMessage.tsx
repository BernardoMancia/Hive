import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';

interface MediaMessageProps {
  image?: string;
  video?: string;
  onPress?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_MAX_WIDTH = SCREEN_WIDTH * 0.55;

export default function MediaMessage({ image, video, onPress }: MediaMessageProps) {
  if (image) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={styles.container}
      >
        <Image
          source={{ uri: image }}
          style={styles.image}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  }

  if (video) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={styles.container}
      >
        <View style={styles.videoPlaceholder}>
          <Text style={styles.playIcon}>▶</Text>
          <Text style={styles.videoLabel}>Play video</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  image: {
    width: IMAGE_MAX_WIDTH,
    height: IMAGE_MAX_WIDTH * 0.75,
    borderRadius: 12,
  },
  videoPlaceholder: {
    width: IMAGE_MAX_WIDTH,
    height: IMAGE_MAX_WIDTH * 0.56,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  playIcon: {
    fontSize: 36,
    color: Colors.primary,
    marginBottom: 6,
  },
  videoLabel: {
    ...Typography.caption,
    color: Colors.textSub,
  },
});
