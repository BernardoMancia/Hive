# Hive — Release Notes & Versioning

## Esquema de Versão: X.Y.Z

| Campo | Significado |
|---|---|
| **X** (Major) | Mudança grande de arquitetura ou conjunto de features |
| **Y** (Phase) | `0` = Alpha · `1` = Beta · `2` = Stable |
| **Z** (Patch) | Número de modificações pequenas nesta fase |

**Exemplos:**
- `3.0.0` → Major 3, Alpha, build inicial
- `3.0.3` → Major 3, Alpha, 3 correções
- `3.1.0` → Major 3, Beta, build inicial
- `3.2.0` → Major 3, Stable
- `4.0.0` → Nova grande mudança, Alpha

---

## v3.2.3-stable · versionCode 22 · 2026-05-29

**Phase:** Stable — Code Review Cleanup + VPS Media Engine

### What's new

- **VPS Media Upload Engine** — files >1MB upload silently to VPS; GunDB carries only the URL reference (prevents OOM on large videos)
- **Unified TTL** — standardized to 1 hour across app and relay (was 1h app / 24h relay)
- **Full English UI** — all Portuguese strings translated to English
- **EAS Removed** — eas.json deleted, EAS references cleaned from app.json
- **Code Review Cleanup** — 900+ lines of dead code removed, 6 orphan components deleted
- **Unified Versioning** — v3.2.3 across package.json, app.json, and UI
- **Type Unification** — ConnectionState type consolidated into single definition
- **Relay URL Externalized** — moved from hardcoded to app.json extra config
- **README Rewrite** — bilingual documentation reflecting hybrid P2P+Relay architecture

---

<pt-BR>
Versão 3.2.3 Stable — Limpeza de Código + Motor de Mídia VPS

**Novidades:**
• Motor de upload de mídia para VPS — arquivos >1MB fazem upload silencioso, GunDB carrega apenas URL
• TTL unificado para 1 hora em app e relay
• Interface 100% em inglês — todas as strings traduzidas
• EAS completamente removido do projeto
• Limpeza de código: 900+ linhas removidas, 6 componentes órfãos deletados
• Versionamento unificado v3.2.3
• Tipos TypeScript consolidados
• URL do relay externalizada para configuração
• README reescrito com documentação bilíngue
</pt-BR>

<en-US>
Version 3.2.3 Stable — Code Review Cleanup + VPS Media Engine

**What's new:**
• VPS media upload engine — files >1MB upload silently to server, GunDB carries only URL
• Unified TTL to 1 hour across app and relay
• Full English UI — all strings translated
• EAS completely removed from project
• Code cleanup: 900+ dead lines removed, 6 orphan components deleted
• Unified versioning v3.2.3
• TypeScript types consolidated
• Relay URL externalized to configuration
• README rewritten with bilingual documentation
</en-US>

---

## v3.2.2-stable · versionCode 21 · 2026-05-25

**Phase:** Stable — Telegram Chat UI

### What's new

- **Telegram-style Chat UI** — redesigned message bubbles with sender names, avatars, and delivery status
- **Fullscreen Media Viewer** — tap any image or video to view fullscreen with native controls
- **Inline Video Player** — play videos directly in chat
- **Relay Boot Guard** — prevents replaying old admin control commands on restart

---

<pt-BR>
Versão 3.2.2 Stable — UI estilo Telegram

**Novidades:**
• UI de chat estilo Telegram com bolhas redesenhadas, nomes de remetentes e status de entrega
• Visualizador fullscreen de mídia
• Player de vídeo inline no chat
• Proteção contra replay de comandos antigos no boot do relay
</pt-BR>

<en-US>
Version 3.2.2 Stable — Telegram-style Chat UI

**What's new:**
• Telegram-style chat UI with redesigned bubbles, sender names, and delivery status
• Fullscreen media viewer
• Inline video player in chat
• Relay boot guard prevents old command replay
</en-US>

---

## v3.2.1-stable · versionCode 20 · 2026-05-22

**Phase:** Stable — Media & Relay Fixes

### What's new

- **Relay chdir + dedup** — relay changes to its own directory and deduplicates data
- **Video support** — full video sending and playback in chat
- **clearChat fix** — clearing chat no longer re-sends deleted messages
- **Media limit** — increased to 10MB for inline base64

---

<pt-BR>
Versão 3.2.1 Stable — Correções de Mídia e Relay

