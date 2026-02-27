import React from 'react';
import '../styles/dashboard.css';

const StatCard = ({ 
  icon, 
  iconType = 'primary', 
  title, 
  value, 
  change = null, 
  isPositive = true,
  onClick = null 
}) => {
  return (
    <div className="stat-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="stat-card-header">
        <div className={`stat-card-icon ${iconType}`}>{icon}</div>
      </div>
      <p className="stat-card-title">{title}</p>
      <h3 className="stat-card-value">{value}</h3>
      {change && (
        <p className={`stat-card-change ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? '📈' : '📉'} {change}
        </p>
      )}
    </div>
  );
};

export default StatCard;
