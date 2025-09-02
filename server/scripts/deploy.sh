#!/bin/bash

# Invizio WMS Deployment Script
# Run this after uploading files to VPS

set -e

echo "🚀 Deploying Invizio WMS..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the application root directory"
    exit 1
fi

# Install dependencies and build
print_status "Installing dependencies and building application..."
npm install
npm run build

# Setup server
print_status "Setting up server..."
cd server
npm install --production

# Check if .env exists
if [ ! -f ".env" ]; then
    print_warning "Creating .env file from example..."
    cp .env.example .env
    print_warning "Please edit .env file with your configuration before continuing"
    nano .env
fi

# Run database migration
print_status "Running database migration..."
npm run migrate

# Create default admin user
print_status "Creating default admin user..."
npm run create-admin

# Setup PM2 ecosystem
print_status "Setting up PM2 configuration..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Install Nginx configuration
print_status "Installing Nginx configuration..."
sudo cp invizio-wms.nginx.conf /etc/nginx/sites-available/invizio-wms
sudo ln -sf /etc/nginx/sites-available/invizio-wms /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Install systemd service
print_status "Installing systemd service..."
sudo cp invizio-wms.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable invizio-wms

# Create log directories
print_status "Creating log directories..."
sudo mkdir -p /var/log/invizio-wms
sudo chown $USER:$USER /var/log/invizio-wms

# Set proper permissions
print_status "Setting file permissions..."
sudo chown -R $USER:$USER /var/www/invizio-wms
chmod 600 .env

print_status "✅ Deployment completed successfully!"
print_status "🌐 Your application should now be accessible at:"
echo "   - Local: http://localhost"
echo "   - Network: http://$(curl -s ifconfig.me)"
echo ""
print_status "📋 Default login credentials:"
echo "   - Username: admin"
echo "   - Password: admin123"
echo ""
print_warning "⚠️  IMPORTANT: Change the default password after first login!"
print_status "🎉 Invizio WMS is now live and ready for use!"