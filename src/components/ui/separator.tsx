import React from 'react';

interface SeparatorProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export const Separator: React.FC<SeparatorProps> = ({ 
  className = '', 
  orientation = 'horizontal' 
}) => {
  return (
    <div
      className={`${
        orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full'
      } bg-gray-200 ${className}`}
    />
  );
};
