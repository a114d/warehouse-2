import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Download, Filter, ArrowUpDown, Calendar, TrendingUp, FileText, Database } from 'lucide-react';
import useDailyOperationsStore from '../../store/dailyOperationsStore';
import useSupplierStore from '../../store/supplierStore';
import useShipmentStore from '../../store/shipmentStore';
import useStockRequestStore from '../../store/stockRequestStore';
import { DailyOperation } from '../../types';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const DailyReportsPage: React.FC = () => {
  const { operations, fetchOperations } = useDailyOperationsStore();
  const { deliveries, fetchDeliveries } = useSupplierStore();
  const { shipments, fetchShipments } = useShipmentStore();
  const { requests: stockRequests, fetchRequests } = useStockRequestStore();
  
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [filteredOperations, setFilteredOperations] = useState<DailyOperation[]>([]);
  const [sortField, setSortField] = useState<keyof DailyOperation>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [includeSupplierDeliveries, setIncludeSupplierDeliveries] = useState(true);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchOperations(),
          fetchDeliveries(),
          fetchShipments(),
          fetchRequests()
        ]);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [fetchOperations, fetchDeliveries, fetchShipments, fetchRequests]);
  
  useEffect(() => {
    let filtered = [...operations];
    
    // Add supplier deliveries as operations if enabled
    if (includeSupplierDeliveries) {
      const supplierOperations: DailyOperation[] = deliveries.flatMap(delivery =>
        delivery.items.map(item => ({
          id: `supplier-${delivery.id}-${item.id}`,
          itemId: `supplier-${item.id}`,
          itemName: item.name,
          itemType: 'kitchen' as const,
          quantity: item.quantity,
          direction: 'in' as const,
          date: delivery.deliveryDate,
          adminId: delivery.receivedBy.id,
          adminName: delivery.receivedBy.name,
          notes: `Supplier delivery from ${delivery.supplierName} - ${item.category}`
        }))
      );
      filtered = [...filtered, ...supplierOperations];
    }
    
    // Filter by report type
    if (reportType === 'daily') {
      filtered = filtered.filter(op => op.date === selectedDate);
    } else {
      const monthStart = startOfMonth(parseISO(selectedMonth + '-01'));
      const monthEnd = endOfMonth(parseISO(selectedMonth + '-01'));
      
      filtered = filtered.filter(op => {
        const opDate = parseISO(op.date);
        return opDate >= monthStart && opDate <= monthEnd;
      });
    }
    
    setFilteredOperations(filtered);
  }, [operations, deliveries, selectedDate, selectedMonth, reportType, includeSupplierDeliveries]);
  
  const sortedOperations = [...filteredOperations].sort((a, b) => {
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
  
  const handleSort = (field: keyof DailyOperation) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const renderSortIcon = (field: keyof DailyOperation) => {
    if (sortField !== field) return null;
    
    return (
      <ArrowUpDown size={16} className="ml-1 inline" />
    );
  };
  
  // Prepare chart data
  const directionData = filteredOperations.reduce((acc, op) => {
    const existing = acc.find(item => item.name === op.direction);
    if (existing) {
      existing.value += op.quantity;
    } else {
      acc.push({ name: op.direction, value: op.quantity });
    }
    return acc;
  }, [] as { name: string; value: number }[]);
  
  const itemTypeData = filteredOperations.reduce((acc, op) => {
    const existing = acc.find(item => item.name === op.itemType);
    if (existing) {
      existing.value += op.quantity;
    } else {
      acc.push({ name: op.itemType, value: op.quantity });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  // Monthly trend data
  const monthlyTrendData = reportType === 'monthly' ? (() => {
    const monthStart = startOfMonth(parseISO(selectedMonth + '-01'));
    const monthEnd = endOfMonth(parseISO(selectedMonth + '-01'));
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayOps = filteredOperations.filter(op => op.date === dayStr);
      const inQuantity = dayOps.filter(op => op.direction === 'in').reduce((sum, op) => sum + op.quantity, 0);
      const outQuantity = dayOps.filter(op => op.direction === 'out').reduce((sum, op) => sum + op.quantity, 0);
      
      return {
        date: format(day, 'MMM dd'),
        in: inQuantity,
        out: outQuantity,
        total: dayOps.length
      };
    });
  })() : [];

  // Summary statistics
  const summaryStats = {
    totalOperations: filteredOperations.length,
    totalIn: filteredOperations.filter(op => op.direction === 'in').reduce((sum, op) => sum + op.quantity, 0),
    totalOut: filteredOperations.filter(op => op.direction === 'out').reduce((sum, op) => sum + op.quantity, 0),
    totalShipments: shipments.filter(s => reportType === 'daily' ? s.shipmentDate === selectedDate : s.shipmentDate.startsWith(selectedMonth)).length,
    totalStockRequests: stockRequests.filter(r => reportType === 'daily' ? r.requestDate === selectedDate : r.requestDate.startsWith(selectedMonth)).length,
    uniqueItems: new Set(filteredOperations.map(op => op.itemName)).size,
    uniqueAdmins: new Set(filteredOperations.map(op => op.adminName)).size
  };
  
  const exportPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text(`${reportType === 'daily' ? 'Daily' : 'Monthly'} Operations Report`, 14, 22);
    
    // Add date/period
    doc.setFontSize(12);
    if (reportType === 'daily') {
      doc.text(`Date: ${selectedDate}`, 14, 32);
    } else {
      doc.text(`Month: ${format(parseISO(selectedMonth + '-01'), 'MMMM yyyy')}`, 14, 32);
    }
    
    // Add summary statistics
    doc.setFontSize(14);
    doc.text('Summary Statistics', 14, 45);
    doc.setFontSize(10);
    doc.text(`Total Operations: ${summaryStats.totalOperations}`, 14, 55);
    doc.text(`Total Items In: ${summaryStats.totalIn}`, 14, 62);
    doc.text(`Total Items Out: ${summaryStats.totalOut}`, 14, 69);
    doc.text(`Total Shipments: ${summaryStats.totalShipments}`, 14, 76);
    doc.text(`Total Stock Requests: ${summaryStats.totalStockRequests}`, 14, 83);
    doc.text(`Unique Items: ${summaryStats.uniqueItems}`, 14, 90);
    doc.text(`Unique Admins: ${summaryStats.uniqueAdmins}`, 14, 97);
    
    if (includeSupplierDeliveries) {
      doc.text('* Includes supplier deliveries', 14, 107);
    }
    
    // Add operations table
    const tableColumn = ["Date", "Item", "Type", "Quantity", "Direction", "Admin", "Notes"];
    const tableRows = sortedOperations.map(op => [
      op.date,
      op.itemName,
      op.itemType,
      op.quantity.toString(),
      op.direction,
      op.adminName,
      op.notes || ''
    ]);
    
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: includeSupplierDeliveries ? 115 : 110,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 66, 155] }
    });
    
    // Add footer
    const finalY = (doc as any).lastAutoTable.finalY || 110;
    doc.setFontSize(8);
    doc.text(`Generated on: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`, 14, finalY + 10);
    doc.text('Invizio WMS - Warehouse Management System', 14, finalY + 16);
    
    // Save the PDF
    const fileName = reportType === 'daily' 
      ? `daily-operations-report-${selectedDate}.pdf`
      : `monthly-operations-report-${selectedMonth}.pdf`;
    doc.save(fileName);
  };
  
  const exportCSV = () => {
    const headers = ["Date", "Item", "Type", "Quantity", "Direction", "Admin", "Notes"];
    const rows = sortedOperations.map(op => [
      op.date,
      op.itemName,
      op.itemType,
      op.quantity.toString(),
      op.direction,
      op.adminName,
      op.notes || ''
    ]);
    
    const csvContent = [
      `# ${reportType === 'daily' ? 'Daily' : 'Monthly'} Operations Report`,
      `# Period: ${reportType === 'daily' ? selectedDate : format(parseISO(selectedMonth + '-01'), 'MMMM yyyy')}`,
      `# Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`,
      `# Total Operations: ${summaryStats.totalOperations}`,
      `# Total Items In: ${summaryStats.totalIn}`,
      `# Total Items Out: ${summaryStats.totalOut}`,
      '',
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    const fileName = reportType === 'daily' 
      ? `daily-operations-report-${selectedDate}.csv`
      : `monthly-operations-report-${selectedMonth}.csv`;
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <FileText className="mr-3" size={28} />
              Operations Reports
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Generate comprehensive daily and monthly reports with analytics
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Report Type Toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setReportType('daily')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  reportType === 'daily'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Calendar size={16} className="mr-2 inline" />
                Daily
              </button>
              <button
                onClick={() => setReportType('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  reportType === 'monthly'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <TrendingUp size={16} className="mr-2 inline" />
                Monthly
              </button>
            </div>

            {/* Date/Month Selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="date-selector" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {reportType === 'daily' ? 'Date:' : 'Month:'}
              </label>
              {reportType === 'daily' ? (
                <input
                  id="date-selector"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              ) : (
                <input
                  id="date-selector"
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              )}
            </div>
            
            {/* Options */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeSupplier"
                checked={includeSupplierDeliveries}
                onChange={(e) => setIncludeSupplierDeliveries(e.target.checked)}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 rounded"
              />
              <label htmlFor="includeSupplier" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Include Supplier Deliveries
              </label>
            </div>
            
            {/* Export Buttons */}
            <div className="flex gap-2">
              <button
                onClick={exportPDF}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
              >
                <Download size={16} className="mr-1" />
                PDF
              </button>
              <button
                onClick={exportCSV}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
              >
                <Download size={16} className="mr-1" />
                CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
              <Database size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Operations</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{summaryStats.totalOperations}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400">
              <TrendingUp size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Items In</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{summaryStats.totalIn}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400">
              <TrendingUp size={24} className="rotate-180" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Items Out</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{summaryStats.totalOut}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400">
              <FileText size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Unique Items</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{summaryStats.uniqueItems}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Charts */}
      {(directionData.length > 0 || itemTypeData.length > 0 || monthlyTrendData.length > 0) ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {directionData.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Operations by Direction</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={directionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {directionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.name === 'in' ? '#4ade80' : '#f87171'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} units`, 'Quantity']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          
          {itemTypeData.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Operations by Item Type</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={itemTypeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Quantity" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {reportType === 'monthly' && monthlyTrendData.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 lg:col-span-2 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Daily Trend for {format(parseISO(selectedMonth + '-01'), 'MMMM yyyy')}</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="in" stroke="#4ade80" name="Items In" strokeWidth={2} />
                    <Line type="monotone" dataKey="out" stroke="#f87171" name="Items Out" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center border border-gray-200 dark:border-gray-700">
          <FileText size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Data Available</h3>
          <p className="text-gray-600 dark:text-gray-400">
            No operations found for the selected {reportType === 'daily' ? 'date' : 'month'}. 
            Try selecting a different period or check if there are any recorded operations.
          </p>
        </div>
      )}
      
      {/* Operations Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Operations Log - {reportType === 'daily' ? selectedDate : format(parseISO(selectedMonth + '-01'), 'MMMM yyyy')}
            {includeSupplierDeliveries && (
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">(Including Supplier Deliveries)</span>
            )}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {filteredOperations.length} operations found
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('date')}
                >
                  <span className="flex items-center">
                    Date {renderSortIcon('date')}
                  </span>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('itemName')}
                >
                  <span className="flex items-center">
                    Item {renderSortIcon('itemName')}
                  </span>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('itemType')}
                >
                  <span className="flex items-center">
                    Type {renderSortIcon('itemType')}
                  </span>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('quantity')}
                >
                  <span className="flex items-center">
                    Quantity {renderSortIcon('quantity')}
                  </span>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('direction')}
                >
                  <span className="flex items-center">
                    Direction {renderSortIcon('direction')}
                  </span>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('adminName')}
                >
                  <span className="flex items-center">
                    Admin {renderSortIcon('adminName')}
                  </span>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {sortedOperations.length > 0 ? (
                sortedOperations.map((op) => (
                  <tr key={op.id} className={op.id.startsWith('supplier-') ? 'bg-green-50 dark:bg-green-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {op.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {op.itemName}
                      {op.id.startsWith('supplier-') && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          Supplier
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">
                      {op.itemType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {op.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        op.direction === 'in' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {op.direction === 'in' ? 'In' : 'Out'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {op.adminName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {op.notes || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No operations found for the selected {reportType === 'daily' ? 'date' : 'month'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DailyReportsPage;