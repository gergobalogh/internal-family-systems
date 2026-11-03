# The test link: ifs.gergobalogh.me

An unlisted copy of the app for testers on their own phones. Caddy serves
the built app from `dist/` and sends `/api/*` to `server/serve.ts`, a small
Node server on `127.0.0.1:8785` that runs as a user service. No login; kept
out of search engines; the AI routes limit themselves (200 calls per
visitor an hour, 2000 a day for everyone; a walk takes about 30).

## Keys

In `/home/www/internal-family-systems/.env` on the VPS (`chmod 600`):

```
# Muse Spark writes the reflections, names and phrases (the standard model,
# not a "contributor" one). Without it: Claude if ANTHROPIC_API_KEY is set,
# else the app's fixed lines.
META_API_KEY=
# Figures, where parts start, the toward-check and the free-write's form.
JEV_API_KEY=
# The safety check, with JEV: keep both on while anyone tests with real words.
OPENAI_API_KEY=
```

After changing it: `systemctl --user restart internal-family-systems`.
The service prints which ones it found (never the keys):
`journalctl --user -u internal-family-systems -n 5`.

## First setup

1. DNS: an A record `ifs` → `116.203.191.174`, DNS only (like `lab` and `app`).
2. The app, as the `gfcj` user:
   ```
   git clone https://github.com/gergobalogh/internal-family-systems.git /home/www/internal-family-systems
   cd /home/www/internal-family-systems && npm ci && npm run build
   cp deploy/internal-family-systems.service ~/.config/systemd/user/
   systemctl --user daemon-reload && systemctl --user enable --now internal-family-systems
   ```
3. Caddy (needs sudo):
   ```
   sudo cp /home/www/internal-family-systems/deploy/ifs.caddy /etc/caddy/sites/
   sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile && sudo systemctl reload caddy
   ```

## Updating

```
cd /home/www/internal-family-systems && git pull && npm ci && npm run build
systemctl --user restart internal-family-systems
```
