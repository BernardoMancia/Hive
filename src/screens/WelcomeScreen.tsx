import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { RootStackParamList } from '../types';
import { getUserName, setUserName, getUserId, initPresence } from '../services/presence';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Welcome'>;
};

export default function WelcomeScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

  const logoScale = useRef(new Animated.Value(0)).current;
  const titleFade = useRef(new Animated.Value(0)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;
  const inputSlide = useRef(new Animated.Value(40)).current;
  const inputFade = useRef(new Animated.Value(0)).current;
  const buttonFade = useRef(new Animated.Value(0)).current;
  const hexRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkExistingUser();
    startAnimations();
  }, []);

  const checkExistingUser = async () => {
    try {
      const existingName = await getUserName();
      if (existingName) {
        const userId = await getUserId();
        await initPresence(userId, existingName);
        navigation.replace('Home');
        return;
      }
    } catch (e) {
      console.warn('[Hive] Check existing user failed:', e);
    }
    setLoading(false);
  };

  const startAnimations = () => {
    Animated.loop(
      Animated.timing(hexRotation, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    ).start();

    Animated.stagger(200, [
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(titleFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(subtitleFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(inputSlide, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(inputFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(buttonFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleEnter = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      Alert.alert('Invalid name', 'Please enter at least 2 characters.');
      return;
    }
    if (trimmed.length > 20) {
      Alert.alert('Invalid name', 'Maximum 20 characters allowed.');
      return;
    }

    try {
      await setUserName(trimmed);
      const userId = await getUserId();
      await initPresence(userId, trimmed);
      navigation.replace('Home');
    } catch (e) {
      Alert.alert('Error', 'Failed to initialize. Please try again.');
    }
  };

  const spin = hexRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (loading) return <View style={styles.container} />;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      <View style={styles.bgDecor}>
        <Animated.View
          style={[
            styles.hexBg,
            { transform: [{ rotate: spin }] },
          ]}
        >
          <Text style={styles.hexBgText}>⬡</Text>
        </Animated.View>
      </View>

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoContainer,
            { transform: [{ scale: logoScale }] },
          ]}
        >
          <Text style={styles.logoEmoji}>🐝</Text>
          <View style={styles.logoGlow} />
        </Animated.View>

        <Animated.Text style={[styles.title, { opacity: titleFade }]}>
          Hive
        </Animated.Text>

        <Animated.Text style={[styles.subtitle, { opacity: subtitleFade }]}>
          Decentralized P2P Chat{'\n'}
          Every peer sustains the network
        </Animated.Text>

        <Animated.View
          style={[
            styles.inputContainer,
            {
              opacity: inputFade,
              transform: [{ translateY: inputSlide }],
            },
          ]}
        >
          <TextInput
            style={styles.input}
            placeholder="What should we call you?"
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
            maxLength={20}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={handleEnter}
          />
        </Animated.View>

        <Animated.View style={{ opacity: buttonFade, width: '100%' }}>
          <TouchableOpacity
            style={[
              styles.button,
              name.trim().length < 2 && styles.buttonDisabled,
            ]}
            onPress={handleEnter}
            disabled={name.trim().length < 2}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Join the Hive</Text>
            <Text style={styles.buttonArrow}>→</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.features, { opacity: buttonFade }]}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🔒</Text>
            <Text style={styles.featureText}>No central server</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>👤</Text>
            <Text style={styles.featureText}>No login required</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🌐</Text>
            <Text style={styles.featureText}>Distributed network</Text>
          </View>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bgDecor: {
    position: 'absolute',
    top: -80,
    right: -60,
    opacity: 0.04,
  },
  hexBg: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hexBgText: {
    fontSize: 200,
    color: Colors.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: Colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.borderActive,
  },
  logoEmoji: {
    fontSize: 48,
  },
  logoGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primaryGlow,
    opacity: 0.4,
  },
  title: {
    ...Typography.hero,
    color: Colors.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    ...Typography.body,
    color: Colors.text,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 10,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    ...Typography.bodyBold,
    color: Colors.textInverse,
    fontSize: 16,
  },
  buttonArrow: {
    fontSize: 18,
    color: Colors.textInverse,
    fontWeight: '600',
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 40,
    flexWrap: 'wrap',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureIcon: {
    fontSize: 14,
  },
  featureText: {
    ...Typography.small,
    color: Colors.textMuted,
  },
});
