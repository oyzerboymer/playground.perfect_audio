import React, { useState } from 'react';
import { Edit3, Play, ClipboardList, Copy } from 'lucide-react';
import { Header, Button } from './UIComponents';

export default function TasksView({ setView, words }) {
    const [learnCount, setLearnCount] = useState(10);
    const [reviewCount, setReviewCount] = useState(20);
    const [generatedList, setGeneratedList] = useState(null);

    const generateList = () => {
        const poolLearn = words.filter(w => w.score >= 1 && w.score <= 2);
        const poolWeak = words.filter(w => w.score >= 3 && w.score <= 4);
        const poolKnown = words.filter(w => w.score >= 5);

        let listA = poolLearn.sort(() => Math.random() - 0.5).slice(0, learnCount);
        if (listA.length < learnCount) {
            listA = [...listA, ...poolWeak.sort(() => Math.random() - 0.5).slice(0, learnCount - listA.length)];
        }
        const usedIds = new Set(listA.map(w => w.id));
        const poolReview = [...poolWeak, ...poolKnown].filter(w => !usedIds.has(w.id));
        const listB = poolReview.sort(() => Math.random() - 0.5).slice(0, reviewCount);

        const date = new Date().toLocaleDateString('he-IL');
        let content = `📅 רשימת תרגול\nתאריך: ${date}\n===================\n\n`;
        if (listA.length > 0) { content += `🔵 מיקוד למידה (${listA.length})\n---\n`; listA.forEach((w, i) => content += `${i+1}. ${w.english} - ${w.hebrew}\n`); content += `\n`; }
        if (listB.length > 0) { content += `🟢 חזרה (${listB.length})\n---\n`; listB.forEach((w, i) => content += `${i+1}. ${w.english} - ${w.hebrew}\n`); }
        setGeneratedList(content);
    };

    return (
        <div className="h-[100dvh] flex flex-col bg-gray-50" dir="rtl">
            <Header title="משימות" onBack={() => setView('DASHBOARD')} subtitle="מחולל תרגול" />
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                 <Button variant="outline" onClick={() => setView('GAME_SPELLING')} className="w-full py-6 text-xl justify-between px-6 border-indigo-100">
                    <span className="flex items-center gap-3 font-bold text-gray-800"><Edit3 className="text-indigo-600"/> אימון איות</span>
                    <Play size={20} className="text-gray-300 transform rotate-180"/>
                </Button>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex gap-2"><ClipboardList className="text-teal-600"/> מחולל משימות</h2>
                    {!generatedList ? (
                        <div className="space-y-6">
                             <div><label className="font-bold text-gray-700 block mb-2">מיקוד למידה: {learnCount}</label><input type="range" min="5" max="30" value={learnCount} onChange={e=>setLearnCount(Number(e.target.value))} className="w-full accent-blue-600"/></div>
                             <div><label className="font-bold text-gray-700 block mb-2">חזרה: {reviewCount}</label><input type="range" min="10" max="50" value={reviewCount} onChange={e=>setReviewCount(Number(e.target.value))} className="w-full accent-green-600"/></div>
                             <Button onClick={generateList} className="w-full bg-teal-600 hover:bg-teal-700">צור רשימה</Button>
                        </div>
                    ) : (
                        <div>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm font-mono whitespace-pre-wrap h-64 overflow-y-auto mb-4" dir="ltr">{generatedList}</div>
                            <div className="flex gap-2">
                                <Button onClick={() => navigator.clipboard.writeText(generatedList)} variant="outline" className="flex-1"><Copy size={18}/> העתק</Button>
                                <Button onClick={() => setGeneratedList(null)} variant="ghost">חדש</Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}