# 🐝 Hive — Encrypted P2P Chat

> Hybrid peer-to-peer mobile messaging app powered by GunDB with a self-hosted relay for NAT traversal.

---

## English

### About

**Hive** is a hybrid P2P chat application built with React Native and GunDB. A self-hosted relay on a VPS acts as a superpeer for connection stability and NAT/firewall traversal, while data syncs directly between peers.

**No login. No tracking. Messages expire in 1 hour.**

### Key Features

- **Hybrid P2P + Relay Architecture** — self-hosted GunDB relay for NAT traversal, direct P2P sync between peers
- **No Login Required** — pick a name, start chatting
- **11 Themed Channels + 1 Adult (+18)** — General, Tech & Code, Gaming, Music, Movies & TV, Crypto & Finance, Art & Design, Fitness & Health, Books & Knowledge, Travel, Memes & Humor, Free Zone (+18)
- **VPS Media Engine** — files >1MB upload silently to VPS; GunDB carries only the URL reference (prevents OOM)
- **End-to-End Encryption** — SEA (Security, Encryption, Authorization) per room
- **Fullscreen Media Viewer** — tap any image or video to view fullscreen
- **Inline Video Player** — play videos directly in chat with native controls
- **Screenshot Protection** — FLAG_SECURE blocks screenshots and screen recording
- **Live Online Counter** — real-time peer count per room
- **Age-Gated Room** — +18 room with local verification prompt
- **1h TTL Auto-Expiry** — messages and media auto-delete after 1 hour
- **Auto-Reconnect** — exponential backoff via secure WSS
- **Telegram Admin Bot** — monitor, pause, clear chat, manage relay via Telegram
- **Web Admin Panel** — browser-based admin center at `/admin`

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.81 + Expo SDK 54 |
| P2P Database | GunDB (self-hosted relay) |
| Encryption | GunDB SEA (per-room key derivation) |
| Navigation | React Navigation 7 |
| Video | expo-av |
| Media | expo-image-picker + expo-file-system |
| Storage | AsyncStorage (local only) |
| Relay | Node.js + GunDB server |
| Admin | Telegram Bot + Web Panel |

### Architecture

```
                    ┌─────────────────────┐
  Peer A  ◄────────│  VPS Relay/Superpeer │────────►  Peer B
    │               │  (NAT traversal)    │               │
    │               │  • /gun (WebSocket) │               │
    │               │  • /upload (media)  │               │
    │               │  • /media/ (serve)  │               │
    │               │  • /admin (panel)   │               │
    │               └─────────────────────┘               │
    └──────────── Direct P2P sync (when possible) ────────┘
```

The self-hosted relay at `wss://fogoeluar.com.br/gun` acts as a superpeer for:
- **NAT/Firewall traversal** — ensures peers behind restrictive networks can connect
- **Media hosting** — files >1MB are uploaded to the VPS, GunDB carries only the URL
- **TTL enforcement** — server-side message expiry at 1 hour
- **Admin controls** — maintenance mode, pause messaging, clear chat

### Namespace

All data is isolated under `hive_v2` to prevent contamination from older versions.

### Setup

```bash
git clone https://github.com/BernardoMancia/Hive.git
cd Hive
npm install
cp .env.example .env
npx expo start
```

### Relay Setup (VPS)

```bash
cd relay
cp .env.example .env
# Edit .env with your Telegram bot token and group ID
npm install
npm start
```

See [relay/.env.example](relay/.env.example) for all relay environment variables.

### Build APK Locally (Android)

> Requires: Android SDK, JDK 17, NDK 27.x

```powershell
# Generate native project
npx expo prebuild --platform android

# Generate APK
cd android
.\gradlew.bat :app:assembleRelease --no-daemon

# Generate AAB (Play Store)
.\gradlew.bat :app:bundleRelease --no-daemon
```

Output:
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

### Project Structure

```
├── App.tsx                 # Root component with navigation
├── index.ts                # Entry point with polyfills
├── app.json                # Expo configuration
├── src/
│   ├── components/         # Reusable UI components
│   │   └── MediaViewer.tsx # Fullscreen media viewer
│   ├── screens/            # App screens
│   │   ├── WelcomeScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── ChatScreen.tsx
│   │   └── AgeVerificationScreen.tsx
│   ├── services/           # Business logic
│   │   ├── gun.ts          # GunDB connection + messaging
│   │   ├── media.ts        # Media upload (VPS + inline)
│   │   ├── presence.ts     # Online presence heartbeat
│   │   ├── connection.ts   # Connection status hook
│   │   └── crypto.ts       # E2E encryption via SEA
│   ├── config/
│   │   └── rooms.ts        # Channel definitions
│   ├── theme/
│   │   ├── colors.ts       # Color palette
│   │   └── typography.ts   # Font styles
│   └── types/
│       └── index.ts        # TypeScript interfaces
├── relay/                  # VPS relay server
│   ├── relay.js            # GunDB relay + Telegram bot
│   ├── admin/index.html    # Web admin panel
│   ├── nginx-hive.conf     # Nginx reverse proxy config
│   └── setup.sh            # VPS setup script
└── assets/                 # App icons and splash
```

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

