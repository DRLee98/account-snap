import { ReactNode, useRef } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type {
  GestureStateChangeEvent,
  GestureUpdateEvent,
  PanGestureChangeEventPayload,
  PanGestureHandlerEventPayload,
} from 'react-native-gesture-handler';

type Props = {
  children: ReactNode;
  leftActions?: ReactNode;
  rightActions?: ReactNode;
  /** 좌표 이동이 거의 없는 진짜 탭일 때만 호출 (스와이프 중엔 fire 안 됨) */
  onPress?: () => void;
  style?: ViewStyle;
};

export default function SwipeableListItem({
  children,
  leftActions,
  rightActions,
  onPress,
  style,
}: Props) {
  const leftWidth = useRef(0);
  const rightWidth = useRef(0);
  const offset = useRef(new Animated.Value(0)).current;
  const offsetValue = useRef(0);

  const setOffset = (v: number) => {
    offsetValue.current = v;
    offset.setValue(v);
  };

  const springTo = (to: number) => {
    offsetValue.current = to;
    Animated.spring(offset, {
      toValue: to,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  };

  const onLayout = (
    e: LayoutChangeEvent,
    ref: React.MutableRefObject<number>,
  ) => {
    ref.current = e.nativeEvent.layout.width;
  };

  const closeActions = () => springTo(0);

  const onPanChange = (
    e: GestureUpdateEvent<
      PanGestureHandlerEventPayload & PanGestureChangeEventPayload
    >,
  ) => {
    const next = offsetValue.current + e.changeX;
    if (next > 1) {
      setOffset(Math.min(next, leftWidth.current));
    } else {
      setOffset(Math.max(next, -rightWidth.current));
    }
  };

  const onPanEnd = (
    e: GestureStateChangeEvent<PanGestureHandlerEventPayload>,
  ) => {
    const tx = e.translationX;
    if (leftWidth.current > 0 && offsetValue.current >= 0) {
      if (tx > 0 && offsetValue.current < leftWidth.current) {
        return springTo(tx > 30 ? leftWidth.current : 0);
      }
      return springTo(tx < -30 ? 0 : leftWidth.current);
    }
    if (rightWidth.current > 0 && offsetValue.current <= 0) {
      if (tx < 0 && offsetValue.current > -rightWidth.current) {
        return springTo(tx < -30 ? -rightWidth.current : 0);
      }
      return springTo(tx > 30 ? 0 : -rightWidth.current);
    }
    springTo(offsetValue.current);
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .onChange(onPanChange)
    .onEnd(onPanEnd)
    .runOnJS(true);

  const tap = Gesture.Tap()
    .maxDistance(8)
    .onEnd((_, success) => {
      if (success && onPress) onPress();
    })
    .runOnJS(true);

  const composed = Gesture.Race(pan, tap);

  return (
    <View style={[styles.container, style]}>
      {leftActions ? (
        <View
          style={[styles.actions, styles.actionsLeft]}
          onTouchEnd={closeActions}
          onLayout={e => onLayout(e, leftWidth)}
        >
          {leftActions}
        </View>
      ) : null}
      <GestureDetector gesture={composed}>
        <Animated.View
          style={[styles.row, { transform: [{ translateX: offset }] }]}
        >
          {children}
        </Animated.View>
      </GestureDetector>
      {rightActions ? (
        <View
          style={[styles.actions, styles.actionsRight]}
          onTouchEnd={closeActions}
          onLayout={e => onLayout(e, rightWidth)}
        >
          {rightActions}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative' },
  row: { zIndex: 1 },
  actions: { position: 'absolute', top: 0, bottom: 0, zIndex: 0 },
  actionsLeft: { left: 0 },
  actionsRight: { right: 0 },
});
