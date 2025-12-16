import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';

import { MASTER_WORDS } from './data';
import { DEFAULT_SETTINGS } from './utils';
import { AudioProvider } from './contexts/AudioContext';

import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView'; 
import GamesMenuView from './components/GamesMenuView';
import WordBankView from './components/WordBankView';
import ProgressView from './components/ProgressView';
import TasksView from './components/TasksView';

import SwipeGame from './components/GameSwipe';
import QuizGame from './components/GameQuiz';
import MatchGame from './components/GameMatch';
import SpellingGame from './components/GameSpelling';

export default function VocabMasterApp() {
  // --- מפת הרמות (Hierarchy Map) ---
  // עוזרת לנו לדעת אם אנחנו "נכנסים פנימה" או "חוזרים אחורה"
  const VIEW_LEVELS = {
      'DASHBOARD': 0,
      
      'WORD_BANK': 1,
      'PROGRESS': 1,
      'TASKS': 1,
      'GAMES_MENU': 1,

      'GAME_SWIPE': 2,
      'GAME_QUIZ': 2,
      'GAME_MATCH': 2,
      'GAME_SPELLING': 2
  };

  // אתחול המצב לפי ההיסטוריה הקיימת (למקרה של רענון)
  const [view, setView] = useState(() => {
      if (typeof window !== 'undefined' && window.history.state?.view) {
          return window.history.state.view;
      }
      return 'DASHBOARD';
  });

  const [words, setWords] = useState([]); 
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  
  const [showExitModal, setShowExitModal] = useState(false);
  
  // דגל מיוחד לעקיפת המלכודת (כשהמשתמש מאשר יציאה)
  const ignoreTrap = useRef(false);

  // --- 1. הראוטר המרכזי (The Logic Brain) ---
  const handleViewChange = (targetView) => {
      const currentLevel = VIEW_LEVELS[view] || 0;
      const targetLevel = VIEW_LEVELS[targetView] || 0;

      // תרחיש א': ניסיון לצאת ממשחק (בכל דרך שהיא - כפתור חץ או לוגיקה פנימית)
      if (currentLevel === 2 && targetLevel < 2) {
          // עוצרים הכל ומציגים מודאל. לא משנים היסטוריה עדיין.
          setShowExitModal(true);
          return;
      }

      // תרחיש ב': חזרה לאחור (למשל: תפריט -> דשבורד)
      if (targetLevel < currentLevel) {
          // במקום לפתוח דף חדש, אנחנו אומרים לדפדפן לחזור אחורה!
          // זה מסנכרן את הכפתור הפנימי עם כפתור הטלפון.
          window.history.back();
      } 
      // תרחיש ג': כניסה פנימה (למשל: דשבורד -> משחק)
      else if (targetLevel > currentLevel) {
          window.history.pushState({ view: targetView }, '');
          setView(targetView);
      }
      // תרחיש ד': מעבר באותה רמה (נדיר באפליקציה הזו, אבל נתייחס כהחלפה)
      else {
          window.history.replaceState({ view: targetView }, '');
          setView(targetView);
      }
  };

  // --- 2. המאזין להיסטוריה (PopState Listener & Trap) ---
  useEffect(() => {
      const onPopState = (event) => {
          // אם הדגל מורם, אנחנו נותנים לחזרה לקרות בלי להתערב (כי המשתמש אישר יציאה)
          if (ignoreTrap.current) {
              ignoreTrap.current = false;
              // מעדכנים את התצוגה למה שהדפדפן החליט
              const dest = event.state?.view || 'DASHBOARD';
              setView(dest);
              return;
          }

          const currentLevel = VIEW_LEVELS[view] || 0;
          // לאן הדפדפן מנסה לקחת אותנו?
          const destinationView = event.state?.view || 'DASHBOARD';
          const destinationLevel = VIEW_LEVELS[destinationView] || 0;

          // --- המלכודת: האם אנחנו בורחים ממשחק? ---
          if (currentLevel === 2 && destinationLevel < 2) {
              // הופה! הדפדפן כבר חזר אחורה. אנחנו חייבים לבטל את זה ויזואלית.
              // אנחנו דוחפים את המשתמש חזרה למשחק (משחזרים את ההיסטוריה)
              window.history.pushState({ view: view }, '');
              
              // ומציגים את השאלה
              setShowExitModal(true);
          } else {
              // חזרה רגילה (למשל תפריט -> דשבורד) - מאשרים ומשקפים בתצוגה
              setView(destinationView);
          }
      };

      window.addEventListener('popstate', onPopState);
      return () => window.removeEventListener('popstate', onPopState);
  }, [view]);


  // --- לוגיקת המודאל ---
  const handleConfirmExit = () => {
      setShowExitModal(false);
      
      // המשתמש אמר "כן, צא".
      // אנחנו נמצאים כרגע במצב "משחק" (כי המלכודת החזירה אותנו לשם).
      // אנחנו רוצים לחזור אחורה (לתפריט).
      
      ignoreTrap.current = true; // מרמים דגל: "בפעם הבאה אל תפעיל את המלכודת"
      window.history.back(); // מבצעים את החזרה בפועל
  };

  const handleStay = () => {
      setShowExitModal(false);
      // לא עושים כלום. המלכודת כבר החזירה אותנו למצב "משחק" בהיסטוריה.
  };

  // --- טעינת נתונים (רגיל) ---
  useEffect(() => {
    // אתחול היסטוריה בסיסי אם אין
    if (!window.history.state) {
        window.history.replaceState({ view: 'DASHBOARD' }, '');
    }

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

  const updateWord = (id, updates) => {
      setWords(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  const handleLogin = (name) => {
      setUser(name);
      localStorage.setItem('vocab_user_name', name);
      window.history.replaceState({ view: 'DASHBOARD' }, '');
      setView('DASHBOARD');
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600"/></div>;

  if (!user) {
      return <LoginView onLogin={handleLogin} />;
  }

  return (
    <AudioProvider>
        {view === 'DASHBOARD' && <DashboardView setView={handleViewChange} user={user} />}
        {view === 'WORD_BANK' && <WordBankView setView={handleViewChange} words={words} updateWord={updateWord} />}
        {view === 'GAMES_MENU' && <GamesMenuView setView={handleViewChange} />}
        {view === 'TASKS' && <TasksView setView={handleViewChange} words={words} />}
        {view === 'PROGRESS' && <ProgressView setView={handleViewChange} words={words} updateWord={updateWord} />}
        
        {view === 'GAME_SPELLING' && <SpellingGame words={words} updateWord={updateWord} setView={handleViewChange} />}
        {view === 'GAME_SWIPE' && <SwipeGame words={words} updateWord={updateWord} setView={handleViewChange} settings={settings} setSettings={setSettings} />}
        {view === 'GAME_QUIZ' && <QuizGame words={words} updateWord={updateWord} setView={handleViewChange} settings={settings} setSettings={setSettings} />}
        {view === 'GAME_MATCH' && <MatchGame words={words} updateWord={updateWord} setView={handleViewChange} />}

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