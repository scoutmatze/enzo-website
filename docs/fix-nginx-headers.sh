#!/bin/bash
# Fix F-02 (HSTS) + F-14 (server_tokens) in nginx
CONF="/etc/nginx/sites-enabled/enzo-temp.conf"

# Add HSTS if not present
if ! grep -q "Strict-Transport-Security" "$CONF"; then
  sed -i '/listen 443 ssl/a \    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;' "$CONF"
  echo "✅ HSTS Header hinzugefügt"
else
  echo "✅ HSTS bereits vorhanden"
fi

# Add X-Frame-Options if not present
if ! grep -q "X-Frame-Options" "$CONF"; then
  sed -i '/listen 443 ssl/a \    add_header X-Frame-Options "DENY" always;' "$CONF"
  echo "✅ X-Frame-Options hinzugefügt"
fi

# Add Referrer-Policy if not present
if ! grep -q "Referrer-Policy" "$CONF"; then
  sed -i '/listen 443 ssl/a \    add_header Referrer-Policy "strict-origin-when-cross-origin" always;' "$CONF"
  echo "✅ Referrer-Policy hinzugefügt"
fi

# Add Permissions-Policy if not present
if ! grep -q "Permissions-Policy" "$CONF"; then
  sed -i '/listen 443 ssl/a \    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;' "$CONF"
  echo "✅ Permissions-Policy hinzugefügt"
fi

# server_tokens off in main nginx.conf
if ! grep -q "server_tokens off" /etc/nginx/nginx.conf; then
  sed -i '/http {/a \    server_tokens off;' /etc/nginx/nginx.conf
  echo "✅ server_tokens off gesetzt"
else
  echo "✅ server_tokens bereits off"
fi

# Test and reload
nginx -t && systemctl reload nginx && echo "✅ nginx neu geladen" || echo "❌ nginx-Config fehlerhaft!"

# Verify
echo ""
echo "Header-Check:"
curl -sI https://da-enzo-muenchen.de | grep -iE "strict|x-frame|referrer|permissions|server:"
