# Deploy Firmum — Staging + Production

| Environment | Host | Tunnel ID | Port |
|-------------|------|-----------|------|
| **Staging** | Mac Mini `10.58.146.142` | `e5ee3930-03f0-42c2-a4d7-2efe6cad8cb9` | **5006** |
| **Production** | Mac Studio `10.58.146.159` | `143a4609-ce85-4ebc-b921-1b43fcf20639` | **8004** |

## Hostname routing

| Hostname | Machine | Purpose |
|----------|---------|---------|
| `staging.firmum.ai` | Mac Mini | Staging / QA |
| `app.firmum.ai` | Mac Studio | Production app |
| `firmum.ai` | Mac Studio | Production marketing + app |
| `www.firmum.ai` | Mac Studio | Canonical alias |
| `edgeadvisors.ai` / `edgeria.ai` | Mac Mini (legacy) | Keep until 301 redirects |

**Important:** `staging.firmum.ai` and `app.firmum.ai` must CNAME to **different tunnels** (Mini vs Studio). All records should be **proxied (orange cloud)**.

---

## 1. DNS (Cloudflare — proxied CNAMEs)

### Staging → Mac Mini tunnel

| Type | Name | Target |
|------|------|--------|
| CNAME | `staging` | `e5ee3930-03f0-42c2-a4d7-2efe6cad8cb9.cfargotunnel.com` |

```bash
cloudflared tunnel route dns e5ee3930-03f0-42c2-a4d7-2efe6cad8cb9 staging.firmum.ai
```

### Production → Mac Studio tunnel

| Type | Name | Target |
|------|------|--------|
| CNAME | `@` | `143a4609-ce85-4ebc-b921-1b43fcf20639.cfargotunnel.com` |
| CNAME | `www` | `143a4609-ce85-4ebc-b921-1b43fcf20639.cfargotunnel.com` |
| CNAME | `app` | `143a4609-ce85-4ebc-b921-1b43fcf20639.cfargotunnel.com` |

```bash
TUNNEL_ID=143a4609-ce85-4ebc-b921-1b43fcf20639
cloudflared tunnel route dns $TUNNEL_ID firmum.ai
cloudflared tunnel route dns $TUNNEL_ID www.firmum.ai
cloudflared tunnel route dns $TUNNEL_ID app.firmum.ai
```

**Verify** (should return Cloudflare `104.x` / `172.x` IPs):

```bash
dig +short staging.firmum.ai
dig +short app.firmum.ai
dig +short firmum.ai
```

---

## 2. Cloudflared ingress

### Mac Mini (`~/.cloudflared/config.yml`) — add before `http_status:404`

```yaml
  - hostname: staging.firmum.ai
    service: http://localhost:5006

  - hostname: edgeadvisors.ai
    service: http://localhost:5006
  # ... legacy hostnames only — do NOT route app.firmum.ai here
```

Remove `app.firmum.ai`, `firmum.ai`, `www.firmum.ai` from Mini once Studio production is live.

### Mac Studio (`~/.cloudflared/config.yml`) — add before `http_status:404`

```yaml
  - hostname: firmum.ai
    service: http://localhost:8004

  - hostname: www.firmum.ai
    service: http://localhost:8004

  - hostname: app.firmum.ai
    service: http://localhost:8004
```

Restart tunnels:

```bash
# Mac Mini
launchctl stop com.iab.cloudflared && sleep 2 && launchctl start com.iab.cloudflared

# Mac Studio
launchctl stop com.iabadvisors.cloudflared && sleep 2 && launchctl start com.iabadvisors.cloudflared
```

---

## 3. Environment

### Mac Mini — `.env.beta`

```bash
PORT=5006
PUBLIC_DOMAIN=firmum.ai
ENVIRONMENT=staging
JWT_SECRET=<strong-secret>
ALLOWED_ORIGINS=https://staging.firmum.ai,https://edgeadvisors.ai,https://www.edgeadvisors.ai,https://edgeria.ai,https://www.edgeria.ai,http://localhost:5173
SENDGRID_FROM_EMAIL=notifications@firmum.ai
SENDGRID_FROM_NAME=Firmum
```

### Mac Studio — `.env.production`

```bash
PORT=8004
WORKERS=4
PUBLIC_DOMAIN=firmum.ai
ENVIRONMENT=production
JWT_SECRET=<strong-secret-different-from-staging>
ALLOWED_ORIGINS=https://firmum.ai,https://www.firmum.ai,https://app.firmum.ai
SENDGRID_FROM_EMAIL=notifications@firmum.ai
SENDGRID_FROM_NAME=Firmum
```

`backend/app.py` auto-appends `firmum.ai` subdomains (`www`, `app`, `staging`) when `PUBLIC_DOMAIN` is set.

---

## 4. Deploy staging (Mac Mini)

```bash
# From dev machine — rsync or git pull on Mini
ssh iabadvisors@10.58.146.142

cd ~/Projects/edgeai-demo
git pull origin main   # or rsync from dev

cd frontend && npm ci && npm run build

launchctl stop com.iab.edgeai-ria-beta
sleep 2
launchctl start com.iab.edgeai-ria-beta
# Fallback if launchd fails:
# nohup ~/scripts/start_edgeai_ria.sh >> /tmp/edgeai-ria-beta.log 2>&1 &
```

Start script: `~/scripts/start_edgeai_ria.sh` → `scripts/start_firmum_mac_mini.sh` pattern (port 5006).

---

## 5. Deploy production (Mac Studio)

First-time setup:

```bash
ssh iabadvisors@10.58.146.159

cd ~/Projects
git clone <repo-url> edgeai-demo   # or rsync from dev

cd edgeai-demo
~/.pyenv/versions/3.12.12/bin/python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

cp .env.production.example .env.production   # edit JWT_SECRET, DB if needed

cd frontend && npm ci && npm run build
```

Install launchd (`~/Library/LaunchAgents/com.iabadvisors.firmum.plist`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.iabadvisors.firmum</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>/Users/iabadvisors/Projects/edgeai-demo/scripts/start_firmum_mac_studio.sh</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/Users/iabadvisors/logs/firmum.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/iabadvisors/logs/firmum-error.log</string>
</dict>
</plist>
```

Deploy updates:

```bash
cd ~/Projects/edgeai-demo && git pull origin main
cd frontend && npm ci && npm run build
launchctl stop com.iabadvisors.firmum && sleep 3 && launchctl start com.iabadvisors.firmum
```

---

## 6. Verification

```bash
# Staging
curl -s https://staging.firmum.ai/api/health
curl -s https://staging.firmum.ai/ | grep -i firmum

# Production
curl -s https://app.firmum.ai/api/health
curl -s https://firmum.ai/api/health

# Local
curl -s http://10.58.146.142:5006/api/health   # Mini
curl -s http://10.58.146.159:8004/api/health   # Studio
```

Login smoke test: `leslie@iabadvisors.com` / `CreateWealth2026$`

---

## 7. Legacy redirects (Cloudflare Rules)

After production is verified on `app.firmum.ai`:

- `https://edgeadvisors.ai/*` → `https://firmum.ai/$1` (301)
- `https://edgeria.ai/*` → `https://firmum.ai/$1` (301)

---

## Quick reference

| Item | Staging | Production |
|------|---------|------------|
| URL | `staging.firmum.ai` | `app.firmum.ai` |
| Host | Mac Mini | Mac Studio |
| Port | 5006 | 8004 |
| Env file | `.env.beta` | `.env.production` |
| launchd | `com.iab.edgeai-ria-beta` | `com.iabadvisors.firmum` |
| Tunnel | `e5ee3930-…` | `143a4609-…` |
