export interface ChatRoom {
  id: string;
  name: string;
  description: string;
  icon: string;
  isAdult: boolean;
  color: string;
}

export interface ChatMessage {
  _id: string;
  text: string;
  createdAt: Date | number;
  user: ChatUser;
  image?: string;
  video?: string;
  system?: boolean;
}

export interface ChatUser {
  _id: string;
  name: string;
  avatar?: string;
}

export interface PeerInfo {
  id: string;
  name: string;
  lastSeen: number;
  roomId?: string;
}

export interface PresenceData {
  [peerId: string]: PeerInfo;
}

export type RootStackParamList = {
  Welcome: undefined;
  Home: undefined;
  Chat: { room: ChatRoom };
  AgeVerification: { room: ChatRoom };
};
