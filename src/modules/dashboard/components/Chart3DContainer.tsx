import React from 'react';
import { motion } from 'framer-motion';

interface Chart3DContainerProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const Chart3DContainer: React.FC<Chart3DContainerProps> = ({
  title,
  children,
  className = ''
}) => {
  return (
    <motion.div
      className={`bg-white rounded-lg border shadow-sm ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      </div>
      <div className="p-6">
        {children}
      </div>
    </motion.div>
  );
};