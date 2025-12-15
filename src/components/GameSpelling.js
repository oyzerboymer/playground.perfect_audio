import React, { useState, useEffect } from 'react';
import { Trophy, Check, X, Languages, Edit3 } from 'lucide-react';
import { Header, Button } from './UIComponents';

export default function SpellingGame({ words, updateWord, setView }) {
    const [queue, setQueue] = useState([]);
    const [current, setCurrent] = useState(0);
    const [input, setInput] = useState('');
    const [feedback, setFeedback] = useState(null); 
    const [showSummary, setShowSummary] = useState(false);
    const [score, setScore] = useState(0);

    useEffect(() => {
        const pool = words.filter(w => w.flag_spelling === true);
        setQueue(pool.sort(() => Math.random() - 0.5));
    }, []);

    const handleCheck = (e) => {
        e?.preventDefault();
        if (!input.trim() || feedback) return;

        const word = queue[current];
        const isCorrect = input.trim().toLowerCase() === word.english.toLowerCase();

        if (isCorrect) {
            setFeedback('CORRECT');
            setScore(s => s + 1);
            if (word.score < 10) updateWord(word.id, { score: word.score + 1 });
        } else {
            setFeedback('WRONG');
        }

        setTimeout(() => {
            if (current < queue.length - 1) {
                setCurrent(c => c + 1);
                setInput('');
                setFeedback(null);
            } else {
                setShowSummary(true);
            }
        }, 2000); 
    };

    if (queue.length === 0) {
        return (
            <div className="h-[100dvh] bg-gray-50 flex flex-col items-center justify-center text-center p-6" dir="rtl">
                <div className="bg-indigo-50 p-6 rounded-full mb-6">
                    <Edit3 size={48} className="text-indigo-600"/>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">רשימת האיות ריקה</h2>
                <p className="text-gray-500 mb-8 max-w-xs">
                    כדי להתאמן באיות, עליך לסמן מילים באייקון <Languages size={16} className="inline"/> במסך "התקדמות".
                </p>
                <Button onClick={() => setView('PROGRESS')} className="w-full">עבור להתקדמות</Button>
                <Button variant="ghost" onClick={() => setView('TASKS')} className="mt-2">חזור</Button>
            </div>
        );
    }

    if (showSummary) {
        return (
            <div className="h-[100dvh] bg-gray-50 flex flex-col text-right" dir="rtl">
                <Header title="סיכום איות" onBack={() => setView('TASKS')} subtitle={`הצלחות: ${score} מתוך ${queue.length}`} />
                <div className="flex-1 flex flex-col items-center justify-center p-6">
                    <Trophy size={64} className="text-yellow-500 mb-6 animate-bounce"/>
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">כל הכבוד!</h2>
                    <p className="text-gray-500 mb-8">סיימת את סבב האיות הנוכחי.</p>
                    <Button onClick={() => setView('TASKS')} className="w-full py-4 text-lg">חזור לתפריט</Button>
                </div>
            </div>
        );
    }

    const word = queue[current];

    return (
        <div className="h-[100dvh] flex flex-col bg-gray-50" dir="rtl">
            <Header title="אימון איות" onBack={() => setView('TASKS')} subtitle={`${current + 1} / ${queue.length}`} />

            <div className="flex-1 flex flex-col p-6 items-center">
                <div className="w-full bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col items-center justify-center mb-8 min-h-[200px]">
                    <h2 className="text-4xl font-bold text-gray-800 mb-2 text-center">{word.hebrew}</h2>
                    <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-sm">{word.partOfSpeech}</span>
                </div>

                <form onSubmit={handleCheck} className="w-full max-w-sm relative">
                    <div className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={feedback !== null}
                            autoFocus
                            placeholder="הקלד באנגלית..."
                            dir="ltr"
                            className={`w-full text-center text-2xl font-bold py-4 px-4 rounded-2xl border-2 outline-none transition-all shadow-sm
                                ${feedback === 'CORRECT' ? 'bg-green-50 border-green-500 text-green-700' : 
                                  feedback === 'WRONG' ? 'bg-red-50 border-red-500 text-red-700' : 
                                  'bg-white border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50'}`}
                        />
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                            {feedback === 'CORRECT' && <Check className="text-green-500" size={28}/>}
                            {feedback === 'WRONG' && <X className="text-red-500" size={28}/>}
                        </div>
                    </div>

                    {feedback === 'WRONG' && (
                        <div className="mt-4 text-center animate-in fade-in slide-in-from-top-2">
                            <p className="text-gray-400 text-sm mb-1">התשובה הנכונה:</p>
                            <p className="text-2xl font-bold text-indigo-600 tracking-wide" dir="ltr">{word.english}</p>
                        </div>
                    )}

                    {!feedback && (
                        <Button onClick={handleCheck} disabled={!input} className="w-full mt-6 py-4 text-lg shadow-lg shadow-indigo-200">
                            בדיקה
                        </Button>
                    )}
                </form>
            </div>
            <div className="h-[20vh]"></div>
        </div>
    );
}