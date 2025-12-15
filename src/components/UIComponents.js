// src/components/UIComponents.js
import React from 'react';
import { ChevronLeft, Settings } from 'lucide-react';

export const Button = ({ children, onClick, variant = 'primary', className = '', disabled }) => {
  const base = "px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 select-none outline-none focus:outline-none ring-0 active:scale-95";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-200",
    outline: "bg-white border-2 border-gray-100 text-gray-700 hover:border-indigo-100 hover:text-indigo-600 shadow-sm",
    ghost: "text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 p-2",
    warning: "bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200"
  };
  return (
    <button 
        disabled={disabled} 
        onClick={onClick} 
        className={`${base} ${variants[variant]} ${className} ${disabled ? 'opacity-50 grayscale' : ''}`}
        style={{ WebkitTapHighlightColor: 'transparent' }} 
    >
        {children}
    </button>
  );
};

export const Header = ({ title, onBack, subtitle, extraLeft, onSettings }) => (
    <div className="bg-white px-4 py-4 shadow-sm border-b border-gray-100 sticky top-0 z-50 flex items-center justify-between" dir="rtl">
        <div className="flex items-center gap-3">
            {onBack && (
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                    <ChevronLeft className="transform rotate-180" size={24}/>
                </button>
            )}
            <div>
                <h2 className="font-bold text-xl text-gray-800 leading-none">{title}</h2>
                {subtitle && <p className="text-xs text-gray-400 mt-1 font-medium">{subtitle}</p>}
            </div>
        </div>
        <div className="flex items-center gap-2 pl-1">
            {extraLeft}
            {onSettings && (
                <button onClick={onSettings} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                    <Settings size={20} />
                </button>
            )}
        </div>
    </div>
);

export const SettingsModal = ({ settings, setSettings, onClose }) => {
    if (!settings.showSettings) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" dir="rtl" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Settings size={18}/> הגדרות משחק</h3>
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between mb-2">
                             <label className="text-sm font-medium text-gray-700">זמן למענה (שניות)</label>
                             <span className="font-bold text-indigo-600">{settings.timerDuration}</span>
                        </div>
                        <input 
                            type="range" min="3" max="15" 
                            value={settings.timerDuration} 
                            onChange={(e) => setSettings({...settings, timerDuration: Number(e.target.value)})}
                            className="w-full accent-indigo-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between mb-2">
                             <label className="text-sm font-medium text-gray-700">סף לחץ (שניות)</label>
                             <span className="font-bold text-red-500">{settings.panicThreshold}</span>
                        </div>
                        <input 
                            type="range" min="0.5" max="3" step="0.5"
                            value={settings.panicThreshold} 
                            onChange={(e) => setSettings({...settings, panicThreshold: Number(e.target.value)})}
                            className="w-full accent-red-500 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <p className="text-xs text-gray-400 mt-1">מתחת לזמן זה, טעות תגרור ענישה כפולה.</p>
                    </div>
                </div>
                <Button onClick={onClose} className="w-full mt-6">שמור וסגור</Button>
            </div>
        </div>
    );
};