import React, { useState } from 'react';
import { BookOpen, Gamepad2, ClipboardList, TrendingUp, Settings, Volume2, VolumeX, Vibrate, VibrateOff, Trash2, Mail, X, LogOut, RefreshCcw, User } from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';

export default function DashboardView({ setView, user }) {
    const [showSettings, setShowSettings] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    
    const { 
        globalSettings, toggleGlobalSetting, // שליטה על מיוט ראשי ורטט
        audioSettings, toggleSetting, // שליטה על מהירות קול
        availableVoices, selectedVoice, setSelectedVoice // שליטה על סוג הקול
    } = useAudio();

    // --- לוגיקה ---

    const handleLogout = () => {
        // מחיקת שם המשתמש בלבד - לא נוגע בהתקדמות
        if (window.confirm(`האם להחליף את המשתמש "${user}"?`)) {
            localStorage.removeItem('vocab_user_name');
            window.location.reload(); 
        }
    };

    const handleResetSettings = () => {
        const confirmMessage = 
            "פעולה זו תאפס את כל ההגדרות:\n" +
            "• הגדרות סאונד וקול (TTS)\n" +
            "• הגדרות כל המשחקים (זמן, כמות מילים)\n\n" +
            "האם להמשיך?";

        if (window.confirm(confirmMessage)) {
            
            // המשתנים שאנחנו רוצים להגן עליהם ממחיקה
            const keysToKeep = [
                'vocab_user_name',        // המשתמש
                'vocab_offline_progress', // הניקוד והמילים
                'vocab_words'
            ];

            // שלב 1: מחיקה ישירה מהזיכרון (בלי לשנות State של React!)
            Object.keys(localStorage).forEach(key => {
                if (!keysToKeep.includes(key)) {
                    localStorage.removeItem(key);
                }
            });

            // שלב 2: רענון מיידי
            // אנחנו לא נותנים ל-React זמן להפעיל useEffects ולשמור דברים מחדש
            window.location.reload();
        }
    };

    const handleHardReset = () => {
        // מחיקה מוחלטת
        localStorage.clear();
        window.location.reload();
    };

    // --- רכיבים ---

    const SettingRow = ({ icon: Icon, label, value, onClick, color = "indigo" }) => (
        <button onClick={onClick} className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 active:scale-95 transition-all">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${value ? `bg-${color}-100 text-${color}-600` : 'bg-gray-200 text-gray-400'}`}>
                    <Icon size={20} />
                </div>
                <span className={`font-bold ${value ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
            </div>
            <div className={`w-12 h-6 rounded-full relative transition-colors ${value ? `bg-${color}-500` : 'bg-gray-300'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${value ? 'left-1' : 'right-1'}`} />
            </div>
        </button>
    );

    const MenuCard = ({ icon: Icon, title, subtitle, color, onClick }) => (
        <button onClick={onClick} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform h-40 w-full outline-none">
            <div className={`p-4 rounded-full bg-${color}-50`}><Icon size={32} className={`text-${color}-600`} /></div>
            <div className="text-center"><h3 className="font-bold text-gray-800 text-lg">{title}</h3><p className="text-gray-400 text-xs mt-1">{subtitle}</p></div>
        </button>
    );

    return (
        <div className="h-[100dvh] bg-gray-50 flex flex-col font-sans" dir="rtl">
            {/* Header */}
            <div className="bg-white p-6 pt-12 pb-6 shadow-sm border-b border-gray-100 sticky top-0 z-10">
                <div className="flex justify-between items-center mb-4">
                    <div><h1 className="text-2xl font-bold text-gray-800">שלום, {user}</h1><p className="text-gray-400 text-sm">המשימה: 700 מילים</p></div>
                    <button onClick={() => setShowSettings(true)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <Settings size={28} className="text-gray-400" />
                    </button>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden"><div className="bg-indigo-600 h-full w-[10%] rounded-full shadow-[0_0_10px_rgba(79,70,229,0.3)]"></div></div>
            </div>

            {/* Menu Grid */}
            <div className="flex-1 p-6 overflow-y-auto flex flex-col">
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <MenuCard icon={BookOpen} title="מאגר מילים" subtitle="כל הרשימה" color="indigo" onClick={() => setView('WORD_BANK')}/>
                    <MenuCard icon={Gamepad2} title="מבדקים" subtitle="בחן את עצמך" color="indigo" onClick={() => setView('GAMES_MENU')}/>
                    <MenuCard icon={ClipboardList} title="משימות" subtitle="תרגול וייצוא" color="indigo" onClick={() => setView('TASKS')}/>
                    <MenuCard icon={TrendingUp} title="התקדמות" subtitle="ניהול ידע" color="indigo" onClick={() => setView('PROGRESS')}/>
                </div>
                <div className="mt-auto pt-4 text-center">
                    <p className="text-[10px] text-gray-300">גרסה 5.0 • נבנה באהבה והשקעה</p>
                    <p className="text-xs text-gray-400 font-medium mt-1">✨ שכוייח לעויזר, אהרן, וג'מיני</p>
                </div>
            </div>

            {/* --- Settings Modal --- */}
            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full sm:max-w-sm h-[90vh] sm:h-auto sm:rounded-3xl rounded-t-[2rem] shadow-2xl flex flex-col overflow-hidden">
                        
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <Settings className="text-indigo-600" /> הגדרות
                            </h2>
                            <button onClick={() => setShowSettings(false)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"><X size={20}/></button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            
                            {/* 1. Account (Top) */}
                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white p-2 rounded-full text-indigo-600"><User size={20}/></div>
                                    <span className="font-bold text-indigo-900">{user}</span>
                                </div>
                                <button onClick={handleLogout} className="text-sm font-bold text-indigo-600 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-indigo-100 hover:bg-indigo-50 transition-colors flex items-center gap-1">
                                    <LogOut size={14}/> החלף משתמש
                                </button>
                            </div>

                            {/* 2. Global Master Switches */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-gray-400">שמע ורטט (כללי)</h3>
                                <SettingRow 
                                    icon={globalSettings.isMuted ? VolumeX : Volume2} 
                                    label="שמע ראשי" 
                                    value={!globalSettings.isMuted} 
                                    onClick={() => toggleGlobalSetting('isMuted')}
                                    color="green"
                                />
                                <SettingRow 
                                    icon={globalSettings.isVibrationEnabled ? Vibrate : VibrateOff} 
                                    label="רטט" 
                                    value={globalSettings.isVibrationEnabled} 
                                    onClick={() => toggleGlobalSetting('isVibrationEnabled')}
                                    color="orange"
                                />
                            </div>

                            {/* 3. Voice Settings (Details only) */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-gray-400">אפשרויות הקראה (TTS)</h3>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4">
                                    {/* Voice Selector */}
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 block mb-2">סגנון קול / מבטא</label>
                                        <select 
                                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 outline-none focus:border-indigo-500"
                                            value={selectedVoice ? selectedVoice.name : ''}
                                            onChange={(e) => {
                                                const voice = availableVoices.find(v => v.name === e.target.value);
                                                setSelectedVoice(voice);
                                            }}
                                        >
                                            {availableVoices.map(v => (
                                                <option key={v.name} value={v.name}>{v.name.replace('Microsoft ', '').replace('Google ', '')}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Speed Slider */}
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-xs font-bold text-gray-500">מהירות הקראה</label>
                                            <span className="text-xs font-bold text-indigo-600">x{audioSettings.voiceSpeed}</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="0.5" 
                                            max="2.0" 
                                            step="0.1" 
                                            value={audioSettings.voiceSpeed} 
                                            onChange={(e) => toggleSetting('voiceSpeed', parseFloat(e.target.value))} 
                                            className="w-full accent-indigo-600"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 4. Actions & Feedback */}
                            <div className="space-y-3 pt-2 border-t border-gray-100">
                                <button onClick={handleResetSettings} className="w-full flex items-center gap-3 p-3 text-gray-500 font-bold justify-start hover:bg-gray-50 rounded-lg transition-colors text-sm">
                                    <RefreshCcw size={18} /> שחזר הגדרות ברירת מחדל
                                </button>

                                <a href="mailto:oyzerim@gmail.com?subject=VocabMaster - משוב משתמש ודיווח תקלה" className="w-full flex items-center gap-3 p-3 text-indigo-600 font-bold justify-start hover:bg-indigo-50 rounded-lg transition-colors text-sm">
                                    <Mail size={18} /> משוב ודיווח
                                </a>
                            </div>

                            {/* 5. Hard Reset (Separated) */}
                            <div className="pt-6 mt-4 border-t border-gray-100">
                                <button onClick={() => setShowResetConfirm(true)} className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 rounded-xl font-bold active:scale-95 transition-transform hover:bg-red-100">
                                    <Trash2 size={20} /> איפוס נתונים מלא
                                </button>
                                <p className="text-xs text-center text-gray-400 mt-2">מוחק את כל ההיסטוריה והניקוד לצמיתות</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Hard Reset Confirmation Modal --- */}
            {showResetConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in zoom-in duration-200">
                    <div className="bg-white w-full max-w-xs rounded-2xl p-6 shadow-2xl text-center">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">מחיקת נתונים מלאה</h3>
                        <p className="text-gray-500 text-sm mb-6">פעולה זו תמחק את כל המילים שלמדת, הניקוד וההיסטוריה. לא ניתן לשחזר את המידע.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl">ביטול</button>
                            <button onClick={handleHardReset} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-200">כן, מחק הכל</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}