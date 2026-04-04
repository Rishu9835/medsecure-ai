import { useEffect, useRef } from 'react';
import L from 'leaflet';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Create icons lazily to avoid issues
const createBoxIcon = () => L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const createTargetIcon = () => L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const LiveMap = ({ 
  boxPosition, 
  targetPosition,
  deliveryPosition,
  radius,
  geofenceRadius,
  onMapClick, 
  clickable = false,
  height = '400px' 
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const boxMarkerRef = useRef(null);
  const targetMarkerRef = useRef(null);
  const circleRef = useRef(null);

  // Use delivery position/geofence radius as aliases
  const effectiveTargetPosition = targetPosition || deliveryPosition;
  const effectiveRadius = radius || geofenceRadius;

  // Initialize map and add delivery marker immediately
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    
    // Determine initial center - prefer delivery position since it's always available
    let initialCenter = [28.6139, 77.2090];
    let initialZoom = 14;
    
    if (effectiveTargetPosition && Array.isArray(effectiveTargetPosition) && effectiveTargetPosition.length === 2) {
      initialCenter = effectiveTargetPosition;
      initialZoom = 15;
    } else if (boxPosition && Array.isArray(boxPosition) && boxPosition.length === 2) {
      initialCenter = boxPosition;
      initialZoom = 15;
    }
    
    mapInstanceRef.current = L.map(mapRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: true
    });
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(mapInstanceRef.current);

    if (clickable && onMapClick) {
      mapInstanceRef.current.on('click', (e) => {
        onMapClick([e.latlng.lat, e.latlng.lng]);
      });
    }

    // Add delivery marker immediately if available
    if (effectiveTargetPosition && Array.isArray(effectiveTargetPosition) && effectiveTargetPosition.length === 2) {
      targetMarkerRef.current = L.marker(effectiveTargetPosition, { icon: createTargetIcon() })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<div style="font-family: monospace; font-size: 11px; color: #333;"><b style="color: #22c55e;">🎯 DELIVERY ZONE</b><br>LAT: ${effectiveTargetPosition[0].toFixed(6)}<br>LNG: ${effectiveTargetPosition[1].toFixed(6)}${effectiveRadius ? `<br>RADIUS: ${effectiveRadius}M` : ''}</div>`);
      
      // Add geofence circle
      if (effectiveRadius) {
        circleRef.current = L.circle(effectiveTargetPosition, {
          color: '#22c55e',
          fillColor: '#22c55e',
          fillOpacity: 0.15,
          weight: 2,
          dashArray: '5, 5',
          radius: effectiveRadius
        }).addTo(mapInstanceRef.current);
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        boxMarkerRef.current = null;
        targetMarkerRef.current = null;
        circleRef.current = null;
      }
    };
  }, []);  // Only run once on mount

  // Update delivery marker and geofence when props change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (!effectiveTargetPosition || !Array.isArray(effectiveTargetPosition) || effectiveTargetPosition.length !== 2) return;
    if (isNaN(effectiveTargetPosition[0]) || isNaN(effectiveTargetPosition[1])) return;

    try {
      if (targetMarkerRef.current) {
        targetMarkerRef.current.setLatLng(effectiveTargetPosition);
      } else {
        targetMarkerRef.current = L.marker(effectiveTargetPosition, { icon: createTargetIcon() })
          .addTo(mapInstanceRef.current)
          .bindPopup(`<div style="font-family: monospace; font-size: 11px; color: #333;"><b style="color: #22c55e;">🎯 DELIVERY ZONE</b><br>LAT: ${effectiveTargetPosition[0].toFixed(6)}<br>LNG: ${effectiveTargetPosition[1].toFixed(6)}${effectiveRadius ? `<br>RADIUS: ${effectiveRadius}M` : ''}</div>`);
      }

      if (effectiveRadius) {
        if (circleRef.current) {
          circleRef.current.setLatLng(effectiveTargetPosition);
          circleRef.current.setRadius(effectiveRadius);
        } else {
          circleRef.current = L.circle(effectiveTargetPosition, {
            color: '#22c55e',
            fillColor: '#22c55e',
            fillOpacity: 0.15,
            weight: 2,
            dashArray: '5, 5',
            radius: effectiveRadius
          }).addTo(mapInstanceRef.current);
        }
      }
      
      // Center on delivery if no box position yet
      if (!boxPosition) {
        mapInstanceRef.current.setView(effectiveTargetPosition, 15);
      }
    } catch (err) {
      console.error('Error updating delivery marker:', err);
    }
  }, [effectiveTargetPosition, effectiveRadius]);

  // Update box marker (ESP32 live location)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (!boxPosition || !Array.isArray(boxPosition) || boxPosition.length !== 2) return;
    if (isNaN(boxPosition[0]) || isNaN(boxPosition[1])) return;

    try {
      if (boxMarkerRef.current) {
        boxMarkerRef.current.setLatLng(boxPosition);
      } else {
        boxMarkerRef.current = L.marker(boxPosition, { icon: createBoxIcon() })
          .addTo(mapInstanceRef.current)
          .bindPopup(`<div style="font-family: monospace; font-size: 11px; color: #333;"><b style="color: #ff5e00;">📦 BOX LIVE LOCATION</b><br>LAT: ${boxPosition[0].toFixed(6)}<br>LNG: ${boxPosition[1].toFixed(6)}</div>`);
      }
      
      // Fit bounds to show both markers
      if (effectiveTargetPosition && Array.isArray(effectiveTargetPosition) && effectiveTargetPosition.length === 2) {
        const bounds = L.latLngBounds([boxPosition, effectiveTargetPosition]);
        mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
      } else {
        mapInstanceRef.current.setView(boxPosition, 15);
      }
    } catch (err) {
      console.error('Error updating box marker:', err);
    }
  }, [boxPosition, effectiveTargetPosition]);

  return (
    <div 
      ref={mapRef} 
      style={{ height, width: '100%' }}
      className="border border-white/10"
    />
  );
};

export default LiveMap;
