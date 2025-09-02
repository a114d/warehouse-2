# 🌍 Production VPS Setup - Fix Data Sync Issue

## ❗ **Critical Issue Solved:**

**Problem**: When you add admins, locations, users on one device, they don't appear on other devices because the app was using localStorage instead of the database.

**Solution**: The application now properly connects to PostgreSQL database on VPS for shared data across all devices.

## 🔧 **VPS Configuration Steps:**

### **Step 1: Set Environment Variables**

On your VPS, edit the `.env` file:

```bash
cd /var/www/invizio-wms
nano .env
```

**Important**: Make sure these variables are set correctly:
```env
# CRITICAL: Set this to true for VPS deployment
VITE_LOCAL_SERVER=true

# Your VPS IP address or domain
VITE_SERVER_URL=http://YOUR-VPS-IP
# OR if you have a domain:
# VITE_SERVER_URL=http://your-domain.com

# API endpoint
VITE_API_ENDPOINT=/api

# Database credentials
DB_HOST=localhost
DB_PORT=5432
DB_NAME=invizio_wms
DB_USER=invizio_admin
DB_PASSWORD=InvizioSecure2025!

# Security
JWT_SECRET=your_very_long_jwt_secret_key_here
SESSION_SECRET=your_very_long_session_secret_here

# CORS - Add your VPS IP and domain
CORS_ORIGINS=http://YOUR-VPS-IP,http://your-domain.com,https://your-domain.com
```

### **Step 2: Rebuild Application**

```bash
cd /var/www/invizio-wms
npm run build
```

### **Step 3: Restart Services**

```bash
# Restart the application
sudo systemctl restart invizio-wms

# Restart Nginx
sudo systemctl reload nginx

# Check status
sudo systemctl status invizio-wms
```

### **Step 4: Test Database Connection**

```bash
# Test database
sudo -u postgres psql invizio_wms -c "SELECT COUNT(*) FROM users;"

# Test API
curl http://localhost:3000/api/health
```

## 🌐 **How to Access from Different Devices:**

### **Replace YOUR-VPS-IP with your actual VPS IP address:**

**Example**: If your VPS IP is `192.168.1.100`:
```env
VITE_SERVER_URL=http://192.168.1.100
CORS_ORIGINS=http://192.168.1.100,http://localhost:3000
```

### **Access URLs:**
- **Local Network**: `http://192.168.1.100`
- **Internet**: `http://your-domain.com` (if domain configured)

## ✅ **Now It Will Work Correctly:**

### **Before (Problem):**
- Device A adds user → Saved to Device A localStorage only
- Device B doesn't see the user → Different localStorage

### **After (Fixed):**
- Device A adds user → Saved to PostgreSQL database on VPS
- Device B sees the user → Reading from same PostgreSQL database
- **All devices share the same data! 🎉**

## 🔍 **Verification Steps:**

1. **Login from Device A** → Add a shop
2. **Login from Device B** → You should see the same shop
3. **Add user from Device B** → Should appear on Device A

## 📱 **Mobile Access:**

All devices (phones, tablets, laptops) can now access:
- **URL**: `http://YOUR-VPS-IP`
- **Shared Data**: Everyone sees the same inventory, users, shops
- **Real-time**: Changes appear immediately on all devices

## 🆘 **Troubleshooting:**

### **If data still doesn't sync:**

1. **Check environment file**:
   ```bash
   cat /var/www/invizio-wms/.env | grep VITE_LOCAL_SERVER
   # Should show: VITE_LOCAL_SERVER=true
   ```

2. **Check server logs**:
   ```bash
   sudo journalctl -u invizio-wms -f
   ```

3. **Test API connection**:
   ```bash
   curl http://YOUR-VPS-IP/api/health
   ```

4. **Clear browser cache** on all devices and login again

Your VPS is now properly configured for **worldwide shared data access**! 🌍