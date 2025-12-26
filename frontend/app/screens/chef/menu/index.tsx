import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// NPM

// Types & Services
import { IMenu } from '../../../types/index';

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
      <View style={{flex: 1, width: '100%', alignItems: 'center', gap: 30}}>
        <Text style={styles.missingHeading}>
          Display UNLIMITED items on your menu{' '}
        </Text>
        <Image
          style={styles.missingImg}
          source={require('../../../assets/images/unlimit.webp')}
        />
        <Text style={styles.missingSubheading}>
          Tap below to create your very first menu item{' '}
        </Text>
        <TouchableOpacity style={GlobalStyles.btn} onPress={onPress}>
          <Text style={GlobalStyles.btnTxt}>ADD </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const cardComponent = (item: IMenu) => {
    return (
      <TouchableOpacity
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
                return cardComponent({...item});
              })}
              {filteredItems.length == 0 && (
                <EmptyListView
                  text={`No ${selectedTab?.label.toLowerCase()} menus `}
                />
              )}
            </ScrollView>
            <TouchableOpacity
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
