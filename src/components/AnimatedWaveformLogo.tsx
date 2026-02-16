import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

/**
 * Bar height proportions – identical to WaveformLogo.tsx so the animated
 * version is a pixel-perfect stand-in for the static one.
 */
const BAR_HEIGHTS = [0.30, 0.55, 0.80, 0.50, 1.00, 0.45, 0.90, 0.60, 0.35];

const GAP_RATIO = 0.35;
const BAR_COUNT = BAR_HEIGHTS.length;

/** How much each bar stretches at the peak of a ripple (1 = no change). */
const RIPPLE_PEAK = 1.4;

/** Duration (ms) for one bar's up-then-down cycle. */
const BAR_CYCLE_MS = 400;

/** Stagger delay (ms) between consecutive bars in one sweep direction. */
const STAGGER_MS = 70;

/** Number of full left-right-left cycles before calling onComplete. */
const CYCLE_COUNT = 3;

type Props = {
  /** Overall size (dp) – the tallest bar will be this height. */
  size?: number;
  /** Bar colour. */
  color?: string;
  /** Called after all ripple cycles finish. */
  onComplete?: () => void;
};

export default function AnimatedWaveformLogo({
  size = 130,
  color = '#FFFFFF',
  onComplete,
}: Props) {
  const barWidth = size / (BAR_COUNT + (BAR_COUNT - 1) * GAP_RATIO);
  const gap = barWidth * GAP_RATIO;
  const pillRadius = barWidth / 2;

  const scales = useRef(BAR_HEIGHTS.map(() => new Animated.Value(1))).current;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const buildSweep = (reverse: boolean): Animated.CompositeAnimation => {
      const order = reverse
        ? [...Array(BAR_COUNT).keys()].reverse()
        : [...Array(BAR_COUNT).keys()];

      const barAnims = order.map((barIdx, seqPos) => {
        const delay = seqPos * STAGGER_MS;
        return Animated.sequence([
          Animated.delay(delay),
          Animated.timing(scales[barIdx], {
            toValue: RIPPLE_PEAK,
            duration: BAR_CYCLE_MS / 2,
            easing: Easing.out(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(scales[barIdx], {
            toValue: 1,
            duration: BAR_CYCLE_MS / 2,
            easing: Easing.in(Easing.sin),
            useNativeDriver: true,
          }),
        ]);
      });

      return Animated.parallel(barAnims);
    };

    const oneCycle = Animated.sequence([
      buildSweep(false),
      buildSweep(true),
    ]);

    let completed = 0;

    const runCycle = () => {
      oneCycle.start(({ finished }) => {
        if (!finished) return;
        completed += 1;
        if (completed < CYCLE_COUNT) {
          runCycle();
        } else {
          onCompleteRef.current?.();
        }
      });
    };

    runCycle();

    return () => {
      scales.forEach((s) => s.stopAnimation());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.wrap}>
      {BAR_HEIGHTS.map((h, i) => {
        const barHeight = size * h;
        return (
          <Animated.View
            key={i}
            style={{
              width: barWidth,
              height: barHeight,
              borderRadius: pillRadius,
              backgroundColor: color,
              marginLeft: i === 0 ? 0 : gap,
              transform: [{ scaleY: scales[i] }],
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
