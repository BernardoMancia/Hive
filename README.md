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
- **Dynamic Channels** — 12 rooms managed in real-time via the admin web panel
- **Media Sharing** — send images and videos P2P (up to 10MB)
- **End-to-End Encryption** — SEA (Security, Encryption, Authorization) per room
- **Fullscreen Media Viewer** — tap any image or video to view fullscreen
- **Inline Video Player** — play videos directly in chat with native controls
- **Screenshot Protection** — FLAG_SECURE blocks screenshots and screen recording
- **Live Online Counter** — see how many peers are active
- **Age-Gated Room** — +18 room with local verification prompt
- **Privacy First** — messages sync between peers with 24h TTL auto-expiry
- **Auto-Reconnect** — exponential backoff reconnection via secure WSS

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.81 + Expo SDK 52 |
| P2P Database | GunDB (self-hosted relay) |
| Encryption | GunDB SEA (per-room key derivation) |
| Navigation | React Navigation 7 |
| Video | expo-av |
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

- `wss://fogoeluar.com.br/gun` (self-hosted relay via Nginx + TLS 1.3)

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
- **Canais Dinâmicos** — 12 salas gerenciadas em tempo real pelo painel web admin
- **Compartilhamento de Mídia** — envio de imagens e vídeos P2P (até 10MB)
- **Criptografia E2E** — SEA (Security, Encryption, Authorization) por sala
- **Visualizador Fullscreen** — toque em qualquer imagem ou vídeo para ver em tela cheia
- **Player de Vídeo Inline** — reproduza vídeos diretamente no chat
- **Proteção contra Screenshot** — FLAG_SECURE bloqueia capturas de tela e gravação
- **Contador de Peers Online** — veja quantos participantes estão na rede
- **Sala com Controle de Idade** — sala +18 com verificação local
- **Privacidade Total** — mensagens sincronizadas entre peers com expiração automática em 24h
- **Reconexão Automática** — backoff exponencial via WSS seguro

### Stack Técnica

| Camada | Tecnologia |
|---|---|
| Framework | React Native 0.81 + Expo SDK 52 |
| Banco P2P | GunDB (relay auto-hospedado) |
| Criptografia | GunDB SEA (derivação de chave por sala) |
| Navegação | React Navigation 7 |
| Vídeo | expo-av |
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

### Contribuindo

1. Faça um fork do repositório
2. Crie uma branch de feature: `git checkout -b feat/minha-feature`
3. Teste localmente antes de fazer merge na `main`
4. Nunca faça commit de `.env`, keystores ou arquivos APK/AAB

### Licença

MIT
