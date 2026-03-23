scp website\admin.html hetzner:/var/www/enzo/
scp enzo-api\src\db\init.js hetzner:/opt/enzo-api/src/db/
scp enzo-api\src\routes\invoices.js hetzner:/opt/enzo-api/src/routes/
scp enzo-api\src\routes\customer.js hetzner:/opt/enzo-api/src/routes/
ssh hetzner "systemctl restart enzo-api && sleep 2 && curl -s http://127.0.0.1:3000/api/health"
