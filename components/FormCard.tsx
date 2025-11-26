import React from 'react';

interface FormCardProps {
  title: string;
  description?: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}

export const FormCard: React.FC<FormCardProps> = ({ 
  title, 
  description, 
  required, 
  children,
  error 
}) => {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-4 transition-all duration-200 ${error ? 'border-l-4 border-l-red-500' : ''}`}>
      <div className="mb-4">
        <h3 className="text-base font-medium text-gray-900 leading-6">
          {title} {required && <span className="text-red-500 ml-1">*</span>}
        </h3>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      <div className="mt-2">
        {children}
      </div>
      {error && <p className="text-xs text-red-600 mt-2 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {error}
      </p>}
    </div>
  );
};
