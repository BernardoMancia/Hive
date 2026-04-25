import { StyleSheet } from 'react-native';

export const Typography = StyleSheet.create({
  hero: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
  },
  h1: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 16,
    fontWeight: '600',
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  bodyBold: {
    fontSize: 15,
    fontWeight: '600',
  },
  small: {
    fontSize: 12,
    fontWeight: '400',
  },
  caption: {
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  captionBold: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
