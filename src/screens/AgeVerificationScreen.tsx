import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { RootStackParamList } from '../types';
import { setAgeVerified } from '../services/presence';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AgeVerification'>;
  route: RouteProp<RootStackParamList, 'AgeVerification'>;
};

export default function AgeVerificationScreen({ navigation, route }: Props) {
  const { room } = route.params;
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleConfirm = async () => {
    await setAgeVerified();
    navigation.replace('Chat', { room });
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      <View style={styles.backdrop} />
      
      <Animated.View
        style={[
          styles.card,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔞</Text>
        </View>
        
        <Text style={styles.title}>Adult Content</Text>
        
        <Text style={styles.description}>
          The room <Text style={styles.roomName}>"{room.name}"</Text> contains 
          content intended exclusively for users aged 18 and over.
        </Text>
        
        <Text style={styles.warning}>
          By continuing, you declare that you are 18 years old or older and 
          accept full responsibility for accessing this content.
        </Text>
        
        <View style={styles.buttons}>
          <TouchableOpacity
            onPress={handleConfirm}
            style={styles.confirmButton}
            activeOpacity={0.85}
          >
            <Text style={styles.confirmText}>I'm 18+, enter</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleCancel}
            style={styles.cancelButton}
            activeOpacity={0.85}
          >
            <Text style={styles.cancelText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(229, 57, 53, 0.03)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.adultGlow,
    shadowColor: Colors.adult,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: Colors.adultGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    ...Typography.h2,
    color: Colors.adult,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  roomName: {
    color: Colors.text,
    fontWeight: '600',
  },
  warning: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  confirmButton: {
    backgroundColor: Colors.adult,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmText: {
    ...Typography.bodyBold,
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelText: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
  },
});
