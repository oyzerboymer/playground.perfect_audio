import React, { useState } from 'react';
import { Search as SearchIcon, X, Check, Eye, BookOpen, CircleDashed, Volume2 } from 'lucide-react';
import { Header } from './UIComponents';
import { useAudio } from '../contexts/AudioContext';

export default function WordBankView({ setView, words, updateWord }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTab, setFilterTab] = useState('ALL'); 
    const { speak } = useAudio();

    const stats = {
        ALL: words.length,
        KNOWN: words.filter(w => w.score >= 5).length,
        WEAK: words.filter(w => w.score >= 3 && w.score <= 4).length,
        LEARN: words.filter(w => w.score >= 1 && w.score <= 2).length
    };

    const filteredWords = words.filter(word => {
        const score = word.score;
        const matchesSearch = word.english.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              word.hebrew.includes(searchTerm);
        if (!matchesSearch) return false;
        if (filterTab === 'ALL') return true;
        if (filterTab === 'KNOWN') return score >= 5;
        if (filterTab === 'WEAK') return score >= 3 && score <= 4;
        if (filterTab === 'LEARN') return score >= 1 && score <= 2;
        return true;
    });

    const getStatusIcon = (score) => {
        if (score >= 5) return <Check size={18} className="text-green-600"/>;
        if (score >= 3) return <Eye size={18} className="text-amber-500"/>;
        if (score >= 1) return <BookOpen size={18} className="text-indigo-500"/>; // תוקן: זה יחזיר ספר כחול למילים בשלב למידה
        return <CircleDashed size={18} className="text-gray-300"/>;
    };

    // הגדרת הצבעים לטאבים
    const tabs = [
        { id: 'ALL', label: 'הכל', count: stats.ALL, baseColor: 'gray' },
        { id: 'KNOWN', label: 'יודע', count: stats.KNOWN, baseColor: 'green' },
        { id: 'WEAK', label: 'לחיזוק', count: stats.WEAK, baseColor: 'amber' },
        { id: 'LEARN', label: 'ללמידה', count: stats.LEARN, baseColor: 'indigo' }
    ];

    return (
        <div className="h-[100dvh] flex flex-col bg-gray-50" dir="rtl">
            <Header title="מאגר מילים" onBack={() => setView('DASHBOARD')} subtitle={`סה"כ ${stats.ALL} מילים`} />
            
            <div className="bg-white p-4 shadow-sm z-10 space-y-3">
                {/* חיפוש */}
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="חפש מילה..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-100 text-gray-800 rounded-xl py-3 px-10 border-none outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-right"
                    />
                    <div className="absolute top-3 right-3 text-gray-400"><SearchIcon size={20}/></div>
                    {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute top-3 left-3 text-gray-400"><X size={20}/></button>}
                </div>

                {/* טאבים צבעוניים */}
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {tabs.map(tab => {
                        const isActive = filterTab === tab.id;
                        // לוגיקת צבעים: אם פעיל - צבע מלא ולבן. אם לא - צבע בהיר וטקסט צבעוני
                        const activeClass = `bg-${tab.baseColor}-500 text-white shadow-md transform scale-105`;
                        const inactiveClass = `bg-${tab.baseColor}-50 text-${tab.baseColor}-600 border border-${tab.baseColor}-100`;

                        return (
                            <button 
                                key={tab.id} 
                                onClick={() => setFilterTab(tab.id)} 
                                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${isActive ? activeClass : inactiveClass}`}
                            >
                                {tab.label} <span className={`text-xs ${isActive ? 'opacity-100' : 'opacity-70'}`}>({tab.count})</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filteredWords.map(word => (
                    <div key={word.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                        
                        {/* צד ימין: טקסט נקי */}
                        <div className="text-right flex-1">
                            <div className="font-bold text-gray-800 text-lg leading-tight" dir="ltr">{word.english}</div>
                            <div className="text-gray-500 text-sm mt-0.5">{word.hebrew}</div>
                        </div>

                        {/* צד שמאל: אייקונים (רמקול עבר לפה) */}
                        <div className="flex items-center gap-2 pl-1">
                             <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    speak(word.english); 
                                }} 
                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                            >
                                <Volume2 size={20} />
                            </button>

                             <div className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 shadow-sm">
                                 {getStatusIcon(word.score)}
                             </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}