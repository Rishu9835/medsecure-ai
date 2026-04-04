import { useState, useEffect, useRef } from 'react';
import Card from '../components/Card';
import { createShipment, getAllShipments, getQRCode, deleteShipment, getAllDrivers } from '../api';
import L from 'leaflet';
import { 
  Package, 
  Plus, 
  Phone, 
  MapPin, 
  QrCode,
  X,
  Check,
  Truck,
  Clock,
  Search,
  User
} from 'lucide-react';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Location Picker with Search using Nominatim (free)
const LocationPicker = ({ position, setPosition, radius }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = L.map(mapRef.current).setView([28.6139, 77.2090], 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(mapInstanceRef.current);

    mapInstanceRef.current.on('click', (e) => {
      setPosition([e.latlng.lat, e.latlng.lng]);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update marker and circle
  useEffect(() => {
    if (!mapInstanceRef.current || !position) return;

    if (markerRef.current) {
      markerRef.current.setLatLng(position);
    } else {
      const greenIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });
      markerRef.current = L.marker(position, { icon: greenIcon }).addTo(mapInstanceRef.current);
    }

    if (circleRef.current) {
      circleRef.current.setLatLng(position);
      circleRef.current.setRadius(radius);
    } else {
      circleRef.current = L.circle(position, {
        color: '#22c55e',
        fillColor: '#22c55e',
        fillOpacity: 0.2,
        radius: radius
      }).addTo(mapInstanceRef.current);
    }

    mapInstanceRef.current.panTo(position);
  }, [position, radius]);

  // Search using Nominatim API (free, no key needed)
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSuggestions([]);
    
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      const data = await res.json();
      setSuggestions(data);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const selectPlace = (place) => {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);
    setPosition([lat, lng]);
    mapInstanceRef.current.setView([lat, lng], 16);
    setSearchQuery(place.display_name.split(',').slice(0, 2).join(', '));
    setSuggestions([]);
  };

  return (
    <div className="relative h-full">
      {/* Search Bar */}
      <div className="absolute top-3 left-3 right-3 z-[1000]">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search address..."
            className="flex-1 px-4 py-2.5 bg-forensic-bg-elevated border border-white/10 text-forensic-text placeholder-forensic-text-muted font-mono text-xs focus:outline-none focus:border-forensic-orange transition-all duration-100"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-4 py-2.5 bg-forensic-orange/20 text-forensic-orange border border-forensic-orange/30 hover:bg-forensic-orange/30 transition-all duration-100"
          >
            <Search className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
        
        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <div className="mt-1 bg-forensic-bg-elevated border border-white/10 max-h-48 overflow-y-auto shadow-forensic-float">
            {suggestions.map((place, idx) => (
              <button
                key={idx}
                onClick={() => selectPlace(place)}
                className="w-full px-4 py-3 text-left text-xs hover:bg-forensic-surface-high border-b border-white/5 last:border-0 transition-all duration-100"
              >
                <div className="font-medium text-forensic-text font-mono">{place.display_name.split(',')[0]}</div>
                <div className="text-[10px] text-forensic-text-muted truncate">
                  {place.display_name.split(',').slice(1, 3).join(',')}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
};

const Shipments = () => {
  const [shipments, setShipments] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState(null);
  const [radius, setRadius] = useState(100);
  const [assignedDriver, setAssignedDriver] = useState('');

  const fetchShipments = async () => {
    try {
      const res = await getAllShipments();
      setShipments(res.data);
    } catch (err) {
      console.error('Error fetching shipments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await getAllDrivers();
      setDrivers(res.data);
    } catch (err) {
      console.error('Error fetching drivers:', err);
    }
  };

  useEffect(() => {
    fetchShipments();
    fetchDrivers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!position) {
      alert('Please select a delivery location on the map');
      return;
    }
    
    try {
      await createShipment(phone, position[0], position[1], radius, assignedDriver || null);
      setShowModal(false);
      setPhone('');
      setPosition(null);
      setRadius(100);
      setAssignedDriver('');
      fetchShipments();
    } catch (err) {
      console.error('Error creating shipment:', err);
    }
  };

  const handleShowQR = async (uniqueId) => {
    try {
      const res = await getQRCode(uniqueId);
      setQrData(res.data);
      setShowQRModal(true);
    } catch (err) {
      console.error('Error fetching QR:', err);
    }
  };

  const handleDelete = async (uniqueId) => {
    if (!window.confirm(`Delete shipment ${uniqueId}?`)) return;
    
    try {
      await deleteShipment(uniqueId);
      fetchShipments();
    } catch (err) {
      console.error('Error deleting shipment:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-forensic-sepia-warn/10 text-forensic-sepia-warn border-forensic-sepia-warn/30';
      case 'in_transit': return 'bg-forensic-orange/10 text-forensic-orange border-forensic-orange/30';
      case 'delivered': return 'bg-forensic-green-live/10 text-forensic-green-live border-forensic-green-live/30';
      default: return 'bg-white/5 text-forensic-text-dim border-white/10';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-3 h-3" strokeWidth={1.5} />;
      case 'in_transit': return <Truck className="w-3 h-3" strokeWidth={1.5} />;
      case 'delivered': return <Check className="w-3 h-3" strokeWidth={1.5} />;
      default: return <Package className="w-3 h-3" strokeWidth={1.5} />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-forensic-text uppercase tracking-forensic">SHIPMENTS</h1>
          <p className="text-xs text-forensic-text-dim font-mono mt-1 tracking-wide uppercase">
            LOGISTICS MANAGEMENT // PACKAGE TRACKING
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-forensic-orange/20 text-forensic-orange border border-forensic-orange/30 hover:bg-forensic-orange/30 hover:shadow-forensic-glow transition-all duration-100 uppercase text-xs tracking-wide font-medium"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          CREATE
        </button>
      </div>

      {/* Shipments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shipments.map((shipment) => (
          <Card key={shipment.id} className="p-5">
            <div className="flex items-center justify-between mb-4">
              <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 border ${getStatusColor(shipment.status)}`}>
                {getStatusIcon(shipment.status)}
                {shipment.status}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleShowQR(shipment.unique_id)}
                  className="p-1.5 bg-forensic-orange/10 border border-forensic-orange/30 hover:bg-forensic-orange/20 transition-all duration-100"
                >
                  <QrCode className="w-4 h-4 text-forensic-orange" strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => handleDelete(shipment.unique_id)}
                  className="p-1.5 bg-forensic-blood-red/10 border border-forensic-blood-red/30 hover:bg-forensic-blood-red/20 transition-all duration-100"
                >
                  <X className="w-4 h-4 text-forensic-blood-red" strokeWidth={1.5} />
                </button>
              </div>
            </div>
            
            <h3 className="text-sm font-bold text-forensic-text mb-3 font-mono uppercase tracking-wide">
              {shipment.unique_id}
            </h3>
            
            <div className="space-y-2 text-xs text-forensic-text-dim">
              <div className="flex items-center gap-2">
                <Phone className="w-3 h-3" strokeWidth={1.5} />
                <span className="font-mono">{shipment.customer_phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3 h-3" strokeWidth={1.5} />
                <span className="font-mono">{shipment.lat.toFixed(4)}, {shipment.lng.toFixed(4)}</span>
              </div>
              {shipment.assigned_driver_email && (
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3" strokeWidth={1.5} />
                  <span className="font-mono text-forensic-orange">{shipment.assigned_driver_email}</span>
                </div>
              )}
              <div className="text-[10px] font-mono uppercase tracking-wide">
                RADIUS: {shipment.radius}M
              </div>
            </div>
          </Card>
        ))}
      </div>

      {shipments.length === 0 && !loading && (
        <Card className="p-12 text-center">
          <Package className="w-16 h-16 text-white/10 mx-auto mb-4" strokeWidth={1} />
          <h3 className="text-base font-bold text-forensic-text uppercase tracking-wide mb-2">NO SHIPMENTS LOGGED</h3>
          <p className="text-forensic-text-muted text-xs font-mono">CREATE FIRST SHIPMENT TO BEGIN TRACKING</p>
        </Card>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-base font-bold text-forensic-text uppercase tracking-forensic">CREATE SHIPMENT</h2>
              <button onClick={() => setShowModal(false)} className="text-forensic-text-dim hover:text-forensic-text transition-all duration-100">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-6">
              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-forensic-text-dim mb-2 uppercase tracking-wide font-mono">
                  CUSTOMER PHONE
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-transparent border-b border-white/10 text-forensic-text placeholder-forensic-text-muted font-mono text-sm focus:outline-none focus:border-forensic-orange transition-all duration-100"
                  placeholder="+91 1234567890"
                  required
                />
              </div>

              {/* Map */}
              <div>
                <label className="block text-xs font-medium text-forensic-text-dim mb-2 uppercase tracking-wide font-mono">
                  DELIVERY COORDINATES
                </label>
                <div className="h-72 overflow-hidden border border-white/10">
                  <LocationPicker position={position} setPosition={setPosition} radius={radius} />
                </div>
                {position && (
                  <p className="text-xs text-forensic-green-live mt-2 flex items-center gap-1 font-mono">
                    <Check className="w-3 h-3" strokeWidth={1.5} />
                    LOCKED: {position[0].toFixed(6)}, {position[1].toFixed(6)}
                  </p>
                )}
              </div>

              {/* Radius */}
              <div>
                <label className="block text-xs font-medium text-forensic-text-dim mb-2 uppercase tracking-wide font-mono">
                  GEOFENCE RADIUS: {radius}M
                </label>
                <input
                  type="range"
                  min="50"
                  max="500"
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Assign Driver */}
              <div>
                <label className="block text-xs font-medium text-forensic-text-dim mb-2 uppercase tracking-wide font-mono">
                  ASSIGN DELIVERY AGENT
                </label>
                <select
                  value={assignedDriver}
                  onChange={(e) => setAssignedDriver(e.target.value)}
                  className="w-full px-4 py-3 bg-forensic-bg-elevated border border-white/10 text-forensic-text font-mono text-sm focus:outline-none focus:border-forensic-orange transition-all duration-100 appearance-none cursor-pointer"
                >
                  <option value="" className="bg-forensic-bg-elevated">-- SELECT AGENT --</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.email} className="bg-forensic-bg-elevated">
                      {driver.email}
                    </option>
                  ))}
                </select>
                {drivers.length === 0 && (
                  <p className="text-[10px] text-forensic-text-muted mt-1 font-mono">NO DRIVERS REGISTERED</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-3 bg-forensic-orange/20 border border-forensic-orange/30 text-forensic-orange font-bold uppercase text-xs tracking-wide hover:bg-forensic-orange/30 hover:shadow-forensic-glow transition-all duration-100"
              >
                AUTHORIZE SHIPMENT
              </button>
            </form>
          </Card>
        </div>
      )}

      {/* QR Modal */}
      {showQRModal && qrData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-base font-bold text-forensic-text uppercase tracking-forensic">SHIPMENT QR</h2>
              <button onClick={() => setShowQRModal(false)} className="text-forensic-text-dim hover:text-forensic-text transition-all duration-100">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
            <div className="p-6 text-center">
              <img 
                src={qrData.qr_base64} 
                alt="QR Code" 
                className="mx-auto w-64 h-64 bg-white p-4 border border-white/10"
              />
              <p className="mt-4 text-xs text-forensic-text-muted break-all font-mono">
                {qrData.qr_data}
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Shipments;
