# EC2 deployment

This repo can be deployed to an EC2 instance by running a local PowerShell deploy script from your Windows machine.

## Security note (PEM)
Do **not** commit `*.pem` files. Keep them local only.

For manual deploys from your machine, keep your SSH private key **outside** the repo and pass its path to the deploy script.

## One-time server setup
1. SSH to the EC2 instance.
2. Run bootstrap (Ubuntu/Debian):
   - `sudo REPO_URL=https://github.com/qutubkothari/SAK-SMS.git BRANCH=main bash deploy/ec2/bootstrap.sh`
3. Create `apps/api/.env` on the server (at `$APP_DIR/apps/api/.env`).
   - Must include `DATABASE_URL=...`
   - Must include `AUTH_JWT_SECRET=...` (required for production login)
   - Optional: `AI_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`
4. Ensure security group allows inbound TCP:
   - `80` (web)
   - (optional) `4000` (api) — recommended to keep **closed** and access API via `/api` proxy
   - `5432` only if you expose Postgres (usually **don’t**)

## Auto-deploy workflow (recommended)
Start the auto-deploy watcher that commits + pushes to GitHub and deploys to EC2 on every file change:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File deploy/ec2/auto-deploy-v2.ps1 -Server <EC2_IP> -User ubuntu -KeyPath "C:\path\to\your-key.pem" -RepoUrl "https://github.com/<owner>/<repo>.git" -Branch <branch>
```

The watcher:
- Monitors workspace for file changes (ignores node_modules, .git, dist, etc.)
- Debounces changes (5 sec default)
- Auto-commits with timestamp to GitHub
- Auto-deploys to EC2 from GitHub
- Press Ctrl+C to stop

## Manual workflow (alternative)
1. Push your changes to GitHub (manual, separate step):
   - `powershell -NoProfile -ExecutionPolicy Bypass -File deploy/ec2/push-to-github.ps1 -Message "your message"`
2. Deploy the latest pushed code to EC2 (manual, separate step):
   - `powershell -NoProfile -ExecutionPolicy Bypass -File deploy/ec2/deploy-from-local.ps1 -Server <EC2_IP> -User ubuntu -KeyPath "C:\path\to\your-key.pem" -RepoUrl "https://github.com/<owner>/<repo>.git" -Branch <branch>`

Notes:
- `deploy-from-local.ps1` uploads the deploy scripts and then runs `deploy/ec2/remote-deploy.sh` on the server.
- The server deploy pulls from GitHub (`git reset --hard origin/<branch>`), so deploy the commit you want first.

## URLs
- Web: `http://<EC2_IP>/`
- API (proxied): `http://<EC2_IP>/api/health`

