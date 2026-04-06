import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../hooks/useTheme';
import { sleepTimerStore } from '../store/sleepTimerStore';

/** Format seconds into MM:SS or H:MM:SS. */
function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export const SleepTimerButton = memo(function SleepTimerButton() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const endTime = sleepTimerStore((s) => s.endTime);
  const endOfTrack = sleepTimerStore((s) => s.endOfTrack);
  const remaining = sleepTimerStore((s) => s.remaining);
  const showSheet = sleepTimerStore((s) => s.showSheet);

  const isActive = endTime != null || endOfTrack;

  const handlePress = useCallback(() => {
    showSheet();
  }, [showSheet]);

  const iconColor = isActive ? colors.primary : colors.textPrimary;

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={t('sleepTimer')}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={isActive ? 'moon' : 'moon-outline'} size={20} color={iconColor} />
      {isActive && remaining != null && (
        <Text
          style={[styles.countdown, { color: colors.primary }]}
          allowFontScaling={false}
        >
          {formatCountdown(remaining)}
        </Text>
      )}
      {isActive && endOfTrack && (
        <View style={[styles.dot, { backgroundColor: colors.primary }]} />
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  countdown: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginLeft: 2,
  },
  pressed: {
    opacity: 0.6,
  },
});
