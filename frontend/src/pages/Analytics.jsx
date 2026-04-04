import { useState, useEffect } from 'react';
import Card from '../components/Card';
import { getAnalytics } from '../api';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  Thermometer,
  Droplets,
  AlertTriangle,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

// Forensic color palette - MAXIMUM contrast for dark backgrounds
const COLORS = {
  pending: '#fbbf24',     // Bright amber/gold (high visibility)
  in_transit: '#ff5e00',  // Forensic orange (signature color)
  delivered: '#10b981'    // Bright emerald green (high visibility)
};

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const res = await getAnalytics();
      setAnalytics(res.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-forensic-orange animate-spin" strokeWidth={1.5} />
      </div>
    );
  }

  const pieData = [
    { name: 'PENDING', value: analytics?.pending || 0, color: COLORS.pending },
    { name: 'IN TRANSIT', value: analytics?.in_transit || 0, color: COLORS.in_transit },
    { name: 'DELIVERED', value: analytics?.delivered || 0, color: COLORS.delivered },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-4 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-forensic-text uppercase tracking-forensic">ANALYTICS</h1>
          <p className="text-xs text-forensic-text-dim font-mono mt-1 tracking-wide uppercase">
            DATA ANALYSIS // PATTERN RECOGNITION
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-4 py-2 bg-forensic-orange/20 text-forensic-orange border border-forensic-orange/30 hover:bg-forensic-orange/30 hover:shadow-forensic-glow transition-all duration-100 uppercase text-xs tracking-wide font-medium self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
          REFRESH
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-forensic-text-dim uppercase tracking-wide font-mono">TOTAL SHIPMENTS</p>
              <p className="text-2xl font-bold text-forensic-text mt-1 font-mono">{analytics?.total_shipments || 0}</p>
            </div>
            <div className="w-12 h-12 bg-forensic-orange/10 border border-forensic-orange/30 flex items-center justify-center">
              <Package className="w-6 h-6 text-forensic-orange" strokeWidth={1.5} />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-forensic-text-dim uppercase tracking-wide font-mono">PENDING</p>
              <p className="text-2xl font-bold text-forensic-text mt-1 font-mono">{analytics?.pending || 0}</p>
            </div>
            <div className="w-12 h-12 bg-forensic-sepia-warn/10 border border-forensic-sepia-warn/30 flex items-center justify-center">
              <Clock className="w-6 h-6 text-forensic-sepia-warn" strokeWidth={1.5} />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-forensic-text-dim uppercase tracking-wide font-mono">IN TRANSIT</p>
              <p className="text-2xl font-bold text-forensic-text mt-1 font-mono">{analytics?.in_transit || 0}</p>
            </div>
            <div className="w-12 h-12 bg-forensic-orange/10 border border-forensic-orange/30 flex items-center justify-center">
              <Truck className="w-6 h-6 text-forensic-orange" strokeWidth={1.5} />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-forensic-text-dim uppercase tracking-wide font-mono">DELIVERED</p>
              <p className="text-2xl font-bold text-forensic-text mt-1 font-mono">{analytics?.delivered || 0}</p>
            </div>
            <div className="w-12 h-12 bg-forensic-green-live/10 border border-forensic-green-live/30 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-forensic-green-live" strokeWidth={1.5} />
            </div>
          </div>
        </Card>
      </div>

      {/* Sensor Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-forensic-text-dim uppercase tracking-wide font-mono">AVG THERMAL</p>
              <p className="text-2xl font-bold text-forensic-text mt-1 font-mono">{analytics?.avg_temperature || 0}°C</p>
            </div>
            <div className="w-12 h-12 bg-forensic-orange/10 border border-forensic-orange/30 flex items-center justify-center">
              <Thermometer className="w-6 h-6 text-forensic-orange" strokeWidth={1.5} />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-forensic-text-dim uppercase tracking-wide font-mono">AVG HUMIDITY</p>
              <p className="text-2xl font-bold text-forensic-text mt-1 font-mono">{analytics?.avg_humidity || 0}%</p>
            </div>
            <div className="w-12 h-12 bg-forensic-sepia-warn/10 border border-forensic-sepia-warn/30 flex items-center justify-center">
              <Droplets className="w-6 h-6 text-forensic-sepia-warn" strokeWidth={1.5} />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-forensic-text-dim uppercase tracking-wide font-mono">SHOCK EVENTS</p>
              <p className="text-2xl font-bold text-forensic-text mt-1 font-mono">{analytics?.shock_alerts || 0}</p>
            </div>
            <div className="w-12 h-12 bg-forensic-blood-red/10 border border-forensic-blood-red/30 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-forensic-blood-red" strokeWidth={1.5} />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Temperature & Humidity Chart */}
        <Card className="p-6">
          <h2 className="text-sm font-bold text-forensic-text mb-4 uppercase tracking-forensic border-b border-white/5 pb-3">
            THERMAL & HUMIDITY HISTORY
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.sensor_history || []}>
                <defs>
                  <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff5e00" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ff5e00" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="humidGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d4a373" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#d4a373" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="0" stroke="#ffffff" opacity={0.05} />
                <XAxis 
                  dataKey="timestamp" 
                  tick={{ fontSize: 10, fill: '#9ca3af', fontFamily: 'monospace' }} 
                  stroke="#ffffff"
                  strokeOpacity={0.1}
                />
                <YAxis 
                  tick={{ fill: '#9ca3af', fontFamily: 'monospace', fontSize: 10 }} 
                  stroke="#ffffff"
                  strokeOpacity={0.1}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111111',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0px',
                    color: '#e5e5e5',
                    fontFamily: 'monospace',
                    fontSize: '11px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="temperature"
                  stroke="#ff5e00"
                  strokeWidth={1.5}
                  fill="url(#tempGradient)"
                  name="Temperature (°C)"
                />
                <Area
                  type="monotone"
                  dataKey="humidity"
                  stroke="#d4a373"
                  strokeWidth={1.5}
                  fill="url(#humidGradient)"
                  name="Humidity (%)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Shipment Status Pie */}
        <Card className="p-6">
          <h2 className="text-sm font-bold text-forensic-text mb-4 uppercase tracking-forensic border-b border-white/5 pb-3">
            SHIPMENT STATUS DISTRIBUTION
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  fill="#8884d8"
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value, cx, cy, midAngle, innerRadius, outerRadius }) => {
                    const RADIAN = Math.PI / 180;
                    const radius = outerRadius + 25;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    return (
                      <text 
                        x={x} 
                        y={y} 
                        fill="#e5e5e5" 
                        textAnchor={x > cx ? 'start' : 'end'} 
                        dominantBaseline="central"
                        style={{ 
                          fontSize: '12px', 
                          fontFamily: 'monospace', 
                          fontWeight: 'bold',
                          textTransform: 'uppercase'
                        }}
                      >
                        {`${name}: ${value}`}
                      </text>
                    );
                  }}
                  labelLine={{
                    stroke: '#ffffff',
                    strokeWidth: 1,
                    strokeOpacity: 0.3
                  }}
                >
                  {pieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      stroke="#0a0a0a" 
                      strokeWidth={4}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#111111',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '0px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    padding: '8px 12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
                  }}
                  itemStyle={{
                    color: '#e5e5e5',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}
                  labelStyle={{
                    color: '#e5e5e5',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    marginBottom: '4px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {pieData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 border border-white/30" 
                  style={{ backgroundColor: entry.color }} 
                />
                <span className="text-xs text-forensic-text uppercase tracking-wide font-mono font-medium">
                  {entry.name}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Shock History */}
      <Card className="p-6">
        <h2 className="text-sm font-bold text-forensic-text mb-4 uppercase tracking-forensic border-b border-white/5 pb-3">
          SEISMIC ACTIVITY LOG
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics?.sensor_history || []}>
              <CartesianGrid strokeDasharray="0" stroke="#ffffff" opacity={0.05} />
              <XAxis 
                dataKey="timestamp" 
                tick={{ fontSize: 10, fill: '#9ca3af', fontFamily: 'monospace' }} 
                stroke="#ffffff"
                strokeOpacity={0.1}
              />
              <YAxis 
                tick={{ fill: '#9ca3af', fontFamily: 'monospace', fontSize: 10 }} 
                stroke="#ffffff"
                strokeOpacity={0.1}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111111',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '0px',
                  color: '#e5e5e5',
                  fontFamily: 'monospace',
                  fontSize: '11px'
                }}
              />
              <Bar dataKey="shock" fill="#b91c1c" name="Shock (g)" radius={[0, 0, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default Analytics;
