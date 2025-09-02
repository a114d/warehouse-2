# 🚀 Invizio WMS - Production Deployment Guide

## 📋 Overview

This guide will help you deploy Invizio WMS to your Ubuntu or Windows server with PostgreSQL database for production use.

## 🖥️ Server Requirements

### Minimum Hardware Requirements
- **CPU**: 2 cores (Intel i3 or AMD equivalent)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 100GB SSD minimum
- **Network**: Stable internet connection

### Recommended Hardware Requirements
- **CPU**: 4+ cores (Intel i5 or AMD Ryzen 5+)
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 500GB SSD
- **Network**: High-speed internet with static IP

## 🐧 Ubuntu Server Deployment

### Step 1: Update System
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install curl wget git unzip -y
```

### Step 2: Install Node.js 18+
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y
node --version  # Should show v18.x.x or higher
npm --version
```

### Step 3: Install PostgreSQL
```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Set password for postgres user
sudo -u postgres psql
\password postgres
# Enter your secure password
\q
```

### Step 4: Create Database and User
```bash
sudo -u postgres psql
```

```sql
-- Create database
CREATE DATABASE invizio_wms;

-- Create user
CREATE USER invizio_admin WITH PASSWORD 'your_secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE invizio_wms TO invizio_admin;
ALTER USER invizio_admin CREATEDB;

-- Connect to database and grant schema permissions
\c invizio_wms
GRANT ALL ON SCHEMA public TO invizio_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO invizio_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO invizio_admin;

\q
```

### Step 5: Install Nginx
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Step 6: Deploy Application
```bash
# Create application directory
sudo mkdir -p /var/www/invizio-wms
sudo chown $USER:$USER /var/www/invizio-wms

# Clone or upload your application
cd /var/www/invizio-wms
# Upload your built application files here

# Install dependencies
cd server
npm install --production

# Create logs directory
mkdir -p logs

# Set up environment variables
cp .env.example .env
nano .env
```

### Step 7: Configure Environment Variables
Edit `/var/www/invizio-wms/server/.env`:

```env
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

DB_HOST=localhost
DB_PORT=5432
DB_NAME=invizio_wms
DB_USER=invizio_admin
DB_PASSWORD=your_secure_password_here

JWT_SECRET=your_very_long_and_secure_jwt_secret_key_here
SESSION_SECRET=your_very_long_and_secure_session_secret_here

CORS_ORIGINS=http://your-domain.com,http://your-server-ip,https://your-domain.com,https://your-server-ip

LOG_LEVEL=info
```

### Step 8: Run Database Migration
```bash
cd /var/www/invizio-wms/server
npm run migrate
```

### Step 9: Configure Nginx
Create `/etc/nginx/sites-available/invizio-wms`:

```nginx
server {
    listen 80;
    server_name your-domain.com your-server-ip;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Serve static files
    location / {
        root /var/www/invizio-wms/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API routes
    location /api {
        proxy_pass http://localhost:3001;
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
    }

    # Security: Block access to sensitive files
    location ~ /\. {
        deny all;
    }
    
    location ~ \.(env|log)$ {
        deny all;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/invizio-wms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 10: Create Systemd Service
Create `/etc/systemd/system/invizio-wms.service`:

```ini
[Unit]
Description=Invizio WMS Server
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/invizio-wms/server
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=invizio-wms

[Install]
WantedBy=multi-user.target
```

Start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable invizio-wms
sudo systemctl start invizio-wms
sudo systemctl status invizio-wms
```

