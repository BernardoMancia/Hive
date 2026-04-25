#!/bin/bash
# =============================================================================
#  Hive Relay — VPS Setup  |  fogoeluar.com.br
#  Execução: sudo bash setup.sh
# =============================================================================
set -euo pipefail

DOMAIN="fogoeluar.com.br"
RELAY_DIR="/home/adm_luke/prod/apps/hive-relay"
NGINX_SITE="/etc/nginx/sites-available/hive-relay"
RELAY_PORT=8765
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

[[ $EUID -ne 0 ]] && err "Execute como root: sudo bash setup.sh"

# ─── 1. DEPENDÊNCIAS ─────────────────────────────────────────────────────────
log "Atualizando sistema..."
apt-get update -qq
apt-get install -y -qq curl nginx ufw certbot python3-certbot-nginx

log "Instalando Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
apt-get install -y -qq nodejs
npm install -g pm2 --silent

# ─── 2. REMOVER PROJETO DROPSHIP ANTERIOR ────────────────────────────────────
log "Removendo site dropship anterior em $DOMAIN..."
rm -f /etc/nginx/sites-enabled/dropship* 2>/dev/null || true
rm -f /etc/nginx/sites-available/dropship* 2>/dev/null || true
pm2 delete dropship 2>/dev/null || true
pm2 delete all 2>/dev/null || true
systemctl reload nginx 2>/dev/null || true

# ─── 3. RELAY NODE.JS ────────────────────────────────────────────────────────
log "Instalando relay em $RELAY_DIR..."
mkdir -p "$RELAY_DIR"
cp "$SCRIPT_DIR/relay.js"    "$RELAY_DIR/relay.js"
cp "$SCRIPT_DIR/package.json" "$RELAY_DIR/package.json"
cd "$RELAY_DIR"
npm install --silent --production

# ─── 4. NGINX TEMPORÁRIO (para certbot validar o domínio) ───────────────────
log "Configurando Nginx temporário para validação Let's Encrypt..."
mkdir -p /var/www/certbot
cat > /etc/nginx/sites-available/hive-temp <<'EOF'
server {
    listen 80;
    server_name fogoeluar.com.br www.fogoeluar.com.br;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 200 'ok'; }
}
EOF
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/hive-temp /etc/nginx/sites-enabled/hive-temp
nginx -t && systemctl reload nginx

# ─── 5. LET'S ENCRYPT ───────────────────────────────────────────────────────
log "Emitindo certificado TLS para $DOMAIN..."
certbot certonly --webroot \
  -w /var/www/certbot \
  -d "$DOMAIN" -d "www.$DOMAIN" \
  --non-interactive \
  --agree-tos \
  --email admin@$DOMAIN \
  --no-eff-email

# Renovação automática
echo "0 3 * * * root certbot renew --quiet --post-hook 'systemctl reload nginx'" \
  > /etc/cron.d/certbot-renew

# ─── 6. NGINX FINAL ─────────────────────────────────────────────────────────
log "Configurando Nginx final (TLS 1.3 + WSS)..."
rm -f /etc/nginx/sites-enabled/hive-temp
cp "$SCRIPT_DIR/nginx-hive.conf" "$NGINX_SITE"
ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/hive-relay
nginx -t && systemctl reload nginx

# ─── 7. PM2 ────────────────────────────────────────────────────────────────
log "Iniciando relay com PM2..."
cd "$RELAY_DIR"
PORT=$RELAY_PORT pm2 start relay.js \
  --name hive-relay \
  --max-memory-restart 150M \
  --restart-delay 3000
pm2 save
pm2 startup systemd -u root --hp /root > /dev/null 2>&1

# ─── 8. FIREWALL ────────────────────────────────────────────────────────────
log "Configurando UFW (22 + 443 apenas)..."
ufw --force reset > /dev/null 2>&1
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   comment "SSH"
ufw allow 443/tcp  comment "HTTPS/WSS Hive"
ufw allow 80/tcp   comment "HTTP (redirect + certbot)"
ufw --force enable

# ─── 9. VERIFICAÇÃO ─────────────────────────────────────────────────────────
sleep 3
echo ""
echo "════════════════════════════════════════════════════════"
echo "  ✅ Hive Relay ativo em wss://$DOMAIN/gun"
echo "  🔒 TLS 1.3 | Let's Encrypt | RAM only | TTL 1h"
echo ""
echo "  Teste: curl https://$DOMAIN/health"
echo "  PM2:   pm2 show hive-relay"
echo "════════════════════════════════════════════════════════"
