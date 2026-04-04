import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin, signup as apiSignup } from '../api';
import { Shield, Lock, AlertTriangle } from 'lucide-react';

// Interactive Grid Background Component
const GridBackground = () => {
  const canvasRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const gridSize = 40;
    const glowRadius = 150;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      for (let x = 0; x < canvas.width; x += gridSize) {
        for (let y = 0; y < canvas.height; y += gridSize) {
          const dx = x - mousePos.x;
          const dy = y - mousePos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Calculate glow intensity based on distance
          let alpha = 0.08;
          let size = 1;
          
          if (distance < glowRadius) {
            const intensity = 1 - (distance / glowRadius);
            alpha = 0.08 + (intensity * 0.5);
            size = 1 + (intensity * 2);
          }

          // Draw grid point
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 94, 0, ${alpha})`;
          ctx.fill();

          // Draw glow effect for nearby points
          if (distance < glowRadius) {
            const glowIntensity = 1 - (distance / glowRadius);
            ctx.beginPath();
            ctx.arc(x, y, size + 4, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 94, 0, ${glowIntensity * 0.3})`;
            ctx.fill();
          }
        }
      }

      // Draw connecting lines near cursor
      ctx.strokeStyle = 'rgba(255, 94, 0, 0.1)';
      ctx.lineWidth = 0.5;
      
      for (let x = 0; x < canvas.width; x += gridSize) {
        for (let y = 0; y < canvas.height; y += gridSize) {
          const dx = x - mousePos.x;
          const dy = y - mousePos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < glowRadius * 0.8) {
            const intensity = 1 - (distance / (glowRadius * 0.8));
            ctx.strokeStyle = `rgba(255, 94, 0, ${intensity * 0.2})`;
            
            // Draw lines to adjacent points
            if (x + gridSize < canvas.width) {
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(x + gridSize, y);
              ctx.stroke();
            }
            if (y + gridSize < canvas.height) {
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(x, y + gridSize);
              ctx.stroke();
            }
          }
        }
      }
    };

    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseLeave = () => {
      setMousePos({ x: -1000, y: -1000 });
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const animate = () => {
      draw();
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [mousePos]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: 'transparent' }}
    />
  );
};

const Login = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('driver');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        await apiSignup(email, password, role);
      }
      
      const response = await apiLogin(email, password);
      login(response.data.access_token, response.data.role, email);
      
      if (response.data.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/driver');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-forensic-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Interactive Grid Background with Hover Glow */}
      <GridBackground />

      {/* Grain texture overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay z-[1]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='3.5' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Status Indicators (Top Corner) - hidden on very small screens */}
      <div className="fixed top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2 sm:gap-3 z-10">
        <div className="w-2 h-2 bg-forensic-orange animate-pulse shadow-forensic-glow"></div>
        <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-forensic-text-muted hidden sm:block">
          SIGNAL_ACQUIRED // PORT:8080
        </span>
      </div>

      {/* Metadata (Top Right) - hidden on mobile */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 items-center gap-4 z-10 hidden md:flex">
        <div className="text-right">
          <div className="font-mono text-[10px] text-forensic-text-muted uppercase tracking-wide">GEO_LOCK: LAT 21.7128° N</div>
          <div className="font-mono text-[10px] text-forensic-text-muted uppercase tracking-wide">STATUS: ENCRYPTED_LINK_ESTABLISHED</div>
        </div>
        <Shield className="w-5 h-5 text-forensic-orange" strokeWidth={1.5} />
      </div>

      {/* Footer Metadata - hidden on mobile */}
      <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 font-mono text-[9px] sm:text-[10px] text-forensic-text-muted uppercase tracking-wide hidden sm:block">
        ©2026 LOGICX // CLASSIFIED_FORENSICS
      </div>

      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 font-mono text-[9px] sm:text-[10px] text-forensic-text-muted uppercase tracking-wide hidden sm:block">
        ENCRYPTION_MODE // DATA_CUSTODY
      </div>

      {/* Main Content */}
      <div className="relative w-full max-w-md z-20">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-forensic-orange/10 border border-forensic-orange/30 mb-4">
            <Shield className="w-9 h-9 text-forensic-orange" strokeWidth={1.5} />
          </div>
          <h1 className="text-xl font-bold text-forensic-text uppercase tracking-forensic mb-1">MEDSECURE</h1>
          <p className="text-forensic-text-dim text-xs uppercase tracking-wide font-mono">INVESTIGATIVE_UNIT</p>
        </div>

        {/* Form Container */}
        <div className="bg-forensic-bg-elevated border border-white/10 shadow-forensic-float p-6 sm:p-8">
          {/* Orange accent border */}
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-forensic-orange to-transparent opacity-30"></div>
          
          <h2 className="text-base font-bold text-forensic-text mb-2 uppercase tracking-forensic">
            SECURE_AUTHENTICATION
          </h2>
          <p className="text-xs text-forensic-orange uppercase tracking-wide font-mono mb-6">
            FIELD_AGENT_ACCESS_ONLY
          </p>

          {error && (
            <div className="bg-forensic-blood-red/10 border border-forensic-blood-red/30 p-3 mb-6 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-forensic-blood-red flex-shrink-0 mt-0.5" strokeWidth={1.5} />
              <span className="text-forensic-blood-red text-xs font-mono">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div>
              <label className="block text-forensic-text-dim text-xs mb-2 uppercase tracking-wide font-mono">
                AGENT_ID
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-forensic-orange/10 border border-forensic-orange/30 flex items-center justify-center">
                  <span className="text-forensic-orange text-[10px] font-mono">@</span>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-b border-white/10 pl-12 pr-3 py-3 text-forensic-text placeholder-forensic-text-muted font-mono text-sm focus:outline-none focus:border-forensic-orange transition-all duration-100"
                  placeholder="ENTER_UID"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-forensic-text-dim text-xs mb-2 uppercase tracking-wide font-mono">
                PASSCODE
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-forensic-orange/10 border border-forensic-orange/30 flex items-center justify-center">
                  <Lock className="w-3 h-3 text-forensic-orange" strokeWidth={1.5} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border-b border-white/10 pl-12 pr-3 py-3 text-forensic-text placeholder-forensic-text-muted font-mono text-sm focus:outline-none focus:border-forensic-orange transition-all duration-100"
                  placeholder="••••••••••"
                  required
                />
              </div>
            </div>

            {/* Role Selection (Signup Only) */}
            {isSignup && (
              <div>
                <label className="block text-forensic-text-dim text-xs mb-2 uppercase tracking-wide font-mono">
                  CLEARANCE_LEVEL
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('driver')}
                    className={`flex-1 py-2.5 px-3 border text-xs uppercase tracking-wide font-mono transition-all duration-100 ${
                      role === 'driver'
                        ? 'bg-forensic-orange/20 border-forensic-orange/30 text-forensic-orange'
                        : 'bg-transparent border-white/10 text-forensic-text-dim hover:border-white/20'
                    }`}
                  >
                    DRIVER_UNIT
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`flex-1 py-2.5 px-3 border text-xs uppercase tracking-wide font-mono transition-all duration-100 ${
                      role === 'admin'
                        ? 'bg-forensic-orange/20 border-forensic-orange/30 text-forensic-orange'
                        : 'bg-transparent border-white/10 text-forensic-text-dim hover:border-white/20'
                    }`}
                  >
                    ADMIN_UNIT
                  </button>
                </div>
              </div>
            )}

            {/* Verification Checkboxes */}
            <div className="space-y-2 py-3 border-t border-white/5">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 border border-forensic-orange/30 bg-forensic-orange/10 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-forensic-orange"></div>
                </div>
                <span className="text-forensic-text-dim uppercase tracking-wide font-mono">VERIFYING_CREDENTIALS</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 border border-forensic-green-live/30 bg-forensic-green-live/10 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-forensic-green-live"></div>
                </div>
                <span className="text-forensic-text-dim uppercase tracking-wide font-mono">SESSION_HASH_X</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-forensic-orange/20 border border-forensic-orange/30 text-forensic-orange py-3.5 px-4 uppercase text-xs tracking-wide font-bold hover:bg-forensic-orange/30 hover:shadow-forensic-glow transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'AUTHENTICATING...' : (isSignup ? 'AUTHORIZE_ACCESS' : 'AUTHORIZE_ACCESS')}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-forensic-bg-elevated px-2 text-forensic-text-muted font-mono uppercase tracking-wide">
                OR
              </span>
            </div>
          </div>

          {/* Toggle Mode */}
          <div className="text-center">
            <button
              onClick={() => setIsSignup(!isSignup)}
              className="text-xs text-forensic-text-dim hover:text-forensic-orange font-mono uppercase tracking-wide transition-all duration-100"
            >
              {isSignup ? 'EXISTING_AGENT_LOGIN' : 'NEW_AGENT_REGISTRATION'}
            </button>
          </div>

          {/* Biometric Notice */}
          <div className="mt-6 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 text-[10px] text-forensic-text-muted font-mono uppercase tracking-wide">
              <div className="w-1.5 h-1.5 bg-forensic-orange animate-pulse"></div>
              <span>BIOMETRIC_SCAN: REQUIRED</span>
            </div>
          </div>
        </div>

        {/* Emergency Override Link */}
        <div className="flex justify-between items-center mt-6 text-[10px] font-mono uppercase tracking-wide">
          <button className="text-forensic-text-muted hover:text-forensic-orange transition-all duration-100">
            EMERGENCY_OVERRIDE
          </button>
          <button className="text-forensic-text-muted hover:text-forensic-orange transition-all duration-100">
            CONTACT_HQ
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
