import React, { useState } from 'react';
import { Languages, Edit3, Check, Eye, BookOpen, CircleDashed, Volume2 } from 'lucide-react';
import { Header, Button } from './UIComponents';
import { useAudio } from '../contexts/AudioContext';

export default function ProgressView({ setView, words, updateWord }) {
    const [activeTab, setActiveTab] = useState('UNSEEN');
    const [showSpellingOnly, setShowSpellingOnly] = useState(false);
    const [editingWord, setEditingWord] = useState(null);
    const { speak } = useAudio();

    const stats = {
        known: words.filter(w => w.score >= 5).length,
        weak: words.filter(w => w.score >= 3 && w.score <= 4).length,
        learn: words.filter(w => w.score >= 1 && w.score <= 2).length,
        unseen: words.filter(w => w.score === 0).length,
    };

    const displayWords = words.filter(w => {
        if (showSpellingOnly) return w.flag_spelling === true;
        const score = w.score;
        if (activeTab === 'KNOWN') return score >= 5;
        if (activeTab === 'WEAK') return score >= 3 && score <= 4;
        if (activeTab === 'LEARN') return score >= 1 && score <= 2;
        if (activeTab === 'UNSEEN') return score === 0;
        return false;
    });

    const handleManualUpdate = (newScore) => {
        if (editingWord) {
            updateWord(editingWord.id, { score: newScore });
            setEditingWord(null);
        }
    };

    const toggleSpellingFlag = (e, wordId) => {
        e.stopPropagation();
        const current = words.find(w => w.id === wordId)?.flag_spelling || false;
        updateWord(wordId, { flag_spelling: !current });
    };

    const handleSpeak = (e, text) => {
        e.stopPropagation();
        speak(text, true);
    }

    return (
        <div className="h-[100dvh] flex flex-col bg-gray-50" dir="rtl">
             <Header title={showSpellingOnly ? "רשימת איות" : "התקדמות"} onBack={() => setView('DASHBOARD')} subtitle="ניהול סטטוסים" 
                 extraLeft={<button onClick={() => setShowSpellingOnly(!showSpellingOnly)} className={`p-2 rounded-lg font-bold flex items-center gap-2 text-sm border ${showSpellingOnly ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'}`}><Languages size={18}/> {showSpellingOnly ? 'סגור' : 'איות'}</button>}
             />
             {!showSpellingOnly && (
                <div className="p-4 grid grid-cols-4 gap-2">
                    <button onClick={() => setActiveTab('UNSEEN')} className={`flex-1 flex flex-col items-center py-3 rounded-xl border-2 ${activeTab === 'UNSEEN' ? 'bg-gray-50 border-gray-200 text-gray-700' : 'bg-white border-transparent text-gray-400'}`}><span className="text-xl font-bold">{stats.unseen}</span><span className="text-xs">חדש</span></button>
                    <button onClick={() => setActiveTab('LEARN')} className={`flex-1 flex flex-col items-center py-3 rounded-xl border-2 ${activeTab === 'LEARN' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-transparent text-gray-400'}`}><span className="text-xl font-bold">{stats.learn}</span><span className="text-xs">למידה</span></button>
                    <button onClick={() => setActiveTab('WEAK')} className={`flex-1 flex flex-col items-center py-3 rounded-xl border-2 ${activeTab === 'WEAK' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-transparent text-gray-400'}`}><span className="text-xl font-bold">{stats.weak}</span><span className="text-xs">לחיזוק</span></button>
                    <button onClick={() => setActiveTab('KNOWN')} className={`flex-1 flex flex-col items-center py-3 rounded-xl border-2 ${activeTab === 'KNOWN' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-transparent text-gray-400'}`}><span className="text-xl font-bold">{stats.known}</span><span className="text-xs">יודע</span></button>
                </div>
             )}
             <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                 {displayWords.map(word => (
                     <div key={word.id} onClick={() => setEditingWord(word)} className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer">
                         <div className="text-right">
                             <div className="font-bold text-gray-800 text-lg" dir="ltr">{word.english}</div>
                             <div className="text-gray-500 text-sm">{word.hebrew}</div>
                         </div>
                         <div className="flex items-center gap-3">
                             <button onClick={(e) => handleSpeak(e, word.english)} className="p-2 bg-indigo-50 rounded-full text-indigo-600 active:scale-90 transition-transform"><Volume2 size={18}/></button>
                             <button onClick={(e) => toggleSpellingFlag(e, word.id)} className={`p-2 rounded-full border ${word.flag_spelling ? 'bg-indigo-100 text-indigo-600 border-indigo-200' : 'bg-gray-50 text-gray-300 border-transparent'}`}><Languages size={16}/></button>
                             <Edit3 size={18} className="text-gray-300"/>
                         </div>
                     </div>
                 ))}
             </div>
             {editingWord && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4" onClick={() => setEditingWord(null)}>
                    <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-2xl font-bold text-gray-800 text-center mb-6" dir="ltr">{editingWord.english}</h3>
                        <div className="space-y-3">
                            <Button variant="outline" onClick={() => handleManualUpdate(5)} className="w-full border-green-200 text-green-700 justify-between"><span>יודע (KNOWN)</span> <Check size={18}/></Button>
                            <Button variant="outline" onClick={() => handleManualUpdate(3)} className="w-full border-amber-200 text-amber-700 justify-between"><span>לחיזוק (WEAK)</span> <Eye size={18}/></Button>
                            <Button variant="outline" onClick={() => handleManualUpdate(1)} className="w-full border-indigo-200 text-indigo-700 justify-between"><span>למידה (LEARN)</span> <BookOpen size={18}/></Button>
                            <Button variant="outline" onClick={() => handleManualUpdate(0)} className="w-full border-gray-200 text-gray-500 justify-between"><span>חדש (UNSEEN)</span> <CircleDashed size={18}/></Button>
                        </div>
                        <button onClick={() => setEditingWord(null)} className="mt-6 w-full py-3 text-gray-400 font-bold">ביטול</button>
                    </div>
                </div>
             )}
        </div>
    );
}