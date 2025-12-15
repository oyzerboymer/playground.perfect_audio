import React from 'react';
import { BookOpen, Zap, Brain, Play } from 'lucide-react';
import { Header, Button } from './UIComponents';

export default function GamesMenuView({ setView }) {
    return (
        <div className="h-[100dvh] flex flex-col bg-gray-50" dir="rtl">
            <Header title="מבדקים" onBack={() => setView('DASHBOARD')} subtitle="בחר משחק" />
            <div className="p-6 space-y-4">
                 <Button variant="outline" onClick={() => setView('GAME_SWIPE')} className="w-full py-6 text-xl justify-between px-6"><span className="flex items-center gap-3"><BookOpen className="text-indigo-600"/> Swipe</span><Play size={16} className="text-gray-300 transform rotate-180"/></Button>
                 <Button variant="outline" onClick={() => setView('GAME_QUIZ')} className="w-full py-6 text-xl justify-between px-6"><span className="flex items-center gap-3"><Zap className="text-orange-500"/> Quiz</span><Play size={16} className="text-gray-300 transform rotate-180"/></Button>
                 <Button variant="outline" onClick={() => setView('GAME_MATCH')} className="w-full py-6 text-xl justify-between px-6"><span className="flex items-center gap-3"><Brain className="text-purple-600"/> Match</span><Play size={16} className="text-gray-300 transform rotate-180"/></Button>
            </div>
        </div>
    );
}