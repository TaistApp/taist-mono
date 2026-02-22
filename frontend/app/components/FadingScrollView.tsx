import React, { forwardRef, useCallback, useRef, useState } from 'react';
import { ScrollView, ScrollViewProps, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppColors } from '../../constants/theme';

interface FadingScrollViewProps extends ScrollViewProps {
  /** Color to fade into at the edges — should match parent background */
  fadeColor?: string;
  /** Width of each fade gradient in px */
  fadeWidth?: number;
}

const THRESHOLD = 5;

const FadingScrollView = forwardRef<ScrollView, FadingScrollViewProps>(
  ({ fadeColor = AppColors.surface, fadeWidth = 32, children, onScroll, ...rest }, ref) => {
    const [showLeft, setShowLeft] = useState(false);
    const [showRight, setShowRight] = useState(false);

    const state = useRef({ x: 0, contentW: 0, containerW: 0 });

    const update = useCallback(() => {
      const { x, contentW, containerW } = state.current;
      const scrollable = contentW > containerW + THRESHOLD;
      const left = scrollable && x > THRESHOLD;
      const right = scrollable && x < contentW - containerW - THRESHOLD;
      setShowLeft((prev) => (prev !== left ? left : prev));
      setShowRight((prev) => (prev !== right ? right : prev));
    }, []);

    const handleScroll = useCallback(
      (e: any) => {
        state.current.x = e.nativeEvent.contentOffset.x;
        update();
        onScroll?.(e);
      },
      [onScroll, update],
    );

    const handleContentSizeChange = useCallback(
      (w: number, _h: number) => {
        state.current.contentW = w;
        update();
      },
      [update],
    );

    const handleLayout = useCallback(
      (e: any) => {
        state.current.containerW = e.nativeEvent.layout.width;
        update();
      },
      [update],
    );

    return (
      <View style={styles.wrapper} onLayout={handleLayout}>
        <ScrollView
          {...rest}
          ref={ref}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          onContentSizeChange={handleContentSizeChange}
        >
          {children}
        </ScrollView>

        {showLeft && (
          <LinearGradient
            colors={[fadeColor, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fade, styles.fadeLeft, { width: fadeWidth }]}
            pointerEvents="none"
          />
        )}
        {showRight && (
          <LinearGradient
            colors={['transparent', fadeColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fade, styles.fadeRight, { width: fadeWidth }]}
            pointerEvents="none"
          />
        )}
      </View>
    );
  },
);

FadingScrollView.displayName = 'FadingScrollView';

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  fade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  fadeLeft: {
    left: 0,
  },
  fadeRight: {
    right: 0,
  },
});

export default FadingScrollView;
