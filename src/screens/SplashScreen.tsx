import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Image,
  StatusBar,
  Dimensions,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import AppIcon, { ICONS } from '../components/AppIcon';

// ─── Types ───────────────────────────────────────────────────────────────────
type SplashScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Splash'
>;

interface Props {
  navigation: SplashScreenNavigationProp;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const { width } = Dimensions.get('window');
const MIN_DISPLAY_MS = 2800; // minimum time to show splash

// ─── Component ───────────────────────────────────────────────────────────────
export default function SplashScreen({ navigation }: Props) {
  // Animated values
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const dotsOpacity = useRef([
    new Animated.Value(0.2),
    new Animated.Value(0.2),
    new Animated.Value(0.2),
  ]).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const shimmerTranslate = useRef(new Animated.Value(-width)).current;

  const [statusMessage, setStatusMessage] = useState('Initializing…');

  // ── Shimmer loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerTranslate, {
        toValue: width,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [shimmerTranslate]);

  // ── Bouncing dots ─────────────────────────────────────────────────────────
  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.2,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ).start();

    dotsOpacity.forEach((dot, i) => animateDot(dot, i * 200));
  }, [dotsOpacity]);

  // ── Entrance animations + auth check ─────────────────────────────────────
  useEffect(() => {
    const startTime = Date.now();

    // Logo pop-in
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Title slide-up (after 300 ms)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, 300);

    // Subtitle fade-in (after 600 ms)
    setTimeout(() => {
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 600);

    // Progress bar animation
    Animated.timing(progressWidth, {
      toValue: 1,
      duration: MIN_DISPLAY_MS - 300,
      delay: 400,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false, // width cannot use native driver
    }).start();

    // ── Auth check ───────────────────────────────────────────────────────────
    const checkAuth = async () => {
      try {
        setStatusMessage('Checking authentication…');

        const unsubscribe = auth().onAuthStateChanged(async firebaseUser => {
          unsubscribe(); // only need one emission

          if (firebaseUser) {
            setStatusMessage('Loading your profile…');

            try {
              const snapshot = await firestore()
                .collection('users')
                .where('phone', '==', firebaseUser.phoneNumber)
                .get();

              let role: string | null = null;
              if (!snapshot.empty) {
                role = snapshot.docs[0].data().role ?? null;
              }

              // Ensure minimum display time
              const elapsed = Date.now() - startTime;
              const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);

              setTimeout(() => {
                setStatusMessage('Welcome back!');
                setTimeout(() => navigate(role), 300);
              }, remaining);
            } catch (err) {
              console.error('[SplashScreen] Firestore error:', err);
              handleError(startTime);
            }
          } else {
            // Not logged in
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);

            setTimeout(() => {
              setStatusMessage('Ready');
              setTimeout(() => navigate(null), 300);
            }, remaining);
          }
        });
      } catch (err) {
        console.error('[SplashScreen] Auth error:', err);
        handleError(startTime);
      }
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const navigate = (role: string | null) => {
    if (!role) {
      navigation.replace('Auth');
      return;
    }
    switch (role) {
      case 'driver':
        navigation.replace('App', { screen: 'DriverDashboard' });
        break;
      case 'admin':
        navigation.replace('App', { screen: 'AdminDashboard' });
        break;
      case 'student':
      default:
        navigation.replace('App', { screen: 'StudentDashboard' });
        break;
    }
  };

  const handleError = (startTime: number) => {
    setStatusMessage('Something went wrong…');
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
    setTimeout(() => navigation.replace('Auth'), remaining + 500);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0a1628"
        translucent={false}
      />

      {/* Background accent rings */}
      <View style={[styles.ring, styles.ring1]} />
      <View style={[styles.ring, styles.ring2]} />
      <View style={[styles.ring, styles.ring3]} />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}>
        <View style={styles.logoWrapper}>
          {/* Shimmer overlay on logo */}
          <Animated.View
            style={[
              styles.shimmer,
              { transform: [{ translateX: shimmerTranslate }] },
            ]}
          />
          <Image
            source={require('../../assets/images/college_bus_logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      {/* Title */}
      <Animated.View
        style={{
          opacity: titleOpacity,
          transform: [{ translateY: titleTranslateY }],
        }}>
        <Text style={styles.appTitle}>CollegeBus</Text>
        <Text style={styles.appSubtitle}>Smart Campus Transit</Text>
      </Animated.View>

      {/* Subtitle tagline */}
      <Animated.Text style={[styles.tagline, { opacity: subtitleOpacity }]}>
        Track your bus • Anytime • Anywhere
      </Animated.Text>

      {/* Bottom section */}
      <View style={styles.bottomSection}>
        {/* Status + dots */}
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>{statusMessage}</Text>
          <View style={styles.dotsRow}>
            {dotsOpacity.map((anim, i) => (
              <Animated.View
                key={i}
                style={[styles.dot, { opacity: anim }]}
              />
            ))}
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressWidth.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        {/* Footer */}
        <Text style={styles.version}>v1.0.0 · Powered by Firebase</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Accent Rings ────────────────────────────────────────────────────────────
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.12)',
  },
  ring1: { width: 300, height: 300 },
  ring2: { width: 450, height: 450, borderColor: 'rgba(59,130,246,0.07)' },
  ring3: { width: 600, height: 600, borderColor: 'rgba(59,130,246,0.04)' },

  // ── Logo ────────────────────────────────────────────────────────────────────
  logoContainer: {
    marginBottom: 28,
  },
  logoWrapper: {
    width: 130,
    height: 130,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    // Shadow
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 20,
  },
  logoImage: {
    width: 110,
    height: 110,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.08)',
    transform: [{ skewX: '-20deg' }],
    width: 60,
    zIndex: 10,
  },

  // ── Text ────────────────────────────────────────────────────────────────────
  appTitle: {
    fontSize: 40,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  appSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
    textAlign: 'center',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 20,
    letterSpacing: 0.5,
  },

  // ── Bottom ──────────────────────────────────────────────────────────────────
  bottomSection: {
    position: 'absolute',
    bottom: 48,
    left: 32,
    right: 32,
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginRight: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 99,
    backgroundColor: '#3b82f6',
  },
  progressTrack: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 99,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: '#3b82f6',
  },
  version: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.22)',
    letterSpacing: 0.3,
  },
});