**Hive** é um aplicativo de chat P2P híbrido, construído com React Native e GunDB. Um relay auto-hospedado em VPS atua como superpeer para estabilidade de conexão e travessia de NAT/firewall, enquanto os dados sincronizam diretamente entre os peers.

**Sem login. Sem rastreamento. Mensagens expiram em 1 hora.**

### Funcionalidades

- **Arquitetura Híbrida P2P + Relay** — relay GunDB auto-hospedado para travessia de NAT, sincronização P2P direta entre peers
- **Sem Cadastro** — escolha um nome e comece a conversar
- **11 Canais Temáticos + 1 Adulto (+18)** — General, Tech & Code, Gaming, Music, Movies & TV, Crypto & Finance, Art & Design, Fitness & Health, Books & Knowledge, Travel, Memes & Humor, Free Zone (+18)
- **Motor de Mídia VPS** — arquivos >1MB fazem upload silencioso para a VPS; GunDB carrega apenas a referência URL (previne OOM)
- **Criptografia E2E** — SEA (Security, Encryption, Authorization) por sala
- **Visualizador Fullscreen** — toque em qualquer imagem ou vídeo para ver em tela cheia
- **Player de Vídeo Inline** — reproduza vídeos diretamente no chat
- **Proteção contra Screenshot** — FLAG_SECURE bloqueia capturas de tela e gravação
- **Contador de Peers Online** — contagem em tempo real por sala
- **Sala com Controle de Idade** — sala +18 com verificação local
- **TTL de 1h** — mensagens e mídias auto-deletam após 1 hora
- **Reconexão Automática** — backoff exponencial via WSS seguro
- **Bot Admin Telegram** — monitore, pause, limpe chat, gerencie relay via Telegram
- **Painel Admin Web** — painel admin acessível via navegador em `/admin`

### Stack Técnica

| Camada | Tecnologia |
|---|---|
| Framework | React Native 0.81 + Expo SDK 54 |
| Banco P2P | GunDB (relay auto-hospedado) |
| Criptografia | GunDB SEA (derivação de chave por sala) |
| Navegação | React Navigation 7 |
| Vídeo | expo-av |
| Mídia | expo-image-picker + expo-file-system |
| Armazenamento | AsyncStorage (apenas local) |
| Relay | Node.js + GunDB server |
| Admin | Bot Telegram + Painel Web |

### Instalação

```bash
git clone https://github.com/BernardoMancia/Hive.git
cd Hive
npm install
cp .env.example .env
npx expo start
```

### Setup do Relay (VPS)

```bash
cd relay
cp .env.example .env
# Edite .env com seu token do Telegram e ID do grupo
npm install
npm start
```

Veja [relay/.env.example](relay/.env.example) para todas as variáveis de ambiente do relay.

### Gerar APK Localmente (Android)

> Requisitos: Android SDK, JDK 17, NDK 27.x

```powershell
# Gerar projeto nativo
npx expo prebuild --platform android

# Gerar APK
cd android
.\gradlew.bat :app:assembleRelease --no-daemon

# Gerar AAB (Play Store)
.\gradlew.bat :app:bundleRelease --no-daemon
```

Saída:
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

### Estrutura do Projeto

```
├── App.tsx                 # Componente raiz com navegação
├── index.ts                # Ponto de entrada com polyfills
├── app.json                # Configuração do Expo
├── src/
│   ├── components/         # Componentes reutilizáveis
│   │   └── MediaViewer.tsx # Visualizador fullscreen de mídia
│   ├── screens/            # Telas do app
│   │   ├── WelcomeScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── ChatScreen.tsx
│   │   └── AgeVerificationScreen.tsx
│   ├── services/           # Lógica de negócios
│   │   ├── gun.ts          # Conexão GunDB + mensagens
│   │   ├── media.ts        # Upload de mídia (VPS + inline)
│   │   ├── presence.ts     # Heartbeat de presença online
│   │   ├── connection.ts   # Hook de status de conexão
│   │   └── crypto.ts       # Criptografia E2E via SEA
│   ├── config/
│   │   └── rooms.ts        # Definições de canais
│   ├── theme/
│   │   ├── colors.ts       # Paleta de cores
│   │   └── typography.ts   # Estilos de fonte
│   └── types/
│       └── index.ts        # Interfaces TypeScript
├── relay/                  # Servidor relay na VPS
│   ├── relay.js            # Relay GunDB + bot Telegram
│   ├── admin/index.html    # Painel admin web
│   ├── nginx-hive.conf     # Config de proxy reverso Nginx
│   └── setup.sh            # Script de setup da VPS
└── assets/                 # Ícones e splash do app
```

### Contribuindo

1. Faça um fork do repositório
2. Crie uma branch de feature: `git checkout -b feat/minha-feature`
3. Teste localmente antes de fazer merge na `main`
4. Nunca faça commit de `.env`, keystores ou arquivos APK/AAB

### Licença

MIT