**Correções:**
• Relay usa diretório explícito e deduplica dados
• Suporte completo a vídeo no chat
• Limpeza de chat não reenvia mensagens deletadas
• Limite de mídia aumentado para 10MB
</pt-BR>

<en-US>
Version 3.2.1 Stable — Media & Relay Fixes

**Fixes:**
• Relay uses explicit directory and deduplicates data
• Full video support in chat
• Chat clearing no longer re-sends deleted messages
• Media limit increased to 10MB
</en-US>

---

## v3.2.0-stable · versionCode 19 · 2026-05-18

**Phase:** Stable — Channel Sync & Security

### What's new

- **12 Channel Sync** — all channels synced with admin panel in real-time
- **FLAG_SECURE** — screenshot and screen recording blocked across the app
- **Admin Panel Updates** — online user tracking via WebSocket, text message Telegram alerts, channel deletion triggers relay cleanup

---

<pt-BR>
Versão 3.2.0 Stable — Sincronização de Canais e Segurança

**Novidades:**
• Sincronização de 12 canais com painel admin em tempo real
• FLAG_SECURE bloqueia screenshots e gravação de tela
• Painel admin: rastreamento de usuários online via WebSocket, alertas de mensagens no Telegram
</pt-BR>

<en-US>
Version 3.2.0 Stable — Channel Sync & Security

**What's new:**
• 12 channels synced with admin panel in real-time
• FLAG_SECURE blocks screenshots and screen recording
• Admin panel: online user tracking via WebSocket, Telegram text alerts
</en-US>

---

## v3.1.1-stable · versionCode 17 · 2026-04-29

**Fase:** Stable — Revisão de Tipagem e UI

### O que há de novo

- **Correção de Tipagem UI**: As propriedades de temas (`Colors`, `Typography`) que estavam apontando para referências inexistentes foram corrigidas em múltiplos componentes (RoomCard, MediaMessage, OnlineCounter, PeerStatus).
- **Estabilidade do App**: Garantia de renderização segura dos gradientes e cores sem causar crash por undefined.

---

<pt-BR>
Versão 3.1.1 Stable — Revisão de UI e Estabilidade

**Melhorias:**
• Correções de cores e fontes não declaradas nos cartões de sala e nos indicadores online.
• Maior fluidez de interface e prevenção de erros em tempo de execução.
• O aplicativo está consolidado e preparado para produção sem problemas de compilação.
</pt-BR>

<en-US>
Version 3.1.1 Stable — UI Review and Stability

**Improvements:**
• Fixed undeclared colors and fonts in room cards and online indicators.
• Increased UI fluidity and prevention of runtime errors.
• The application is consolidated and ready for production with no compilation issues.
</en-US>

---

## v3.0.6-alpha · versionCode 15 · 2026-04-26

**Fase:** Alpha — Painel Administrativo aprimorado

### O que há de novo

- **Tela de login** no Admin Center: usuário `Luke Arwolf`, senha padrão com reset obrigatório no primeiro acesso
- **Testes do sistema**: Health Check, GunDB WebSocket e Telegram Bot com resultado em tempo real
- **Comando de teste Telegram**: botão no painel envia mensagem de diagnóstico diretamente no grupo
- **Logout**: botão de encerramento de sessão no header do painel
- **Fix mixed-content**: URLs de health e WebSocket agora usam `location.origin` — funciona em HTTP e HTTPS sem hardcode de porta

---

<pt-BR>
Versão 3.0.6 Alpha — Painel Admin com login e testes

**Novidades:**
• Tela de login com senha padrão e reset obrigatório no primeiro acesso
• Painel de testes: Health Check, GunDB e Telegram com resposta em tempo real
• Botão de envio de mensagem de teste para o grupo Telegram
• Correção de conectividade no painel via HTTPS

⚠️ Esta é uma versão Alpha — pode conter instabilidades.
</pt-BR>

<en-US>
Version 3.0.6 Alpha — Admin Panel with login and system tests

**What's new:**
• Login screen with default password and mandatory reset on first access
• System tests panel: Health Check, GunDB and Telegram with real-time feedback
• Test message button to send diagnostics to the Telegram group
• HTTPS connectivity fix in the admin panel

⚠️ This is an Alpha release — may contain instabilities.
</en-US>

---

## v3.0.5-alpha · versionCode 14 · 2026-04-26

