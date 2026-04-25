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
