# Release Notes - Hive

---

## v2.1.1 — Patch Release

**Version:** 2.1.1 (Production)
**Version Code:** 4
**Release Date:** 2026-04-22

---

### English

**What's new in 2.1.1**

This release is a full logic rewrite focused on stability and correctness. No new features were added; all changes are internal improvements.

- Fixed double-initialization guard in GunDB service (prevents duplicate peer connections)
- Fixed race condition in `resetGun` that caused a brief incorrect "reconnecting" status flash
- Fixed memory leak: animation loops (breathe, float, hex-rotate) now properly cancelled on component unmount
- Fixed `initPresence` being called multiple times without guard, which duplicated heartbeat timers
- Fixed `markOffline` accidentally re-initializing GunDB during shutdown
- Fixed peer count duplication caused by GunDB emitting the same node multiple times (now uses `Map` dedup)
- Increased `STALE_THRESHOLD` from 35s to 50s to reduce false "offline" detections
- Fixed media upload: `size = undefined` from `FileSystem.getInfoAsync` now throws explicit error instead of passing silently
- Added image extension allowlist + MIME type map for correct media validation
- Fixed `subscribeToPresence` not being cleaned up on `ChatScreen` unmount (caused ghost peer counts)
- Fixed `renderActions` recreated on every render in `ChatScreen` (now memoized with `useMemo`)
- Fixed userId being `'__init__'` before async init completed, causing sent messages to appear on wrong side
- Added `isMounted` guard to all async callbacks in `WelcomeScreen`, `HomeScreen`, `ChatScreen`, `AgeVerificationScreen`
- Fixed double-tap bug in `AgeVerificationScreen` that could trigger `navigation.replace` twice
- Fixed `PeerStatus` recalculating `hexagons` array on every render (now `useMemo`)
- Fixed `OnlineCounter` breathe animation conflicting with pulse animation (animations now sequenced correctly)

<pt-BR>
**O que há de novo na versão 2.1.1**

Esta versão é uma reescrita completa da lógica focada em estabilidade e correção. Nenhuma nova funcionalidade foi adicionada; todas as mudanças são melhorias internas.

- Corrigida dupla inicialização no serviço GunDB (evita conexões de peers duplicadas)
- Corrigida race condition no `resetGun` que causava flash incorreto de status "reconnecting"
- Corrigido vazamento de memória: loops de animação (breathe, float, rotação hex) agora são cancelados corretamente no unmount
- Corrigida chamada múltipla de `initPresence` sem guard, que duplicava timers de heartbeat
- Corrigido `markOffline` reinicializando acidentalmente o GunDB durante shutdown
- Corrigida duplicação de contagem de peers causada pelo GunDB emitindo o mesmo nó múltiplas vezes (agora usa `Map` para deduplicação)
- `STALE_THRESHOLD` aumentado de 35s para 50s para reduzir detecções falsas de "offline"
- Corrigido upload de mídia: `size = undefined` do `FileSystem.getInfoAsync` agora lança erro explícito em vez de passar silenciosamente
- Adicionada lista de extensões permitidas + mapa de MIME type para validação correta de mídia
- Corrigido `subscribeToPresence` não sendo limpo no unmount do `ChatScreen` (causava contagens de peers fantasmas)
- Corrigido `renderActions` sendo recriado a cada render no `ChatScreen` (agora memoizado com `useMemo`)
- Corrigido userId sendo `'__init__'` antes do init assíncrono completar, fazendo mensagens enviadas aparecerem no lado errado
- Adicionado guard `isMounted` em todos os callbacks assíncronos de `WelcomeScreen`, `HomeScreen`, `ChatScreen`, `AgeVerificationScreen`
- Corrigido bug de duplo toque em `AgeVerificationScreen` que disparava `navigation.replace` duas vezes
- Corrigido `PeerStatus` recalculando array `hexagons` a cada render (agora `useMemo`)
- Corrigida animação breathe do `OnlineCounter` conflitando com a animação pulse (animações agora sequenciadas corretamente)
</pt-BR>

---

## v2.1.0 — Production Release

**Version:** 2.1.0 (Production)
**Version Code:** 3
**Release Date:** 2026-04-21

---

### English

**What's new in 2.1.0**

- P2P chat with no central server — completely decentralized
- 12 themed chat rooms including a protected Adult room
- Image sharing via peer-to-peer (gallery and camera)
- Real-time peer count with animated neon indicators
- Persistent anonymous identity (local storage only)
- Connection status banner with manual reconnect
- Cybersecurity / Fluent UI dark design with glassmorphism
- Smooth entry animations and floating effects
- Zero data collection — no accounts, no tracking

<pt-BR>
**O que há de novo na versão 2.1.0**

- Chat P2P sem servidor central — completamente descentralizado
- 12 salas temáticas incluindo sala Adulto protegida por verificação de idade
- Compartilhamento de imagens via peer-to-peer (galeria e câmera)
- Contagem de peers em tempo real com indicadores neon animados
- Identidade anônima persistente (armazenamento local apenas)
- Banner de status de conexão com reconexão manual
- Design escuro Cybersecurity / Fluent UI com glassmorphismo
- Animações de entrada suaves e efeitos flutuantes
- Zero coleta de dados — sem contas, sem rastreamento
</pt-BR>
