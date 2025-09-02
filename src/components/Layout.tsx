import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Package, Truck, Store, BarChart3, LogOut, Users, Coffee, ClipboardList, Boxes, MapPin, ChefHat, Menu, X, Factory, User, Moon, Sun, Bell, Server, ShoppingCart, Box, Monitor, Scan } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import useStockRequestStore from '../store/stockRequestStore';
import useShipmentRequestStore from '../store/shipmentRequestStore';
import useUserManagementStore from '../store/userManagementStore';
import useShopManagementStore from '../store/shopManagementStore';
import useProductStore from '../store/productStore';
import ServerStatus from './ServerStatus';

const Layout: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const { requests: stockRequests } = useStockRequestStore();
  const { requests: shipmentRequests } = useShipmentRequestStore();
  const { fetchUsers } = useUserManagementStore();
  const { fetchShops } = useShopManagementStore();
  const { fetchProducts } = useProductStore();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('🔄 Loading data for authenticated user:', user.name);
      fetchUsers();
      fetchShops();
      fetchProducts();
    }
  }, [isAuthenticated, user, fetchUsers, fetchShops, fetchProducts]);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  const isActive = (path: string) => {
    return location.pathname.startsWith(path) ? 'bg-emerald-700 dark:bg-emerald-600' : '';
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // Calculate pending requests for admin notification
  const pendingStockRequests = stockRequests.filter(req => req.status === 'pending').length;
  const pendingShipmentRequests = shipmentRequests.filter(req => req.status === 'pending').length;
  const totalPendingRequests = pendingStockRequests + pendingShipmentRequests;

  // Calculate new shop requests for stock workers
  const newShopRequests = stockRequests.filter(req => req.status === 'pending').length;

  // Role-based navigation items
  const getNavigationItems = () => {
    const items = [
      {
        path: '/dashboard',
        icon: LayoutDashboard,
        label: 'Dashboard',
        roles: ['admin'] // Only admin can access Dashboard
      },
      {
        path: '/inventory',
        icon: Package,
        label: 'Inventory',
        roles: ['admin', 'stock-worker', 'store-worker']
      },
      {
        path: '/scanner',
        icon: Scan,
        label: 'Barcode Scanner',
        roles: ['admin', 'stock-worker']
      },
      {
        path: '/products',
        icon: Coffee,
        label: 'Products',
        roles: ['admin']
      },
      {
        path: '/supplier',
        icon: Factory,
        label: 'Supplier',
        roles: ['admin', 'stock-worker']
      },
      {
        path: '/stock-requests',
        icon: ClipboardList,
        label: 'Stock Requests',
        roles: ['admin', 'store-worker']
      },
      {
        path: '/shop-requests',
        icon: ShoppingCart,
        label: 'Shop Requests',
        roles: ['stock-worker'],
        notification: user?.role === 'stock-worker' && newShopRequests > 0 ? newShopRequests : 0
      },
      {
        path: '/stock-management',
        icon: Boxes,
        label: 'Stock Management',
        roles: ['admin'],
        notification: user?.role === 'admin' && totalPendingRequests > 0 ? totalPendingRequests : 0
      },
      {
        path: '/shipping',
        icon: Truck,
        label: 'Shipping',
        roles: ['admin', 'stock-worker']
      },
      {
        path: '/daily-reports',
        icon: BarChart3,
        label: 'Daily Reports',
        roles: ['admin']
      },
      {
        path: '/users',
        icon: Users,
        label: 'User Management',
        roles: ['admin']
      },
      {
        path: '/shops',
        icon: MapPin,
        label: 'Shop Management',
        roles: ['admin']
      },
      {
        path: '/screen-display',
        icon: Monitor,
        label: 'Screen Display',
        roles: ['admin']
      }
    ];

    return items.filter(item => item.roles.includes(user?.role || ''));
  };

  const navigationItems = getNavigationItems();
  
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden transition-colors safe-all">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50 safe-top safe-left">
        <button
          onClick={toggleSidebar}
          className="mobile-button-primary"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-30 bg-black bg-opacity-50"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 bg-emerald-800 dark:bg-gray-800 text-white 
        transform transition-transform duration-300 ease-in-out safe-left
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* System Status Indicator */}
        <div className="p-2 bg-emerald-900 dark:bg-gray-900 border-b border-emerald-700 dark:border-gray-700">
          <ServerStatus />
        </div>

        {/* User Info at Top */}
        <div className="p-4 pt-16 lg:pt-4 border-b border-emerald-700 dark:border-gray-700 safe-top">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-emerald-700 dark:bg-gray-700">
              <User size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-emerald-200 dark:text-gray-400 capitalize">
                {user?.role?.replace('-', ' ')}
              </p>
              {user?.shopName && (
                <div className="mt-1 flex items-center">
                  <MapPin size={12} className="text-emerald-300 dark:text-gray-500 mr-1" />
                  <p className="text-xs text-emerald-300 dark:text-gray-500 truncate">
                    {user.shopName}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Logo */}
        <div className="p-4">
          <h1 className="text-xl font-bold flex items-center">
            <LayoutDashboard className="mr-2" size={20} />
            Invizio WMS
          </h1>
        </div>
        
        <nav className="mt-4 flex-1 overflow-y-auto">
          <ul className="space-y-1 px-2 pb-4">
            {navigationItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={closeSidebar}
                  className={`mobile-nav-item ${isActive(item.path)} relative`}
                >
                  <item.icon className="mr-3" size={20} />
                  {item.label}
                  {item.notification && item.notification > 0 && (
                    <span className="ml-auto flex items-center">
                      <Bell className="text-red-400 animate-pulse" size={16} />
                      <span className="ml-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {item.notification}
                      </span>
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-emerald-700 dark:border-gray-700 safe-bottom">
          <button
            onClick={() => {
              logout();
              closeSidebar();
            }}
            className="mobile-nav-item w-full text-left"
          >
            <LogOut className="mr-3" size={20} />
            Logout
          </button>
          
          {/* Copyright */}
          <div className="mt-4 pt-4 border-t border-emerald-700 dark:border-gray-700">
            <p className="text-xs text-emerald-200 dark:text-gray-400 text-center">
              © 2025 DigiProTech
            </p>
            <p className="text-xs text-emerald-200 dark:text-gray-400 text-center">
              All rights reserved
            </p>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors safe-top">
          <div className="px-4 lg:px-6 py-4 safe-x">
            <div className="flex items-center justify-between">
              {/* Store Worker Shop Info - Left Side */}
              <div className="flex items-center ml-12 lg:ml-0 min-w-0 flex-1">
                {user?.role === 'store-worker' && user?.shopName ? (
                  <div className="flex items-center bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800 min-w-0">
                    <MapPin className="text-emerald-600 dark:text-emerald-400 mr-2" size={20} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 truncate">
                        📍 {user.shopName}
                      </p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 truncate">
                        Store Worker Location
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-4">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white truncate">
                      {location.pathname.includes('/scanner') ? 'Barcode Scanner' :
                       location.pathname.includes('/stock-requests') ? 'Stock Requests' :
                       location.pathname.includes('/stock-management') ? 'Stock Management' :
                       location.pathname.includes('/shop-requests') ? 'Shop Requests Preparation' :
                       location.pathname.includes('/screen-display') ? 'Screen Display' :
                       location.pathname.includes('/inventory/ice-cream') ? 'Ice Cream Inventory' :
                       location.pathname.includes('/inventory/coffee') ? 'Coffee Inventory' :
                       location.pathname.includes('/inventory/kitchen') ? 'Kitchen Inventory' :
                       location.pathname.includes('/inventory/non-kitchen') ? 'Non-Kitchen Inventory' :
                       location.pathname.includes('/inventory/item/') ? 'Item Details' :
                       location.pathname.includes('/inventory') ? 'Inventory' :
                       location.pathname.includes('/shipping') ? 'Shipping' :
                       location.pathname.includes('/daily-reports') ? 'Daily Reports' :
                       location.pathname.includes('/users') ? 'User Management' :
                       location.pathname.includes('/products') ? 'Product Management' :
                       location.pathname.includes('/shops') ? 'Shop Management' :
                       location.pathname.includes('/supplier') ? 'Supplier Management' :
                       'Dashboard'}
                    </h2>
                  </div>
                )}
              </div>
              
              {/* Right Side Controls */}
              <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
                {/* Dark Mode Toggle */}
                <button
                  onClick={toggleDarkMode}
                  className="mobile-button-secondary"
                  title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {isDarkMode ? (
                    <Sun className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <Moon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  )}
                </button>

                {/* Stock Worker notification for new shop requests */}
                {user?.role === 'stock-worker' && newShopRequests > 0 && (
                  <Link
                    to="/shop-requests"
                    className="hidden sm:flex items-center px-3 py-2 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors border border-blue-200 dark:border-blue-800"
                  >
                    <ShoppingCart className="mr-2 animate-pulse" size={16} />
                    <span className="text-sm font-medium whitespace-nowrap">
                      {newShopRequests} new shop request{newShopRequests > 1 ? 's' : ''}
                    </span>
                  </Link>
                )}

                {/* Admin notification indicator */}
                {user?.role === 'admin' && totalPendingRequests > 0 && (
                  <Link
                    to="/stock-management"
                    className="hidden sm:flex items-center px-3 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors border border-red-200 dark:border-red-800"
                  >
                    <Bell className="mr-2 animate-pulse" size={16} />
                    <span className="text-sm font-medium whitespace-nowrap">
                      {totalPendingRequests} pending request{totalPendingRequests > 1 ? 's' : ''}
                    </span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-auto p-4 lg:p-6 bg-gray-50 dark:bg-gray-900 transition-colors safe-bottom custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;