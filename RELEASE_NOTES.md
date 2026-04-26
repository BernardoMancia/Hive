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

- **Peer WebSocket na porta 80**: conexão GunDB migrada de `ws://82.112.245.99:8765` para `ws://82.112.245.99/gun` via nginx reverse proxy — resolve bloqueios de provedor em redes restritivas
- **Nginx master_proxy**: configurado `hive.conf` no container Docker com `default_server` na porta 80, roteando `/gun`, `/admin` e `/health`
- **IP de gateway correto**: proxy_pass atualizado de `172.17.0.1` para `172.21.0.1` (gateway real da rede Docker)

### Infraestrutura

- Admin panel `http://82.112.245.99/admin` acessível externamente ✅
- Health check `http://82.112.245.99/health` com CORS ✅
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
