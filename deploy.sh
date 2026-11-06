#!/usr/bin/env bash
set -euo pipefail

COMMAND="${1:-}"

case "$COMMAND" in
  dev)
    wsl docker compose --env-file core/.env -f docker-compose.yml -f docker-compose.dev.yml up --build
    ;;
  prod)
    wsl docker compose --env-file core/.env up -d --build
    ;;
  logs)
    wsl docker compose --env-file core/.env logs -f
    ;;
  restart)
    wsl docker compose --env-file core/.env restart
    ;;
  stop)
    wsl docker compose --env-file core/.env stop
    ;;
  down)
    wsl docker compose --env-file core/.env down --remove-orphans
    ;;
  build)
    wsl docker compose --env-file core/.env build
    ;;
  *)
    echo "Usage: ./deploy.sh {dev|prod|logs|restart|stop|down|build}"
    exit 1
    ;;
esac