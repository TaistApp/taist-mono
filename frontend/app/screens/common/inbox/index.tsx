import { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView } from 'react-native';

import { navigate } from '@/app/utils/navigation';
import { useFocusEffect } from '@react-navigation/native';
import EmptyListView from '../../../components/emptyListView/emptyListView';
import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';
import Container from '../../../layout/Container';
import { hideLoading, showLoading } from '../../../reducers/loadingSlice';
import { GetConversationListAPI } from '../../../services/api';
import { IMessage, IOrder, IUser } from '../../../types/index';
import InboxRecord from './components/inboxRecord';
import { styles } from './styles';

const Inbox = () => {
  const self = useAppSelector(x => x.user.user);
  const users = useAppSelector(x => x.table.users);
  const dispatch = useAppDispatch();

  const [items, setItems] = useState<Array<{user: IUser; msg: IMessage}>>([]);
  const samplePhotoUrl =
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80';

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    dispatch(showLoading());
    const resp = await GetConversationListAPI({});
    if (resp.success == 1) {
      var tmpArr: Array<{user: IUser; msg: IMessage}> = [];
      resp.data.map((item: any, idx: number) => {
        const msg: IMessage = item as IMessage;
        var user: IUser = {
          id: item.user_id,
          first_name: item.user_first_name,
          last_name: item.user_last_name,
          photo: item.user_photo,
        };
        tmpArr.push({msg, user});
      });
      setItems(tmpArr);
    }
    dispatch(hideLoading());
  };

  const handleOpenChat = (userInfo: IUser, orderInfo: IOrder) => {
    navigate.toCommon.chat(userInfo, orderInfo);
  };

  return (
    <SafeAreaView style={styles.main}>
      <Container backMode title="Inbox">
        <ScrollView contentContainerStyle={styles.pageView}>
          {items.map((item, idx) => {
            return (
              <InboxRecord
                testID={`chatInbox.conversationCard.${idx}`}
                self={self}
                user={item.user}
                lastMsg={item.msg}
                openChat={() => {
                  handleOpenChat(item.user, {id: item.msg.order_id});
                }}
                key={`inboxitem_${idx}`}
              />
            );
          })}
          {items.length == 0 && <EmptyListView text="No Conversations" />}
        </ScrollView>
      </Container>
    </SafeAreaView>
  );
};

export default Inbox;
