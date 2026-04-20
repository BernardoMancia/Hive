# 🐝 Hive — Decentralized P2P Chat

> Peer-to-peer mobile messaging app where every user IS the server. No central infrastructure, no login required, no tracking.

## About

**Hive** is a decentralized peer-to-peer chat application built with React Native and GunDB. Each connected user becomes a relay node in the network — the more users connected, the stronger and more resilient the network becomes.

**Zero servers required.** Peer discovery uses GunDB's public community relays (like public BitTorrent trackers). All message data is distributed across connected peers.

## Key Features

- **100% P2P Architecture**: No central server — each device is the network
- **No Login Required**: Just pick a name and start chatting
- **12 Themed Rooms**: From Tech & Gaming to Art & Travel
- **Media Sharing**: Send images and videos directly P2P
- **Live Online Counter**: See how many peers are sustaining the network
- **Age-Gated Room**: +18 room with verification prompt
- **Privacy First**: Messages sync between peers, never stored on central servers

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo |
| P2P Database | GunDB (public relays) |
| Navigation | React Navigation |
| Chat UI | react-native-gifted-chat |
| Media | expo-image-picker, expo-file-system |

## Setup

```bash
git clone https://github.com/your-user/hive-chat.git
cd hive-chat
npm install
npx expo start
```

## Architecture

```
User A (Peer+Relay) <--> User B (Peer+Relay)
        |                       |
        +--  Public GunDB  ----+
        |   Relay (discovery)   |
        |                       |
User C (Peer+Relay) <--> User D (Peer+Relay)
```

Public GunDB relays are used ONLY for initial peer discovery. Once peers find each other, all communication is direct P2P. No data persists on any server.

## Chat Rooms

| # | Room | Topic |
|---|------|-------|
| 1 | 🌐 General | Open conversation |
| 2 | 💻 Tech & Code | Programming |
| 3 | 🎮 Gaming | Games & eSports |
| 4 | 🎵 Music | Music discussion |
| 5 | 🎬 Movies & TV | Films & series |
| 6 | 📈 Crypto & Finance | Trading |
| 7 | 🎨 Art & Design | Creative works |
| 8 | 🏋️ Fitness & Health | Workouts |
| 9 | 📚 Books & Knowledge | Reading |
| 10 | 🌍 Travel | Destinations |
| 11 | 🤣 Memes & Humor | Funny content |
| 12 | 🔞 Free Zone (+18) | Adult content |

## License

MIT
