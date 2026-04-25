#!/bin/bash
# =============================================================================
#  Hive Relay — VPS Setup Script
#  Servidor: 82.112.245.99 (Ubuntu 22.04+)
#  Execução: sudo bash setup.sh
# =============================================================================
set -euo pipefail

VPS_IP="82.112.245.99"
RELAY_DIR="/opt/hive-relay"
SSL_DIR="/etc/ssl/hive"
NGINX_SITE="/etc/nginx/sites-available/hive-relay"
RELAY_PORT=8765

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[!]${NC} $1"; exit 1; }

[[ $EUID -ne 0 ]] && err "Execute como root: sudo bash setup.sh"

# ─── 1. DEPENDÊNCIAS ─────────────────────────────────────────────────────────
log "Atualizando sistema..."
apt-get update -qq
apt-get install -y -qq curl nginx ufw openssl

log "Instalando Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
apt-get install -y -qq nodejs

log "Instalando PM2..."
npm install -g pm2 --silent

# ─── 2. CERTIFICADO TLS (self-signed para IP direto) ─────────────────────────
log "Gerando certificado TLS 1.3 para $VPS_IP (RSA-4096, 10 anos)..."
mkdir -p "$SSL_DIR"
chmod 700 "$SSL_DIR"

openssl req -x509 \
  -newkey rsa:4096 \
  -keyout "$SSL_DIR/key.pem" \
  -out "$SSL_DIR/cert.pem" \
  -days 3650 \
  -nodes \
  -subj "/C=XX/ST=Relay/L=P2P/O=Hive/CN=$VPS_IP" \
  -addext "subjectAltName=IP:$VPS_IP" \
  -addext "keyUsage=digitalSignature,keyEncipherment" \
  -addext "extendedKeyUsage=serverAuth" 2>/dev/null

chmod 600 "$SSL_DIR/key.pem"
chmod 644 "$SSL_DIR/cert.pem"

# Extrair fingerprint SHA-256 para pinning no app
FINGERPRINT=$(openssl x509 -in "$SSL_DIR/cert.pem" -noout -fingerprint -sha256 \
  | sed 's/SHA256 Fingerprint=//' | sed 's/://g' | tr '[:upper:]' '[:lower:]')

echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║  FINGERPRINT SHA-256 DO CERTIFICADO — COPIE PARA O APP              ║"
echo "║  (src/services/crypto.ts → CERT_FINGERPRINT)                        ║"
echo "╠══════════════════════════════════════════════════════════════════════╣"
echo "║  $FINGERPRINT  ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# ─── 3. RELAY NODE.JS ────────────────────────────────────────────────────────
log "Configurando relay em $RELAY_DIR..."
mkdir -p "$RELAY_DIR"

cp relay.js "$RELAY_DIR/relay.js"
cp package.json "$RELAY_DIR/package.json"

cd "$RELAY_DIR"
npm install --silent --production
PORT=$RELAY_PORT pm2 start relay.js \
  --name hive-relay \
  --max-memory-restart 150M \
  --restart-delay 3000 \
  --no-autorestart false

pm2 save
pm2 startup systemd -u root --hp /root > /dev/null 2>&1

# ─── 4. NGINX ────────────────────────────────────────────────────────────────
log "Configurando Nginx (TLS 1.3 + WSS proxy)..."
cp /opt/hive-relay/../nginx-hive.conf "$NGINX_SITE" 2>/dev/null || \
  cp "$(dirname "$0")/nginx-hive.conf" "$NGINX_SITE"

# Remover site default
rm -f /etc/nginx/sites-enabled/default
ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/hive-relay

nginx -t && systemctl reload nginx

# ─── 5. FIREWALL ─────────────────────────────────────────────────────────────
log "Configurando UFW (apenas 22 + 443)..."
ufw --force reset > /dev/null 2>&1
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    comment "SSH"
ufw allow 443/tcp   comment "HTTPS / WSS Hive"
ufw --force enable

# ─── 6. VERIFICAÇÃO ──────────────────────────────────────────────────────────
log "Verificando serviços..."
sleep 2

pm2 show hive-relay | grep -E "status|memory" || true

echo ""
echo "══════════════════════════════════════════════════════════════════════"
echo "  Hive Relay ativo em wss://$VPS_IP/gun"
echo "  TLS 1.3 | RAM only | Zero persistência"
echo ""
echo "  Teste: curl -k https://$VPS_IP/health"
echo ""
echo "  ⚠ PRÓXIMO PASSO:"
echo "  Cole o fingerprint SHA-256 acima em:"
echo "  android/app/src/main/res/xml/network_security_config.xml"
echo "  → atributo pin: (linha SHA256)"
echo "══════════════════════════════════════════════════════════════════════"
