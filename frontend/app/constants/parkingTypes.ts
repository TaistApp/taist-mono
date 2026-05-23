export interface IParkingType {
  id: string;
  label: string;
  icon: string;
}

export const PARKING_TYPES: IParkingType[] = [
  { id: 'street', label: 'Street Parking', icon: '🅿️' },
  { id: 'driveway', label: 'Driveway', icon: '🏠' },
  { id: 'apartment_lot', label: 'Building Garage', icon: '🏢' },
  { id: 'gate_code', label: 'Gate / Code Required', icon: '🔐' },
  { id: 'other', label: 'Other', icon: '📍' },
];

export const getParkingTypeById = (id: string | undefined): IParkingType | undefined =>
  PARKING_TYPES.find(p => p.id === id);

export const getSelectedParkingTypes = (parkingType: string | undefined): string[] => {
  if (!parkingType) return [];
  return parkingType.split(',').filter(id => PARKING_TYPES.some(p => p.id === id));
};

export const getParkingLabel = (parkingType: string | undefined): string => {
  const ids = getSelectedParkingTypes(parkingType);
  if (ids.length === 0) return '';
  return ids.map(id => {
    const type = getParkingTypeById(id);
    return type ? `${type.icon} ${type.label}` : '';
  }).filter(Boolean).join(' · ');
};
