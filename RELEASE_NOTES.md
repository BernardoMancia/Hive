# Release Notes — Hive v2.1.0

## English

**Version:** 2.1.0 (Production)
**Version Code:** 3
**Release Type:** Production
**Release Date:** 2026-04-21

### What's New

- **Fully Decentralized Network**: Removed all connections to centralized servers and VPS infrastructure. The app now connects exclusively through public GunDB community relays (`peer.wallie.io`, `relay.peer.ooo`).

- **New Data Namespace**: Migrated to `hive_v2` namespace for cleaner peer synchronization, isolating data from legacy relay contamination.

- **Smarter Connection Management**: Connection status now correctly waits for the `hi` event from GunDB before marking as connected, eliminating false "connected" states. Exponential backoff reconnection (3s → 4.5s → 6.75s → up to 30s).

- **Fixed Chat Layout**: Resolved visual layout flip when the first message arrived in a conversation.

- **Optimistic Image Sending**: Images now appear instantly in the chat as soon as you send them, without waiting for P2P sync confirmation.

- **Fixed Memory Leak**: Message listeners are now properly cleaned up when leaving a chat room.

- **Fixed Presence Heartbeat**: Heartbeat timer no longer duplicates on app resume. App state changes (background/foreground) are now correctly handled.

- **Improved Media Handling**: Image size limit enforcer now correctly reads file size using the `expo-file-system` legacy API. Clear error messages when the image is too large (limit: 200KB).

- **Better Loading States**: Chat screen shows a connecting indicator while your peer identity is being resolved, preventing "ghost" user IDs.

### Bug Fixes

- Fixed stale closure in the room list refresh function
- Fixed `markOffline` incorrectly re-initializing the GunDB instance when the app went to background
- Fixed `AppState` listener not re-registering after `stopPresence()` was called

---

## Português (PT-BR)

**Versão:** 2.1.0 (Produção)
**Código de Versão:** 3
**Tipo de Lançamento:** Produção
**Data de Lançamento:** 21/04/2026

<pt-BR>
### O que há de novo

- **Rede Totalmente Descentralizada**: Removidas todas as conexões com servidores centralizados e infraestrutura de VPS. O aplicativo agora se conecta exclusivamente através de relays públicos da comunidade GunDB (`peer.wallie.io`, `relay.peer.ooo`).

- **Novo Namespace de Dados**: Migração para o namespace `hive_v2` para sincronização de peers mais limpa, isolando dados de contaminação por relays legados.

- **Gerenciamento de Conexão Mais Inteligente**: O status de conexão agora aguarda corretamente o evento `hi` do GunDB antes de marcar como conectado, eliminando estados "conectado" falsos. Reconexão com backoff exponencial (3s → 4,5s → 6,75s → até 30s).

- **Layout do Chat Corrigido**: Resolvida a inversão visual do layout quando a primeira mensagem chegava em uma conversa.

- **Envio Otimista de Imagens**: As imagens agora aparecem instantaneamente no chat assim que são enviadas, sem aguardar a confirmação da sincronização P2P.

- **Vazamento de Memória Corrigido**: Os listeners de mensagens agora são limpos corretamente ao sair de uma sala de chat.

- **Heartbeat de Presença Corrigido**: O timer de heartbeat não duplica mais na retomada do aplicativo. As mudanças de estado do app (segundo plano/primeiro plano) são tratadas corretamente.

- **Tratamento de Mídia Melhorado**: O limitador de tamanho de imagem agora lê corretamente o tamanho do arquivo usando a API legada do `expo-file-system`. Mensagens de erro claras quando a imagem é muito grande (limite: 200KB).

- **Melhores Estados de Carregamento**: A tela do chat exibe um indicador de conexão enquanto sua identidade de peer é resolvida, evitando IDs de usuário "fantasmas".

### Correções de Bugs

- Corrigido closure desatualizado na função de atualização da lista de salas
- Corrigido `markOffline` reinicializando incorretamente a instância do GunDB ao ir para segundo plano
- Corrigido listener do `AppState` não se registrando novamente após `stopPresence()` ser chamado
</pt-BR>

---

## Google Play Store — Short Description (EN)

> Hive is a 100% P2P, decentralized chat app. No servers, no login, no tracking. Just peers talking to peers.

## Google Play Store — Descrição Curta (PT-BR)

> Hive é um app de chat 100% P2P e descentralizado. Sem servidores, sem cadastro, sem rastreamento. Apenas peers conversando entre si.