### Step 11: Configure Firewall
```bash
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### Step 12: Set up SSL (Recommended)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

## 🪟 Windows Server Deployment

### Step 1: Install Prerequisites
1. Download and install [Node.js 18+](https://nodejs.org/)
2. Download and install [PostgreSQL](https://www.postgresql.org/download/windows/)
3. Download and install [Git](https://git-scm.com/download/win)

### Step 2: Configure PostgreSQL
1. Open pgAdmin or use psql command line
2. Create database `invizio_wms`
3. Create user `invizio_admin` with password
4. Grant all privileges

### Step 3: Deploy Application
1. Create folder `C:\inetpub\invizio-wms`
2. Copy application files
3. Open Command Prompt as Administrator:

```cmd
cd C:\inetpub\invizio-wms\server
npm install --production
copy .env.example .env
```

4. Edit `.env` file with your configuration

### Step 4: Run Migration
```cmd
cd C:\inetpub\invizio-wms\server
npm run migrate
```

### Step 5: Install as Windows Service
Install PM2 globally:
```cmd
npm install -g pm2
npm install -g pm2-windows-service
```

Create PM2 configuration `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'invizio-wms',
    script: 'server.js',
    cwd: 'C:\\inetpub\\invizio-wms\\server',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
```

Install and start service:
```cmd
pm2-service-install
pm2 start ecosystem.config.js
pm2 save
```

### Step 6: Configure IIS (Optional)
1. Install IIS with URL Rewrite module
2. Create new site pointing to `C:\inetpub\invizio-wms\dist`
3. Configure reverse proxy for `/api` to `http://localhost:3001`

## 🔧 Post-Deployment Configuration

### Create Default Admin User
```bash
cd /var/www/invizio-wms/server
node -e "
const bcrypt = require('bcryptjs');
const { query } = require('./config/database.js');

async function createAdmin() {
  const passwordHash = await bcrypt.hash('admin123', 12);
  await query(
    'INSERT INTO users (username, name, password_hash, role) VALUES ($1, $2, $3, $4)',
    ['admin', 'System Administrator', passwordHash, 'admin']
  );
  console.log('Admin user created: admin / admin123');
  process.exit(0);
}

createAdmin().catch(console.error);
"
```

### Set up Automated Backups
Create backup script `/var/www/invizio-wms/scripts/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/backups/invizio-wms"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="invizio_wms"
DB_USER="invizio_admin"

mkdir -p $BACKUP_DIR

# Database backup
pg_dump -U $DB_USER -h localhost $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# Application files backup
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /var/www/invizio-wms

# Remove old backups (keep 30 days)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

Add to crontab:
```bash
sudo crontab -e
# Add this line for daily backup at 2 AM
0 2 * * * /var/www/invizio-wms/scripts/backup.sh
```

## 🔍 Monitoring and Maintenance

### Check Application Status
```bash
sudo systemctl status invizio-wms
sudo journalctl -u invizio-wms -f
```

### Monitor Logs
```bash
tail -f /var/www/invizio-wms/server/logs/combined.log
tail -f /var/www/invizio-wms/server/logs/error.log
```

### Database Maintenance
```bash
# Connect to database
sudo -u postgres psql invizio_wms

# Check database size
SELECT pg_size_pretty(pg_database_size('invizio_wms'));

# Vacuum and analyze
VACUUM ANALYZE;
```

## 🌐 Network Configuration

### For Local Network Access
1. Configure your router to assign a static IP to the server
2. Update CORS_ORIGINS in .env with your server IP
3. Access via: `http://your-server-ip`

### For Internet Access
1. Configure port forwarding on your router (port 80 and 443)
2. Set up dynamic DNS or use static IP
3. Configure SSL certificate
4. Update CORS_ORIGINS with your domain

## 🔒 Security Checklist

- [ ] Strong passwords for database and admin users
- [ ] JWT secrets are long and random
- [ ] Firewall configured properly
- [ ] SSL certificate installed
- [ ] Regular security updates
- [ ] Database access restricted to localhost
- [ ] Application running as non-root user
- [ ] Log monitoring set up
- [ ] Regular backups configured

## 📞 Support

For deployment issues:
1. Check logs: `/var/www/invizio-wms/server/logs/`
2. Verify database connection
3. Check service status
4. Review nginx configuration
5. Ensure all environment variables are set

## 🎉 Success!

Once deployed, you can:
1. Access the application at your domain/IP
2. Login with admin credentials
3. Create shops and users
4. Start managing your warehouse operations

Your Invizio WMS is now ready for production use with full database persistence and multi-user support!