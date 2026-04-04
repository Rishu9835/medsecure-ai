const Card = ({ children, className = '', glow = false, hover = true }) => {
  return (
    <div
      className={`
        bg-forensic-bg-elevated
        backdrop-blur-forensic
        border border-white/5
        shadow-forensic-card
        transition-all duration-100
        ${glow ? 'shadow-forensic-glow-strong animate-pulse-glow' : ''} 
        ${hover ? 'hover:bg-forensic-surface hover:shadow-forensic-glow hover:-translate-y-0.5' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default Card;
