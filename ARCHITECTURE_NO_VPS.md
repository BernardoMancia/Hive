# Hive — Arquitetura P2P Pura (Zero VPS)

## Visão Geral

O Hive é um aplicativo de chat **100% descentralizado**, construído sobre o protocolo **GunDB**.
Toda a comunicação ocorre diretamente entre os dispositivos dos usuários (peer-to-peer).

---

## O que É permitido

| Recurso | Descrição |
|---|---|
| **GunDB community relays** | Relays públicos mantidos pela comunidade open-source do GunDB. Servem apenas como ponto de encontro inicial (bootstrap) entre peers — não armazenam dados de forma centralizada. |
| **WebRTC** | Comunicação direta entre browsers/apps sem intermediários, quando disponível. |
| **AsyncStorage** | Persistência local no dispositivo do usuário (userId, nome, preferências). |
| **GunDB RAX** | Sincronização local em memória entre abas/instâncias no mesmo dispositivo. |

---

## O que NÃO é permitido (Spec Negativas)

| Proibição | Motivo |
|---|---|
| ❌ Qualquer IP privado ou VPS próprio | Cria dependência central e ponto único de falha |
| ❌ Relay auto-hospedado (mesmo que em cloud: AWS, GCP, DigitalOcean próprio) | Viola o modelo P2P — o operador controla o tráfego |
| ❌ Backend REST, GraphQL ou WebSocket próprio | Centralização explícita |
| ❌ Firebase, Supabase, PocketBase ou qualquer BaaS | Centralização em terceiro |
| ❌ Armazenamento de mensagens em banco de dados do operador | Quebra de privacidade |
| ❌ Autenticação via servidor externo (OAuth, JWT próprio) | Cria tracking de usuário |
| ❌ Analytics que transmitem dados para servidor próprio | Rastreamento centralizado |
| ❌ Relay Heroku free-tier (ex: `gun-manhattan.herokuapp.com`) | Heroku encerrou dynos gratuitos em Nov/2022 — relay morto |

---

## Relays Comunitários em Uso

Os relays abaixo são mantidos pela comunidade GunDB e são **públicos e gratuitos**.
O app funciona com qualquer subconjunto deles ativo.

```
https://peer.wallie.io/gun
https://relay.peer.ooo/gun
```

> **Por que usar relays comunitários?**
> GunDB em ambiente mobile não possui capacidade nativa de WebRTC hole-punching sem um servidor de sinalização.
> Os relays servem apenas como **ponto de bootstrap**: após a conexão inicial, os dados se propagam
> diretamente entre os peers. Se todos os relays caírem, os peers que já se conhecem continuam se comunicando.

---

## Fluxo de Dados

```
Dispositivo A ──► Relay Comunitário ◄── Dispositivo B
                       │
                  (bootstrap only)
                  dados sincronizados
                  peer-to-peer via GunDB DAM
```

---

## Namespace GunDB

- **Namespace ativo:** `hive_v2`
- **Namespace legado (descontinuado):** `hive_v1` — usado quando havia relay VPS; dados não migráveis por design de privacidade.

---

## Modelo de Identidade

- `userId`: gerado localmente via `nanoid`-like, persistido em `AsyncStorage`. Nunca sai do dispositivo para um servidor controlado pelo operador.
- `userName`: escolhido pelo usuário, propagado via GunDB presence. Sem registro, sem senha.

---

## Limitações Conhecidas (P2P puro)

| Limitação | Motivo |
|---|---|
| Histórico de mensagens não é garantido | GunDB não tem persistência centralizada; mensagens antigas dependem de peers que as tenham em cache |
| Contagem de peers é aproximada | Baseada em heartbeats com janela de 30s |
| Imagens limitadas a 200KB (base64) | GunDB nodes têm limite prático de tamanho de payload |
| Sem push notifications | Requer servidor push central |
