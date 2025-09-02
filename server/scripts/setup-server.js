import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Setup script for configuring the server for production
 */
const setupServer = async () => {
  try {
    logger.info('🚀 Starting server setup...');

    // Create necessary directories
    const dirs = [
      path.join(__dirname, '../logs'),
      '/var/log/invizio-wms',
      '/backups/invizio-wms'
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
          logger.info(`📁 Created directory: ${dir}`);
        } catch (error) {
          logger.warn(`⚠️ Could not create directory ${dir}. You may need to create it manually with sudo.`);
        }
      }
    }

    // Check if PostgreSQL is installed
    try {
      await execCommand('which psql');
      logger.info('✅ PostgreSQL client is installed');
    } catch (error) {
      logger.error('❌ PostgreSQL client is not installed. Please install PostgreSQL.');
      logger.info('   On Ubuntu: sudo apt install postgresql postgresql-contrib');
      logger.info('   On CentOS: sudo yum install postgresql postgresql-server');
      throw new Error('PostgreSQL not installed');
    }

    // Check if Node.js is installed
    try {
      const nodeVersion = await execCommand('node --version');
      logger.info(`✅ Node.js ${nodeVersion.trim()} is installed`);
    } catch (error) {
      logger.error('❌ Node.js is not installed or not in PATH');
      throw new Error('Node.js not installed');
    }

    // Check if Nginx is installed (optional)
    try {
      await execCommand('which nginx');
      logger.info('✅ Nginx is installed');
    } catch (error) {
      logger.warn('⚠️ Nginx is not installed. It is recommended for production.');
      logger.info('   On Ubuntu: sudo apt install nginx');
      logger.info('   On CentOS: sudo yum install nginx');
    }

    // Create systemd service file
    const serviceFile = path.join(__dirname, '../invizio-wms.service');
    const serviceContent = `[Unit]
Description=Invizio WMS Server
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=${path.resolve(__dirname, '..')}
Environment=NODE_ENV=production
Environment=ENV_FILE=${path.resolve(__dirname, '../../.env')}
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=invizio-wms

[Install]
WantedBy=multi-user.target
`;

    fs.writeFileSync(serviceFile, serviceContent);
    logger.info('✅ Created systemd service file');
    logger.info(`   To install: sudo cp ${serviceFile} /etc/systemd/system/`);
    logger.info('   Then: sudo systemctl daemon-reload && sudo systemctl enable invizio-wms');

    // Create Nginx configuration file
    const nginxFile = path.join(__dirname, '../invizio-wms.nginx.conf');
    const nginxContent = `server {
    listen 80;
    server_name your-domain.com your-server-ip;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Serve static files
    location / {
        root ${path.resolve(__dirname, '../../dist')};
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
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
    }

    # Security: Block access to sensitive files
    location ~ /\\. {
        deny all;
    }
    
    location ~ \\.(env|log)$ {
        deny all;
    }
}
`;

    fs.writeFileSync(nginxFile, nginxContent);
    logger.info('✅ Created Nginx configuration file');
    logger.info(`   To install: sudo cp ${nginxFile} /etc/nginx/sites-available/invizio-wms`);
    logger.info('   Then: sudo ln -s /etc/nginx/sites-available/invizio-wms /etc/nginx/sites-enabled/');
    logger.info('   And: sudo nginx -t && sudo systemctl reload nginx');

    // Create backup script
    const backupScript = path.join(__dirname, '../backup.sh');
    const backupContent = `#!/bin/bash
BACKUP_DIR="/backups/invizio-wms"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="invizio_wms"
DB_USER="invizio_admin"

mkdir -p $BACKUP_DIR

# Database backup
pg_dump -U $DB_USER -h localhost $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# Application files backup
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz ${path.resolve(__dirname, '../..')}

# Remove old backups (keep 30 days)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
`;

    fs.writeFileSync(backupScript, backupContent);
    fs.chmodSync(backupScript, '755');
    logger.info('✅ Created backup script');
    logger.info(`   To schedule daily backups: sudo crontab -e`);
    logger.info('   Add: 0 2 * * * /path/to/backup.sh');

    logger.info('🎉 Server setup completed successfully!');
    logger.info('');
    logger.info('📋 Next steps:');
    logger.info('1. Update .env file with your production settings');
    logger.info('2. Run database migration: npm run migrate');
    logger.info('3. Install systemd service and Nginx configuration');
    logger.info('4. Start the service: sudo systemctl start invizio-wms');
    logger.info('5. Set up SSL with Certbot: sudo certbot --nginx -d your-domain.com');
    logger.info('');
    logger.info('For more details, see DEPLOYMENT_GUIDE.md');

  } catch (error) {
    logger.error('❌ Server setup failed:', error);
    throw error;
  }
};

// Execute a command and return its output
const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
};

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupServer()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      process.exit(1);
    });
}

export { setupServer };