import type { Coordinates } from 'expo-maps';
import { GoogleMaps } from 'expo-maps';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';
import Container from '../../../layout/Container';
import { styles } from './styles';

const Map = () => {
  const self = useAppSelector(x => x.user.user);
  const users = useAppSelector(x => x.table.users);
  const dispatch = useAppDispatch();

  const [location, setLocation] = useState<Coordinates>({
    latitude: 37.788825,
    longitude: -122.4324,
  });

  const onCameraMove = (event: any) => {
    // console.log('OnCameraMove', event);
  };

  const onMarkerClick = (marker: any) => {
    console.log('Marker clicked:', marker);
  };

  return (
    <SafeAreaView style={styles.main}>
      <Container backMode title="Map">
        <GoogleMaps.View
          style={{flex: 1}}
          cameraPosition={{
            coordinates: {
              latitude: 37.788825,
              longitude: -122.4324,
            },
            zoom: 15,
          }}
          markers={[
            {
              id: 'customer-location',
              coordinates: location,
              title: 'Customer',
              snippet: 'Order Arrival',
              draggable: true,
              showCallout: true,
            },
          ]}
          onCameraMove={onCameraMove}
          onMarkerClick={onMarkerClick}
          onMapClick={(e: any) => console.log(e.coordinates)}
        />
      </Container>
    </SafeAreaView>
  );
};

export default Map;
