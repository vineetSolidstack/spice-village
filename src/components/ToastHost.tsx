/**
 * App-level toast host.
 *
 * Toasts are bottom-anchored above the tab bar and auto-dismiss after ~2.5s,
 * entering with a fade + small translate-up (no bounce), per the interaction
 * spec in the handoff.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { layout, motion } from '../theme';
import { Toast, type ToastTone } from './Toast';

const AUTO_DISMISS_MS = 2500;
/** Clears the 4-tab bar the customer and portal shells render. */
const ABOVE_TAB_BAR = 78;

type ToastState = { id: number; message: string; tone: ToastTone } | null;

type ToastContextValue = {
  /** Show a toast. Customer-facing success copy may be punny; portals stay plain. */
  showToast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const nextId = useRef(0);

  const showToast = useCallback((message: string, tone: ToastTone = 'success') => {
    nextId.current += 1;
    setToast({ id: nextId.current, message, tone });
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <ToastBubble
          // Remounting on id restarts the animation for back-to-back toasts.
          key={toast.id}
          message={toast.message}
          tone={toast.tone}
          onDone={() => setToast((current) => (current?.id === toast.id ? null : current))}
        />
      ) : null}
    </ToastContext.Provider>
  );
}

function ToastBubble({
  message,
  tone,
  onDone,
}: {
  message: string;
  tone: ToastTone;
  onDone: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const easing = Easing.bezier(motion.easeOut.x1, motion.easeOut.y1, motion.easeOut.x2, motion.easeOut.y2);

    Animated.timing(anim, {
      toValue: 1,
      duration: motion.durBase,
      easing,
      useNativeDriver: true,
    }).start();

    const id = setTimeout(() => {
      Animated.timing(anim, {
        toValue: 0,
        duration: motion.durFast,
        easing,
        useNativeDriver: true,
      }).start(onDone);
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(id);
  }, [anim, onDone]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });

  return (
    <View style={styles.layer} pointerEvents="none">
      <Animated.View style={{ opacity: anim, transform: [{ translateY }] }}>
        <Toast tone={tone}>{message}</Toast>
      </Animated.View>
    </View>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    bottom: ABOVE_TAB_BAR,
    left: layout.gutter,
    right: layout.gutter,
    alignItems: 'center',
  },
});
