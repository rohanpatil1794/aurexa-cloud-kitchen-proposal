// Kind builders for the "prep" equipment group (Prep & Storage rooms). Kind names are prefixed `prep.`.
import { registerKinds } from '../registry';
import { prepRoomKinds } from './prepRooms';
import { prepStorageKinds } from './prepStorage';

registerKinds({ ...prepRoomKinds, ...prepStorageKinds });
