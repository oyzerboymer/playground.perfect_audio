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
        if (filterTab === 'LEARN') return score <= 2;
        return true;
    });

    const getStatusIcon = (score) => {
        if (score >= 5) return <Check size={18} className="text-green-500"/>;
        if (score >= 3) return <Eye size={18} className="text-amber-500"/>;
        if (score >= 1) return <BookOpen size={18} className="text-indigo-400"/>;
        return <CircleDashed size={18} className="text-gray-300"/>;
    };

    return (
        <div className="h-[100dvh] flex flex-col bg-gray-50" dir="rtl">
            <Header title="מאגר מילים" onBack={() => setView('DASHBOARD')} subtitle={`סה"כ ${stats.ALL} מילים`} />
            <div className="bg-white p-4 shadow-sm z-10 space-y-3">
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
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {[{ id: 'ALL', label: 'הכל', count: stats.ALL }, { id: 'KNOWN', label: 'יודע', count: stats.KNOWN, color: 'green' }, { id: 'WEAK', label: 'לחיזוק', count: stats.WEAK, color: 'amber' }, { id: 'LEARN', label: 'ללמידה', count: stats.LEARN, color: 'indigo' }].map(tab => (
                        <button key={tab.id} onClick={() => setFilterTab(tab.id)} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 border ${filterTab === tab.id ? `bg-${tab.color || 'gray'}-100 text-${tab.color || 'gray'}-800 border-${tab.color || 'gray'}-300` : 'bg-white text-gray-500 border-gray-100'}`}>{tab.label} <span className="text-xs opacity-60">({tab.count})</span></button>
                    ))}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filteredWords.map(word => (
                    <div key={word.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                        <div className="text-right">
                            <div className="font-bold text-gray-800 text-lg leading-tight" dir="ltr">{word.english}</div>
                            <div className="text-gray-500 text-sm mt-0.5">{word.hebrew}</div>
                        </div>
                        <div className="flex items-center gap-3">
                             <button onClick={() => speak(word.english, true)} className="p-2 bg-indigo-50 rounded-full text-indigo-600 active:scale-90 transition-transform"><Volume2 size={18}/></button>
                             <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50">{getStatusIcon(word.score)}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}