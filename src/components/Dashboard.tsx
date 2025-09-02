import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Truck, Store, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import useInventoryStore from '../store/inventoryStore';
import useShipmentStore from '../store/shipmentStore';
import useDailyOperationsStore from '../store/dailyOperationsStore';

const COLORS = ['#10b981', '#059669', '#34d399', '#6ee7b7', '#a7f3d0'];

const Dashboard: React.FC = () => {
  const { items, fetchItems } = useInventoryStore();
  const { shipments, fetchShipments } = useShipmentStore();
  const { operations, fetchOperations } = useDailyOperationsStore();
  
  useEffect(() => {
    fetchItems();
    fetchShipments();
    fetchOperations();
  }, [fetchItems, fetchShipments, fetchOperations]);
  
  // Calculate inventory stats
  const totalIceCream = items.filter(item => item.type === 'ice-cream').reduce((sum, item) => sum + item.quantity, 0);
  const totalCoffee = items.filter(item => item.type === 'coffee').reduce((sum, item) => sum + item.quantity, 0);
  const totalKitchen = items.filter(item => item.type === 'kitchen').reduce((sum, item) => sum + item.quantity, 0);
  
  // Prepare data for charts
  const inventoryTypeData = [
    { name: 'Ice Cream', value: totalIceCream },
    { name: 'Coffee', value: totalCoffee },
    { name: 'Kitchen', value: totalKitchen },
  ].filter(item => item.value > 0);
  
  const recentOperationsData = operations.slice(0, 5).map(op => ({
    name: op.itemName,
    value: op.quantity,
    direction: op.direction,
  }));
  
  const shipmentDestinationData = shipments.reduce((acc, shipment) => {
    const existing = acc.find(item => item.name === shipment.destination);
    if (existing) {
      existing.value += shipment.quantity;
    } else {
      acc.push({ name: shipment.destination, value: shipment.quantity });
    }
    return acc;
  }, [] as { name: string; value: number }[]);
  
  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/inventory" className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400">
              <Package size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Inventory</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{totalIceCream + totalCoffee + totalKitchen}</p>
            </div>
          </div>
        </Link>
        
        <Link to="/shipping" className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
              <Truck size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Recent Shipments</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{shipments.length}</p>
            </div>
          </div>
        </Link>
        
        <Link to="/shop-received" className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400">
              <Store size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Shops Served</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {new Set(shipments.map(s => s.destination)).size}
              </p>
            </div>
          </div>
        </Link>
        
        <Link to="/daily-reports" className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400">
              <BarChart3 size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Daily Operations</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{operations.length}</p>
            </div>
          </div>
        </Link>
      </div>
      
      {/* Charts */}
      {(inventoryTypeData.length > 0 || recentOperationsData.length > 0 || shipmentDestinationData.length > 0) ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {inventoryTypeData.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Inventory by Type</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={inventoryTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {inventoryTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} units`, 'Quantity']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          
          {recentOperationsData.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Recent Operations</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recentOperationsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar 
                      dataKey="value" 
                      name="Quantity"
                      fill="#10b981"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          
          {shipmentDestinationData.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 lg:col-span-2 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Shipments by Destination</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={shipmentDestinationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Quantity" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center border border-gray-200 dark:border-gray-700">
          <Package size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Welcome to Invizio WMS</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Start by adding products and managing your inventory to see analytics and reports here.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/products"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              Add Products
            </Link>
            <Link
              to="/inventory"
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              View Inventory
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;