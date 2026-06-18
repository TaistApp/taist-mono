/**
 * Kitchen Appliances - Hardcoded constant
 *
 * These are the appliances customers need to have available
 * for chefs to prepare menu items. IDs must match what's stored
 * in menu item `appliances` field in the database.
 *
 * Images are bundled LOCALLY (require) so the tiles render instantly — the
 * previous remote URLs (served from the API host) loaded slowly on cellular.
 */

import { ImageSourcePropType } from 'react-native';

export interface IAppliance {
  id: number;
  name: string;
  image: ImageSourcePropType;
  emoji: string; // Fallback if image fails to load
}

export const APPLIANCES: IAppliance[] = [
  { id: 1, name: 'Sink', image: require('../assets/images/appliances/sink.png'), emoji: '💧' },
  { id: 2, name: 'Stove', image: require('../assets/images/appliances/stove.png'), emoji: '🍳' },
  { id: 3, name: 'Oven', image: require('../assets/images/appliances/oven.png'), emoji: '🔥' },
  { id: 4, name: 'Microwave', image: require('../assets/images/appliances/microwave.png'), emoji: '📻' },
  { id: 5, name: 'Charcoal Grill', image: require('../assets/images/appliances/charcoal_grill.png'), emoji: '🍖' },
  { id: 6, name: 'Gas Grill', image: require('../assets/images/appliances/gas_grill.png'), emoji: '🔥' },
];

/** Get a single appliance by ID */
export const getApplianceById = (id: number): IAppliance | undefined => {
  return APPLIANCES.find(a => a.id === id);
};

/** Get multiple appliances by IDs */
export const getAppliancesByIds = (ids: number[]): IAppliance[] => {
  return APPLIANCES.filter(a => ids.includes(a.id));
};

/** Get appliance names from IDs (for display) */
export const getApplianceNames = (ids: number[]): string[] => {
  return getAppliancesByIds(ids).map(a => a.name);
};
