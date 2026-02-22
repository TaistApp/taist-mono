import React, { forwardRef, useCallback, useRef, useState } from 'react';
import { ScrollView, ScrollViewProps, StyleSheet, Text, View } from 'react-native';
import { AppColors } from '../../constants/theme';

interface FadingScrollViewProps extends ScrollViewProps {
  /** Size of the chevron indicator in px */
  chevronSize?: number;
}

const THRESHOLD = 5;

const FadingScrollView = forwardRef<ScrollView, FadingScrollViewProps>(
  ({ chevronSize = 24, children, onScroll, ...rest }, ref) => {
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

    const chevronStyle = {
      width: chevronSize,
      height: chevronSize,
      borderRadius: chevronSize / 2,
    };

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
          style={[rest.style, styles.scroll]}
        >
          {children}
        </ScrollView>

        {showLeft && (
          <View style={[styles.chevronWrap, styles.chevronLeft]} pointerEvents="none">
            <View style={[styles.chevronCircle, chevronStyle]}>
              <Text style={[styles.chevronText, { fontSize: chevronSize * 0.6 }]}>{'\u2039'}</Text>
            </View>
          </View>
        )}
        {showRight && (
          <View style={[styles.chevronWrap, styles.chevronRight]} pointerEvents="none">
            <View style={[styles.chevronCircle, chevronStyle]}>
              <Text style={[styles.chevronText, { fontSize: chevronSize * 0.6 }]}>{'\u203A'}</Text>
            </View>
          </View>
        )}
      </View>
    );
  },
);

FadingScrollView.displayName = 'FadingScrollView';

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'stretch',
    flexShrink: 0,
    flexGrow: 0,
  },
  scroll: {
    flexGrow: 0,
  },
  chevronWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  chevronLeft: {
    left: -4,
  },
  chevronRight: {
    right: -4,
  },
  chevronCircle: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronText: {
    color: AppColors.textOnPrimary,
    fontWeight: '700',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export default FadingScrollView;
