#!/bin/bash

# Invizio WMS Quick Setup Script for VPS
# Run this script on your Ubuntu/Debian VPS

set -e

echo "🚀 Starting Invizio WMS VPS Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root. Run as a regular user with sudo privileges."
    exit 1
fi

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install dependencies
print_status "Installing dependencies..."
sudo apt install curl wget git unzip build-essential postgresql postgresql-contrib nginx -y

# Install Node.js 18+
print_status "Installing Node.js 18+..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y

# Verify installations
print_status "Verifying installations..."
node_version=$(node --version)
npm_version=$(npm --version)
psql_version=$(psql --version | head -n1)

echo "✅ Node.js: $node_version"
echo "✅ npm: $npm_version"
echo "✅ PostgreSQL: $psql_version"

# Install PM2
print_status "Installing PM2 process manager..."
sudo npm install -g pm2

# Setup PostgreSQL
print_status "Setting up PostgreSQL database..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
print_status "Creating database and user..."
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

# Create application directory
print_status "Creating application directory..."
sudo mkdir -p /var/www/invizio-wms
sudo chown $USER:$USER /var/www/invizio-wms

# Create logs directory
print_status "Creating logs directory..."
sudo mkdir -p /var/log/invizio-wms
sudo chown $USER:$USER /var/log/invizio-wms

print_status "✅ Basic setup completed!"
print_warning "Next steps:"
echo "1. Upload your application files to /var/www/invizio-wms"
echo "2. Run: cd /var/www/invizio-wms && npm run deploy:prepare"
echo "3. Configure .env file with your settings"
echo "4. Install services: sudo cp server/*.service /etc/systemd/system/"
echo "5. Install nginx config: sudo cp server/*.nginx.conf /etc/nginx/sites-available/"
echo "6. Enable services and start application"

print_status "🎉 VPS is ready for Invizio WMS deployment!"