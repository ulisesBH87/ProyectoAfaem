import React from 'react';

const Skeleton = ({ width, height, borderRadius = 'var(--radius-md)', className = '' }) => {
  return (
    <div 
      className={`skeleton ${className}`} 
      style={{ 
        width: width || '100%', 
        height: height || '20px', 
        borderRadius 
      }} 
    />
  );
};

export const SkeletonCircle = ({ size = '40px', className = '' }) => (
  <Skeleton width={size} height={size} borderRadius="50%" className={className} />
);

export const SkeletonText = ({ lines = 3, className = '' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    {[...Array(lines)].map((_, i) => (
      <Skeleton key={i} width={i === lines - 1 ? '70%' : '100%'} height="12px" className={className} />
    ))}
  </div>
);

export default Skeleton;
