import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

// NPM

// Types & Services
import { IMenu } from '../../../types/index';
import { GetChefMenusAPI } from '../../../services/api';

// Hooks
import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';

import { navigate } from '@/app/utils/navigation';
import EmptyListView from '../../../components/emptyListView/emptyListView';
import StyledTabButton from '../../../components/styledTabButton';
import Container from '../../../layout/Container';
import GlobalStyles from '../../../types/styles';
import { styles } from './styles';


const Menu = () => {
  const self = useAppSelector(x => x.user.user);
  const menus = useAppSelector(x => x.table.menus);
  const dispatch = useAppDispatch();

  const [tabId, onChangeTabId] = useState('1');
  const [items, onChangeItems] = useState<Array<IMenu>>([]);

  const tabs = useMemo(
    () => [
      {
        id: '1',
        label: 'AVAILABLE ',
        value: 1,
      },
      {
        id: '2',
        label: 'NOT AVAILABLE ',
        value: 0,
      },
    ],
    [],
  );

  // Refresh menus from server when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (self?.id) {
        GetChefMenusAPI({ user_id: self.id }, dispatch);
      }
    }, [self?.id, dispatch])
  );

  useEffect(() => {
    loadData();
  }, [tabId, menus]);

  const loadData = async () => {
    onChangeItems(menus);
  };

  const handleNewItemAdd = () => {
    navigate.toChef.addMenuItem();
  };

  const handleItemEdit = (item: IMenu) => {
    navigate.toChef.addMenuItem(item);
  };

  const emptyListComponent = ({onPress}: any) => {
    return (
      <View style={{flex: 1, width: '100%', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20}}>
        <Text style={styles.missingHeading}>
          Display UNLIMITED items on your menu{' '}
        </Text>
        <View style={{flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'flex-end', marginHorizontal: -10}}>
          <Image
            style={[styles.missingImgLeft, {marginLeft: -10}]}
            source={require('../../../assets/images/2.png')}
          />
          <Image
            style={[styles.missingImgRight, {marginBottom: 60, marginRight: -10}]}
            source={require('../../../assets/images/1.png')}
          />
        </View>
        <View style={{alignItems: 'center', gap: 20}}>
          <Text style={styles.missingSubheading}>
            Tap below to create your very first menu item{' '}
          </Text>
          <TouchableOpacity testID="chefMenu.addButton" style={GlobalStyles.btn} onPress={onPress}>
            <Text style={GlobalStyles.btnTxt}>ADD </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const cardComponent = (item: IMenu, index?: number) => {
    return (
      <TouchableOpacity
        testID={index !== undefined ? `chefMenu.menuItem.${index}` : undefined}
        style={styles.card}
        key={`cc_${item.id}`}
        onPress={() => handleItemEdit(item)}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardText}>{item.description}</Text>
        <Text style={styles.cardText}>{`Price: $${(item.price ?? 0).toFixed(
          2,
        )} `}</Text>
        <Text
          style={
            styles.cardText
          }>{`Serving size: ${item.serving_size} Person `}</Text>
      </TouchableOpacity>
    );
  };

  const selectedTab = tabs.find(x => x.id == tabId);
  const filteredItems = items.filter(x => x.is_live == selectedTab?.value);

  return (
    <Container>
      <View style={styles.pageView}>
        {items.length == 0 &&
          emptyListComponent({
            onPress: () => {
              handleNewItemAdd();
            },
          })}
        {items.length > 0 && (
          <>
            <View style={styles.tabContainer}>
              {tabs.map((tab, idx) => {
                return (
                  <StyledTabButton
                    testID={`chefMenu.tab.${idx}`}
                    title={tab.label}
                    style={styles.tab}
                    titleStyle={styles.tabText}
                    disabled={tab.id != tabId}
                    onPress={() => onChangeTabId(tab.id)}
                    key={`tab_${idx}`}
                  />
                );
              })}
            </View>
            <ScrollView
              style={{width: '100%'}}
              contentContainerStyle={styles.cardContainer}>
              {filteredItems.map((item, idx) => {
                return cardComponent({...item}, idx);
              })}
              {filteredItems.length == 0 && (
                <EmptyListView
                  text={`No ${selectedTab?.label.toLowerCase()} menus `}
                />
              )}
            </ScrollView>
            <TouchableOpacity
              testID="chefMenu.addButton"
              style={[GlobalStyles.btn, {width: '100%'}]}
              onPress={handleNewItemAdd}>
              <Text style={GlobalStyles.btnTxt}>ADD </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Container>
  );
};

export default Menu;
