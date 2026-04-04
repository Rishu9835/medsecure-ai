import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const SafeScoreGauge = ({ score, size = 'large' }) => {
  const getColor = (s) => {
    if (s >= 90) return '#22c55e';
    if (s >= 70) return '#84cc16';
    if (s >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getStatus = (s) => {
    if (s >= 90) return 'EXCELLENT';
    if (s >= 70) return 'GOOD';
    if (s >= 50) return 'WARNING';
    return 'CRITICAL';
  };

  const color = getColor(score);
  const status = getStatus(score);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  const sizeClasses = size === 'large' 
    ? 'w-32 h-32' 
    : 'w-20 h-20';
  
  const textSize = size === 'large' ? 'text-3xl' : 'text-lg';
  const statusSize = size === 'large' ? 'text-xs' : 'text-[10px]';

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${sizeClasses}`}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-white/5"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="butt"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${textSize} font-bold font-mono`} style={{ color }}>
            {score.toFixed(0)}
          </span>
          {size === 'large' && (
            <span className="text-[10px] text-forensic-text-muted font-mono">/ 100</span>
          )}
        </div>
      </div>
      <div 
        className={`mt-3 px-3 py-1 ${statusSize} font-bold tracking-forensic uppercase border`}
        style={{ 
          backgroundColor: `${color}15`, 
          color: color,
          borderColor: `${color}30`
        }}
      >
        {status}
      </div>
    </div>
  );
};

const SafeScoreCard = ({ score, issues = [], className = '' }) => {
  const getStatusIcon = (s) => {
    if (s >= 70) return <CheckCircle className="w-5 h-5 text-forensic-green-live" strokeWidth={1.5} />;
    if (s >= 50) return <AlertTriangle className="w-5 h-5 text-forensic-yellow-warn" strokeWidth={1.5} />;
    return <XCircle className="w-5 h-5 text-forensic-red-alert" strokeWidth={1.5} />;
  };

  return (
    <div className={`bg-forensic-bg-elevated border border-white/5 shadow-forensic-card overflow-hidden ${className}`}>
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-forensic-orange/10 border border-forensic-orange/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-forensic-orange" strokeWidth={1.5} />
          </div>
          <h3 className="text-sm font-bold text-forensic-text uppercase tracking-forensic">RISK INDEX</h3>
        </div>
        
        <div className="flex justify-center mb-5">
          <SafeScoreGauge score={score} size="large" />
        </div>
        
        {issues.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-forensic-text-dim uppercase tracking-wide">ISSUES DETECTED:</h4>
            {issues.map((issue, idx) => (
              <div 
                key={idx}
                className="flex items-start gap-2 p-2 bg-forensic-red-alert/10 border border-forensic-red-alert/20 text-xs text-forensic-red-alert"
              >
                <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <span className="font-mono">{issue}</span>
              </div>
            ))}
          </div>
        )}
        
        {issues.length === 0 && score >= 70 && (
          <div className="flex items-center gap-2 p-3 bg-forensic-green-live/10 border border-forensic-green-live/20 text-xs text-forensic-green-live">
            <CheckCircle className="w-3 h-3" strokeWidth={1.5} />
            <span className="font-mono uppercase tracking-wide">All parameters within safe range</span>
          </div>
        )}
      </div>
    </div>
  );
};

const SafeScoreMini = ({ score }) => {
  return (
    <div className="flex items-center gap-4 p-4 bg-forensic-bg-elevated border border-white/5 shadow-forensic-card">
      <SafeScoreGauge score={score} size="small" />
      <div>
        <p className="text-xs text-forensic-text-dim uppercase tracking-wide font-mono">RISK INDEX</p>
        <p className="text-base font-bold text-forensic-text uppercase tracking-wide mt-1">PACKAGE STATUS</p>
      </div>
    </div>
  );
};

export { SafeScoreGauge, SafeScoreCard, SafeScoreMini };
export default SafeScoreCard;
