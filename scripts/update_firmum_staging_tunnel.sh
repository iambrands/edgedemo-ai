#!/bin/zsh
# Add staging.firmum.ai to prod-mac-studio remote tunnel ingress (Cloudflare Zero Trust API).
# Required because prod-mac-studio is remotely managed — local config.yml is ignored.
#
# Usage:
#   export CLOUDFLARE_API_TOKEN='...'   # Account → Cloudflare Tunnel → Edit
#   ./scripts/update_firmum_staging_tunnel.sh
#
# Origin proxies staging traffic from Studio tunnel to Mac Mini over ZeroTier.

set -euo pipefail

ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-e055fa34a574bf5b022a0d2dc1827199}"
TUNNEL_ID="${CLOUDFLARE_TUNNEL_ID:-143a4609-ce85-4ebc-b921-1b43fcf20639}"
STAGING_ORIGIN="${STAGING_ORIGIN:-http://10.58.146.142:5006}"

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "ERROR: Set CLOUDFLARE_API_TOKEN (Cloudflare Tunnel Edit permission)." >&2
  exit 1
fi

API="https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/cfd_tunnel/${TUNNEL_ID}/configurations"

current="$(curl -sf "$API" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json")"

updated_json="$(python3 - "$current" "$STAGING_ORIGIN" <<'PY'
import json, sys

payload = json.loads(sys.argv[1])
origin = sys.argv[2]
config = payload.get("result", {}).get("config") or payload.get("result", {})
ingress = list(config.get("ingress") or [])

for rule in ingress:
    if rule.get("hostname") == "staging.firmum.ai":
        sys.exit(0)

catch_all = ingress[-1] if ingress else {"service": "http_status:404"}
body = ingress[:-1] if ingress and "hostname" not in ingress[-1] else ingress
body.append({"hostname": "staging.firmum.ai", "service": origin, "originRequest": {}})
if catch_all.get("service") == "http_status:404":
    body.append(catch_all)
else:
    body.append({"service": "http_status:404"})

print(json.dumps({"config": {"ingress": body, "warp-routing": config.get("warp-routing", {"enabled": False})}}))
PY
)"

if [[ -z "$updated_json" ]]; then
  echo "Remote ingress already includes staging.firmum.ai."
  exit 0
fi

response="$(curl -sf -X PUT "$API" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data "$updated_json")"

echo "$response" | python3 -c "import json,sys; r=json.load(sys.stdin); print('OK' if r.get('success') else r)"

echo "Waiting for tunnel to pick up config..."
sleep 8
code="$(curl -s -o /dev/null -w '%{http_code}' https://staging.firmum.ai/api/health || true)"
echo "staging.firmum.ai/api/health → HTTP $code"
