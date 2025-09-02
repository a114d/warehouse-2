# 🏭 Invizio WMS - Local Server Setup Guide

## 🎯 Architecture Overview

The owner requested a **local server-based architecture** where:
- **Main Server** (Owner's location) hosts the database and application
- **Remote Shops** connect via web interface to the main server
- **All data** (inventory, operations, shipments) is centralized on the main server

## 🖥️ Server Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MAIN SERVER (Owner)                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Web Server    │  │    Database     │  │   Storage   │ │
│  │   (Node.js)     │  │  (PostgreSQL)   │  │   (Files)   │ │
│  │   Port: 3000    │  │   Port: 5432    │  │             │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│           │                     │                          │
│           └─────────────────────┼──────────────────────────┘
│                                 │
└─────────────────────────────────┼─────────────────────────────
                                  │ Local Network / Internet
┌─────────────────────────────────┼─────────────────────────────┐
│                                 │                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │   Shop A    │  │   Shop B    │  │   Shop C    │           │
│  │ (Browser)   │  │ (Browser)   │  │ (Browser)   │           │
│  │ Store Worker│  │ Store Worker│  │ Store Worker│           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
│                                                               │
│              REMOTE SHOPS (Connected via Web)                │
└───────────────────────────────────────────────────────────────┘
```

## 🔧 Server Requirements

### Hardware Requirements
- **CPU**: Intel i5 or AMD Ryzen 5 (minimum)
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 500GB SSD minimum
- **Network**: Stable internet connection (for remote shop access)

### Software Requirements
- **Operating System**: Windows Server 2019+, Ubuntu 20.04+, or CentOS 8+
- **Node.js**: Version 18 or higher
- **PostgreSQL**: Version 14 or higher
- **Web Server**: Nginx (recommended) or Apache

## 📋 Installation Steps

### Step 1: Install PostgreSQL Database

#### On Windows Server:
```bash
# Download PostgreSQL from https://www.postgresql.org/download/windows/
# Install with default settings
# Set password for 'postgres' user
```

#### On Linux (Ubuntu):
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Set password for postgres user
sudo -u postgres psql
\password postgres
\q
```

### Step 2: Create Database and User

```sql
-- Connect as postgres user
CREATE DATABASE invizio_wms;
CREATE USER invizio_admin WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE invizio_wms TO invizio_admin;

-- Connect to invizio_wms database
\c invizio_wms

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO invizio_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO invizio_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO invizio_admin;
```

### Step 3: Run Database Migration

```bash
# Copy the migration file to server
# Run the SQL migration script
psql -U invizio_admin -d invizio_wms -f supabase/migrations/20250530145231_velvet_garden.sql
```

### Step 4: Install Node.js Application

```bash
# Clone or copy the application files to server
cd /var/www/invizio-wms

# Install dependencies
npm install

# Build the application
npm run build
```

### Step 5: Configure Environment Variables

Create `.env.production` file:
```env
# Database Configuration
DATABASE_URL=postgresql://invizio_admin:secure_password_here@localhost:5432/invizio_wms
DB_HOST=localhost
DB_PORT=5432
DB_NAME=invizio_wms
DB_USER=invizio_admin
DB_PASSWORD=secure_password_here

# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Security
JWT_SECRET=your_jwt_secret_key_here
SESSION_SECRET=your_session_secret_here

# Application Settings
APP_NAME=Invizio WMS
COMPANY_NAME=DigiProTech
```

### Step 6: Setup Web Server (Nginx)

Create `/etc/nginx/sites-available/invizio-wms`:
```nginx
server {
    listen 80;
    server_name your-server-ip-or-domain;

    # Serve static files
    location / {
        root /var/www/invizio-wms/dist;
        try_files $uri $uri/ /index.html;
    }

    # API routes (if you add backend API)
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
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/invizio-wms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🌐 Network Configuration

### For Local Network Access:
1. **Configure Firewall**:
   ```bash
   # Allow HTTP traffic
   sudo ufw allow 80
   sudo ufw allow 443
   
   # Allow PostgreSQL (only from local network)
   sudo ufw allow from 192.168.1.0/24 to any port 5432
   ```

2. **Find Server IP**:
   ```bash
   ip addr show
   # Note the local IP (e.g., 192.168.1.100)
   ```

3. **Shop Access URL**: `http://192.168.1.100`

### For Internet Access:
1. **Configure Router Port Forwarding**:
   - Forward port 80 to server IP
   - Forward port 443 for HTTPS (recommended)

2. **Get Public IP**: Check your public IP and configure DNS if needed

3. **Shop Access URL**: `http://your-public-ip` or `http://your-domain.com`

## 🔐 Security Configuration

### 1. Database Security
```sql
-- Restrict database access
ALTER DATABASE invizio_wms SET log_statement = 'all';
ALTER DATABASE invizio_wms SET log_min_duration_statement = 1000;
```

### 2. Firewall Rules
```bash
# Only allow necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 3. SSL Certificate (Recommended)
```bash
# Install Certbot for free SSL
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 👥 User Access Management

### Admin Access (Owner):
- **Location**: Main server (local access)
- **Permissions**: Full system access
- **URL**: `http://localhost` or `http://server-ip`

### Shop Workers (Remote):
- **Location**: Remote shops
- **Permissions**: Limited to assigned shop
- **URL**: `http://server-ip` or `http://your-domain.com`
- **Login**: Provided by admin

## 📊 Data Flow

### Inventory Operations:
1. **Stock In**: Admin adds inventory → Database updated → All shops see new stock
2. **Stock Out**: Shop requests → Admin approves → Inventory reduced → Operation logged
3. **Shipments**: Admin ships to shop → Database tracks → Shop receives notification

### Real-time Updates:
- All operations are immediately reflected in the database
- Shop workers see real-time inventory levels
- Admin monitors all shop activities from central dashboard

## 🔧 Maintenance

### Daily Backups:
```bash
# Create backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U invizio_admin invizio_wms > /backups/invizio_wms_$DATE.sql
find /backups -name "invizio_wms_*.sql" -mtime +7 -delete
```

### Log Monitoring:
```bash
# Check application logs
tail -f /var/log/nginx/access.log
tail -f /var/log/postgresql/postgresql-14-main.log
```

### Performance Monitoring:
```bash
# Monitor database connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Monitor server resources
htop
df -h
```

## 🚀 Deployment Checklist

- [ ] Server hardware meets requirements
- [ ] PostgreSQL installed and configured
- [ ] Database created and migrated
- [ ] Application built and deployed
- [ ] Web server (Nginx) configured
- [ ] Firewall rules configured
- [ ] SSL certificate installed (recommended)
- [ ] Backup system configured
- [ ] Admin user created
- [ ] Shop users created and assigned
- [ ] Network access tested from remote locations
- [ ] All shop workers trained on system access

## 📞 Support

For technical support or questions about the server setup:
- **Documentation**: This guide
- **Database Issues**: Check PostgreSQL logs
- **Network Issues**: Verify firewall and router configuration
- **Application Issues**: Check browser console and server logs

---

**🎉 Once setup is complete, the owner will have full control over all shop operations from the central server, with real-time visibility into inventory movements across all locations!**