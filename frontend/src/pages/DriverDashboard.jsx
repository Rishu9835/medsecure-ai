import { useState, useEffect } from 'react';
import Card from '../components/Card';
import LiveMap from '../components/LiveMap';
import { SafeScoreMini } from '../components/SafeScore';
import { getLatestSensorData, getCommand, getSafeScore, getMyShipments } from '../api';
import { 
  Thermometer, 
  Droplets, 
  Activity, 
  MapPin, 
  Lock, 
  Unlock,
  AlertTriangle,
  Wifi,
  WifiOff,
  RefreshCw,
  Package,
  Shield,
  Truck,
  Clock,
  CheckCircle,
  ChevronDown,
  Target,
  ExternalLink
} from 'lucide-react';

const DriverDashboard = () => {
  const [sensorData, setSensorData] = useState(null);
  const [lockState, setLockState] = useState({ lock: true, override: false });
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [safeScore, setSafeScore] = useState(100);
  
  // Shipment state
  const [shipments, setShipments] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [showShipmentDropdown, setShowShipmentDropdown] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Fetch shipments assigned to this driver
  useEffect(() => {
    const fetchShipments = async () => {
      try {
        const res = await getMyShipments();
        const shipmentList = res.data || [];
        setShipments(shipmentList);
        
        // Auto-select the most recent non-delivered shipment
        const activeShipment = shipmentList.find(s => s.status !== 'delivered') || shipmentList[0];
        if (activeShipment) {
          setSelectedShipment(activeShipment);
        }
      } catch (err) {
        console.error('Error fetching shipments:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchShipments();
  }, []);

  const fetchData = async () => {
    try {
      const [dataRes, cmdRes, scoreRes] = await Promise.all([
        getLatestSensorData(1),
        getCommand('BOX_001'),
        getSafeScore('BOX_001')
      ]);
      
      if (scoreRes.data) {
        setSafeScore(scoreRes.data.score);
      }
      
      if (dataRes.data.length > 0) {
        setSensorData(dataRes.data[0]);
        
        const newAlerts = [];
        const d = dataRes.data[0];
        if (d.temperature > 34) newAlerts.push({ type: 'danger', msg: `High temperature: ${d.temperature}°C` });
        if (d.temperature < 15) newAlerts.push({ type: 'warning', msg: `Low temperature: ${d.temperature}°C` });
        if (d.shock > 1.5) newAlerts.push({ type: 'danger', msg: `Shock detected: ${d.shock.toFixed(2)}g` });
        setAlerts(newAlerts);
      }
      
      setLockState(cmdRes.data);
      setDataLoaded(true);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  // Auto-refresh data when loaded
  useEffect(() => {
    if (!dataLoaded) return;
    
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [dataLoaded]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-forensic-sepia-warn/20 text-forensic-sepia-warn border-forensic-sepia-warn/30';
      case 'in_transit': return 'bg-forensic-orange/20 text-forensic-orange border-forensic-orange/30';
      case 'delivered': return 'bg-forensic-green-live/20 text-forensic-green-live border-forensic-green-live/30';
      default: return 'bg-white/10 text-forensic-text-dim border-white/20';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" strokeWidth={1.5} />;
      case 'in_transit': return <Truck className="w-4 h-4" strokeWidth={1.5} />;
      case 'delivered': return <CheckCircle className="w-4 h-4" strokeWidth={1.5} />;
      default: return <Package className="w-4 h-4" strokeWidth={1.5} />;
    }
  };

  const handleLoadData = () => {
    setDataLoaded(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-forensic-orange animate-spin" strokeWidth={1.5} />
      </div>
    );
  }

  // No shipments exist
  if (shipments.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="border-b border-white/5 pb-4">
          <h1 className="text-2xl font-bold text-forensic-text uppercase tracking-forensic">DRIVER DASHBOARD</h1>
          <p className="text-xs text-forensic-text-dim font-mono mt-1 tracking-wide uppercase">
            NO ACTIVE SHIPMENTS
          </p>
        </div>
        <Card className="p-12 text-center">
          <Package className="w-16 h-16 text-white/10 mx-auto mb-4" strokeWidth={1} />
          <h3 className="text-base font-bold text-forensic-text uppercase tracking-wide mb-2">NO SHIPMENTS ASSIGNED</h3>
          <p className="text-forensic-text-muted text-xs font-mono">WAITING FOR SHIPMENT ASSIGNMENT</p>
        </Card>
      </div>
    );
  }

  // Show shipment selection first before loading data
  if (!dataLoaded) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="border-b border-white/5 pb-4">
          <h1 className="text-2xl font-bold text-forensic-text uppercase tracking-forensic">DRIVER DASHBOARD</h1>
          <p className="text-xs text-forensic-text-dim font-mono mt-1 tracking-wide uppercase">
            SELECT SHIPMENT TO BEGIN TRANSPORT
          </p>
        </div>

        {/* Shipment Selection Card */}
        <Card className="p-6">
          <h2 className="text-sm font-bold text-forensic-text mb-4 flex items-center gap-3 uppercase tracking-forensic border-b border-white/5 pb-3">
            <div className="w-6 h-6 bg-forensic-orange/10 border border-forensic-orange/30 flex items-center justify-center">
              <Package className="w-4 h-4 text-forensic-orange" strokeWidth={1.5} />
            </div>
            SELECT ACTIVE SHIPMENT
          </h2>

          {/* Shipment Dropdown */}
          <div className="relative mb-6">
            <button
              onClick={() => setShowShipmentDropdown(!showShipmentDropdown)}
              className="w-full flex items-center justify-between p-4 bg-forensic-bg-elevated border border-white/10 hover:border-forensic-orange/30 transition-all duration-100"
            >
              {selectedShipment ? (
                <div className="flex items-center gap-4">
                  <div className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 border ${getStatusColor(selectedShipment.status)}`}>
                    {getStatusIcon(selectedShipment.status)}
                    {selectedShipment.status?.replace('_', ' ')}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-forensic-text font-mono">{selectedShipment.unique_id}</p>
                    <p className="text-xs text-forensic-text-dim font-mono">{selectedShipment.customer_phone}</p>
                  </div>
                </div>
              ) : (
                <span className="text-forensic-text-muted text-sm font-mono">SELECT A SHIPMENT</span>
              )}
              <ChevronDown className={`w-5 h-5 text-forensic-text-dim transition-transform ${showShipmentDropdown ? 'rotate-180' : ''}`} strokeWidth={1.5} />
            </button>

            {showShipmentDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-forensic-bg-elevated border border-white/10 z-50 max-h-64 overflow-y-auto shadow-forensic-float">
                {shipments.map((shipment) => (
                  <button
                    key={shipment.id}
                    onClick={() => {
                      setSelectedShipment(shipment);
                      setShowShipmentDropdown(false);
                    }}
                    className={`w-full flex items-center gap-4 p-4 text-left hover:bg-forensic-surface-high transition-all duration-100 border-b border-white/5 last:border-0 ${
                      selectedShipment?.id === shipment.id ? 'bg-forensic-orange/10' : ''
                    }`}
                  >
                    <div className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 border ${getStatusColor(shipment.status)}`}>
                      {getStatusIcon(shipment.status)}
                      {shipment.status?.replace('_', ' ')}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-forensic-text font-mono">{shipment.unique_id}</p>
                      <p className="text-xs text-forensic-text-dim font-mono">{shipment.customer_phone}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Shipment Details */}
          {selectedShipment && (
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-forensic-surface-high border border-white/5">
                  <p className="text-[10px] text-forensic-text-dim uppercase tracking-wide font-mono mb-1">SHIPMENT ID</p>
                  <p className="text-sm font-bold text-forensic-text font-mono">{selectedShipment.unique_id}</p>
                </div>
                <div className="p-4 bg-forensic-surface-high border border-white/5">
                  <p className="text-[10px] text-forensic-text-dim uppercase tracking-wide font-mono mb-1">CUSTOMER</p>
                  <p className="text-sm font-bold text-forensic-text font-mono">{selectedShipment.customer_phone}</p>
                </div>
                <div className="p-4 bg-forensic-surface-high border border-white/5">
                  <p className="text-[10px] text-forensic-text-dim uppercase tracking-wide font-mono mb-1">DELIVERY ZONE</p>
                  <p className="text-sm font-bold text-forensic-text font-mono">
                    {selectedShipment.lat?.toFixed(4)}, {selectedShipment.lng?.toFixed(4)}
                  </p>
                </div>
                <div className="p-4 bg-forensic-surface-high border border-white/5">
                  <p className="text-[10px] text-forensic-text-dim uppercase tracking-wide font-mono mb-1">GEOFENCE RADIUS</p>
                  <p className="text-sm font-bold text-forensic-text font-mono">{selectedShipment.radius}M</p>
                </div>
              </div>

              {/* Geofence Visual */}
              <div className="p-4 bg-forensic-surface-high border border-white/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-6 h-6 bg-forensic-green-live/10 border border-forensic-green-live/30 flex items-center justify-center">
                    <Target className="w-4 h-4 text-forensic-green-live" strokeWidth={1.5} />
                  </div>
                  <p className="text-xs text-forensic-text uppercase tracking-wide font-mono font-bold">GEOFENCE PARAMETERS</p>
                </div>
                <p className="text-xs text-forensic-text-dim font-mono">
                  BOX MUST BE WITHIN {selectedShipment.radius}M OF TARGET FOR DELIVERY UNLOCK
                </p>
              </div>
            </div>
          )}

          {/* Load Data Button */}
          <button
            onClick={handleLoadData}
            disabled={!selectedShipment}
            className="w-full py-4 bg-forensic-orange/20 text-forensic-orange border border-forensic-orange/30 hover:bg-forensic-orange/30 hover:shadow-forensic-glow transition-all duration-100 uppercase text-sm tracking-wide font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <Truck className="w-5 h-5" strokeWidth={1.5} />
            START TRANSPORT
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-4 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-forensic-text uppercase tracking-forensic">DRIVER DASHBOARD</h1>
          <p className="text-xs text-forensic-text-dim font-mono mt-1 tracking-wide uppercase">
            SHIPMENT: {selectedShipment?.unique_id || 'N/A'} | STATUS: {selectedShipment?.status?.replace('_', ' ').toUpperCase() || 'N/A'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Change Shipment Button */}
          <button 
            onClick={() => setDataLoaded(false)}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 text-forensic-text-dim border border-white/10 hover:bg-white/10 transition-all duration-100 uppercase text-xs tracking-wide font-medium"
          >
            <Package className="w-4 h-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">CHANGE</span>
          </button>
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 bg-forensic-orange/20 text-forensic-orange border border-forensic-orange/30 hover:bg-forensic-orange/30 hover:shadow-forensic-glow transition-all duration-100 uppercase text-xs tracking-wide font-medium"
          >
            <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">REFRESH</span>
          </button>
        </div>
      </div>

      {/* Active Shipment Banner */}
      {selectedShipment && (
        <Card className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide flex items-center gap-2 border ${getStatusColor(selectedShipment.status)}`}>
                {getStatusIcon(selectedShipment.status)}
                {selectedShipment.status?.replace('_', ' ')}
              </div>
              <div>
                <p className="text-sm font-bold text-forensic-text font-mono">{selectedShipment.unique_id}</p>
                <p className="text-xs text-forensic-text-dim font-mono">{selectedShipment.customer_phone}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs text-forensic-text-dim font-mono">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-forensic-green-live" strokeWidth={1.5} />
                <span>GEOFENCE: {selectedShipment.radius}M</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-forensic-orange" strokeWidth={1.5} />
                <span>{selectedShipment.lat?.toFixed(4)}, {selectedShipment.lng?.toFixed(4)}</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Safe Score Banner */}
      <SafeScoreMini score={safeScore} />

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <Card className="p-4 bg-forensic-blood-red/10 border-forensic-blood-red/30" glow={true}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-forensic-blood-red/10 border border-forensic-blood-red/30 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-forensic-blood-red" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              {alerts.map((alert, idx) => (
                <p key={idx} className="text-forensic-blood-red text-xs font-mono">{alert.msg}</p>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Lock Status */}
      <Card className={`p-6 ${!lockState.lock ? 'border-forensic-green-live/30 shadow-forensic-glow' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 flex items-center justify-center border ${
              lockState.lock 
                ? 'bg-forensic-blood-red/10 border-forensic-blood-red/30' 
                : 'bg-forensic-green-live/10 border-forensic-green-live/30 animate-pulse-glow'
            }`}>
              {lockState.lock ? (
                <Lock className="w-8 h-8 text-forensic-blood-red" strokeWidth={1.5} />
              ) : (
                <Unlock className="w-8 h-8 text-forensic-green-live" strokeWidth={1.5} />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-forensic-text uppercase tracking-wide">
                {lockState.lock ? 'SECURED' : 'BREACHED'}
              </h2>
              {lockState.override && (
                <p className="text-xs text-forensic-yellow-warn font-mono mt-1 uppercase tracking-wide">ADMIN OVERRIDE ACTIVE</p>
              )}
            </div>
          </div>
          <Package className="w-12 h-12 text-white/5" strokeWidth={1.5} />
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 flex items-center justify-center border ${
              sensorData?.temperature > 34 ? 'bg-forensic-red-alert/10 border-forensic-red-alert/30' : 'bg-forensic-orange/10 border-forensic-orange/30'
            }`}>
              <Thermometer className={`w-5 h-5 ${sensorData?.temperature > 34 ? 'text-forensic-red-alert' : 'text-forensic-orange'}`} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[10px] text-forensic-text-dim uppercase tracking-wide font-mono">TEMP</p>
              <p className="text-lg font-bold text-forensic-text font-mono">
                {sensorData?.temperature?.toFixed(1) || '--'}°C
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-forensic-sepia-warn/10 border border-forensic-sepia-warn/30 flex items-center justify-center">
              <Droplets className="w-5 h-5 text-forensic-sepia-warn" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[10px] text-forensic-text-dim uppercase tracking-wide font-mono">HUMID</p>
              <p className="text-lg font-bold text-forensic-text font-mono">
                {sensorData?.humidity?.toFixed(1) || '--'}%
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 flex items-center justify-center border ${
              sensorData?.shock > 1.5 ? 'bg-forensic-red-alert/10 border-forensic-red-alert/30' : 'bg-forensic-green-live/10 border-forensic-green-live/30'
            }`}>
              <Activity className={`w-5 h-5 ${sensorData?.shock > 1.5 ? 'text-forensic-red-alert' : 'text-forensic-green-live'}`} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[10px] text-forensic-text-dim uppercase tracking-wide font-mono">SHOCK</p>
              <p className="text-lg font-bold text-forensic-text font-mono">
                {sensorData?.shock?.toFixed(2) || '--'}g
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 flex items-center justify-center border ${
              sensorData?.gps_status === 'LIVE' ? 'bg-forensic-green-live/10 border-forensic-green-live/30' : 'bg-forensic-yellow-warn/10 border-forensic-yellow-warn/30'
            }`}>
              {sensorData?.gps_status === 'LIVE' ? (
                <Wifi className="w-5 h-5 text-forensic-green-live" strokeWidth={1.5} />
              ) : (
                <WifiOff className="w-5 h-5 text-forensic-yellow-warn" strokeWidth={1.5} />
              )}
            </div>
            <div>
              <p className="text-[10px] text-forensic-text-dim uppercase tracking-wide font-mono">GPS</p>
              <p className="text-sm font-bold text-forensic-text font-mono uppercase">
                {sensorData?.gps_status || '--'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Map */}
      <Card className="p-6">
        <h2 className="text-sm font-bold text-forensic-text mb-4 flex items-center gap-3 uppercase tracking-forensic border-b border-white/5 pb-3">
          <div className="w-6 h-6 bg-forensic-orange/10 border border-forensic-orange/30 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-forensic-orange" strokeWidth={1.5} />
          </div>
          LAST KNOWN POSITION
          {selectedShipment && (
            <span className="ml-auto text-[10px] text-forensic-text-dim font-mono font-normal">
              GEOFENCE: {selectedShipment.radius}M RADIUS
            </span>
          )}
        </h2>
        <LiveMap
          boxPosition={sensorData ? [sensorData.gps_lat, sensorData.gps_lng] : null}
          deliveryPosition={selectedShipment ? [selectedShipment.lat, selectedShipment.lng] : null}
          geofenceRadius={selectedShipment?.radius}
          height="300px"
        />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-forensic-text-muted font-mono">
            {sensorData?.gps_lat?.toFixed(6)}, {sensorData?.gps_lng?.toFixed(6)}
          </p>
          {sensorData && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${sensorData.gps_lat},${sensorData.gps_lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-forensic-orange/10 border border-forensic-orange/30 text-forensic-orange text-[10px] font-mono uppercase tracking-wider hover:bg-forensic-orange/20 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Open in Maps
            </a>
          )}
        </div>
      </Card>
    </div>
  );
};

export default DriverDashboard;
