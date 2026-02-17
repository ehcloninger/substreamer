/**
 * SwipeableRow – drop-in swipeable row built on ReanimatedSwipeable.
 *
 * Reveals action buttons behind the row when the user swipes left or right.
 * Each action appears as a colored circular disc with a white icon and label,
 * matching the iOS Mail style.
 *
 * - Swipe physics, snap-back, and alignment handled by the library
 * - Long press and tap handled via a Pressable wrapper
 * - Module-level `closeOpenRow()` export for scroll-to-close behaviour
 */

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/utils/haptics';
import { memo, useCallback, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { useTheme } from '../hooks/useTheme';

/* ------------------------------------------------------------------ */
/*  Module-level: active row tracking                                  */
/* ------------------------------------------------------------------ */

interface SwipeableMethods {
  close: () => void;
  openLeft: () => void;
  openRight: () => void;
  reset: () => void;
}

let _activeRef: SwipeableMethods | null = null;

/**
 * Close whichever SwipeableRow is currently peeked open (if any).
 * Call from list `onScrollBeginDrag` so open rows close on scroll.
 */
export function closeOpenRow() {
  _activeRef?.close();
  _activeRef = null;
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SwipeAction {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  /** Text label displayed below the icon (e.g., "Queue", "Favorite"). */
  label?: string;
  onPress: () => void;
  /** When true the row is removed from the list after the action fires. */
  removesRow?: boolean;
}

export interface SwipeableRowProps {
  /** Actions revealed when swiping RIGHT (content moves right, buttons on left). */
  rightActions?: SwipeAction[];
  /** Actions revealed when swiping LEFT (content moves left, buttons on right). */
  leftActions?: SwipeAction[];
  /** Called when a long-press gesture activates. */
  onLongPress?: () => void;
  /** Called when the row is tapped. */
  onPress?: () => void;
  children: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ACTION_WIDTH = 74;
const ICON_SIZE = 22;
const ICON_DISC_SIZE = 46;

/* ------------------------------------------------------------------ */
/*  SwipeableRow                                                       */
/* ------------------------------------------------------------------ */

export const SwipeableRow = memo(function SwipeableRow({
  rightActions = [],
  leftActions = [],
  onLongPress,
  onPress,
  children,
}: SwipeableRowProps) {
  const { colors } = useTheme();
  const swipeableRef = useRef<SwipeableMethods>(null);
  const isOpenRef = useRef(false);

  const hasRight = rightActions.length > 0;
  const hasLeft = leftActions.length > 0;

  /* ---- Swipeable event handlers ---- */

  const handleOpenStartDrag = useCallback(() => {
    if (_activeRef && _activeRef !== swipeableRef.current) {
      _activeRef.close();
      _activeRef = null;
    }
  }, []);

  const handleSwipeableOpen = useCallback(() => {
    isOpenRef.current = true;
    _activeRef = swipeableRef.current;
  }, []);

  const handleSwipeableClose = useCallback(() => {
    isOpenRef.current = false;
    if (_activeRef === swipeableRef.current) {
      _activeRef = null;
    }
  }, []);

  /* ---- Tap / long-press handlers ---- */

  const handlePress = useCallback(() => {
    if (isOpenRef.current) {
      swipeableRef.current?.close();
      return;
    }
    onPress?.();
  }, [onPress]);

  const handleLongPress = useCallback(() => {
    if (isOpenRef.current) {
      swipeableRef.current?.close();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onLongPress?.();
  }, [onLongPress]);

  /* ---- Action panel render functions ---- */

  // renderLeftActions = shown when swiping RIGHT = our rightActions
  const renderLeftPanel = useCallback(
    (
      progress: SharedValue<number>,
      _translation: SharedValue<number>,
      methods: SwipeableMethods,
    ) => (
      <ActionPanel
        actions={rightActions}
        progress={progress}
        bgColor={colors.background}
        methods={methods}
      />
    ),
    [rightActions, colors.background],
  );

  // renderRightActions = shown when swiping LEFT = our leftActions
  const renderRightPanel = useCallback(
    (
      progress: SharedValue<number>,
      _translation: SharedValue<number>,
      methods: SwipeableMethods,
    ) => (
      <ActionPanel
        actions={leftActions}
        progress={progress}
        bgColor={colors.background}
        methods={methods}
      />
    ),
    [leftActions, colors.background],
  );

  return (
    <ReanimatedSwipeable
      ref={swipeableRef as any}
      friction={2}
      overshootFriction={8}
      leftThreshold={40}
      rightThreshold={40}
      overshootLeft={hasRight}
      overshootRight={hasLeft}
      renderLeftActions={hasRight ? renderLeftPanel : undefined}
      renderRightActions={hasLeft ? renderRightPanel : undefined}
      onSwipeableOpenStartDrag={handleOpenStartDrag}
      onSwipeableOpen={handleSwipeableOpen}
      onSwipeableClose={handleSwipeableClose}
    >
      <Pressable
        onPress={handlePress}
        onLongPress={onLongPress ? handleLongPress : undefined}
        delayLongPress={400}
      >
        {children}
      </Pressable>
    </ReanimatedSwipeable>
  );
});

/* ------------------------------------------------------------------ */
/*  ActionPanel – row of action buttons behind the swiped content      */
/* ------------------------------------------------------------------ */

interface ActionPanelProps {
  actions: SwipeAction[];
  progress: SharedValue<number>;
  bgColor: string;
  methods: SwipeableMethods;
}

function ActionPanel({ actions, progress, bgColor, methods }: ActionPanelProps) {
  return (
    <View style={[styles.actionPanel, { backgroundColor: bgColor }]}>
      {actions.map((action, index) => (
        <ActionButton
          key={index}
          action={action}
          progress={progress}
          methods={methods}
        />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  ActionButton – circular disc with icon + label                     */
/* ------------------------------------------------------------------ */

interface ActionButtonProps {
  action: SwipeAction;
  progress: SharedValue<number>;
  methods: SwipeableMethods;
}

const ActionButton = memo(function ActionButton({
  action,
  progress,
  methods,
}: ActionButtonProps) {
  const discStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          progress.value,
          [0, 0.6, 1],
          [0.5, 1, 1],
          'clamp',
        ),
      },
    ],
    opacity: interpolate(progress.value, [0, 0.3, 1], [0, 1, 1], 'clamp'),
  }));

  const handlePress = useCallback(() => {
    action.onPress();
    methods.close();
  }, [action, methods]);

  return (
    <Pressable onPress={handlePress} style={styles.actionButton}>
      <Animated.View
        style={[styles.iconDisc, { backgroundColor: action.color }, discStyle]}
      >
        <Ionicons name={action.icon} size={ICON_SIZE} color="#fff" />
      </Animated.View>
      {action.label != null && (
        <Text style={styles.actionLabel} numberOfLines={1}>
          {action.label}
        </Text>
      )}
    </Pressable>
  );
});

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  actionPanel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: ACTION_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  iconDisc: {
    width: ICON_DISC_SIZE,
    height: ICON_DISC_SIZE,
    borderRadius: ICON_DISC_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
