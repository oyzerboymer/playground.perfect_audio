import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// ייבוא הנתונים והכלים
import { MASTER_WORDS } from './data';
import { DEFAULT_SETTINGS } from './utils';
import { AudioProvider } from './contexts/AudioContext'; // <--- התוספת החדשה

// ייבוא המסכים והמשחקים
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
  const [view, setView] = useState('DASHBOARD');
  const [words, setWords] = useState([]); 
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // --- טעינת נתונים ומיגרציה ---
  useEffect(() => {
    const savedUser = localStorage.getItem('vocab_user_name');
    const savedSettings = localStorage.getItem('vocab_settings');
    const savedProgress = JSON.parse(localStorage.getItem('vocab_offline_progress') || '{}');
    
    // מיגרציה לוגית (Status -> Score)
    const initializedWords = MASTER_WORDS.map(word => {
        const userWord = savedProgress[word.id];
        let score = 0; // ברירת מחדל: UNSEEN
        let flag_spelling = false;

        if (userWord) {
             if (typeof userWord.score === 'number') {
                 score = userWord.score;
                 flag_spelling = userWord.flag_spelling || false;
             } 
             // תמיכה לאחור בגרסאות ישנות
             else if (userWord.status) {
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
    </AudioProvider>
  );
}