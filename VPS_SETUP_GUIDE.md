# 🚀 Invizio WMS - Complete VPS Deployment Guide

## 📋 Overview

This guide provides step-by-step instructions to deploy Invizio WMS on any VPS (Ubuntu, CentOS, Debian) with PostgreSQL database, complete backend API, and mobile-responsive frontend.

## 🖥️ VPS Requirements

### Minimum Requirements
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 50GB SSD
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **Network**: Stable internet connection

### Recommended Requirements
- **CPU**: 4+ cores
- **RAM**: 8GB
- **Storage**: 100GB SSD
- **Network**: 1Gbps connection

## 🔧 Complete Installation Process

### Step 1: Update System and Install Dependencies

#### Ubuntu/Debian:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install curl wget git unzip build-essential -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Nginx
sudo apt install nginx -y

# Install PM2 for process management
sudo npm install -g pm2

# Verify installations
node --version  # Should show v18.x.x+
npm --version
psql --version
nginx -v
pm2 --version
```

#### CentOS/RHEL:
```bash
# Update system
sudo yum update -y

# Install essential packages
sudo yum groupinstall "Development Tools" -y
sudo yum install curl wget git unzip -y

# Install Node.js 18+
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install nodejs -y

# Install PostgreSQL
sudo yum install postgresql postgresql-server postgresql-contrib -y
sudo postgresql-setup initdb

# Install Nginx
sudo yum install nginx -y

# Install PM2
sudo npm install -g pm2

# Start services
sudo systemctl start postgresql nginx
sudo systemctl enable postgresql nginx
```

### Step 2: Configure PostgreSQL Database

```bash
# Switch to postgres user
sudo -u postgres psql
```

Execute these SQL commands:
```sql
-- Set password for postgres user
\password postgres
-- Enter a secure password when prompted

-- Create database and user
CREATE DATABASE invizio_wms;
CREATE USER invizio_admin WITH PASSWORD 'your_secure_password_here';

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE invizio_wms TO invizio_admin;
ALTER USER invizio_admin CREATEDB;

-- Connect to the database
\c invizio_wms

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO invizio_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO invizio_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO invizio_admin;

-- Exit PostgreSQL
\q
```

### Step 3: Deploy Application Files

```bash
# Create application directory
sudo mkdir -p /var/www/invizio-wms
sudo chown $USER:$USER /var/www/invizio-wms

# Navigate to application directory
cd /var/www/invizio-wms

# Upload your application files here
# You can use scp, rsync, git clone, or file transfer

# Example using git (if you have a repository):
# git clone https://github.com/yourusername/invizio-wms.git .

# Install frontend dependencies and build
npm install
npm run build

# Install server dependencies
cd server
npm install --production

# Create necessary directories
mkdir -p logs
sudo mkdir -p /var/log/invizio-wms
sudo chown $USER:$USER /var/log/invizio-wms
```

### Step 4: Configure Environment Variables

```bash
# Copy and edit environment file
cd /var/www/invizio-wms/server
cp .env.example .env
nano .env
```

Configure your `.env` file:
```env
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=invizio_wms
DB_USER=invizio_admin
DB_PASSWORD=your_secure_password_here

# Security Keys (Generate secure random strings)
JWT_SECRET=your_very_long_and_secure_jwt_secret_key_here_at_least_64_characters_long
SESSION_SECRET=your_very_long_and_secure_session_secret_here_also_64_characters

# CORS Origins (Update with your domain/IP)
CORS_ORIGINS=http://your-domain.com,https://your-domain.com,http://your-vps-ip,https://your-vps-ip

# Logging
LOG_LEVEL=info

# Application Settings
APP_NAME=Invizio WMS
COMPANY_NAME=DigiProTech

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Step 5: Initialize Database

```bash
# Run database migration (creates all tables and seeds data)
cd /var/www/invizio-wms/server
npm run migrate

# This will:
# - Create all database tables with proper relationships
# - Seed products and inventory data
# - Create QR code mappings
# - Create default admin user (username: admin, password: admin123)
```

