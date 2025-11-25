import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress?: number;
  message?: string;
}

interface ProgressTrackerProps {
  steps: ProgressStep[];
  className?: string;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({ steps, className = '' }) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {steps.map((step, index) => (
        <motion.div
          key={step.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`flex items-center space-x-4 p-4 rounded-lg border ${
            step.status === 'completed' ? 'bg-green-50 border-green-200' :
            step.status === 'running' ? 'bg-blue-50 border-blue-200' :
            step.status === 'error' ? 'bg-red-50 border-red-200' :
            'bg-gray-50 border-gray-200'
          }`}
        >
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            step.status === 'completed' ? 'bg-green-500' :
            step.status === 'running' ? 'bg-blue-500' :
            step.status === 'error' ? 'bg-red-500' :
            'bg-gray-300'
          }`}>
            {step.status === 'completed' ? (
              <CheckCircle className="w-5 h-5 text-white" />
            ) : step.status === 'running' ? (
              <Clock className="w-5 h-5 text-white animate-spin" />
            ) : step.status === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-white" />
            ) : (
              <span className="text-white text-sm font-medium">{index + 1}</span>
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className={`font-medium ${
                step.status === 'completed' ? 'text-green-800' :
                step.status === 'running' ? 'text-blue-800' :
                step.status === 'error' ? 'text-red-800' :
                'text-gray-700'
              }`}>
                {step.label}
              </h4>
              
              {step.status === 'running' && step.progress !== undefined && (
                <span className="text-sm text-blue-600 font-medium">
                  {step.progress.toFixed(0)}%
                </span>
              )}
            </div>
            
            {step.message && (
              <p className={`text-sm mt-1 ${
                step.status === 'completed' ? 'text-green-600' :
                step.status === 'running' ? 'text-blue-600' :
                step.status === 'error' ? 'text-red-600' :
                'text-gray-500'
              }`}>
                {step.message}
              </p>
            )}
            
            {step.status === 'running' && step.progress !== undefined && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    className="bg-blue-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${step.progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};