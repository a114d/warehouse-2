# 🚀 VPS Deployment Checklist

## ✅ Pre-Deployment Checklist

### **Server Requirements**
- [ ] VPS with Ubuntu 20.04+ or Debian 11+
- [ ] Minimum 4GB RAM, 2 CPU cores
- [ ] 100GB+ SSD storage
- [ ] Root or sudo access
- [ ] Static IP address or domain name

### **Network Requirements**
- [ ] Port 80 open (HTTP)
- [ ] Port 443 open (HTTPS)
- [ ] Port 22 open (SSH)
- [ ] Firewall configured

## 🔧 Deployment Steps

### **Step 1: Server Preparation**
```bash
# Run the quick setup script
chmod +x server/scripts/quick-setup.sh
./server/scripts/quick-setup.sh
```

### **Step 2: Upload Application**
```bash
# Upload files to VPS (use scp, rsync, or git)
scp -r ./dist ./server ./package.json user@your-vps-ip:/var/www/invizio-wms/
```

### **Step 3: Install and Configure**
```bash
# On VPS
cd /var/www/invizio-wms
npm run deploy:prepare

# Configure environment
cd server
cp .env.example .env
nano .env  # Update with your settings
```

### **Step 4: Install Services**
```bash
# Install Nginx configuration
sudo cp server/invizio-wms.nginx.conf /etc/nginx/sites-available/invizio-wms
sudo ln -s /etc/nginx/sites-available/invizio-wms /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default site
sudo nginx -t && sudo systemctl reload nginx

# Install systemd service
sudo cp server/invizio-wms.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable invizio-wms
sudo systemctl start invizio-wms
```

### **Step 5: Configure Firewall**
```bash
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
sudo ufw status
```

### **Step 6: Setup SSL (Recommended)**
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
sudo certbot renew --dry-run
```

## 🔍 Verification Steps

### **Check Services**
```bash
# Check application status
sudo systemctl status invizio-wms
pm2 status

# Check database
sudo -u postgres psql invizio_wms -c "SELECT COUNT(*) FROM users;"

# Check web server
sudo systemctl status nginx
curl -I http://localhost
```

### **Test Application**
- [ ] Access web interface: `http://your-vps-ip`
- [ ] Login with: `admin` / `admin123`
- [ ] Test mobile access on phone/tablet
- [ ] Test supplier management
- [ ] Test inventory updates
- [ ] Test QR scanner functionality

## 🌐 DNS Configuration

### **Point Domain to VPS**
1. Get VPS IP: `curl ifconfig.me`
2. Add DNS records:
   - A record: `your-domain.com` → `your-vps-ip`
   - A record: `www.your-domain.com` → `your-vps-ip`

### **Update CORS Settings**
```bash
# Edit .env file
nano /var/www/invizio-wms/server/.env

# Update CORS_ORIGINS
CORS_ORIGINS=http://your-vps-ip,http://your-domain.com,https://your-domain.com

# Restart application
sudo systemctl restart invizio-wms
```

## 📊 Monitoring Commands

```bash
# Application logs
sudo journalctl -u invizio-wms -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Database status
sudo -u postgres psql invizio_wms -c "SELECT pg_size_pretty(pg_database_size('invizio_wms'));"

# System resources
htop
df -h
```

## 🔐 Security Checklist

- [ ] Changed default admin password
- [ ] Updated JWT secrets in .env
- [ ] Configured firewall rules
- [ ] Installed SSL certificate
- [ ] Set up fail2ban (optional)
- [ ] Configured automated backups

## 📱 Mobile Access Instructions

### **For Shop Workers:**
1. **Bookmark**: Add `http://your-domain.com` to mobile bookmarks
2. **Home Screen**: Add to home screen for app-like experience
3. **Login**: Use provided credentials from admin
4. **Features**: Full touch-optimized interface

### **Supported Devices:**
- ✅ iPhone (iOS 12+)
- ✅ iPad (all models)
- ✅ Android phones (Android 8+)
- ✅ Android tablets
- ✅ Desktop browsers (Chrome, Firefox, Safari, Edge)

## 🎉 Deployment Complete!

Your Invizio WMS is now live and accessible worldwide with:

- ✅ **Complete Database Persistence**
- ✅ **Mobile-Optimized Interface**
- ✅ **Real-time Inventory Management**
- ✅ **Multi-Shop Support**
- ✅ **QR Code Integration**
- ✅ **Professional Security**
- ✅ **Automated Backups**

**🌍 Your warehouse management system is now ready for global access!**