import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Coffee, ChefHat, Box, Bell, Plus } from 'lucide-react';
import useInventoryStore from '../../store/inventoryStore';

const InventoryHome: React.FC = () => {
  const { items, recentlyAdded } = useInventoryStore();
  
  // Calculate counts for each type
  const iceCreamCount = items.filter(item => item.type === 'ice-cream').length;
  const drinksCount = items.filter(item => item.type === 'drinks').length;
  const kitchenCount = items.filter(item => item.type === 'kitchen').length;
  const nonKitchenCount = items.filter(item => item.type === 'non-kitchen').length;

  // Get recently added items (last 24 hours)
  const recentItems = recentlyAdded || [];
  return (
    <div className="space-y-6">
      {/* Recently Added Items Notification */}
      {recentItems.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded-r-lg">
          <div className="flex items-start">
            <Bell className="text-green-500 mr-2 mt-0.5 animate-pulse" size={20} />
            <div className="flex-1">
              <h3 className="text-green-800 dark:text-green-300 font-semibold">
                🆕 New Items Added to Inventory ({recentItems.length})
              </h3>
              <div className="mt-2 space-y-1">
                {recentItems.slice(0, 3).map((item, index) => (
                  <div key={index} className="text-sm text-green-700 dark:text-green-400">
                    <span className="font-medium">{item.code}</span> - {item.name} 
                    <span className="text-green-600 dark:text-green-500"> (+{item.quantity} units)</span>
                    <span className="text-xs text-green-500 dark:text-green-400 ml-2">
                      {new Date(item.addedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
                {recentItems.length > 3 && (
                  <div className="text-xs text-green-600 dark:text-green-400">
                    +{recentItems.length - 3} more items added recently
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Inventory Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{iceCreamCount}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Ice Cream Items</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{drinksCount}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Drinks Items</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{kitchenCount}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Kitchen Items</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{nonKitchenCount}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Non-Kitchen Items</div>
          </div>
        </div>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Link
        to="/inventory/ice-cream"
        className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
      >
        <div className="flex flex-col items-center">
          <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 mb-4">
            <Package size={32} />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Ice Cream Inventory
            <span className="block text-sm text-blue-600 dark:text-blue-400 mt-1">
              {iceCreamCount} items
            </span>
          </h3>
          <p className="mt-2 text-gray-600 dark:text-gray-400 text-center">
            Manage all ice cream products, including flavors, quantities, and expiry dates.
          </p>
        </div>
      </Link>
      
      <Link
        to="/inventory/drinks"
        className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
      >
        <div className="flex flex-col items-center">
          <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400 mb-4">
            <Coffee size={32} />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Drinks Inventory
            <span className="block text-sm text-amber-600 dark:text-amber-400 mt-1">
              {drinksCount} items
            </span>
          </h3>
          <p className="mt-2 text-gray-600 dark:text-gray-400 text-center">
            Manage all drinks including coffee, milk alternatives, soft drinks, and syrups.
          </p>
        </div>
      </Link>

      <Link
        to="/inventory/kitchen"
        className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
      >
        <div className="flex flex-col items-center">
          <div className="p-4 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 mb-4">
            <ChefHat size={32} />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Kitchen Inventory
            <span className="block text-sm text-green-600 dark:text-green-400 mt-1">
              {kitchenCount} items
            </span>
          </h3>
          <p className="mt-2 text-gray-600 dark:text-gray-400 text-center">
            Manage all kitchen supplies, equipment, and ingredients.
          </p>
        </div>
      </Link>

      <Link
        to="/inventory/non-kitchen"
        className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
      >
        <div className="flex flex-col items-center">
          <div className="p-4 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 mb-4">
            <Box size={32} />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Non-Kitchen Inventory
            <span className="block text-sm text-purple-600 dark:text-purple-400 mt-1">
              {nonKitchenCount} items
            </span>
          </h3>
          <p className="mt-2 text-gray-600 dark:text-gray-400 text-center">
            Manage all non-kitchen products, supplies, and miscellaneous items.
          </p>
        </div>
      </Link>
      </div>
    </div>
  );
};

export default InventoryHome;