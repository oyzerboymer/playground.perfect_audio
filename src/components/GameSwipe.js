import React, { useState, useEffect } from 'react';
import { Check, X, Eye, Loader2, Languages, Edit3, Volume2, Sparkles, BookOpen } from 'lucide-react';
import { Header, Button } from './UIComponents';
import GameLobby from './GameLobby'; 
import { useAudio } from '../contexts/AudioContext'; 
import { shuffleArray, getScoreColorClass, getHebrewLabel, getNextManualScore } from '../utils';

const DEFAULT_GAME_SETTINGS = {
    isSmartMode: true,
    wordSource: { unseen: true, learn: true, weak: true, known: true },
    amount: 20,
    languageMode: 'EN',
    feedbackDuration: 0.7
};

const CATEGORY_CONFIG = {
    unseen: { label: 'חדש', color: 'gray' },
    learn: { label: 'למידה', color: 'indigo' },
    weak: { label: 'לחיזוק', color: 'amber' },
    known: { label: 'יודע', color: 'green' }
};

export default function SwipeGame({ words, updateWord, setView, onGameFinish } ) {
  // --- טעינת הגדרות ---
  const [gameSettings, setGameSettings] = useState(() => {
      try {
          const saved = localStorage.getItem('swipe_settings');
          return saved ? JSON.parse(saved) : DEFAULT_GAME_SETTINGS;
      } catch (e) {
          return DEFAULT_GAME_SETTINGS;
      }
  });

  useEffect(() => {
      localStorage.setItem('swipe_settings', JSON.stringify(gameSettings));
  }, [gameSettings]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState([]);
  const [sessionResults, setSessionResults] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const [current, setCurrent] = useState(0);
   
  const [dragStart, setDragStart] = useState(null);
  const [offset, setOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPeeked, setIsPeeked] = useState(false); 
  const [feedback, setFeedback] = useState(null); 

  const { speak, playSFX, vibrate, playMusic, stopMusic, audioSettings, setGameScope } = useAudio();

  // פרופיל אודיו
  useEffect(() => {
    setGameScope('SWIPE'); 
    return () => {
        stopMusic(); 
        setGameScope('GLOBAL'); 
    };
  }, []);

  // --- התחלת משחק (עם האלגוריתם המקורי!) ---
  const startGame = () => {
    const totalWords = words.length;
    const touchedWords = words.filter(w => w.score > 0).length;
    const progressPercent = totalWords > 0 ? Math.round((touchedWords / totalWords) * 100) : 0;
    const unseen = words.filter(w => w.score === 0);
    const shouldMix = progressPercent > 80;

    const targetAmount = gameSettings.amount;
    let pool = [];

    if (gameSettings.isSmartMode) {
        // === לוגיקה מקורית (משוחזרת) ===
        if (unseen.length > 0 && !shouldMix) {
            pool = shuffleArray(unseen).slice(0, targetAmount);
        } else {
            const learn = words.filter(w => w.score >= 1 && w.score <= 2);
            const weak = words.filter(w => w.score >= 3 && w.score <= 4);
            const known = words.filter(w => w.score >= 5).sort((a,b) => a.score - b.score);

            // חלוקה יחסית לפי גודל היעד
            const partSize = Math.floor(targetAmount * 0.4); // 40% לכל קבוצה חלשה
            pool = [...shuffleArray(weak).slice(0, partSize), ...shuffleArray(learn).slice(0, partSize)];
            
            const remaining = targetAmount - pool.length;
            if (remaining > 0 && known.length > 0) pool = [...pool, ...known.slice(0, remaining)];
            if (pool.length < targetAmount && unseen.length > 0) pool = [...pool, ...shuffleArray(unseen).slice(0, targetAmount - pool.length)];
        }
    } else {
        // מצב ידני
        pool = words.filter(w => {
            if (w.score === 0 && gameSettings.wordSource.unseen) return true;
            if (w.score >= 1 && w.score <= 2 && gameSettings.wordSource.learn) return true;
            if (w.score >= 3 && w.score <= 4 && gameSettings.wordSource.weak) return true;
            if (w.score >= 5 && gameSettings.wordSource.known) return true;
            return false;
        });
        if (pool.length === 0) { alert("לא נמצאו מילים בקטגוריות שנבחרו."); return; }
        pool = shuffleArray(pool).slice(0, targetAmount);
    }

    // הוספת הגדרות שפה לכרטיסים
    const queueWithLang = shuffleArray(pool).map(w => {
        let showEnglish = true;
        if (gameSettings.languageMode === 'HE') showEnglish = false;
        else if (gameSettings.languageMode === 'MIX') showEnglish = Math.random() > 0.5;
        return { ...w, showEnglish };
    });

    setQueue(queueWithLang);
    setIsPlaying(true);
    playMusic('CALM');
  };

  // --- לוגיקת החלקה (משולבת עם סאונד חדש) ---
  const processSwipe = (direction) => {
      setIsAnimating(true);
      const word = queue[current];
      let newScore = word.score;

      if (direction === 'RIGHT') { 
          playSFX('SWIPE_RIGHT');
          vibrate(40); 
          if (isPeeked) newScore = 3;
          else newScore = word.score < 5 ? 5 : word.score + 1;
      } else { 
          playSFX('SWIPE_LEFT');
          vibrate(200); 
          newScore = 1; 
      }
       
      setOffset(direction === 'RIGHT' ? 800 : -800);
      updateWord(word.id, { score: newScore });
      setSessionResults(prev => [...prev, { ...word, score: newScore }]);
      
      // --- תיקון: TTS מופעל מיד ---
      if (audioSettings.tts && !isPeeked) {
          speak(word.english);
      }

      const delay = audioSettings.tts ? 1500 : (gameSettings.feedbackDuration * 1000);

      setTimeout(() => {
          setFeedback({ ...word, score: newScore });
          setOffset(0); 
          setIsPeeked(false);
          setIsAnimating(false);
      }, 200);
       
      setTimeout(() => {
          setFeedback(null);
          if (current < queue.length - 1) {
              setCurrent(c => c + 1);
          } else {
              stopMusic(); 
              setShowSummary(true);
          }
      }, 200 + delay); 
  };

  const toggleSpelling = (id) => updateWord(id, { flag_spelling: !words.find(w => w.id === id)?.flag_spelling });
  const toggleStatusManual = (idx) => {
      const item = sessionResults[idx];
      const nextScore = getNextManualScore(item.score);
      const newResults = [...sessionResults];
      newResults[idx] = { ...item, score: nextScore };
      setSessionResults(newResults);
      updateWord(item.id, { score: nextScore });
  };
   
  const handleTouchStart = (e) => { if(!isAnimating && !feedback) setDragStart(e.touches[0].clientX); };
  const handleTouchMove = (e) => { if(dragStart && !isAnimating && !feedback) setOffset(e.touches[0].clientX - dragStart); };
  const handleTouchEnd = () => { if (!dragStart || isAnimating || feedback) return; if (offset > 100) processSwipe('RIGHT'); else if (offset < -100) processSwipe('LEFT'); else setOffset(0); setDragStart(null); };
  const handleManualSpeak = (e, text) => { e.stopPropagation(); speak(text, true); };
  
  // --- פונקציית יציאה מסודרת ---
  const handleExit = (force = false) => {
    // הפונקציה הזו תועבר מה-App או פשוט נשתמש ב-setView
    // התיקון האמיתי יבוא ב-App.js, כאן אנחנו רק קוראים לזה
    stopMusic();
    setView('GAMES_MENU'); // זה אמור להפעיל את המודאל אם לא תיקנו, אבל נתקן ב-App
  };

  // --- מסך 1: לובי ---
  if (!isPlaying && !showSummary) {
      return (
          <GameLobby 
              title="Swipe"
              icon={BookOpen}
              subtitle="מיון מהיר לשינון"
              instructions="החלק ימינה מילים שאתה מכיר, והחלק שמאלה מילים שאתה רוצה ללמוד. הקש על הכרטיס לחשיפת התרגום שלו וסימון כמילה שצריכה חיזוק."
              onPlay={startGame}
              onBack={() => setView('GAMES_MENU')}
              settingsContent={
                  <div className="space-y-6">
                      <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                          <div className="flex justify-between items-center mb-2">
                              <span className="font-bold text-indigo-900 flex items-center gap-2"><Sparkles size={18}/> מצב חכם</span>
                              <button onClick={() => setGameSettings(prev => ({...prev, isSmartMode: !prev.isSmartMode}))} className={`w-12 h-6 rounded-full transition-colors relative ${gameSettings.isSmartMode ? 'bg-indigo-600' : 'bg-gray-300'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${gameSettings.isSmartMode ? 'left-1 translate-x-6' : 'left-1'}`} /></button>
                          </div>
                          <p className="text-xs text-indigo-700 leading-tight">המערכת תבחר עבורך מילים בצורה אופטימלית לפי ההתקדמות שלך.</p>
                      </div>

                      {!gameSettings.isSmartMode && (
                          <div className="animate-in slide-in-from-top-2 fade-in">
                              <label className="text-sm font-bold text-gray-700 block mb-2">מקור מילים (ידני)</label>
                              <div className="grid grid-cols-2 gap-2">
                                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                                      <label key={key} className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer ${gameSettings.wordSource[key] ? `border-${config.color}-200 bg-${config.color}-50 text-${config.color}-700` : 'border-gray-200 text-gray-400'}`}>
                                          <input type="checkbox" checked={gameSettings.wordSource[key]} onChange={() => setGameSettings(prev => ({...prev, wordSource: {...prev.wordSource, [key]: !prev.wordSource[key]}}))} className="hidden"/>
                                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${gameSettings.wordSource[key] ? `bg-${config.color}-500 border-${config.color}-500` : 'border-gray-300'}`}>{gameSettings.wordSource[key] && <Check size={12} className="text-white"/>}</div>
                                          <span className="text-sm font-bold">{config.label}</span>
                                      </label>
                                  ))}
                              </div>
                          </div>
                      )}

                      <div className="space-y-4 pt-4 border-t border-gray-100">
                          <div>
                              <div className="flex justify-between mb-2"><label className="text-sm font-bold text-gray-700">כמות כרטיסים</label><span className="text-indigo-600 font-bold">{gameSettings.amount}</span></div>
                              <input type="range" min="10" max="50" step="5" value={gameSettings.amount} onChange={(e) => setGameSettings({...gameSettings, amount: Number(e.target.value)})} className="w-full accent-indigo-600"/>
                          </div>
                          <div>
                              <label className="text-sm font-bold text-gray-700 block mb-2">שפה בכרטיס</label>
                              <div className="flex bg-gray-100 p-1 rounded-xl">{[{id: 'EN', label: 'אנגלית'}, {id: 'HE', label: 'עברית'}, {id: 'MIX', label: 'מעורב'}].map(opt => (<button key={opt.id} onClick={() => setGameSettings({...gameSettings, languageMode: opt.id})} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${gameSettings.languageMode === opt.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>{opt.label}</button>))}</div>
                          </div>
                          <div className={audioSettings.tts ? 'opacity-50 grayscale' : ''}>
                              <div className="flex justify-between mb-2"><label className="text-sm font-bold text-gray-700">זמן משוב</label><span className="text-indigo-600 font-bold">{gameSettings.feedbackDuration}s</span></div>
                              <input type="range" min="0.4" max="2.0" step="0.1" value={gameSettings.feedbackDuration} onChange={(e) => {if (audioSettings.tts) return; setGameSettings({...gameSettings, feedbackDuration: Number(e.target.value)});}} disabled={audioSettings.tts} className="w-full accent-indigo-600"/>
                          </div>
                      </div>
                  </div>
              }
          />
      );
  }

  // --- מסך 3: סיכום ---
  if (showSummary) {
      return (
        <div className="h-[100dvh] bg-gray-50 flex flex-col text-right" dir="rtl">
            <Header title="סיכום סשן" onBack={onGameFinish} subtitle="תוצאות המיון" />
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {sessionResults.map((item, idx) => {
                    const isSpelling = words.find(w => w.id === item.id)?.flag_spelling;
                    const color = getScoreColorClass(item.score);
                    const statusLabel = getHebrewLabel(item.score);
                    return (
                      <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                          <div className="flex-1 ml-4 overflow-hidden">
                              <div className="font-bold text-gray-800 truncate">{item.english}</div>
                              <div className="text-sm text-gray-500">{item.hebrew}</div>
                          </div>
                          <div className="flex items-center gap-2">
                              <button onClick={() => toggleSpelling(item.id)} className={`p-2 rounded-lg border ${isSpelling ? 'bg-indigo-100 text-indigo-600 border-indigo-200' : 'bg-gray-50 text-gray-300 border-gray-100'}`}>
                                  <Languages size={18}/>
                              </button>
                              <button onClick={() => toggleStatusManual(idx)} className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg border transition-colors shrink-0 bg-${color}-50 text-${color}-700 border-${color}-200`}>
                                  {statusLabel} <Edit3 size={14} className="opacity-50"/>
                              </button>
                          </div>
                      </div>
                    );
                })}
            </div>
            {/* כפתור יציאה שמשתמש ב-handleExit */}
            <div className="p-4 bg-white border-t border-gray-100">
                <Button onClick={onGameFinish} className="w-full py-4 text-lg">סיום וחזרה</Button>
            </div>
        </div>
    );
  }

  // --- מסך 2: המשחק ---
  if (queue.length === 0) return <div className="h-[100dvh] flex items-center justify-center bg-gray-50 text-indigo-600"><Loader2 className="animate-spin"/></div>;

  const word = queue[current];
  const dynamicFontSize = `${Math.min(3.5, 18 / word.english.length)}rem`;
  const mainText = word.showEnglish ? word.english : word.hebrew;
  const subText = word.showEnglish ? word.hebrew : word.english;

  let cardStyle = "bg-white border-white";
  let overlayColor = "";
  if (offset > 50) { cardStyle = "bg-green-50 border-green-100"; overlayColor = "bg-green-500/10"; }
  else if (offset < -50) { cardStyle = "bg-red-50 border-red-100"; overlayColor = "bg-red-500/10"; }
  else if (isPeeked) { cardStyle = "bg-amber-50 border-amber-100"; }

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-50" dir="rtl">
       <Header title="Swipe" onBack={() => { stopMusic(); setView('GAMES_MENU'); }} subtitle={`${current + 1} מתוך ${queue.length}`} />

      <div className="flex-1 relative flex items-center justify-center perspective-1000 p-6 overflow-hidden">
          {!feedback && (
            <div 
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={() => { 
                    if (Math.abs(offset) <= 5 && !isAnimating && !feedback) {
                        setIsPeeked(true);
                        if (audioSettings.tts) speak(word.english);
                        vibrate(40); 
                    }
                }}
                style={{ transform: `translateX(${offset}px) rotate(${offset / 25}deg)`, transition: isAnimating ? 'transform 0.4s ease-out' : 'background-color 0.2s', cursor: 'grab' }}
                className={`w-full h-full max-h-[500px] rounded-[2rem] shadow-xl flex flex-col items-center justify-center p-8 relative border-4 select-none z-20 ${cardStyle}`}
            >
                {overlayColor && <div className={`absolute inset-0 rounded-[1.8rem] pointer-events-none transition-colors ${overlayColor}`}></div>}
                
                <button onClick={(e) => handleManualSpeak(e, word.english)} className="absolute top-4 left-4 p-3 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 z-30 shadow-sm active:scale-90 transition-transform">
                    <Volume2 size={24} />
                </button>

                <div className="flex-1 flex flex-col items-center justify-center w-full text-center overflow-hidden z-10">
                    <h2 dir="ltr" style={{ fontSize: dynamicFontSize }} className="font-bold text-gray-800 leading-tight text-center w-full whitespace-nowrap overflow-hidden">
                        {mainText}
                    </h2>
                    <p className="text-gray-400 text-xl mt-4 bg-gray-100 px-3 py-1 rounded-full text-sm font-medium">{word.partOfSpeech}</p>
                    
                    {isPeeked && (
                        <div className="mt-8 animate-in fade-in zoom-in-95 duration-200 w-full">
                            <div className="h-px w-16 bg-gray-200 mx-auto mb-8"></div>
                            <h3 className="text-3xl font-bold text-indigo-600 mb-4" dir="ltr">{subText}</h3>
                            <p className="text-amber-600 text-xs font-bold bg-amber-50 border border-amber-100 px-3 py-1 rounded-full inline-block">סומן לחיזוק</p>
                        </div>
                    )}
                </div>
                {!isPeeked && <p className="absolute bottom-8 text-gray-300 text-sm animate-pulse">לחץ להצצה בתרגום</p>}
            </div>
          )}
          {feedback && (
             <div className="absolute inset-0 flex flex-col items-center justify-center z-30 animate-in fade-in zoom-in-95 duration-200 bg-white/95 backdrop-blur-sm">
                 <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-8 shadow-sm ${getScoreColorClass(feedback.score) === 'green' ? 'bg-green-100 text-green-600' : getScoreColorClass(feedback.score) === 'amber' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                     {feedback.score >= 5 && <Check size={48}/>}
                     {feedback.score >= 3 && feedback.score < 5 && <Eye size={48}/>}
                     {feedback.score <= 2 && <X size={48}/>}
                 </div>
                 <h2 className="text-4xl font-bold text-gray-800 mb-2 px-2 text-center" dir="ltr">{word.english}</h2>
                 <h3 className="text-2xl text-gray-400 mb-8 font-medium px-4 text-center">{word.hebrew}</h3>
             </div>
          )}
      </div>
    </div>
  );
}