import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, SafeAreaView, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';

import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import KeyboardManager from 'react-native-keyboard-manager';
import StyledProfileImage from '../../../components/styledProfileImage';
import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';
import Container from '../../../layout/Container';
import { hideLoading, showLoading } from '../../../reducers/loadingSlice';
import {
  CreateConverstationAPI,
  GetConversationsByOrderAPI,
  UpdateConverstationAPI,
} from '../../../services/api';
import { IMessage, IOrder, IUser } from '../../../types/index';
import { getImageURL } from '../../../utils/functions';
import TextBubble from './components/textBubble';
import { styles } from './styles';

const Chat = () => {
  const self = useAppSelector(x => x.user.user);
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams();
  const orderInfo: IOrder = typeof params.orderInfo === 'string'
    ? JSON.parse(params.orderInfo)
    : (params.orderInfo as IOrder);

  const otherUserInfo: IUser = typeof params.userInfo === 'string'
    ? JSON.parse(params.userInfo)
    : (params.userInfo as IUser);

  const refTextInput = useRef<TextInput>(null);
  const refScrollView = useRef<ScrollView>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<IMessage>>([]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'ios') {
        KeyboardManager.setEnableAutoToolbar(false);
        return () => KeyboardManager.setEnableAutoToolbar(true);
      }
    }, []),
  );

  useEffect(() => {
    refScrollView.current?.scrollToEnd();
    loadData();
  }, []);

  const loadData = async () => {
    dispatch(showLoading());
    const resp = await GetConversationsByOrderAPI(
      {order_id: orderInfo.id},
      dispatch,
    );
    dispatch(hideLoading());
    if (resp.success == 1) {
      if (resp.data.length > 0) {
        const lastMsg: IMessage = resp.data[resp.data.length - 1];
        if (lastMsg.is_viewed != 1) {
          lastMsg.is_viewed = 1;
          const resp_status = await UpdateConverstationAPI(lastMsg, dispatch);
        }
      }
      setMessages(resp.data);
    }
    refScrollView.current?.scrollToEnd();
  };

  const handleSendMessage = async (text: string) => {
    if (text.length == 0) return;

    const msg: IMessage = {
      message: text,
      order_id: orderInfo.id,
      from_user_id: self.id,
      to_user_id: otherUserInfo.id,
    };
    // setMessages([...messages, msg]);
    setMessage('');
    const resp = await CreateConverstationAPI(msg, dispatch);
    if (resp.success == 1) {
      setMessages([...messages, resp.data]);
    }
    refScrollView.current?.scrollToEnd();
  };

  return (
    <SafeAreaView style={styles.main}>
      <Container
        backMode
        title={`${otherUserInfo.first_name} `}
        rightContent={
          otherUserInfo?.photo ? (
            <StyledProfileImage
              url={getImageURL(otherUserInfo?.photo)}
              size={40}
            />
          ) : null
        }>
        <View style={styles.container}>
          <ScrollView
            ref={refScrollView}
            style={{flex: 1}}
            contentContainerStyle={{}}>
            <View style={styles.msgContainer}>
              {messages.map((msg, idx) => {
                const isMy = msg.from_user_id == self.id;
                return (
                  <TextBubble
                    msg={msg}
                    fromUser={isMy ? self : otherUserInfo}
                    toUser={isMy ? otherUserInfo : self}
                    isMy={msg.from_user_id == self.id}
                    key={`msg_${idx}`}
                  />
                );
              })}
            </View>
          </ScrollView>
          <View style={styles.bottomContainer}>
            <TextInput
              testID="chatDetail.messageInput"
              ref={refTextInput}
              placeholder="Message..."
              value={message}
              onChangeText={setMessage}
              onSubmitEditing={e => handleSendMessage(message)}
              style={styles.textInput}
              returnKeyLabel={'Send'}
            />
            <TouchableOpacity
              testID="chatDetail.sendButton"
              style={styles.btnFly}
              onPress={() => handleSendMessage(message)}>
              <FontAwesomeIcon icon={faPaperPlane} size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </Container>
    </SafeAreaView>
  );
};

export default Chat;
