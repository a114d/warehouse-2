import React, { useState, useRef, useEffect } from 'react';
import { Camera, Scan, X, CheckCircle, AlertCircle, Search, Package, Smartphone, Monitor } from 'lucide-react';
import jsQR from 'jsqr';
import useInventoryStore from '../../store/inventoryStore';
import useAuthStore from '../../store/authStore';
import { Link } from 'react-router-dom';

const BarcodeScannerPage: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [scanResult, setScanResult] = useState<{
    type: 'success' | 'error';
    message: string;
    item?: any;
  } | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isHttps, setIsHttps] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { getItemByCode, items, fetchItems } = useInventoryStore();
  const { user } = useAuthStore();

  useEffect(() => {
    // Load inventory data
    fetchItems();
    
    // Check if we're on HTTPS
    setIsHttps(window.location.protocol === 'https:');
    
    return () => {
      stopScanning();
    };
  }, [fetchItems]);

  const startScanning = async () => {
    setCameraError(null);
    
    try {
      // Check if we have camera permissions
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device');
      }

      console.log('📷 Requesting camera access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
        
        console.log('✅ Camera access granted, starting QR detection');
        
        // Start QR code detection
        scanIntervalRef.current = setInterval(scanForQRCode, 300);
      }
    } catch (error) {
      console.error('❌ Camera access error:', error);
      
      let errorMessage = 'Unable to access camera. ';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage += 'Please allow camera permissions and try again.';
        } else if (error.name === 'NotFoundError') {
          errorMessage += 'No camera found on this device.';
        } else if (error.name === 'NotSupportedError') {
          errorMessage += 'Camera not supported on this device.';
        } else {
          errorMessage += error.message;
        }
      }
      
      if (!isHttps && window.location.hostname !== 'localhost') {
        errorMessage += ' Note: Camera requires HTTPS on remote connections.';
      }
      
      setCameraError(errorMessage);
      setScanResult({
        type: 'error',
        message: errorMessage
      });
    }
  };

  const scanForQRCode = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
      console.log('📱 QR Code detected:', code.data);
      handleCodeDetected(code.data);
      stopScanning();
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    setIsScanning(false);
    setCameraError(null);
  };

  const handleCodeDetected = (code: string) => {
    console.log('🔍 Processing detected code:', code);
    setScannedCode(code.toUpperCase());
    searchForItem(code.toUpperCase());
  };

  const handleManualInput = () => {
    if (!scannedCode.trim()) {
      setScanResult({
        type: 'error',
        message: 'Please enter a valid product code'
      });
      return;
    }

    const code = scannedCode.trim().toUpperCase();
    searchForItem(code);
  };

  const searchForItem = (code: string) => {
    console.log('🔍 Searching for item with code:', code);
    console.log('📦 Available items:', items.length);
    
    // Search by exact code match
    const item = items.find(i => i.code.toUpperCase() === code);
    
    if (item) {
      console.log('✅ Item found:', item);
      setScanResult({
        type: 'success',
        message: `✅ Item found: ${item.name}`,
        item
      });
    } else {
      console.log('❌ Item not found for code:', code);
      
      // Show available codes for debugging
      const availableCodes = items.map(i => i.code).join(', ');
      console.log('📋 Available codes:', availableCodes);
      
      setScanResult({
        type: 'error',
        message: `❌ Item not found for code: ${code}. Available codes: ${availableCodes.substring(0, 100)}${availableCodes.length > 100 ? '...' : ''}`
      });
    }
  };

  const clearResult = () => {
    setScanResult(null);
    setScannedCode('');
  };

  const testQRCode = (testCode: string) => {
    setScannedCode(testCode);
    searchForItem(testCode);
  };

  return (
    <div className="min-h-screen-safe bg-gray-50 dark:bg-gray-900 p-4 safe-all">
      <div className="max-w-4xl mx-auto">
        <div className="mobile-card animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h1 className="mobile-text-xl sm:mobile-text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <Scan className="w-8 h-8 mr-3 text-blue-600" />
              <span className="hidden sm:inline">QR Code & Barcode Scanner</span>
              <span className="sm:hidden">Scanner</span>
            </h1>
            <div className="mobile-text-xs sm:mobile-text-sm text-gray-500 dark:text-gray-400 text-right">
              User: {user?.name} | Items: {items.length}
            </div>
          </div>

          {/* HTTPS Warning */}
          {!isHttps && window.location.hostname !== 'localhost' && (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start">
                <AlertCircle className="text-yellow-500 mr-2 mt-0.5" size={20} />
                <div>
                  <h3 className="text-yellow-800 dark:text-yellow-300 font-semibold">HTTPS Required for Camera</h3>
                  <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-1">
                    Camera access requires HTTPS on remote connections. Use manual input or set up SSL certificate on your VPS.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Test QR Codes Section */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="mobile-text-lg font-semibold text-blue-900 dark:text-blue-300 mb-3 flex items-center">
              <Smartphone className="mr-2" size={20} />
              Test Product Codes
            </h3>
            <p className="mobile-text-sm text-blue-700 dark:text-blue-400 mb-3">
              Click these buttons to test scanning with actual product codes from your inventory:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {items.slice(0, 12).map(item => (
                <button
                  key={item.code}
                  onClick={() => testQRCode(item.code)}
                  className="mobile-button-primary bg-blue-600 hover:bg-blue-700 mobile-text-sm text-center"
                  title={`${item.name} (${item.quantity} in stock)`}
                >
                  {item.code}
                </button>
              ))}
            </div>
            {items.length === 0 && (
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Loading inventory items...
              </p>
            )}
          </div>

          {/* Camera Section */}
          <div className="mb-6">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-4 relative">
              {isScanning ? (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-48 sm:h-64 object-cover rounded-lg"
                  />
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                  />
                  {/* Scanning overlay */}
                  <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-32 border-2 border-red-500 bg-transparent">
                      {/* Corner indicators */}
                      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-red-500"></div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-red-500"></div>
                      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-red-500"></div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-red-500"></div>
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full mobile-text-sm">
                    📷 Scanning for QR codes...
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 sm:h-64 text-gray-400 dark:text-gray-500">
                  <div className="text-center">
                    <Camera className="w-16 h-16 mx-auto mb-4" />
                    <p className="mobile-text-base">Camera not active</p>
                    <p className="mobile-text-sm mt-2">Click "Start Camera" to begin scanning</p>
                    {cameraError && (
                      <p className="mobile-text-sm text-red-500 mt-2 max-w-sm mx-auto">
                        {cameraError}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              {!isScanning ? (
                <button
                  onClick={startScanning}
                  className="mobile-button-primary flex-1 bg-blue-600 hover:bg-blue-700 justify-center"
                  disabled={cameraError !== null}
                >
                  <Camera className="w-5 h-5 mr-2" />
                  {cameraError ? 'Camera Unavailable' : 'Start Camera Scanning'}
                </button>
              ) : (
                <button
                  onClick={stopScanning}
                  className="mobile-button flex-1 bg-red-600 text-white hover:bg-red-700 justify-center"
                >
                  <X className="w-5 h-5 mr-2" />
                  Stop Camera
                </button>
              )}
            </div>
          </div>

          {/* Manual Input Section */}
          <div className="mb-6">
            <label className="block mobile-text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Manual Product Code Entry:
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={scannedCode}
                onChange={(e) => setScannedCode(e.target.value.toUpperCase())}
                placeholder="Enter product code (e.g., IC0001, DR0001, KT0001, NK0001)..."
                className="mobile-input flex-1"
                onKeyPress={(e) => e.key === 'Enter' && handleManualInput()}
              />
              <button
                onClick={handleManualInput}
                className="mobile-button-primary bg-green-600 hover:bg-green-700 justify-center sm:justify-start"
              >
                <Search className="w-5 h-5 mr-2" />
                Search
              </button>
            </div>
            <p className="mobile-text-xs text-gray-500 dark:text-gray-400 mt-1">
              Enter any product code from your inventory to test the scanner functionality
            </p>
          </div>

          {/* Results Section */}
          {scanResult && (
            <div className={`p-6 rounded-lg mb-6 border-2 ${
              scanResult.type === 'success' 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            } animate-fade-in`}>
              <div className="flex items-start">
                {scanResult.type === 'success' ? (
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 mr-3 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`font-medium mobile-text-lg ${
                    scanResult.type === 'success' ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'
                  }`}>
                    {scanResult.message}
                  </p>
                  
                  {scanResult.item && (
                    <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="mobile-text-lg sm:mobile-text-xl font-bold text-gray-900 dark:text-white truncate flex-1 mr-4">{scanResult.item.name}</h3>
                        <Link
                          to={`/inventory/item/${scanResult.item.id}`}
                          className="mobile-button-primary bg-blue-600 hover:bg-blue-700 mobile-text-sm flex-shrink-0"
                        >
                          <Package className="w-4 h-4 mr-1" />
                          Details
                        </Link>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mobile-text-sm">
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Code:</span>
                          <div className="text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mt-1 break-all">
                            {scanResult.item.code}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Type:</span>
                          <div className="text-gray-900 dark:text-white capitalize mt-1">
                            {scanResult.item.type.replace('-', ' ')}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Quantity:</span>
                          <div className={`font-bold mobile-text-lg mt-1 ${
                            scanResult.item.quantity > 10 ? 'text-green-600 dark:text-green-400' :
                            scanResult.item.quantity > 0 ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-red-600 dark:text-red-400'
                          }`}>
                            {scanResult.item.quantity}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Expiry:</span>
                          <div className="text-gray-900 dark:text-white mt-1 mobile-text-sm">
                            {new Date(scanResult.item.expiryDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      {scanResult.item.flavor && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <span className="font-medium text-gray-600 dark:text-gray-400 mobile-text-sm">Flavor:</span>
                          <span className="ml-2 text-gray-900 dark:text-white mobile-text-sm">{scanResult.item.flavor}</span>
                        </div>
                      )}

                      {/* Stock Status */}
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-600 dark:text-gray-400 mr-2 mobile-text-sm">Stock Status:</span>
                          <span className={`status-badge ${
                            scanResult.item.quantity > 10 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                            scanResult.item.quantity > 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                          }`}>
                            {scanResult.item.quantity > 10 ? 'In Stock' :
                             scanResult.item.quantity > 0 ? 'Low Stock' : 'Out of Stock'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={clearResult}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Available Codes Reference */}
          <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3 mobile-text-base flex items-center">
              <Monitor className="mr-2" size={20} />
              Available Product Codes ({items.length} total):
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mobile-text-sm">
              <div>
                <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2 mobile-text-sm">Ice Cream (IC)</h4>
                <div className="space-y-1 text-gray-600 dark:text-gray-400 mobile-text-xs">
                  {items.filter(item => item.type === 'ice-cream').slice(0, 5).map(item => (
                    <div key={item.code} className="flex justify-between">
                      <span className="font-mono">{item.code}</span>
                      <span className="text-xs">({item.quantity})</span>
                    </div>
                  ))}
                  {items.filter(item => item.type === 'ice-cream').length > 5 && (
                    <div className="mobile-text-xs text-gray-500">+{items.filter(item => item.type === 'ice-cream').length - 5} more</div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-2 mobile-text-sm">Drinks (DR)</h4>
                <div className="space-y-1 text-gray-600 dark:text-gray-400 mobile-text-xs">
                  {items.filter(item => item.type === 'drinks').slice(0, 5).map(item => (
                    <div key={item.code} className="flex justify-between">
                      <span className="font-mono">{item.code}</span>
                      <span className="text-xs">({item.quantity})</span>
                    </div>
                  ))}
                  {items.filter(item => item.type === 'drinks').length > 5 && (
                    <div className="mobile-text-xs text-gray-500">+{items.filter(item => item.type === 'drinks').length - 5} more</div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-green-600 dark:text-green-400 mb-2 mobile-text-sm">Kitchen (KT)</h4>
                <div className="space-y-1 text-gray-600 dark:text-gray-400 mobile-text-xs">
                  {items.filter(item => item.type === 'kitchen').slice(0, 5).map(item => (
                    <div key={item.code} className="flex justify-between">
                      <span className="font-mono">{item.code}</span>
                      <span className="text-xs">({item.quantity})</span>
                    </div>
                  ))}
                  {items.filter(item => item.type === 'kitchen').length > 5 && (
                    <div className="mobile-text-xs text-gray-500">+{items.filter(item => item.type === 'kitchen').length - 5} more</div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-purple-600 dark:text-purple-400 mb-2 mobile-text-sm">Non-Kitchen (NK)</h4>
                <div className="space-y-1 text-gray-600 dark:text-gray-400 mobile-text-xs">
                  {items.filter(item => item.type === 'non-kitchen').slice(0, 5).map(item => (
                    <div key={item.code} className="flex justify-between">
                      <span className="font-mono">{item.code}</span>
                      <span className="text-xs">({item.quantity})</span>
                    </div>
                  ))}
                  {items.filter(item => item.type === 'non-kitchen').length > 5 && (
                    <div className="mobile-text-xs text-gray-500">+{items.filter(item => item.type === 'non-kitchen').length - 5} more</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2 mobile-text-base">How to use the scanner:</h3>
            <ul className="mobile-text-sm text-blue-800 dark:text-blue-400 space-y-1">
              <li>• <strong>Camera Scanning:</strong> Click "Start Camera" and point at a QR code (requires HTTPS on VPS)</li>
              <li>• <strong>Manual Entry:</strong> Type any product code from the list above and click "Search"</li>
              <li>• <strong>Test Codes:</strong> Use the blue test buttons to try actual product codes</li>
              <li>• <strong>View Details:</strong> Click "Details" on found items to see full information</li>
              <li>• <strong>HTTPS Note:</strong> Camera requires HTTPS on VPS - set up SSL certificate for camera access</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScannerPage;