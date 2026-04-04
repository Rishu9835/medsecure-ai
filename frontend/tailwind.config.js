/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Forensic Color System
        forensic: {
          // Backgrounds - Deep Investigation Blacks
          bg: '#0a0a0a',
          'bg-elevated': '#111111',
          'surface-low': '#0e0e0e',
          'surface': '#1a1a1a',
          'surface-high': '#2a2a2a',
          
          // Accents - Forensic Markers
          orange: '#ff5e00',
          'orange-glow': 'rgba(255, 94, 0, 0.15)',
          'blood-red': '#b91c1c',
          'sepia-warn': '#d4a373',
          
          // Text - Clinical Precision
          text: '#e5e5e5',
          'text-dim': '#9ca3af',
          'text-muted': '#6b7280',
          
          // Status Colors
          'green-live': '#22c55e',
          'yellow-warn': '#f59e0b',
          'red-alert': '#ef4444',
        }
      },
      backdropBlur: {
        xs: '2px',
        forensic: '12px',
      },
      letterSpacing: {
        'forensic': '0.15em',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in',
        'snap-in': 'snapIn 0.1s ease-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(255, 94, 0, 0.1)',
            opacity: '1' 
          },
          '50%': { 
            boxShadow: '0 0 30px rgba(255, 94, 0, 0.2)',
            opacity: '0.95' 
          },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        snapIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        }
      },
      boxShadow: {
        'forensic-glow': '0 0 20px rgba(255, 94, 0, 0.15)',
        'forensic-glow-strong': '0 0 30px rgba(255, 94, 0, 0.3)',
        'forensic-card': '0 4px 12px rgba(0, 0, 0, 0.5)',
        'forensic-float': '0 20px 50px rgba(0, 0, 0, 0.8)',
      }
    },
  },
  plugins: [],
}
