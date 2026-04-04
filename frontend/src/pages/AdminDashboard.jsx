import { useState, useEffect } from 'react';
import Card from '../components/Card';
import LiveMap from '../components/LiveMap';
import { getSensorData, overrideLock, getCommand, getTamperAlerts, markAlertRead, markAllAlertsRead, getSafeScore, getAllShipments } from '../api';
import { SafeScoreCard } from '../components/SafeScore';
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
  ShieldAlert,
  Bell,
  CheckCheck,
  X,
  Package,
  Truck,
  Clock,
  CheckCircle,
  ChevronDown,
  Target,
  ExternalLink
} from 'lucide-react';

const AdminDashboard = () => {
  const [sensorData, setSensorData] = useState(null);
  const [lockState, setLockState] = useState({ lock: true, override: false });
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [tamperAlerts, setTamperAlerts] = useState([]);
  const [showTamperModal, setShowTamperModal] = useState(false);
  const [safeScore, setSafeScore] = useState({ score: 100, issues: [] });
  
  // Shipment state
  const [shipments, setShipments] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [showShipmentDropdown, setShowShipmentDropdown] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Fetch shipments on mount
  useEffect(() => {
    const fetchShipments = async () => {
      try {
        const res = await getAllShipments();
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
      const [dataRes, cmdRes, tamperRes, scoreRes] = await Promise.all([
        getSensorData(1),
        getCommand('BOX_001'),
        getTamperAlerts(10, false),
        getSafeScore('BOX_001')
      ]);
      
      // Set safe score
      if (scoreRes.data) {
        setSafeScore({
          score: scoreRes.data.score,
          issues: scoreRes.data.issues || []
        });
      }
      
      if (dataRes.data.length > 0) {
        setSensorData(dataRes.data[0]);
        
        // Generate alerts
        const newAlerts = [];
        const d = dataRes.data[0];
        if (d.temperature > 34) newAlerts.push({ type: 'danger', msg: `High temperature: ${d.temperature}°C` });
        if (d.temperature < 15) newAlerts.push({ type: 'warning', msg: `Low temperature: ${d.temperature}°C` });
        if (d.humidity > 70) newAlerts.push({ type: 'warning', msg: `High humidity: ${d.humidity}%` });
        if (d.shock > 1.5) newAlerts.push({ type: 'danger', msg: `Shock detected: ${d.shock.toFixed(2)}g` });
        if (d.gps_status === 'LAST_KNOWN') newAlerts.push({ type: 'info', msg: 'GPS using last known position' });
        setAlerts(newAlerts);
      }
      
      // Set tamper alerts
      if (tamperRes.data) {
        setTamperAlerts(tamperRes.data);
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

  const handleOverride = async () => {
    try {
      const newOverride = !lockState.override;
      await overrideLock('BOX_001', newOverride);
      setLockState({ ...lockState, override: newOverride, lock: !newOverride });
    } catch (err) {
      console.error('Override error:', err);
    }
  };

  const handleMarkAlertRead = async (alertId) => {
    try {
      await markAlertRead(alertId);
      setTamperAlerts(tamperAlerts.filter(a => a.id !== alertId));
    } catch (err) {
      console.error('Mark alert read error:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAlertsRead();
      setTamperAlerts([]);
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  const unreadTamperCount = tamperAlerts.filter(a => !a.is_read).length;

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
          <h1 className="text-2xl font-bold text-forensic-text uppercase tracking-forensic">CASE DASHBOARD</h1>
          <p className="text-xs text-forensic-text-dim font-mono mt-1 tracking-wide uppercase">
            NO ACTIVE SHIPMENTS
          </p>
        </div>
        <Card className="p-12 text-center">
          <Package className="w-16 h-16 text-white/10 mx-auto mb-4" strokeWidth={1} />
          <h3 className="text-base font-bold text-forensic-text uppercase tracking-wide mb-2">NO SHIPMENTS FOUND</h3>
          <p className="text-forensic-text-muted text-xs font-mono mb-6">CREATE A SHIPMENT TO BEGIN MONITORING</p>
          <a 
            href="/admin/shipments"
            className="inline-flex items-center gap-2 px-6 py-3 bg-forensic-orange/20 text-forensic-orange border border-forensic-orange/30 hover:bg-forensic-orange/30 hover:shadow-forensic-glow transition-all duration-100 uppercase text-xs tracking-wide font-medium"
          >
            <Package className="w-4 h-4" strokeWidth={1.5} />
            GO TO SHIPMENTS
          </a>
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
          <h1 className="text-2xl font-bold text-forensic-text uppercase tracking-forensic">CASE DASHBOARD</h1>
          <p className="text-xs text-forensic-text-dim font-mono mt-1 tracking-wide uppercase">
            SELECT SHIPMENT TO BEGIN MONITORING
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
            <Activity className="w-5 h-5" strokeWidth={1.5} />
            LOAD LIVE DATA
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-forensic-text uppercase tracking-forensic">CASE DASHBOARD</h1>
          <p className="text-xs text-forensic-text-dim font-mono mt-1 tracking-wide uppercase">
            SHIPMENT: {selectedShipment?.unique_id || 'N/A'} | STATUS: {selectedShipment?.status?.replace('_', ' ').toUpperCase() || 'N/A'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Change Shipment Button */}
          <button 
            onClick={() => setDataLoaded(false)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 text-forensic-text-dim border border-white/10 hover:bg-white/10 transition-all duration-100 uppercase text-xs tracking-wide font-medium"
          >
            <Package className="w-4 h-4" strokeWidth={1.5} />
            CHANGE
          </button>
          {/* Tamper Alerts Button */}
          <button 
            onClick={() => setShowTamperModal(true)}
            className="relative flex items-center gap-2 px-4 py-2 bg-forensic-blood-red/20 text-forensic-blood-red border border-forensic-blood-red/30 hover:bg-forensic-blood-red/30 transition-all duration-100 uppercase text-xs tracking-wide font-medium"
          >
            <ShieldAlert className="w-4 h-4" strokeWidth={1.5} />
            ANOMALIES
            {unreadTamperCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-forensic-orange text-forensic-bg text-xs font-bold w-5 h-5 flex items-center justify-center animate-pulse-glow border border-forensic-orange/50">
                {unreadTamperCount}
              </span>
            )}
          </button>
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-forensic-orange/20 text-forensic-orange border border-forensic-orange/30 hover:bg-forensic-orange/30 hover:shadow-forensic-glow transition-all duration-100 uppercase text-xs tracking-wide font-medium"
          >
            <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
            REFRESH
          </button>
        </div>
      </div>

      {/* Active Shipment Banner */}
      {selectedShipment && (
        <Card className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
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
            <div className="flex items-center gap-6 text-xs text-forensic-text-dim font-mono">
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

      {/* Tamper Alert Modal */}
      {showTamperModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-forensic-bg border border-white/10 w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-forensic-float">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-forensic-blood-red/10 border border-forensic-blood-red/30 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-forensic-blood-red" strokeWidth={1.5} />
                </div>
                <h2 className="text-base font-bold text-forensic-text uppercase tracking-forensic">ANOMALY LOG</h2>
                {unreadTamperCount > 0 && (
                  <span className="bg-forensic-blood-red/20 text-forensic-blood-red text-xs px-2 py-0.5 border border-forensic-blood-red/30 font-mono">{unreadTamperCount} UNREAD</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {tamperAlerts.length > 0 && (
                  <button 
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-forensic-green-live/20 text-forensic-green-live border border-forensic-green-live/30 hover:bg-forensic-green-live/30 transition-all duration-100 uppercase tracking-wide"
                  >
                    <CheckCheck className="w-3 h-3" strokeWidth={1.5} />
                    CLEAR ALL
                  </button>
                )}
                <button 
                  onClick={() => setShowTamperModal(false)}
                  className="p-2 hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-100"
                >
                  <X className="w-4 h-4 text-forensic-text-dim" strokeWidth={1.5} />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {tamperAlerts.length === 0 ? (
                <div className="text-center py-12 text-forensic-text-muted">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" strokeWidth={1.5} />
                  <p className="text-xs uppercase tracking-wide font-mono">NO ANOMALIES DETECTED</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tamperAlerts.map((alert) => (
                    <div 
                      key={alert.id}
                      className={`p-4 border transition-all duration-100 ${
                        alert.is_read 
                          ? 'bg-forensic-surface-low border-white/5' 
                          : 'bg-forensic-blood-red/10 border-forensic-blood-red/30'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              alert.alert_type === 'UNAUTHORIZED_LOCATION' 
                                ? 'bg-forensic-blood-red/20 text-forensic-blood-red border border-forensic-blood-red/30' 
                                : alert.alert_type === 'SHOCK_DETECTED'
                                  ? 'bg-forensic-orange/20 text-forensic-orange border border-forensic-orange/30'
                                  : 'bg-forensic-yellow-warn/20 text-forensic-yellow-warn border border-forensic-yellow-warn/30'
                            }`}>
                              {alert.alert_type}
                            </span>
                            <span className="text-xs text-forensic-text-muted font-mono">
                              {new Date(alert.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-forensic-text font-medium text-sm font-mono">{alert.message}</p>
                          {alert.shipment_id && (
                            <p className="text-xs text-forensic-text-dim mt-1 font-mono">SHIPMENT: {alert.shipment_id}</p>
                          )}
                          {alert.current_lat && alert.current_lng && (
                            <p className="text-xs text-forensic-text-dim mt-1 font-mono">
                              📍 {alert.current_lat.toFixed(4)}, {alert.current_lng.toFixed(4)}
                              {alert.distance && ` (${alert.distance.toFixed(0)}m FROM ZONE)`}
                            </p>
                          )}
                        </div>
                        {!alert.is_read && (
                          <button
                            onClick={() => handleMarkAlertRead(alert.id)}
                            className="ml-3 p-2 text-forensic-green-live hover:bg-forensic-green-live/10 border border-transparent hover:border-forensic-green-live/30 transition-all duration-100"
                            title="Mark as read"
                          >
                            <CheckCheck className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Temperature */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-forensic-text-dim uppercase tracking-wide font-mono">THERMAL SIGNATURE</p>
              <p className="text-2xl font-bold text-forensic-text mt-1 font-mono">
                {sensorData?.temperature?.toFixed(1) || '--'}°C
              </p>
            </div>
            <div className={`w-12 h-12 flex items-center justify-center border ${
              sensorData?.temperature > 34 ? 'bg-forensic-red-alert/10 border-forensic-red-alert/30' : 'bg-forensic-orange/10 border-forensic-orange/30'
            }`}>
              <Thermometer className={`w-6 h-6 ${
                sensorData?.temperature > 34 ? 'text-forensic-red-alert' : 'text-forensic-orange'
              }`} strokeWidth={1.5} />
            </div>
          </div>
          <div className="h-1 bg-white/5 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-forensic-orange to-forensic-blood-red transition-all"
              style={{ width: `${Math.min((sensorData?.temperature || 0) / 40 * 100, 100)}%` }}
            />
          </div>
        </Card>

        {/* Humidity */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-forensic-text-dim uppercase tracking-wide font-mono">HUMIDITY</p>
              <p className="text-2xl font-bold text-forensic-text mt-1 font-mono">
                {sensorData?.humidity?.toFixed(1) || '--'}%
              </p>
            </div>
            <div className="w-12 h-12 bg-forensic-sepia-warn/10 border border-forensic-sepia-warn/30 flex items-center justify-center">
              <Droplets className="w-6 h-6 text-forensic-sepia-warn" strokeWidth={1.5} />
            </div>
          </div>
          <div className="h-1 bg-white/5 overflow-hidden">
            <div 
              className="h-full bg-forensic-sepia-warn transition-all"
              style={{ width: `${sensorData?.humidity || 0}%` }}
            />
          </div>
        </Card>

        {/* Shock */}
        <Card className={`p-5 ${sensorData?.shock > 1.5 ? 'animate-pulse-glow' : ''}`} glow={sensorData?.shock > 1.5}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-forensic-text-dim uppercase tracking-wide font-mono">EARTHQUAKE</p>
              <p className="text-2xl font-bold text-forensic-text mt-1 font-mono">
                {sensorData?.shock?.toFixed(2) || '--'}g
              </p>
            </div>
            <div className={`w-12 h-12 flex items-center justify-center border ${
              sensorData?.shock > 1.5 ? 'bg-forensic-red-alert/10 border-forensic-red-alert/30' : 'bg-forensic-green-live/10 border-forensic-green-live/30'
            }`}>
              <Activity className={`w-6 h-6 ${
                sensorData?.shock > 1.5 ? 'text-forensic-red-alert' : 'text-forensic-green-live'
              }`} strokeWidth={1.5} />
            </div>
          </div>
        </Card>

        {/* GPS Status */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-forensic-text-dim uppercase tracking-wide font-mono">SIGNAL STATUS</p>
              <p className="text-base font-bold text-forensic-text mt-1 font-mono uppercase">
                {sensorData?.gps_status || '--'}
              </p>
            </div>
            <div className={`w-12 h-12 flex items-center justify-center border ${
              sensorData?.gps_status === 'LIVE' ? 'bg-forensic-green-live/10 border-forensic-green-live/30' : 'bg-forensic-yellow-warn/10 border-forensic-yellow-warn/30'
            }`}>
              {sensorData?.gps_status === 'LIVE' ? (
                <Wifi className="w-6 h-6 text-forensic-green-live" strokeWidth={1.5} />
              ) : (
                <WifiOff className="w-6 h-6 text-forensic-yellow-warn" strokeWidth={1.5} />
              )}
            </div>
          </div>
          <p className="text-[10px] text-forensic-text-muted font-mono">
            {sensorData?.gps_lat?.toFixed(6)}, {sensorData?.gps_lng?.toFixed(6)}
          </p>
        </Card>
      </div>

      {/* Map and Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Map */}
        <Card className="lg:col-span-2 p-6">
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
            height="350px"
          />
          {sensorData && (
            <div className="mt-3 flex justify-end">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${sensorData.gps_lat},${sensorData.gps_lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-forensic-orange/10 border border-forensic-orange/30 text-forensic-orange text-[10px] font-mono uppercase tracking-wider hover:bg-forensic-orange/20 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Open in Google Maps
              </a>
            </div>
          )}
        </Card>

        {/* Safe Score + Lock Control */}
        <div className="space-y-4">
          {/* Safe Score */}
          <SafeScoreCard score={safeScore.score} issues={safeScore.issues} />
          
          {/* Lock Control */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-forensic-text mb-4 uppercase tracking-forensic border-b border-white/5 pb-3">LOCK CONTROL</h2>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 flex items-center justify-center border ${
                  lockState.lock 
                    ? 'bg-forensic-blood-red/10 border-forensic-blood-red/30' 
                    : 'bg-forensic-green-live/10 border-forensic-green-live/30'
                }`}>
                  {lockState.lock ? (
                    <Lock className="w-6 h-6 text-forensic-blood-red" strokeWidth={1.5} />
                  ) : (
                    <Unlock className="w-6 h-6 text-forensic-green-live" strokeWidth={1.5} />
                  )}
                </div>
                <div>
                  <p className="font-bold text-forensic-text uppercase tracking-wide text-sm">
                    {lockState.lock ? 'SECURED' : 'BREACHED'}
                  </p>
                  <p className="text-xs text-forensic-text-dim font-mono">
                    OVERRIDE: {lockState.override ? 'ACTIVE' : 'OFF'}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={handleOverride}
              className={`w-full py-3 px-4 font-bold transition-all duration-100 uppercase text-xs tracking-wide border ${
                lockState.override
                  ? 'bg-forensic-blood-red/20 hover:bg-forensic-blood-red/30 text-forensic-blood-red border-forensic-blood-red/30 hover:shadow-forensic-glow'
                  : 'bg-forensic-green-live/20 hover:bg-forensic-green-live/30 text-forensic-green-live border-forensic-green-live/30'
              }`}
            >
              {lockState.override ? 'DISABLE OVERRIDE' : 'ENABLE OVERRIDE'}
            </button>
          </Card>

          {/* Alerts */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-forensic-text mb-4 flex items-center gap-3 uppercase tracking-forensic border-b border-white/5 pb-3">
              <div className="w-6 h-6 bg-forensic-blood-red/10 border border-forensic-blood-red/30 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-forensic-blood-red" strokeWidth={1.5} />
              </div>
              ANOMALIES
            </h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {alerts.length === 0 ? (
                <p className="text-forensic-text-muted text-center py-4 text-xs font-mono uppercase tracking-wide">NO ANOMALIES DETECTED</p>
              ) : (
                alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={`px-3 py-2.5 text-xs font-mono border ${
                      alert.type === 'danger'
                        ? 'bg-forensic-red-alert/10 border-forensic-red-alert/30 text-forensic-red-alert'
                        : alert.type === 'warning'
                        ? 'bg-forensic-yellow-warn/10 border-forensic-yellow-warn/30 text-forensic-yellow-warn'
                        : 'bg-forensic-orange/10 border-forensic-orange/30 text-forensic-orange'
                    }`}
                  >
                    {alert.msg}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
