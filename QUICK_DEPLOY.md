# 🚀 Quick VPS Deployment Guide

## 📋 One-Command Setup

### Ubuntu/Debian VPS:
```bash
# Update system and install dependencies
sudo apt update && sudo apt upgrade -y
sudo apt install curl wget git unzip build-essential postgresql postgresql-contrib nginx -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y

# Install PM2 globally
sudo npm install -g pm2
```

### Setup Database:
```bash
# Configure PostgreSQL
sudo -u postgres psql << EOF
CREATE DATABASE invizio_wms;
CREATE USER invizio_admin WITH PASSWORD 'InvizioSecure2025!';
GRANT ALL PRIVILEGES ON DATABASE invizio_wms TO invizio_admin;
ALTER USER invizio_admin CREATEDB;
\c invizio_wms
GRANT ALL ON SCHEMA public TO invizio_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO invizio_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO invizio_admin;
\q
EOF
```

### Deploy Application:
```bash
# Create application directory
sudo mkdir -p /var/www/invizio-wms
sudo chown $USER:$USER /var/www/invizio-wms

# Upload your application files to /var/www/invizio-wms
# Then run:
cd /var/www/invizio-wms

# Install and build
npm install
npm run build
cd server && npm install --production

# Setup environment
cp .env.example .env
nano .env  # Update with your settings

# Run database migration
npm run migrate

# Create default admin user
npm run create-admin
```

### Configure Services:
```bash
# Install Nginx configuration
sudo cp server/invizio-wms.nginx.conf /etc/nginx/sites-available/invizio-wms
sudo ln -s /etc/nginx/sites-available/invizio-wms /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Install systemd service
sudo cp server/invizio-wms.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable invizio-wms
sudo systemctl start invizio-wms

# Check status
sudo systemctl status invizio-wms
```

### Configure Firewall:
```bash
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
```

### Setup SSL (Optional but Recommended):
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

## 🔐 **Default Login Credentials**

After deployment, you can login with these accounts:

```
👤 Admin Account:
   Username: admin
   Password: admin123
   Access: Full system access

👤 Stock Worker Account:
   Username: stock  
   Password: stock123
   Access: Inventory, suppliers, shipping

👤 Store Worker Account:
   Username: store
   Password: store123  
   Access: Inventory viewing, stock requests

👤 Screen Display Account:
   Username: screen
   Password: screen123
   Access: Display screen only
```

**⚠️ Change these passwords after first login in production!**

## 🌐 Access Your Application

- **Local Network**: `http://your-vps-ip`
- **Internet**: `http://your-domain.com` (if domain configured)
- **Login**: `admin` / `admin123` (change after first login!)
- **Login**: Use any of the accounts above

## 🔧 **Troubleshooting Login Issues:**

If you can't login:
1. **Try default accounts first** (admin/admin123, stock/stock123, etc.)
2. **Check browser console** for error messages
3. **Clear browser cache** and try again
4. **Check server logs**: `sudo journalctl -u invizio-wms -f`

## 📱 **QR Scanner Setup for VPS:**

For QR camera access on VPS:
1. **Setup HTTPS**: `sudo certbot --nginx -d your-domain.com`
2. **Camera requires HTTPS** on remote connections
3. **Manual input works** without camera
4. **Test with product codes** from inventory

## 📱 Mobile Access

The application is fully optimized for:
- 📱 **iPhone/iPad** - Touch-friendly with safe area support
- 📱 **Android** - Material Design compatible
- 💻 **Desktop** - Full responsive design
- 🖥️ **Tablets** - Optimized layouts

## 🔧 Environment Variables to Update

In `/var/www/invizio-wms/server/.env`:
```env
DB_PASSWORD=InvizioSecure2025!
JWT_SECRET=your_very_long_jwt_secret_key_here_at_least_64_characters_long
SESSION_SECRET=your_very_long_session_secret_here_also_64_characters_long
CORS_ORIGINS=http://your-vps-ip,http://your-domain.com,https://your-domain.com
```

## ✅ Production Ready Features

- 🔐 **Secure Authentication** with JWT tokens
- 🗄️ **PostgreSQL Database** with full persistence
- 🚀 **PM2 Process Management** with auto-restart
- 🌐 **Nginx Reverse Proxy** with SSL support
- 📊 **Complete Analytics** and reporting
- 📱 **Mobile Optimized** for all devices
- 🔄 **Auto Backups** and monitoring
- 🛡️ **Security Hardened** with rate limiting

Your Invizio WMS is now ready for worldwide deployment! 🌍