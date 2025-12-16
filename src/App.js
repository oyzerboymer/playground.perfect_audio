import React, { useState, useEffect } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';

// ייבוא הנתונים והכלים
import { MASTER_WORDS } from './data';
import { DEFAULT_SETTINGS } from './utils';
import { AudioProvider } from './contexts/AudioContext';

// ייבוא המסכים והמשחקים
import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView'; // הנחתי שזה השם לפי הקונטקסט הקודם
import GamesMenuView from './components/GamesMenuView';
import WordBankView from './components/WordBankView';
import ProgressView from './components/ProgressView';
import TasksView from './components/TasksView';

import SwipeGame from './components/GameSwipe';
import QuizGame from './components/GameQuiz';
import MatchGame from './components/GameMatch';
import SpellingGame from './components/GameSpelling';

export default function VocabMasterApp() {
  const [view, setView] = useState('DASHBOARD');
  const [words, setWords] = useState([]); 
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  
  // ניהול מודאל יציאה
  const [showExitModal, setShowExitModal] = useState(false);

  // רשימת המסכים שנחשבים "משחק" (בהם נרצה לשאול לפני יציאה)
  const GAME_VIEWS = ['GAME_SWIPE', 'GAME_QUIZ', 'GAME_MATCH', 'GAME_SPELLING'];

  // --- טעינת נתונים ומיגרציה ---
  useEffect(() => {
    const savedUser = localStorage.getItem('vocab_user_name');
    const savedSettings = localStorage.getItem('vocab_settings');
    const savedProgress = JSON.parse(localStorage.getItem('vocab_offline_progress') || '{}');
    
    const initializedWords = MASTER_WORDS.map(word => {
        const userWord = savedProgress[word.id];
        let score = 0; 
        let flag_spelling = false;

        if (userWord) {
             if (typeof userWord.score === 'number') {
                 score = userWord.score;
                 flag_spelling = userWord.flag_spelling || false;
             } else if (userWord.status) {
                 switch(userWord.status) {
                     case 'DONE': score = 10; break;
                     case 'KNOWN': score = 5; break;
                     case 'WEAK': score = 3; break;
                     case 'LEARN': score = 1; break;
                     default: score = 0;
                 }
                 flag_spelling = userWord.flag_spelling || false;
             }
        }
        return { ...word, score, flag_spelling };
    });

    setWords(initializedWords);
    if (savedUser) setUser(savedUser);
    if (savedSettings) setSettings({...DEFAULT_SETTINGS, ...JSON.parse(savedSettings)});
    setLoading(false);
  }, []);

  // --- שמירת נתונים ---
  useEffect(() => {
    if (!loading && words.length > 0) {
        const progressMap = words.reduce((acc, word) => {
            if (word.score > 0 || word.flag_spelling) {
                acc[word.id] = { score: word.score, flag_spelling: word.flag_spelling };
            }
            return acc;
        }, {});
        localStorage.setItem('vocab_offline_progress', JSON.stringify(progressMap));
    }
  }, [words, loading]);

  useEffect(() => {
      localStorage.setItem('vocab_settings', JSON.stringify(settings));
  }, [settings]);

  // --- לוגיקת כפתור חזור (Back Button Logic) ---
  useEffect(() => {
    // 1. דחיפת היסטוריה מזויפת בכל מעבר מסך (חוץ מהדשבורד)
    if (view !== 'DASHBOARD') {
      window.history.pushState(null, '', window.location.href);
    }

    const handleBackButton = (event) => {
      // אם אנחנו בדשבורד - תן לדפדפן לצאת רגיל
      if (view === 'DASHBOARD') return;

      // מנע את ברירת המחדל
      event.preventDefault(); 

      // אם אנחנו באמצע משחק - הצג מודאל
      if (GAME_VIEWS.includes(view)) {
         setShowExitModal(true);
      } 
      // אם אנחנו במסך רגיל (רשימת מילים וכו') - חזור לדשבורד
      else {
         goBackSafe();
      }
    };

    window.addEventListener('popstate', handleBackButton);
    return () => window.removeEventListener('popstate', handleBackButton);
  }, [view]);

  // פונקציית העזר לניווט אחורה
  const goBackSafe = () => {
      if (['WORD_BANK', 'PROGRESS', 'TASKS', 'GAMES_MENU'].includes(view)) {
          setView('DASHBOARD');
      } else {
          // ברירת מחדל לכל השאר
          setView('DASHBOARD');
      }
  };

  const handleConfirmExit = () => {
      setShowExitModal(false);
      // אם יצאנו ממשחק, נחזור לתפריט המשחקים (או לדשבורד, לבחירתך)
      setView('GAMES_MENU'); 
  };

  const handleStay = () => {
      setShowExitModal(false);
      // חשוב: בגלל שהמשתמש לחץ "חזור", ההיסטוריה "נאכלה". 
      // אנחנו חייבים לדחוף שוב את המצב כדי שכפתור החזור יעבוד שוב בפעם הבאה.
      window.history.pushState(null, '', window.location.href);
  };

  // --- פונקציות ליבה ---
  const updateWord = (id, updates) => {
      setWords(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  const handleLogin = (name) => {
      setUser(name);
      localStorage.setItem('vocab_user_name', name);
      setView('DASHBOARD');
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600"/></div>;

  if (!user) {
      return <LoginView onLogin={handleLogin} />;
  }

  return (
    <AudioProvider>
        {view === 'DASHBOARD' && <DashboardView setView={setView} user={user} />}
        {view === 'WORD_BANK' && <WordBankView setView={setView} words={words} updateWord={updateWord} />}
        {view === 'GAMES_MENU' && <GamesMenuView setView={setView} />}
        {view === 'TASKS' && <TasksView setView={setView} words={words} />}
        {view === 'PROGRESS' && <ProgressView setView={setView} words={words} updateWord={updateWord} />}
        
        {view === 'GAME_SPELLING' && <SpellingGame words={words} updateWord={updateWord} setView={setView} />}
        {view === 'GAME_SWIPE' && <SwipeGame words={words} updateWord={updateWord} setView={setView} settings={settings} setSettings={setSettings} />}
        {view === 'GAME_QUIZ' && <QuizGame words={words} updateWord={updateWord} setView={setView} settings={settings} setSettings={setSettings} />}
        {view === 'GAME_MATCH' && <MatchGame words={words} updateWord={updateWord} setView={setView} />}

        {/* --- מודאל יציאה ממשחק --- */}
        {showExitModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-xs rounded-2xl p-6 shadow-2xl scale-100" dir="rtl">
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                            <AlertTriangle size={28} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">לצאת מהמשחק?</h3>
                            <p className="text-gray-500 text-sm mt-1">ההתקדמות הנוכחית במשחק תאבד.</p>
                        </div>
                        <div className="flex gap-3 w-full mt-2">
                            <button 
                                onClick={handleStay}
                                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 active:scale-95 transition-all"
                            >
                                הישאר
                            </button>
                            <button 
                                onClick={handleConfirmExit}
                                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200"
                            >
                                כן, צא
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </AudioProvider>
  );
}