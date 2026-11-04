// Swipeable row with delete action
// Web-compatible version using TouchableOpacity

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { colors, spacing, radius, fontSize } from './theme';

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
}

export function SwipeableRow({ children, onDelete }: SwipeableRowProps) {
  const [showDelete, setShowDelete] = useState(false);

  // For web, use long press to reveal delete button
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.rowContent}
          onLongPress={() => setShowDelete(!showDelete)}
          delayLongPress={500}
          activeOpacity={0.8}
        >
          {children}
        </TouchableOpacity>
        {showDelete && (
          <View style={styles.deleteOverlay}>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => {
                setShowDelete(false);
                onDelete();
              }}
            >
              <Text style={styles.deleteIcon}>🗑</Text>
              <Text style={styles.deleteText}>Xoá</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowDelete(false)}
            >
              <Text style={styles.cancelText}>Huỷ</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // For native, use gesture handler
  return <SwipeableNative onDelete={onDelete}>{children}</SwipeableNative>;
}

// Native swipeable component - only loaded on native
function SwipeableNative({ children, onDelete }: SwipeableRowProps) {
  const swipeableRef = useRef<any>(null);

  // Dynamically require gesture handler for native only
  const { Swipeable, RectButton } = require('react-native-gesture-handler');

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    _dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const trans = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [80, 0],
    });

    return (
      <RectButton style={styles.rightAction} onPress={() => {
        swipeableRef.current?.close();
        onDelete();
      }}>
        <Animated.View style={[styles.actionContent, { transform: [{ translateX: trans }] }]}>
          <Text style={styles.actionIcon}>🗑</Text>
          <Text style={styles.actionText}>Xoá</Text>
        </Animated.View>
      </RectButton>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={40}
      renderRightActions={renderRightActions}
      overshootRight={false}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  rowContent: {
    flex: 1,
  },
  deleteOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: radius.lg,
    paddingLeft: spacing.md,
  },
  deleteBtn: {
    backgroundColor: colors.red,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  deleteIcon: {
    fontSize: 16,
  },
  deleteText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  cancelText: {
    color: '#fff',
    fontSize: fontSize.sm,
  },
  // Native swipeable styles
  rightAction: {
    backgroundColor: colors.red,
    justifyContent: 'center',
    alignItems: 'flex-end',
    width: 80,
  },
  actionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  actionIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  actionText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
