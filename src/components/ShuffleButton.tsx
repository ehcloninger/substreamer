/**
 * ShuffleButton – one-shot shuffle action for the play queue.
 *
 * Renders an Ionicons `shuffle` icon that fires the provided
 * onPress callback.  Visually matches the skip/repeat/rate controls.
 */

import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '../hooks/useTheme';

export interface ShuffleButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

export const ShuffleButton = memo(function ShuffleButton({
  onPress,
  disabled = false,
}: ShuffleButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Shuffle queue"
      style={({ pressed }) => [
        styles.container,
        (pressed || disabled) && styles.pressed,
      ]}
    >
      <Ionicons name="shuffle" size={20} color={colors.textPrimary} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  pressed: {
    opacity: 0.6,
  },
});
