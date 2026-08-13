/**
 * VidyaSetu ERP — Mobile Device Verification Screen
 * ===================================================
 * Shown after login from a new mobile device.
 * Polls the backend every 5 seconds for verification status.
 * 
 * Navigation integration:
 *   - Receives loginAttemptId as route param
 *   - On VERIFIED → navigate to Home and trigger session setup
 *   - On REJECTED / EXPIRED → navigate back to Login
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Animated, Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import mobileDeviceService from '../../services/deviceService';

type PollStatus = 'polling' | 'verified' | 'rejected' | 'expired';

interface DeviceVerificationScreenProps {
  route: { params: { loginAttemptId: string } };
  navigation: any;
}

const POLL_INTERVAL_MS = 5000;
const MAX_SECONDS = 30 * 60;

export default function DeviceVerificationScreen({
  route,
  navigation,
}: DeviceVerificationScreenProps) {
  const { loginAttemptId } = route.params;
  const [status, setStatus] = useState<PollStatus>('polling');
  const [elapsed, setElapsed] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for the icon
  useEffect(() => {
    if (status === 'polling') {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0,  duration: 900, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
  }, [status, pulseAnim]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const doPoll = async () => {
        try {
          const res = await mobileDeviceService.getAttemptStatus(loginAttemptId);
          if (res.status === 'VERIFIED') {
            setStatus('verified');
            stopPolling();
            setTimeout(() => navigation.replace('Login'), 2000);
          } else if (res.status === 'REJECTED') {
            setStatus('rejected');
            stopPolling();
          } else if (res.status === 'EXPIRED') {
            setStatus('expired');
            stopPolling();
          }
        } catch {
          // Keep polling on network errors
        }
      };

      doPoll();
      intervalRef.current = setInterval(doPoll, POLL_INTERVAL_MS);

      timerRef.current = setInterval(() => {
        setElapsed(prev => {
          if (prev >= MAX_SECONDS) {
            setStatus('expired');
            stopPolling();
          }
          return prev + 1;
        });
      }, 1000);

      return () => stopPolling();
    }, [loginAttemptId, navigation, stopPolling])
  );

  const remaining = Math.max(0, MAX_SECONDS - elapsed);
  const mm = Math.floor(remaining / 60).toString().padStart(2, '0');
  const ss = (remaining % 60).toString().padStart(2, '0');

  const statusColors: Record<PollStatus, string> = {
    polling: '#818cf8',
    verified: '#34d399',
    rejected: '#f87171',
    expired:  '#f87171',
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Icon */}
      <Animated.View style={[styles.iconWrap, { transform: [{ scale: pulseAnim }], borderColor: statusColors[status] }]}>
        <Text style={styles.iconEmoji}>
          {status === 'polling'  && '📧'}
          {status === 'verified' && '✅'}
          {status === 'rejected' && '🚫'}
          {status === 'expired'  && '⏰'}
        </Text>
      </Animated.View>

      {/* Status Badge */}
      <View style={[styles.badge, { backgroundColor: `${statusColors[status]}18`, borderColor: `${statusColors[status]}40` }]}>
        <Text style={[styles.badgeText, { color: statusColors[status] }]}>
          {status === 'polling'  && 'Waiting for Approval'}
          {status === 'verified' && 'Device Approved!'}
          {status === 'rejected' && 'Login Blocked'}
          {status === 'expired'  && 'Link Expired'}
        </Text>
      </View>

      {/* Title & Subtitle */}
      {status === 'polling' && (
        <>
          <Text style={styles.title}>Check Your Email</Text>
          <Text style={styles.subtitle}>
            A login verification email has been sent to your registered email address.
            Open it and tap{' '}
            <Text style={styles.highlight}>"Yes, This Is Me — Allow Login"</Text>
            {' '}to continue.
          </Text>

          {/* Steps */}
          <View style={styles.steps}>
            {[
              'Open your registered email inbox',
              'Find the email from VidyaSetu ERP',
              'Tap "Yes, This Is Me — Allow Login"',
            ].map((step, i) => (
              <View key={i} style={styles.step}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          {/* Timer */}
          <View style={styles.timerRow}>
            <ActivityIndicator size="small" color="#6366f1" />
            <Text style={styles.timerText}>
              {'  '}Auto-checking · Link expires in{' '}
              <Text style={styles.timerValue}>{mm}:{ss}</Text>
            </Text>
          </View>

          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              🛡️ If you did <Text style={styles.bold}>not</Text> attempt this login,
              tap <Text style={styles.bold}>"Block This Login"</Text> in the email immediately
              to protect your account.
            </Text>
          </View>
        </>
      )}

      {status === 'verified' && (
        <>
          <Text style={styles.title}>Device Approved! 🎉</Text>
          <Text style={styles.subtitle}>Your device has been verified. Redirecting you to login...</Text>
        </>
      )}

      {(status === 'rejected' || status === 'expired') && (
        <>
          <Text style={styles.title}>
            {status === 'rejected' ? 'Login Blocked' : 'Link Expired'}
          </Text>
          <Text style={styles.subtitle}>
            {status === 'rejected'
              ? 'You blocked this login. Your account is safe. Please change your password if needed.'
              : 'The verification link has expired. Please try logging in again.'
            }
          </Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.replace('Login')}
          >
            <Text style={styles.backBtnText}>Back to Login</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0c14',
    padding: 24,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconEmoji: {
    fontSize: 34,
  },
  badge: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f1f5f9',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  highlight: {
    color: '#818cf8',
    fontWeight: '600',
  },
  steps: {
    width: '100%',
    gap: 10,
    marginBottom: 20,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(99,102,241,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.12)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: {
    color: '#cbd5e1',
    fontSize: 13,
    flex: 1,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timerText: {
    fontSize: 13,
    color: '#64748b',
  },
  timerValue: {
    fontWeight: '700',
    color: '#818cf8',
  },
  warningBox: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
    borderRadius: 8,
    padding: 14,
    width: '100%',
  },
  warningText: {
    fontSize: 12,
    color: '#fbbf24',
    lineHeight: 18,
  },
  bold: {
    fontWeight: '700',
  },
  backBtn: {
    marginTop: 20,
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.25)',
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 40,
  },
  backBtnText: {
    color: '#818cf8',
    fontWeight: '600',
    fontSize: 14,
  },
});
