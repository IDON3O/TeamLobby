
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { X, AlertCircle, CheckCircle2, Info, Lock, ShieldAlert } from 'lucide-react';

type AlertType = 'success' | 'error' | 'info' | 'confirm' | 'prompt';

interface AlertOptions {
  title?: string;
  message: string;
  type?: AlertType;
  placeholder?: string;
  confirmText?: string;
  onConfirm?: (value?: string) => void;
  onCancel?: () => void;
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  closeAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<AlertOptions | null>(null);
  const [inputValue, setInputValue] = useState('');

  const showAlert = (opts: AlertOptions) => {
    setOptions(opts);
    setInputValue('');
  };

  const closeAlert = () => {
    if (options?.onCancel) options.onCancel();
    setOptions(null);
  };

  const handleConfirm = () => {
    if (options?.onConfirm) {
      options.onConfirm(options.type === 'prompt' ? inputValue : undefined);
    }
    setOptions(null);
  };

  const Icon = () => {
    if (!options) return null;
    switch (options.type) {
      case 'success': return <CheckCircle2 className="text-green-500" size={40} />;
      case 'error': return <ShieldAlert className="text-red-500" size={40} />;
      case 'confirm': return <AlertCircle className="text-yellow-500" size={40} />;
      case 'prompt': return <Lock className="text-primary" size={40} />;
      default: return <Info className="text-primary" size={40} />;
    }
  };

  const getBorderColor = () => {
    switch (options?.type) {
      case 'success': return 'border-green-500/50 shadow-green-500/10';
      case 'error': return 'border-red-500/50 shadow-red-500/10';
      case 'confirm': return 'border-yellow-500/50 shadow-yellow-500/10';
      default: return 'border-primary/50 shadow-primary/10';
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert, closeAlert }}>
      {children}
      {options && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`bg-surface border ${getBorderColor()} w-full max-w-sm rounded-[2rem] p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200`}>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-gray-900/50 p-4 rounded-2xl">
                <Icon />
              </div>
              <div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">
                  {options.title || options.type?.toUpperCase() || 'MESSAGE'}
                </h3>
                <p className="text-gray-400 text-sm font-bold mt-1 leading-relaxed">
                  {options.message}
                </p>
              </div>
            </div>

            {options.type === 'prompt' && (
              <input
                type="password"
                autoFocus
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={options.placeholder || "Enter password..."}
                className="w-full bg-black border border-gray-800 rounded-xl py-4 px-5 text-center text-sm font-black focus:border-primary outline-none transition-all shadow-inner text-primary tracking-widest"
                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
              />
            )}

            <div className="flex gap-3">
              {(options.type === 'confirm' || options.type === 'prompt') && (
                <button
                  onClick={closeAlert}
                  className="flex-1 py-4 rounded-xl font-black text-[10px] text-gray-500 hover:bg-gray-800 transition-all uppercase tracking-widest"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleConfirm}
                className="flex-1 py-4 bg-primary text-white rounded-xl font-black text-[10px] shadow-xl shadow-primary/20 active:scale-95 transition-all uppercase tracking-[0.2em]"
              >
                {options.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) throw new Error('useAlert must be used within an AlertProvider');
  return context;
};
