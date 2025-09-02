# 🏭 Invizio WMS - Production Ready Warehouse Management System

A comprehensive, production-ready warehouse management system built with React, TypeScript, Node.js, and PostgreSQL. Perfect for managing ice cream, coffee, and kitchen inventory with multi-role access control and real-time operations tracking.

![Invizio WMS Dashboard](https://via.placeholder.com/800x400/10b981/ffffff?text=Invizio+WMS+Dashboard)

## 🚀 **Production Ready Features**

### ✅ **Complete Database Integration**
- **PostgreSQL Database** with full CRUD operations
- **Persistent Data Storage** - All data saved permanently
- **Database Migrations** - Automated schema setup
- **Data Backup & Restore** - Automated backup system
- **Multi-year Data Retention** - Historical data preservation

### 🔐 **Enterprise Security**
- **JWT Authentication** with secure token management
- **Role-based Access Control** (Admin, Stock Worker, Store Worker, Screen)
- **Password Hashing** with bcrypt
- **Rate Limiting** and security headers
- **CORS Protection** and input validation

### 📊 **Advanced Reporting System**
- **Daily Reports** - Detailed daily operations analysis
- **Monthly Reports** - Comprehensive monthly trends
- **Custom Date Ranges** - Flexible reporting periods
- **PDF & CSV Export** - Professional report generation
- **Real-time Analytics** - Live data visualization

### 🏗️ **Production Architecture**
- **Node.js Backend** with Express.js
- **PostgreSQL Database** for enterprise data storage
- **React Frontend** with TypeScript
- **Nginx Reverse Proxy** for production deployment
- **Systemd Service** for automatic startup
- **SSL/HTTPS Support** for secure connections

## 🎯 **Key Features**

### 📦 **Comprehensive Inventory Management**
- Track ice cream, coffee, kitchen, and non-kitchen items
- Real-time quantity updates and expiry date monitoring
- Product catalog management with automated code generation
- Barcode/code system for efficient tracking

### 🏪 **Multi-Shop Operations**
- Multiple shop locations support
- Store worker assignments to specific shops
- Location-based inventory tracking
- Shop-specific stock requests and approvals

### 🚚 **Advanced Shipping & Logistics**
- Shipment request workflow with admin approval
- Real-time tracking and delivery confirmations
- Automated inventory adjustments
- Comprehensive shipping history

### 👥 **User Management System**
- **Admin**: Full system access, user management, approvals
- **Stock Worker**: Inventory, supplier management, shipping operations
- **Store Worker**: Inventory viewing, stock requests (shop-specific)
- **Screen Display**: External monitoring displays

### 🏭 **Supplier Management**
- Supplier database with contact management
- Delivery tracking and receiving
- Purchase order management
- Cost tracking and analytics

### 📈 **Real-time Analytics & Reports**
- Daily operations reports with filtering
- Monthly trend analysis
- Inventory analytics and forecasting
- Shipment and supplier analytics
- PDF/CSV export capabilities

### 🖥️ **Screen Display System**
- External screen displays for shop requests
- Real-time monitoring of pending requests
- Auto-refresh functionality
- Dedicated screen user role

## 🛠️ **Technology Stack**

### **Frontend**
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Zustand** for state management
- **Recharts** for data visualization
- **React Hook Form** for form handling
- **Lucide React** for icons

### **Backend**
- **Node.js** with Express.js
- **PostgreSQL** database
- **JWT** authentication
- **bcryptjs** for password hashing
- **Winston** for logging
- **Helmet** for security

### **DevOps & Deployment**
- **Nginx** reverse proxy
- **Systemd** service management
- **PM2** process management (Windows)
- **SSL/TLS** encryption
- **Automated backups**

## 🚀 **Quick Start**

### **Development Setup**
```bash
# Clone the repository
git clone https://github.com/yourusername/invizio-wms.git
cd invizio-wms

# Install all dependencies
npm run full:install

# Set up environment variables
cd server
cp .env.example .env
# Edit .env with your database credentials

# Run database migration
npm run server:migrate

# Start development servers
npm run full:dev
```

### **Production Deployment**

#### **Ubuntu Server**
```bash
# Install dependencies
sudo apt update && sudo apt upgrade -y
sudo apt install nodejs npm postgresql nginx -y

# Clone and setup application
sudo mkdir -p /var/www/invizio-wms
cd /var/www/invizio-wms
# Upload your application files

# Install dependencies and build
npm run production:build

# Setup database
sudo -u postgres createdb invizio_wms
sudo -u postgres createuser invizio_admin

# Run migration
cd server && npm run migrate

# Configure systemd service
sudo systemctl enable invizio-wms
sudo systemctl start invizio-wms
```

#### **Windows Server**
```cmd
# Install Node.js, PostgreSQL, and Git
# Clone repository to C:\inetpub\invizio-wms

# Install dependencies
cd C:\inetpub\invizio-wms
npm run production:build

# Setup database and run migration
cd server
npm run migrate

# Install as Windows service
npm install -g pm2 pm2-windows-service
pm2-service-install
pm2 start ecosystem.config.js
```

## 📋 **Deployment Guide**

For detailed deployment instructions, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

### **Server Requirements**
- **CPU**: 2+ cores (4+ recommended)
- **RAM**: 4GB minimum (8GB recommended)
- **Storage**: 100GB SSD minimum
- **OS**: Ubuntu 20.04+ or Windows Server 2019+

### **Network Configuration**
- **Local Network**: Configure static IP and router settings
- **Internet Access**: Set up domain, SSL certificate, and port forwarding
- **Security**: Firewall configuration and access controls

## 🔧 **Configuration**

### **Environment Variables**
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
DB_PASSWORD=your_secure_password

# Security
JWT_SECRET=your_jwt_secret_key
SESSION_SECRET=your_session_secret

# CORS Origins
CORS_ORIGINS=http://your-domain.com,http://your-server-ip
```

### **Database Schema**
The application automatically creates all necessary tables:
- `users` - User accounts and roles
- `shops` - Shop locations and details
- `products` - Product catalog
- `inventory` - Current inventory levels
- `stock_requests` - Shop stock requests
- `shipments` - Shipping records
- `suppliers` - Supplier information
- `daily_operations` - All operations log

## 📊 **Usage Examples**

### **Admin Workflow**
1. **Setup**: Create shops and assign store workers
2. **Inventory**: Add products and manage stock levels
3. **Approvals**: Review and approve stock/shipment requests
4. **Reports**: Generate daily/monthly operational reports
5. **Analytics**: Monitor trends and performance metrics

### **Store Worker Workflow**
1. **Login**: Access assigned shop interface
2. **Inventory**: View current stock levels
3. **Requests**: Submit stock requests to warehouse
4. **Tracking**: Monitor request status and deliveries

### **Stock Worker Workflow**
1. **Preparation**: Collect items for shop requests
2. **Suppliers**: Receive and process supplier deliveries
3. **Shipping**: Prepare and process shipments
4. **Inventory**: Update stock levels and manage products

## 🔒 **Security Features**

- **Authentication**: JWT-based secure authentication
- **Authorization**: Role-based access control
- **Data Protection**: Input validation and sanitization
- **Network Security**: CORS, rate limiting, security headers
- **Database Security**: Parameterized queries, connection pooling
- **Audit Trail**: Comprehensive operation logging

## 📈 **Monitoring & Maintenance**

### **Health Monitoring**
```bash
# Check application status
sudo systemctl status invizio-wms

# Monitor logs
tail -f /var/www/invizio-wms/server/logs/combined.log

# Database health
sudo -u postgres psql invizio_wms -c "SELECT pg_size_pretty(pg_database_size('invizio_wms'));"
```

### **Backup System**
- **Automated Daily Backups** of database and application files
- **30-day Retention Policy** with automatic cleanup
- **Easy Restore Process** for disaster recovery

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏢 **About DigiProTech**

Invizio WMS is developed by **DigiProTech**, specializing in digital solutions for modern businesses.

**Key Benefits:**
- ✅ **Complete Data Ownership** - All data stored on your server
- ✅ **No Monthly Fees** - One-time setup, lifetime use
- ✅ **Scalable Architecture** - Grows with your business
- ✅ **Professional Support** - Comprehensive documentation and guides
- ✅ **Future-Proof** - Built with modern, maintainable technologies

## 📞 **Support & Contact**

- **Documentation**: [Deployment Guide](DEPLOYMENT_GUIDE.md)
- **Issues**: [GitHub Issues](https://github.com/yourusername/invizio-wms/issues)
- **Email**: support@digiprotech.com

---

<div align="center">

**⭐ Star this repository if you find it helpful!**

**🏭 Perfect for businesses wanting complete control over their warehouse operations!**

**🚀 Production-ready with enterprise-grade features!**

Made with ❤️ by [DigiProTech](https://github.com/yourusername)

</div>