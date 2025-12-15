import React from 'react';
import { BookOpen, Gamepad2, ClipboardList, TrendingUp, Settings } from 'lucide-react';

export default function DashboardView({ setView, user }) {
    const MenuCard = ({ icon: Icon, title, subtitle, color, onClick }) => (
        <button onClick={onClick} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform h-40 w-full outline-none">
            <div className={`p-4 rounded-full bg-${color}-50`}><Icon size={32} className={`text-${color}-600`} /></div>
            <div className="text-center"><h3 className="font-bold text-gray-800 text-lg">{title}</h3><p className="text-gray-400 text-xs mt-1">{subtitle}</p></div>
        </button>
    );

    return (
        <div className="h-[100dvh] bg-gray-50 flex flex-col font-sans" dir="rtl">
            <div className="bg-white p-6 pt-12 pb-6 shadow-sm border-b border-gray-100 sticky top-0 z-10">
                <div className="flex justify-between items-center mb-4">
                    <div><h1 className="text-2xl font-bold text-gray-800">שלום, {user}</h1><p className="text-gray-400 text-sm">המשימה: 700 מילים</p></div>
                    <Settings size={28} className="text-gray-300"/>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden"><div className="bg-indigo-600 h-full w-[10%] rounded-full shadow-[0_0_10px_rgba(79,70,229,0.3)]"></div></div>
            </div>
            <div className="flex-1 p-6 overflow-y-auto flex flex-col">
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <MenuCard icon={BookOpen} title="מאגר מילים" subtitle="כל הרשימה" color="indigo" onClick={() => setView('WORD_BANK')}/>
                    <MenuCard icon={Gamepad2} title="מבדקים" subtitle="בחן את עצמך" color="indigo" onClick={() => setView('GAMES_MENU')}/>
                    <MenuCard icon={ClipboardList} title="משימות" subtitle="תרגול וייצוא" color="indigo" onClick={() => setView('TASKS')}/>
                    <MenuCard icon={TrendingUp} title="התקדמות" subtitle="ניהול ידע" color="indigo" onClick={() => setView('PROGRESS')}/>
                </div>
                <div className="mt-auto pt-4 text-center">
                    <p className="text-[10px] text-gray-300">גרסה 4.0 • נבנה באהבה</p>
                    <p className="text-xs text-gray-400 font-medium mt-1">✨ שכוייח לעויזר, אהרן, וג'מיני</p>
                </div>
            </div>
        </div>
    );
}