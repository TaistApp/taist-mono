import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { InitializeNotification } from '../../firebase';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { hideLoading } from '../../reducers/loadingSlice';
import Indicator from './indicator';

/**
 * Longest the blocking overlay may stay up. Nothing in the app legitimately
 * blocks this long; past it the spinner is a stuck flag, not a real load, and
 * leaving it up locks the user out of the screen entirely (this is what made
 * signing back in after a logout impossible).
 */
const MAX_LOADING_MS = 30000;

type Props = {children: React.ReactNode};
const ProgressProvider = ({children}: Props) => {
  const isLoading = useAppSelector(state => state.loading.value);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => {
      console.warn(`Loading overlay exceeded ${MAX_LOADING_MS}ms — clearing it`);
      dispatch(hideLoading());
    }, MAX_LOADING_MS);
    return () => clearTimeout(timer);
  }, [isLoading, dispatch]);

  return (
    <View style={styles.container}>
      {children}
      {isLoading && <Indicator />}
      <InitializeNotification />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default memo(ProgressProvider);
