#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/cakecost-pro}"
APP_USER="${APP_USER:-ubuntu}"
ENV_FILE="${ENV_FILE:-/tmp/cakecost-pro.env}"
SERVICE_NAME="${SERVICE_NAME:-cakecost-pro}"
DB_NAME="${DB_NAME:-cakecost_pro}"
DB_USER="${DB_USER:-cakecost_pro_user}"
DB_PASSWORD="${DB_PASSWORD:-}"
PORT="${PORT:-80}"
HOST="${HOST:-0.0.0.0}"

if [[ -z "$DB_PASSWORD" && -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  DB_PASSWORD="${DB_PASSWORD:-}"
fi

if [[ -z "$DB_PASSWORD" ]]; then
  echo "DB_PASSWORD é obrigatório." >&2
  exit 1
fi

if ! command -v sudo >/dev/null 2>&1; then
  echo "sudo não encontrado no servidor." >&2
  exit 1
fi

echo "Instalando dependências do sistema..."
sudo apt-get update
sudo apt-get install -y nodejs npm postgresql rsync

echo "Garantindo PostgreSQL ativo..."
sudo systemctl enable --now postgresql

if [[ -d "$APP_DIR/.git" ]]; then
  echo "Encontrado diretório Git em $APP_DIR. O deploy via workflow sincroniza os arquivos diretamente."
fi

echo "Preparando diretório da aplicação..."
sudo mkdir -p "$APP_DIR"
sudo chown -R "$APP_USER:$APP_USER" "$APP_DIR"

if [[ -f "$ENV_FILE" ]]; then
  echo "Instalando arquivo de ambiente..."
  sudo install -m 600 -o root -g root "$ENV_FILE" /etc/cakecost-pro.env
else
  echo "Arquivo de ambiente não encontrado em $ENV_FILE." >&2
  exit 1
fi

echo "Criando usuário e banco no PostgreSQL..."
DB_USER_SQL=${DB_USER//\'/\'\'}
DB_PASSWORD_SQL=${DB_PASSWORD//\'/\'\'}
sudo -u postgres psql <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${DB_USER_SQL}') THEN
    EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', '${DB_USER_SQL}', '${DB_PASSWORD_SQL}');
  ELSE
    EXECUTE format('ALTER ROLE %I WITH LOGIN PASSWORD %L', '${DB_USER_SQL}', '${DB_PASSWORD_SQL}');
  END IF;
END
\$\$;
SQL

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -q 1; then
  sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
else
  sudo -u postgres psql -c "ALTER DATABASE \"${DB_NAME}\" OWNER TO \"${DB_USER}\";"
fi

echo "Instalando dependências Node da aplicação..."
cd "$APP_DIR"
npm ci --omit=dev --no-audit --no-fund

echo "Criando serviço systemd..."
sudo tee "/etc/systemd/system/${SERVICE_NAME}.service" >/dev/null <<EOF
[Unit]
Description=CakeCost Pro
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=/etc/cakecost-pro.env
ExecStart=/usr/bin/node ${APP_DIR}/server/index.mjs
Restart=always
RestartSec=5
AmbientCapabilities=CAP_NET_BIND_SERVICE
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

echo "Recarregando systemd e reiniciando serviço..."
sudo systemctl daemon-reload
sudo systemctl enable --now "${SERVICE_NAME}"
sudo systemctl restart "${SERVICE_NAME}"
sudo systemctl --no-pager --full status "${SERVICE_NAME}" || true

echo "Deploy concluído."
