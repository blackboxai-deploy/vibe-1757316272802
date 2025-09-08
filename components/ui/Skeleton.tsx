import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'rectangular' | 'circular';
  animation?: 'pulse' | 'wave' | 'none';
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  width, 
  height,
  variant = 'rectangular',
  animation = 'pulse'
}) => {
  const baseClasses = 'bg-neutral-300 dark:bg-neutral-700';
  
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-pulse bg-gradient-to-r from-transparent via-neutral-200 dark:via-neutral-600 to-transparent bg-[length:200%_100%] animate-[wave_1.5s_ease-in-out_infinite]',
    none: ''
  };

  const variantClasses = {
    text: 'h-4 rounded',
    rectangular: 'rounded-md',
    circular: 'rounded-full'
  };

  const style: React.CSSProperties = {};
  if (width !== undefined) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height !== undefined) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
      aria-label="Loading..."
      role="status"
    />
  );
};

// Predefined skeleton components for common use cases
export const TextSkeleton: React.FC<{ lines?: number; className?: string }> = ({ 
  lines = 1, 
  className = '' 
}) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }, (_, i) => (
      <Skeleton 
        key={i} 
        variant="text" 
        width={i === lines - 1 ? '75%' : '100%'}
        className="h-4"
      />
    ))}
  </div>
);

export const CardSkeleton: React.FC<{ className?: string; showImage?: boolean }> = ({ 
  className = '', 
  showImage = true 
}) => (
  <div className={`p-4 space-y-4 ${className}`}>
    {showImage && (
      <Skeleton variant="rectangular" className="w-full h-48" />
    )}
    <div className="space-y-2">
      <Skeleton variant="text" className="h-6 w-3/4" />
      <TextSkeleton lines={2} />
    </div>
    <div className="flex justify-between items-center">
      <Skeleton variant="rectangular" className="h-8 w-20" />
      <Skeleton variant="circular" className="h-8 w-8" />
    </div>
  </div>
);

export const TableSkeleton: React.FC<{ 
  rows?: number; 
  columns?: number; 
  className?: string;
}> = ({ 
  rows = 5, 
  columns = 4, 
  className = '' 
}) => (
  <div className={`space-y-4 ${className}`}>
    {/* Table Header */}
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {Array.from({ length: columns }, (_, i) => (
        <Skeleton key={`header-${i}`} variant="text" className="h-5" />
      ))}
    </div>
    
    {/* Table Rows */}
    {Array.from({ length: rows }, (_, rowIndex) => (
      <div 
        key={`row-${rowIndex}`} 
        className="grid gap-4" 
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {Array.from({ length: columns }, (_, colIndex) => (
          <Skeleton key={`cell-${rowIndex}-${colIndex}`} variant="text" className="h-4" />
        ))}
      </div>
    ))}
  </div>
);

export const ListSkeleton: React.FC<{ 
  items?: number; 
  showAvatar?: boolean; 
  className?: string;
}> = ({ 
  items = 3, 
  showAvatar = true, 
  className = '' 
}) => (
  <div className={`space-y-4 ${className}`}>
    {Array.from({ length: items }, (_, i) => (
      <div key={i} className="flex items-center space-x-4">
        {showAvatar && (
          <Skeleton variant="circular" className="h-10 w-10 flex-shrink-0" />
        )}
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="h-4 w-1/3" />
          <Skeleton variant="text" className="h-3 w-full" />
        </div>
      </div>
    ))}
  </div>
);

// Add wave animation keyframes using CSS-in-JS approach
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes wave {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `;
  document.head.appendChild(style);
}

export default Skeleton;