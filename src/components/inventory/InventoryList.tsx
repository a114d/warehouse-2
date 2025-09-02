import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowUpDown } from 'lucide-react';
import useInventoryStore from '../../store/inventoryStore';
import { InventoryItem } from '../../types';

interface InventoryListProps {
  type: 'ice-cream' | 'drinks' | 'kitchen' | 'non-kitchen';
}

const InventoryList: React.FC<InventoryListProps> = ({ type }) => {
  const { items, loading, fetchItems, filterItemsByType } = useInventoryStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof InventoryItem>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Filter items by type and search term
  const filteredItems = filterItemsByType(type).filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.flavor && item.flavor.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const sortedItems = [...filteredItems].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    return 0;
  });
  
  const handleSort = (field: keyof InventoryItem) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const renderSortIcon = (field: keyof InventoryItem) => {
    if (sortField !== field) return null;
    
    return (
      <ArrowUpDown size={16} className="ml-1 inline" />
    );
  };
  
  const getTypeTitle = () => {
    switch (type) {
      case 'ice-cream':
        return 'Ice Cream Inventory';
      case 'drinks':
        return 'Drinks Inventory';
      case 'kitchen':
        return 'Kitchen Inventory';
      case 'non-kitchen':
        return 'Non-Kitchen Inventory';
      default:
        return 'Inventory';
    }
  };
  
  if (loading && items.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  return (
    <div className="mobile-card">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:items-center md:justify-between">
          <h3 className="mobile-text-lg font-semibold text-gray-900 dark:text-white">
            {getTypeTitle()}
          </h3>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mobile-input pl-10 pr-4 w-full md:w-auto"
            />
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>
      
      <div className="mobile-table-wrapper">
        <table className="mobile-table">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th 
                scope="col" 
                className="px-4 sm:px-6 py-3 text-left mobile-text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('name')}
              >
                <span className="flex items-center">
                  Name {renderSortIcon('name')}
                </span>
              </th>
              {type === 'ice-cream' && (
                <th 
                  scope="col" 
                  className="px-4 sm:px-6 py-3 text-left mobile-text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('flavor')}
                >
                  <span className="flex items-center">
                    Flavor {renderSortIcon('flavor')}
                  </span>
                </th>
              )}
              <th 
                scope="col" 
                className="px-4 sm:px-6 py-3 text-left mobile-text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('code')}
              >
                <span className="flex items-center">
                  Code {renderSortIcon('code')}
                </span>
              </th>
              <th 
                scope="col" 
                className="px-4 sm:px-6 py-3 text-left mobile-text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('quantity')}
              >
                <span className="flex items-center">
                  Quantity {renderSortIcon('quantity')}
                </span>
              </th>
              <th 
                scope="col" 
                className="px-4 sm:px-6 py-3 text-left mobile-text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('expiryDate')}
              >
                <span className="flex items-center">
                  Expiry Date {renderSortIcon('expiryDate')}
                </span>
              </th>
              <th scope="col" className="px-4 sm:px-6 py-3 text-right mobile-text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedItems.length > 0 ? (
              sortedItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 sm:px-6 py-4">
                    <div className="mobile-text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</div>
                  </td>
                  {type === 'ice-cream' && (
                    <td className="px-4 sm:px-6 py-4">
                      <div className="mobile-text-sm text-gray-500 dark:text-gray-400 truncate">{item.flavor}</div>
                    </td>
                  )}
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="mobile-text-sm text-gray-500 dark:text-gray-400 font-mono">{item.code}</div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="mobile-text-sm font-semibold text-gray-900 dark:text-gray-300">{item.quantity}</div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="mobile-text-sm text-gray-500 dark:text-gray-400">{item.expiryDate}</div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right mobile-text-sm font-medium">
                    <Link
                      to={`/inventory/item/${item.id}`}
                      className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mobile-button-secondary px-3 py-1 rounded"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={type === 'ice-cream' ? 6 : 5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  <div className="py-8">No items found</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryList;