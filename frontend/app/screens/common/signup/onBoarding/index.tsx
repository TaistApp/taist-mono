import {useEffect, useState, useMemo, useRef} from 'react';
import {
  SafeAreaView,
  ScrollView,
  Image,
  Pressable,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
} from 'react-native';

// Hooks
import {useAppDispatch} from '../../../../hooks/useRedux';

import {styles} from './styles';

type Props = {
  onStart: () => void;
};

const Onboarding = ({onStart}: Props) => {
  const dispatch = useAppDispatch();
  const screenWidth = Dimensions.get('window').width;
  const scrollRef = useRef<ScrollView>(null);
  const [pageIndex, onChangePageIndex] = useState(0);

  const pages = useMemo(
    () => [
      {
        id: 1,
        title: 'Meals are cooked\n at your discretion 24/7! ',
        desc: 'These chefs offer a variety of custom meals, made in the comfort of your own home. ',
        img: require('../../../../assets/images/onboarding_3.jpg'),
      },
      {
        id: 2,
        title: 'Not enough time to cook?\nFed up with delivery? ',
        desc: 'Your chef preps, cooks, and cleans up after. ',
        img: require('../../../../assets/images/onboarding_1.jpg'),
      },
      {
        id: 3,
        title: 'No grocery shopping.\nNo cooking. No cleaning. ',
        desc: 'Need meals prepped for the week or a meal cooked on demand? You choose. ',
        img: require('../../../../assets/images/onboarding_2.jpg'),
      },
    ],
    [],
  );

  const handleScrollIndexChange = (e: any) => {
    const {nativeEvent} = e;
    const index = Math.round(nativeEvent.contentOffset.x / (screenWidth - 20));
    onChangePageIndex(index);
  };

  const handlePagination = (idx: number) => {
    onChangePageIndex(idx);
    if (idx < pages.length) {
      scrollRef.current?.scrollTo({x: screenWidth * idx});
    } else {
      onStart();
    }
  };

  return (
    <View style={styles.main}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollIndexChange}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
      >
        {pages.map((page, idx) => {
          return (
            <View style={styles.pageView} key={`page_${idx}`}>
              <Image source={page.img} style={styles.pageImg} />
              <Text style={styles.pageTitle}>{page.title}</Text>
              <View style={styles.subPageView}>
                <Text style={styles.pageDesc}>{page.desc}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.controllerContainer}>
        <View style={styles.paginationContainer}>
          {pages.map((page, idx) => {
            return (
              <Pressable
                key={`pn_${idx}`}
                style={[
                  styles.paginationIndicator,
                  pageIndex === idx && styles.paginationIndicatorActive,
                ]}
                onPress={() => handlePagination(idx)}
              />
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => handlePagination(pageIndex + 1)}>
          <Text style={styles.buttonText}>
            {pageIndex === pages.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Onboarding;
