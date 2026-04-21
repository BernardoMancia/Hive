# 🐝 Hive — Decentralized P2P Chat

> A peer-to-peer mobile messaging app powered by GunDB. Every user IS the server. No central infrastructure, no login, no tracking.

---

## English

### About

**Hive** is a fully decentralized P2P chat application built with React Native and GunDB. Each connected device becomes a relay node — the more peers connected, the stronger and more resilient the network.

**Zero servers. Zero tracking. Zero login required.**

### Key Features

- **100% P2P Architecture** — no central server, each device sustains the network
- **No Login Required** — pick a name, start chatting
- **12 Themed Rooms** — from Tech & Gaming to Art & Travel
- **Live Image Sharing** — send images directly P2P (base64, <200KB)
- **Live Online Counter** — see how many peers are active
- **Age-Gated Room** — +18 room with local verification prompt
- **Privacy First** — messages sync between peers, never stored centrally
- **Auto-Reconnect** — exponential backoff reconnection to public GunDB relays

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.81 + Expo SDK 54 |
| P2P Database | GunDB (public community relays) |
| Navigation | React Navigation 7 |
| Chat UI | react-native-gifted-chat |
| Media | expo-image-picker + expo-file-system |
| Storage | AsyncStorage (local only) |

### Architecture

```
Peer A  <──── GunDB Public Relay ────>  Peer B
  │           (discovery only)              │
  └──────────── Direct P2P sync ───────────┘
```

Public GunDB relays are used **only for initial peer discovery**. All data syncs directly between connected peers. No data persists on any relay server.

### Active Relays

- `https://peer.wallie.io/gun`
- `https://relay.peer.ooo/gun`

_No VPS. No proprietary server. No Heroku. Community-maintained only._

### Namespace

All data is isolated under `hive_v2` to prevent contamination from older versions.

### Setup

```bash
git clone https://github.com/your-user/hive-chat.git
cd hive-chat
npm install
cp .env.example .env
npx expo start
```

### Build APK Locally (Android)

> Requires: Android SDK, JDK 17, NDK 27.x

```powershell
# Generate APK
cd android
.\gradlew.bat :app:assembleRelease --no-daemon

# Generate AAB (Play Store)
.\gradlew.bat :app:bundleRelease --no-daemon
```

Output:
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

### Chat Rooms

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

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Test locally before merging
4. Never commit `.env`, keystores or APK/AAB files

### License

MIT

---

## Português (PT-BR)

### Sobre

**Hive** é um aplicativo de chat P2P completamente descentralizado, construído com React Native e GunDB. Cada dispositivo conectado se torna um nó de relay — quanto mais usuários, mais forte e resiliente a rede fica.

**Zero servidores. Zero rastreamento. Nenhum login necessário.**

### Funcionalidades

- **Arquitetura 100% P2P** — sem servidor central, cada dispositivo sustenta a rede
- **Sem Cadastro** — escolha um nome e comece a conversar
- **12 Salas Temáticas** — de Tech & Games a Arte & Viagem
- **Compartilhamento de Imagens** — envio direto P2P (base64, <200KB)
- **Contador de Peers Online** — veja quantos participantes estão sustentando a rede
- **Sala com Controle de Idade** — sala +18 com verificação local
- **Privacidade Total** — mensagens sincronizadas entre peers, nunca armazenadas centralmente
- **Reconexão Automática** — backoff exponencial para relays GunDB públicos

### Stack Técnica

| Camada | Tecnologia |
|---|---|
| Framework | React Native 0.81 + Expo SDK 54 |
| Banco P2P | GunDB (relays públicos da comunidade) |
| Navegação | React Navigation 7 |
| UI de Chat | react-native-gifted-chat |
| Mídia | expo-image-picker + expo-file-system |
| Armazenamento | AsyncStorage (apenas local) |

### Instalação

```bash
git clone https://github.com/seu-usuario/hive-chat.git
cd hive-chat
npm install
cp .env.example .env
npx expo start
```

### Gerar APK Localmente (Android)

> Requisitos: Android SDK, JDK 17, NDK 27.x

```powershell
# Gerar APK
cd android
.\gradlew.bat :app:assembleRelease --no-daemon

# Gerar AAB (Play Store)
.\gradlew.bat :app:bundleRelease --no-daemon
```

Saída:
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

### Salas de Chat

| # | Sala | Tema |
|---|------|------|
| 1 | 🌐 Geral | Conversa aberta |
| 2 | 💻 Tech & Código | Programação |
| 3 | 🎮 Games | Jogos & eSports |
| 4 | 🎵 Música | Discussão musical |
| 5 | 🎬 Filmes & Séries | Cinema & streaming |
| 6 | 📈 Cripto & Finanças | Trading |
| 7 | 🎨 Arte & Design | Obras criativas |
| 8 | 🏋️ Fitness & Saúde | Treinos |
| 9 | 📚 Livros & Conhecimento | Leitura |
| 10 | 🌍 Viagem | Destinos |
| 11 | 🤣 Memes & Humor | Conteúdo engraçado |
| 12 | 🔞 Zona Livre (+18) | Conteúdo adulto |

### Contribuindo

1. Faça um fork do repositório
2. Crie uma branch de feature: `git checkout -b feat/minha-feature`
3. Teste localmente antes de fazer merge na `main`
4. Nunca faça commit de `.env`, keystores ou arquivos APK/AAB

### Licença

MIT
