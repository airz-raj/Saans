import type { Profile, RoomSetup } from './types';

export const DEFAULT_ROOM: RoomSetup = {
  areaM2: 14,
  ceilingM: 2.8,
  windows: 'closed',
  purifierCadr: 0,
  cookingFuel: 'lpg',
  kitchenExhaust: false,
  incense: true,
  mosquitoCoil: false,
  smoking: false,
};

export const DEFAULT_PROFILE: Profile = {
  place: null,
  persona: 'adult',
  children: 1,
  elders: 0,
  sensitiveMember: false,
  commuteMode: 'two-wheeler',
  commuteKm: 8,
  departHour: 9,
  returnHour: 18,
  exerciseHour: 7,
  exerciseMinutes: 45,
  exerciseSetting: 'outdoor-roadside',
  room: DEFAULT_ROOM,
  language: 'en',
};
