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

    // קומפוננטה קטנה לטאב העליון
    const StatTab = ({ id, label, count, color, icon }) => {
        const isActive = activeTab === id;
        // לוגיקת צבעים דומה: פעיל = כהה, לא פעיל = בהיר
        const activeClass = `bg-${color}-500 text-white shadow-md transform scale-105 border-${color}-600`;
        const inactiveClass = `bg-${color}-50 text-${color}-600 border-${color}-100`;

        return (
            <button 
                onClick={() => setActiveTab(id)} 
                className={`flex-1 flex flex-col items-center py-3 rounded-xl border transition-all duration-200 ${isActive ? activeClass : inactiveClass}`}
            >
                <span className="text-xl font-bold">{count}</span>
                <span className="text-xs opacity-90">{label}</span>
            </button>
        );
    };

    return (
        <div className="h-[100dvh] flex flex-col bg-gray-50" dir="rtl">
             <Header title={showSpellingOnly ? "רשימת איות" : "התקדמות"} onBack={() => setView('DASHBOARD')} subtitle="ניהול סטטוסים" 
                  extraLeft={<button onClick={() => setShowSpellingOnly(!showSpellingOnly)} className={`p-2 rounded-lg font-bold flex items-center gap-2 text-sm border transition-colors ${showSpellingOnly ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}><Languages size={18}/> {showSpellingOnly ? 'סגור' : 'איות'}</button>}
             />
             
             {!showSpellingOnly && (
                <div className="p-4 grid grid-cols-4 gap-2">
                    <StatTab id="UNSEEN" label="חדש" count={stats.unseen} color="gray" />
                    <StatTab id="LEARN" label="למידה" count={stats.learn} color="indigo" />
                    <StatTab id="WEAK" label="לחיזוק" count={stats.weak} color="amber" />
                    <StatTab id="KNOWN" label="יודע" count={stats.known} color="green" />
                </div>
             )}

             <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                 {displayWords.map(word => (
                     <div key={word.id} onClick={() => setEditingWord(word)} className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer hover:border-indigo-100 transition-colors">
                         
                         {/* צד ימין: טקסט */}
                         <div className="text-right flex-1">
                             <div className="font-bold text-gray-800 text-lg" dir="ltr">{word.english}</div>
                             <div className="text-gray-500 text-sm">{word.hebrew}</div>
                         </div>

                         {/* צד שמאל: כפתורים */}
                         <div className="flex items-center gap-3 pl-1">
                             {/* רמקול */}
                             <button onClick={(e) => handleSpeak(e, word.english)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors">
                                 <Volume2 size={20}/>
                             </button>

                             {/* דגל איות - הלוגיקה החדשה שלך */}
                             <button 
                                onClick={(e) => toggleSpellingFlag(e, word.id)} 
                                className={`p-2 rounded-full border transition-all ${
                                    word.flag_spelling 
                                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200'  // דלוק: תכלת עם טקסט כהה
                                    : 'bg-white text-gray-300 border-gray-200 hover:border-indigo-200 hover:text-indigo-300' // כבוי: לבן עם מסגרת אפורה
                                }`}
                             >
                                 <Languages size={18}/>
                             </button>

                             {/* עיפרון - כתום/חום */}
                             <div className="text-amber-500/70 p-1">
                                <Edit3 size={18}/>
                             </div>
                         </div>
                     </div>
                 ))}
             </div>

             {/* המודאל (חלון קופץ) נשאר אותו דבר */}
             {editingWord && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4" onClick={() => setEditingWord(null)}>
                    <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-2xl font-bold text-gray-800 text-center mb-6" dir="ltr">{editingWord.english}</h3>
                        <div className="space-y-3">
                            <Button variant="outline" onClick={() => handleManualUpdate(5)} className="w-full border-green-200 text-green-700 justify-between hover:bg-green-50"><span>יודע (KNOWN)</span> <Check size={18}/></Button>
                            <Button variant="outline" onClick={() => handleManualUpdate(3)} className="w-full border-amber-200 text-amber-700 justify-between hover:bg-amber-50"><span>לחיזוק (WEAK)</span> <Eye size={18}/></Button>
                            <Button variant="outline" onClick={() => handleManualUpdate(1)} className="w-full border-indigo-200 text-indigo-700 justify-between hover:bg-indigo-50"><span>למידה (LEARN)</span> <BookOpen size={18}/></Button>
                            <Button variant="outline" onClick={() => handleManualUpdate(0)} className="w-full border-gray-200 text-gray-500 justify-between hover:bg-gray-50"><span>חדש (UNSEEN)</span> <CircleDashed size={18}/></Button>
                        </div>
                        <button onClick={() => setEditingWord(null)} className="mt-6 w-full py-3 text-gray-400 font-bold hover:text-gray-600">ביטול</button>
                    </div>
                </div>
             )}
        </div>
    );
}