**Fase:** Alpha — Correção de infraestrutura

### O que há de novo

- **Peer WebSocket na porta 80**: conexão GunDB migrada para `wss://fogoeluar.com.br/gun` via nginx reverse proxy — resolve bloqueios de provedor em redes restritivas
- **Nginx master_proxy**: configurado `hive.conf` no container Docker com `default_server` na porta 80, roteando `/gun`, `/admin` e `/health`
- **IP de gateway correto**: proxy_pass atualizado de `172.17.0.1` para `172.21.0.1` (gateway real da rede Docker)

### Infraestrutura

- Admin panel `https://fogoeluar.com.br/admin` acessível externamente ✅
- Health check `https://fogoeluar.com.br/health` com CORS ✅
- WebSocket P2P na porta padrão 80 ✅

---

<pt-BR>
Versão 3.0.5 Alpha — Correção de conectividade P2P

**Correções:**
• Conexão WebSocket com o relay migrada para a porta padrão 80 (evita bloqueios em redes restritas)
• Painel administrativo agora acessível via HTTP padrão
• Melhor compatibilidade de rede em ambientes corporativos e redes móveis

⚠️ Esta é uma versão Alpha — pode conter instabilidades.
</pt-BR>

<en-US>
Version 3.0.5 Alpha — P2P connectivity fix

**Fixes:**
• WebSocket connection migrated to standard port 80 (avoids blocks on restricted networks)
• Admin panel now accessible via standard HTTP
• Improved network compatibility in corporate and mobile environments

⚠️ This is an Alpha release — may contain instabilities.
</en-US>

---

## v3.0.0-alpha · versionCode 9 · 2026-04-25

**Fase:** Alpha (instável — em desenvolvimento ativo)

### O que há de novo

- **Relay próprio** na VPS `fogoeluar.com.br` — zero dependência de relays públicos
- **Criptografia E2E dupla camada**: TLS 1.3 (transporte) + AES-256-GCM via GunDB SEA (conteúdo)
- **TTL de 1 hora**: mensagens são automaticamente deletadas 1h após o envio
- **Admin Center** em `fogoeluar.com.br/admin` com usuários online e gerenciamento de canais
- **Telegram relay**: toda mídia enviada é encaminhada para grupo Telegram com metadados
- **Bloqueio de screenshot** (FLAG_SECURE) em todo o app
- **Ofuscação R8**: código Java/Kotlin minificado, strings ofuscadas, logs removidos

### Segurança

- Pinning do certificado ISRG Root X1 (Let's Encrypt) no Android
- `allowBackup=false` no AndroidManifest
- Cleartext bloqueado globalmente

---

<pt-BR>
Versão 3.0.0 Alpha — Reescrita completa de arquitetura

Esta é a primeira versão Alpha da linha 3.x do Hive.

**Novidades:**
• Relay próprio no domínio fogoeluar.com.br com criptografia TLS 1.3
• Mensagens criptografadas ponta a ponta com AES-256-GCM
• Mensagens apagadas automaticamente após 1 hora
• Painel administrativo web para gerenciar canais e ver usuários online
• Encaminhamento de mídias para grupo Telegram com nome do remetente e horário
• Bloqueio de screenshots em todo o aplicativo
• Código do app ofuscado contra engenharia reversa

⚠️ Esta é uma versão Alpha — pode conter instabilidades.
</pt-BR>

<en-US>
Version 3.0.0 Alpha — Complete architecture rewrite

This is the first Alpha release of the Hive 3.x line.

**What's new:**
• Private relay at fogoeluar.com.br with TLS 1.3 encryption
• End-to-end encrypted messages using AES-256-GCM
• Messages automatically deleted after 1 hour
• Web admin panel to manage channels and view online users
• Media forwarding to Telegram group with sender name and timestamp
• Screenshot blocking throughout the app
• App code obfuscated against reverse engineering

⚠️ This is an Alpha release — may contain instabilities.
</en-US>

---

## Histórico Anterior (pré-3.x)

| Versão | versionCode | Data |
|---|---|---|
| 2.4.0 | 8 | 2026-04-25 |
| 2.3.0 | 7 | 2026-04-25 |
| 2.2.0 | 6 | 2026-04-25 |
| 2.1.2 | 5 | 2026-04-22 |
| 2.1.1 | 4 | 2026-04-22 |
| 2.1.0 | 3 | 2026-04-22 |
