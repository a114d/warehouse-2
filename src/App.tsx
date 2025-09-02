import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import InventoryHome from './components/inventory/InventoryHome';
import InventoryList from './components/inventory/InventoryList';
import ItemDetail from './components/inventory/ItemDetail';
import ShippingPage from './components/shipping/ShippingPage';
import DailyReportsPage from './components/reports/DailyReportsPage';
import UserManagementPage from './components/users/UserManagementPage';
import ProductManagementPage from './components/products/ProductManagementPage';
import StockRequestsPage from './components/stock/StockRequestsPage';
import StockManagementPage from './components/stock/StockManagementPage';
import ShopRequestsPreparationPage from './components/stock/ShopRequestsPreparationPage';
import ShopManagementPage from './components/shops/ShopManagementPage';
import SupplierPage from './components/supplier/SupplierPage';
import ScreenDisplayPage from './components/screen/ScreenDisplayPage';
import BarcodeScannerPage from './components/scanner/BarcodeScannerPage';
import useAuthStore from './store/authStore';

function App() {
  const { isAuthenticated, user } = useAuthStore();
  
  // Special layout for screen user
  if (isAuthenticated && user?.role === 'screen') {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Navigate to="/screen-display" />} />
          <Route path="/screen-display" element={<ScreenDisplayPage />} />
          <Route path="*" element={<Navigate to="/screen-display" />} />
        </Routes>
      </BrowserRouter>
    );
  }
  
  // Redirect non-admin users away from dashboard
  const getDefaultRoute = () => {
    if (!user) return '/login';
    
    switch (user.role) {
      case 'admin':
        return '/dashboard';
      case 'stock-worker':
        return '/inventory';
      case 'store-worker':
        return '/inventory';
      default:
        return '/inventory';
    }
  };
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to={getDefaultRoute()} /> : <LoginForm />} />
        
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to={getDefaultRoute()} />} />
          
          {/* Dashboard - Admin Only */}
          {user?.role === 'admin' && (
            <Route path="dashboard" element={<Dashboard />} />
          )}
          
          <Route path="inventory">
            <Route index element={<InventoryHome />} />
            <Route path="ice-cream" element={<InventoryList type="ice-cream" />} />
            <Route path="drinks" element={<InventoryList type="drinks" />} />
            <Route path="kitchen" element={<InventoryList type="kitchen" />} />
            <Route path="non-kitchen" element={<InventoryList type="non-kitchen" />} />
            <Route path="item/:id" element={<ItemDetail />} />
          </Route>
          
          <Route path="stock-requests" element={<StockRequestsPage />} />
          <Route path="stock-management" element={<StockManagementPage />} />
          
          {/* Shop Requests Preparation for Stock Workers */}
          <Route path="shop-requests" element={<ShopRequestsPreparationPage />} />
          
          <Route path="shipping" element={<ShippingPage />} />
          <Route path="daily-reports" element={<DailyReportsPage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="products" element={<ProductManagementPage />} />
          <Route path="shops" element={<ShopManagementPage />} />
          <Route path="supplier" element={<SupplierPage />} />
          
          {/* Barcode Scanner - Admin and Stock Workers only */}
          {(user?.role === 'admin' || user?.role === 'stock-worker') && (
            <Route path="scanner" element={<BarcodeScannerPage />} />
          )}
          
          {/* Screen Display - Admin and Screen users only */}
          {(user?.role === 'admin' || user?.role === 'screen') && (
            <Route path="screen-display" element={<ScreenDisplayPage />} />
          )}
        </Route>
        
        <Route path="*" element={<Navigate to={isAuthenticated ? getDefaultRoute() : "/login"} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;