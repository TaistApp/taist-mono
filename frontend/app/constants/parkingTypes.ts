export interface IParkingType {
  id: string;
  label: string;
  icon: string;
}

export const PARKING_TYPES: IParkingType[] = [
  { id: 'street', label: 'Street Parking', icon: '🅿️' },
  { id: 'driveway', label: 'Driveway', icon: '🏠' },
  { id: 'apartment_lot', label: 'Apartment Lot', icon: '🏢' },
  { id: 'garage', label: 'Garage', icon: '🏗️' },
  { id: 'gate_code', label: 'Gate / Code Required', icon: '🔐' },
  { id: 'other', label: 'Other', icon: '📍' },
];

export const getParkingTypeById = (id: string | undefined): IParkingType | undefined =>
  PARKING_TYPES.find(p => p.id === id);

export const getParkingLabel = (id: string | undefined): string => {
  const type = getParkingTypeById(id);
  return type ? `${type.icon} ${type.label}` : '';
};
