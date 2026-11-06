# Adurys Gallery

Adurys Gallery is a Django REST backend with Redis caching plus two Next.js applications for the storefront and admin panel. The production stack is Dockerized and designed to run behind Nginx with Cloudflare Origin SSL.

## Production Topology

Use these hosts in production:

- `adurysgallery.com` for the storefront
- `admin.adurysgallery.com` for the admin panel
- `api.adurysgallery.com` for the Django API

The Django app loads [core/.env](core/.env) at startup. The project now uses a **local PostgreSQL** container as the primary database. Variables like `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, and `DB_PORT` are used by the backend and Docker Compose. A root [.env](.env) file is also used to synchronize these credentials with the Docker infrastructure.

## Required Server Setup

On a fresh Ubuntu server, install Docker and the compose plugin:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

Open the firewall for the public web ports:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Create the Cloudflare Origin SSL files here:

- `ssl/cert.pem`
- `ssl/key.pem`

Then point your Cloudflare DNS records to the server and keep proxying enabled.

## Environment Files

Populate these files separately:

- `core/.env`
- `frontend/.env`
- `admin/.env`

Backend example:

```env
DEBUG=False
SECRET_KEY=replace-me
ALLOWED_HOSTS=api.adurysgallery.com
DATABASE_URL= # Fallback only, discrete variables preferred
DB_NAME=adurys_prod
DB_USER=adurys_admin
DB_PASSWORD=your-secure-password
DB_HOST=db
DB_PORT=5432
REDIS_URL=redis://redis:6379/1
CONN_MAX_AGE=60
CORS_ALLOWED_ORIGINS=https://adurysgallery.com,https://admin.adurysgallery.com
CSRF_TRUSTED_ORIGINS=https://adurysgallery.com,https://admin.adurysgallery.com,https://api.adurysgallery.com
PATHAO_BASE_URL=https://courier-api.pathao.com
PATHAO_CLIENT_ID=your-client-id
PATHAO_CLIENT_SECRET=your-client-secret
PATHAO_USERNAME=your-pathao-username
PATHAO_PASSWORD=your-pathao-password
PATHAO_WEBHOOK_SECRET=your-pathao-webhook-secret
PATHAO_WEBHOOK_INTEGRATION_SECRET=your-merchant-webhook-integration-secret
PATHAO_WEBHOOK_USE_CELERY=True
```

### Root Environment File (.env)

A root `.env` file is required for Docker Compose to resolve database credentials during the build and initialization phase. **Keep these in sync with `core/.env`**.

```env
DB_NAME=adurys_prod
DB_USER=adurys_admin
DB_PASSWORD=your-secure-password
```

Frontend example:

```env
NEXT_PUBLIC_API_URL=https://api.adurysgallery.com
NEXT_PUBLIC_SITE_URL=https://adurysgallery.com
```

Admin example:

```env
NEXT_PUBLIC_API_URL=https://api.adurysgallery.com
NEXT_PUBLIC_SITE_URL=https://admin.adurysgallery.com
```

## Deploy Commands

From the repository root:

```bash
docker compose --env-file core/.env up -d --build
```

For local development fallback without Nginx/SSL:

```bash
docker compose --env-file core/.env -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Shortcuts:

```bash
chmod +x deploy.sh
bash deploy.sh prod
bash deploy.sh dev
bash deploy.sh logs
bash deploy.sh restart
```

Useful follow-up commands:

```bash
docker compose logs -f
docker compose ps
docker compose restart
docker compose down
docker compose down --remove-orphans
docker compose down -v
```

If you change code or dependencies, rebuild the affected service:

```bash
docker compose build core frontend admin
docker compose up -d
```

## GitHub Actions CI/CD

This repository includes a production workflow at `.github/workflows/deploy.yml`.

What it does on every push to `main` (or manual run):

- Runs backend checks and Django tests in `core/`
- Builds both Next.js apps (`frontend/` and `admin/`)
- Deploys to your server over SSH and runs:
	- `git pull --ff-only`
	- `docker compose up -d --build --remove-orphans`

Required repository secrets:

- `DEPLOY_HOST` (or `HOST`): server IP or hostname
- `DEPLOY_PORT` (or `PORT`): SSH port (usually `22`)
- `DEPLOY_USER` (or `USERNAME`): deployment user you created
- `DEPLOY_PATH`: absolute path to repo on server (example: `/home/deploy/Adurys-gallery`)
- `SSH_PRIVATE_KEY` (or `SSH_KEY`): private key that matches the server public key for deploy user
- `SSH_KNOWN_HOSTS` (optional but recommended): output of `ssh-keyscan -p <port> <host>`

Current workflow safety features:

- Step-level job timeouts to prevent stuck pipelines
- BuildKit enabled during server-side Docker build for faster, cleaner builds
- Post-deploy smoke checks for API, storefront, and admin via Nginx host routing
- Automatic rollback to previous git commit if service checks or smoke checks fail
- Conditional Docker cleanup when server disk usage is high (>= 85%)

Manual deployment from Actions:

1. Open Actions and run `CI and Deploy`
2. Set `ref` to the branch or tag you want (default is `main`)
3. Confirm the job finishes and check `docker compose ps` in logs

## Create A Superuser

After the containers are running, create the Django admin user from the backend container:

```bash
docker compose exec core python manage.py createsuperuser
```

docker compose -f docker-compose.yml -f docker-compose.dev.yml exec core python manage.py createsuperuser
```

## Database Backup & Restore

The project includes automated scripts for database maintenance located in the `scripts/` directory.

### Manual Backup
```bash
chmod +x scripts/db-backup.sh
./scripts/db-backup.sh
```
Backups are compressed (`.sql.gz`) and stored in `/mnt/backups/adurys_gallery` (or your configured path) with a 7-day retention policy.

### Restore from Backup
```bash
chmod +x scripts/db-restore.sh
./scripts/db-restore.sh /path/to/backup_file.sql.gz
```

### Automated Backups (Cron)
To run backups every 6 hours, add this to your `crontab -e`:
```cron
0 */6 * * * /path/to/repo/scripts/db-backup.sh >> /var/log/adurys_backup.log 2>&1
```

## What The Stack Does

- Redis runs as a persistent Docker service with append-only mode enabled.
- Django runs with Gunicorn and connects to a **Local PostgreSQL 16** container.
- The database uses a persistent Docker volume `postgres_data` for production.
- The storefront and admin app use standalone Next.js builds.
- Nginx terminates Cloudflare Origin SSL and routes the three hostnames to the correct container.
- HTTPS is enforced end-to-end, and Django trusts the forwarded HTTPS headers from Nginx.

## Notes

- Keep all `.env` files and SSL keys out of git.
- The backend cache remains Redis-based and keeps the existing invalidation logic intact.
- If a container fails, start with `docker compose logs -f <service-name>`.
-currently we are using ngrok for local development and it is not working in production. so we need to change the ngrok url to the production url.
# ruchi-wear-ecom