### Step 6: Configure Nginx

Create Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/invizio-wms
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com your-vps-ip;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header X-Robots-Tag "noindex, nofollow" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Serve static files
    location / {
        root /var/www/invizio-wms/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # Cache HTML files for shorter period
        location ~* \.(html)$ {
            expires 1h;
            add_header Cache-Control "public";
        }
    }

    # API routes
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }

    # Security: Block access to sensitive files
    location ~ /\.(env|log|git) {
        deny all;
        return 404;
    }
    
    location ~ \.(sql|backup)$ {
        deny all;
        return 404;
    }
    
    # Block access to server directory
    location /server {
        deny all;
        return 404;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/invizio-wms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 7: Configure PM2 Process Management

Create PM2 ecosystem file:
```bash
cd /var/www/invizio-wms/server
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'invizio-wms',
    script: 'server.js',
    cwd: '/var/www/invizio-wms/server',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/invizio-wms/error.log',
    out_file: '/var/log/invizio-wms/out.log',
    log_file: '/var/log/invizio-wms/combined.log',
    time: true,
    
    // Restart policy
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Environment variables
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

Start the application:
```bash
# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command above
```

### Step 8: Configure Firewall

#### Ubuntu (UFW):
```bash
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
sudo ufw status
```

#### CentOS (firewalld):
```bash
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
sudo firewall-cmd --list-all
```

### Step 9: Set up SSL Certificate (Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y  # Ubuntu/Debian
# OR
sudo yum install certbot python3-certbot-nginx -y  # CentOS

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run

# Setup auto-renewal cron job
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

### Step 10: Configure Database Security

```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/*/main/postgresql.conf
```

Update these settings:
```
listen_addresses = 'localhost'
port = 5432
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
```

```bash
# Edit access control
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Ensure these lines exist:
```
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

```bash
# Restart PostgreSQL
sudo systemctl restart postgresql
```

## 📱 Mobile & Tablet Optimization

The application is now fully optimized for:

### **📱 iPhone/iOS**
- Safe area inset support for notched devices
- Touch-friendly 44px minimum touch targets
- iOS-specific meta tags for web app behavior
- Optimized font sizes and spacing

### **📱 Android**
- Material Design compatible styling
- Responsive breakpoints for various screen sizes
- Touch-friendly navigation and buttons
- Android-specific optimizations

### **📱 iPad/Tablet**
- Optimized layout for tablet screens
- Touch-friendly interface elements
- Responsive grid layouts
- Landscape and portrait mode support

## 🔧 Post-Deployment Configuration

### Create Backup System

```bash
# Create backup script
sudo nano /usr/local/bin/backup-invizio.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/backups/invizio-wms"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="invizio_wms"
DB_USER="invizio_admin"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
PGPASSWORD="your_secure_password_here" pg_dump -U $DB_USER -h localhost $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# Application files backup
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /var/www/invizio-wms --exclude=/var/www/invizio-wms/node_modules --exclude=/var/www/invizio-wms/server/node_modules

# Remove old backups (keep 30 days)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "✅ Backup completed: $DATE"
echo "📊 Database size: $(du -h $BACKUP_DIR/db_backup_$DATE.sql | cut -f1)"
echo "📁 App backup size: $(du -h $BACKUP_DIR/app_backup_$DATE.tar.gz | cut -f1)"
```

```bash
# Make executable and schedule
sudo chmod +x /usr/local/bin/backup-invizio.sh

# Schedule daily backup at 2 AM
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-invizio.sh >> /var/log/invizio-wms/backup.log 2>&1
```

### Set up Log Rotation

```bash
sudo nano /etc/logrotate.d/invizio-wms
```

```
/var/log/invizio-wms/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload invizio-wms
    endscript
}
```

## 🌐 Domain and DNS Configuration

### Point Domain to VPS
1. **Get your VPS IP address**:
   ```bash
   curl ifconfig.me
   # Note this IP address
   ```

2. **Configure DNS records** in your domain provider:
   - **A record**: `your-domain.com` → `your-vps-ip`
   - **A record**: `www.your-domain.com` → `your-vps-ip`

3. **Update CORS origins** in `/var/www/invizio-wms/server/.env`:
   ```env
   CORS_ORIGINS=http://your-domain.com,https://your-domain.com,http://www.your-domain.com,https://www.your-domain.com,http://your-vps-ip
   ```

4. **Restart the application**:
   ```bash
   pm2 restart invizio-wms
   ```

## 🔐 Security Hardening

### Database Security
```bash
# Secure PostgreSQL installation
sudo -u postgres psql
```

```sql
-- Remove default databases (optional)
DROP DATABASE IF EXISTS template0;
DROP DATABASE IF EXISTS template1;

-- Create template databases again
CREATE DATABASE template1 WITH TEMPLATE = template0;

-- Update user permissions
ALTER USER invizio_admin SET default_transaction_isolation TO 'read committed';
ALTER USER invizio_admin SET timezone TO 'UTC';

\q
```

### Application Security
```bash
# Set proper file permissions
sudo chown -R www-data:www-data /var/www/invizio-wms
sudo chmod -R 755 /var/www/invizio-wms
sudo chmod 600 /var/www/invizio-wms/server/.env

# Secure log files
sudo chown -R www-data:www-data /var/log/invizio-wms
sudo chmod 755 /var/log/invizio-wms
sudo chmod 644 /var/log/invizio-wms/*.log
```

### System Security
```bash
# Install fail2ban for intrusion prevention
sudo apt install fail2ban -y  # Ubuntu/Debian
# OR
sudo yum install epel-release && sudo yum install fail2ban -y  # CentOS

# Configure fail2ban
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
```

```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## 📊 Monitoring and Maintenance

### Application Monitoring
```bash
# Check application status
pm2 status
pm2 logs invizio-wms

# Monitor system resources
pm2 monit

# Check database status
sudo systemctl status postgresql

# Check web server status
sudo systemctl status nginx

# View application logs
tail -f /var/log/invizio-wms/combined.log
tail -f /var/log/invizio-wms/error.log
```

### Database Monitoring
```bash
# Connect to database
sudo -u postgres psql invizio_wms

# Check database size
SELECT pg_size_pretty(pg_database_size('invizio_wms'));

# Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# Check active connections
SELECT count(*) FROM pg_stat_activity;

# Vacuum and analyze (run weekly)
VACUUM ANALYZE;

\q
```

### Performance Optimization
```bash
# Optimize PostgreSQL for your VPS
sudo nano /etc/postgresql/*/main/postgresql.conf
```

For 4GB RAM VPS:
```
shared_buffers = 1GB
effective_cache_size = 3GB
maintenance_work_mem = 256MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
```

```bash
# Restart PostgreSQL after changes
sudo systemctl restart postgresql
```

## 🎯 Testing Deployment

### Health Checks
```bash
# Test database connection
sudo -u postgres psql invizio_wms -c "SELECT COUNT(*) FROM users;"

# Test API endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/server-info

# Test web interface
curl -I http://your-domain.com
curl -I https://your-domain.com  # If SSL is configured
```

### Functionality Tests
1. **Login Test**: Visit your domain and login with `admin` / `admin123`
2. **Product Management**: Add a new product and verify it appears in inventory
3. **QR Scanner**: Test QR code scanning with the test buttons
4. **Mobile Test**: Access the site on mobile devices and test touch interactions
5. **Database Persistence**: Restart the server and verify data persists

## 🔑 Default Login Credentials

After successful deployment:
- **Username**: `admin`
- **Password**: `admin123`

**⚠️ CRITICAL**: Change the default password immediately after first login!

## 📱 Mobile Access Instructions

### For Shop Workers:
1. **Bookmark the site** on mobile devices for easy access
2. **Add to Home Screen** (iOS/Android) for app-like experience
3. **Use landscape mode** on tablets for better table viewing
4. **Touch-friendly interface** with 44px minimum touch targets

### Mobile Features:
- ✅ **Responsive Design** - Works on all screen sizes
- ✅ **Touch Optimized** - Large buttons and touch targets
- ✅ **Safe Area Support** - Proper spacing for notched devices
- ✅ **Offline Capable** - Works with poor internet connection
- ✅ **Fast Loading** - Optimized for mobile networks

## 🐛 Troubleshooting

### Common Issues and Solutions

#### Application Won't Start
```bash
# Check PM2 status
pm2 status
pm2 logs invizio-wms --lines 50

# Check if port is in use
sudo netstat -tlnp | grep :3000

# Restart application
pm2 restart invizio-wms
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test database connection
sudo -u postgres psql invizio_wms -c "SELECT 1;"

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

#### Nginx Issues
```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

#### Permission Issues
```bash
# Fix file permissions
sudo chown -R www-data:www-data /var/www/invizio-wms
sudo chmod -R 755 /var/www/invizio-wms
sudo chmod 600 /var/www/invizio-wms/server/.env

# Fix log permissions
sudo chown -R www-data:www-data /var/log/invizio-wms
```

#### QR Scanner Not Working
1. **Check camera permissions** in browser
2. **Use HTTPS** for camera access (required by modern browsers)
3. **Test with manual input** first to verify backend connectivity
4. **Check browser console** for JavaScript errors

## 📞 Support and Maintenance

### Regular Maintenance Tasks

#### Daily:
- Check application status: `pm2 status`
- Monitor disk space: `df -h`
- Check error logs: `tail -f /var/log/invizio-wms/error.log`

#### Weekly:
- Update system packages: `sudo apt update && sudo apt upgrade`
- Database maintenance: `sudo -u postgres psql invizio_wms -c "VACUUM ANALYZE;"`
- Review backup files: `ls -la /backups/invizio-wms/`

#### Monthly:
- Review security logs: `sudo journalctl -u fail2ban`
- Update SSL certificates: `sudo certbot renew`
- Performance review: `pm2 monit`

### Emergency Procedures

#### Database Recovery:
```bash
# Stop application
pm2 stop invizio-wms

# Restore from backup
sudo -u postgres psql invizio_wms < /backups/invizio-wms/db_backup_YYYYMMDD_HHMMSS.sql

# Start application
pm2 start invizio-wms
```

#### Application Recovery:
```bash
# Restore application files
cd /var/www
sudo tar -xzf /backups/invizio-wms/app_backup_YYYYMMDD_HHMMSS.tar.gz

# Restart services
pm2 restart invizio-wms
sudo systemctl reload nginx
```

## 🎉 Deployment Complete!

Your Invizio WMS is now fully deployed and ready for production use with:

- ✅ **Complete PostgreSQL Database** with all tables and relationships
- ✅ **Full Backend API** with authentication and authorization
- ✅ **Mobile-Responsive Frontend** optimized for all devices
- ✅ **QR Code Integration** with proper database linking
- ✅ **Production Security** with SSL, firewall, and monitoring
- ✅ **Automated Backups** with retention policies
- ✅ **Process Management** with PM2 and auto-restart
- ✅ **Performance Optimization** for VPS environments

### Access Your Application:
- **Web**: `https://your-domain.com` or `http://your-vps-ip`
- **Login**: `admin` / `admin123` (change immediately!)
- **Mobile**: Fully responsive on all devices

### Next Steps:
1. Change default admin password
2. Create shop locations and users
3. Add products and start managing inventory
4. Train users on mobile access
5. Monitor system performance and logs

**🎊 Your warehouse management system is now live and ready for business operations!**