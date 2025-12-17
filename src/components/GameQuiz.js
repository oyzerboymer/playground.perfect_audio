import React, { useState, useEffect } from 'react';
import { Clock, Loader2, Languages, Edit3, Zap, Brain, Check, AlertTriangle } from 'lucide-react';
import { Header, Button } from './UIComponents';
import GameLobby from './GameLobby';
import { useAudio } from '../contexts/AudioContext';
// שינוי 1: ייבוא הפונקציה החדשה getQuizStyle
import { shuffleArray, getScoreColorClass, getHebrewLabel, getNextManualScore, getQuizStyle } from '../utils';

// שינוי 2: הוספת ברירת המחדל
const DEFAULT_QUIZ_SETTINGS = {
    isSmartMode: true,
    wordSource: { unseen: true, learn: true, weak: true, known: true },
    questionCount: 20,
    timerDuration: 5,
    panicThreshold: 3,
    languageMode: 'MIX' // ברירת מחדל למצב מעורב
};

const CATEGORY_CONFIG = {
    unseen: { label: 'חדש', color: 'gray' },
    learn: { label: 'למידה', color: 'indigo' },
    weak: { label: 'לחיזוק', color: 'amber' },
    known: { label: 'יודע', color: 'green' }
};

export default function QuizGame({ words, updateWord, setView, onGameFinish }) {
    const [settings, setSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('quiz_settings');
            return saved ? JSON.parse(saved) : DEFAULT_QUIZ_SETTINGS;
        } catch (e) {
            return DEFAULT_QUIZ_SETTINGS;
        }
    });

    useEffect(() => {
        localStorage.setItem('quiz_settings', JSON.stringify(settings));
    }, [settings]);

    const [isPlaying, setIsPlaying] = useState(false);
    const [questions, setQuestions] = useState([]);
    const [current, setCurrent] = useState(0);
    const [timer, setTimer] = useState(settings.timerDuration);
    const [selectedOpt, setSelectedOpt] = useState(null); 
    const [feedback, setFeedback] = useState(null); 
    const [sessionResults, setSessionResults] = useState([]);
    const [showSummary, setShowSummary] = useState(false);
    const [scoreCount, setScoreCount] = useState(0);
    const [isPanic, setIsPanic] = useState(false);

    const { playSFX, playMusic, stopMusic, vibrate, speak, audioSettings, setGameScope } = useAudio();

    useEffect(() => {
      setGameScope('QUIZ');
      return () => {
          stopMusic();
          setGameScope('GLOBAL');
      };
    }, []);

    useEffect(() => {
        if (!isPlaying || showSummary || feedback) return;
        
        if (timer <= 0) { 
            handleAnswer(null, true); 
            return; 
        } 

        const interval = setInterval(() => {
            setTimer(prev => Math.max(0, prev - 0.1));
        }, 100);

        return () => clearInterval(interval);
    }, [timer, feedback, showSummary, isPlaying]);


    const startGame = () => {
        const totalWords = words.length;
        const touchedWords = words.filter(w => w.score > 0).length;
        const progress = totalWords > 0 ? Math.round((touchedWords / totalWords) * 100) : 0;

        let dist = { unseen: 0, learn: 0, weak: 0, known: 0 };
        if (progress <= 10) dist = { unseen: 100, learn: 0, weak: 0, known: 0 };
        else if (progress <= 30) dist = { unseen: 90, learn: 0, weak: 10, known: 0 };
        else if (progress <= 60) dist = { unseen: 65, learn: 10, weak: 20, known: 5 };
        else if (progress <= 90) dist = { unseen: 40, learn: 20, weak: 25, known: 15 };
        else if (progress <= 99) dist = { unseen: 10, learn: 30, weak: 35, known: 25 };
        else dist = { unseen: 0, learn: 30, weak: 40, known: 30 };

        const getPool = (min, max) => words.filter(w => w.score >= min && w.score <= max);
        const pools = {
            unseen: getPool(0, 0),
            learn: getPool(1, 2),
            weak: getPool(3, 4),
            known: getPool(5, 100).sort((a,b) => a.score - b.score) 
        };

        let qWords = [];
        const target = settings.questionCount;

        if (settings.isSmartMode) {
             Object.keys(dist).forEach(key => {
                const count = Math.floor((dist[key] / 100) * target);
                let pool = pools[key];
                if (key !== 'known') pool = shuffleArray(pool);
                qWords = [...qWords, ...pool.slice(0, count)];
            });

            if (qWords.length < target) {
                const usedIds = new Set(qWords.map(w => w.id));
                const backup = shuffleArray(words.filter(w => !usedIds.has(w.id)));
                qWords = [...qWords, ...backup.slice(0, target - qWords.length)];
            }
        } else {
            const pool = words.filter(w => {
                if (w.score === 0 && settings.wordSource.unseen) return true;
                if (w.score >= 1 && w.score <= 2 && settings.wordSource.learn) return true;
                if (w.score >= 3 && w.score <= 4 && settings.wordSource.weak) return true;
                if (w.score >= 5 && settings.wordSource.known) return true;
                return false;
            });
            qWords = shuffleArray(pool).slice(0, target);
        }

        if (qWords.length < 5) {
            alert("אין מספיק מילים (מינימום 5)");
            return;
        }

        const qList = shuffleArray(qWords).map(word => {
            // שינוי 3: לוגיקת בחירת שפה לפי ההגדרות
            let isEngQuestion = true;
            if (settings.languageMode === 'EN') isEngQuestion = true;
            else if (settings.languageMode === 'HE') isEngQuestion = false;
            else isEngQuestion = Math.random() > 0.5;

            const distractors = shuffleArray(words.filter(w => w.id !== word.id)).slice(0, 3);
            return {
                word,
                isEngQuestion,
                questionText: isEngQuestion ? word.english : word.hebrew,
                options: shuffleArray([...distractors, word]).map(o => ({
                    id: o.id, text: isEngQuestion ? o.hebrew : o.english
                }))
            };
        });

        setQuestions(qList);
        setCurrent(0);
        setTimer(settings.timerDuration);
        setScoreCount(0);
        setIsPlaying(true);
        playMusic('TENSION'); 
    };

    const handleAnswer = (option, isTimeout = false) => {
        const q = questions[current];
        const isCorrect = !isTimeout && option && option.id === q.word.id;
        const panic = timer < settings.panicThreshold;
        
        setSelectedOpt(option ? option.id : null);
        setFeedback(isCorrect ? 'CORRECT' : 'WRONG');
        setIsPanic(panic);
        
        if (isCorrect) {
            playSFX('CORRECT'); 
            setScoreCount(s => s + 1);
            vibrate(40);
        } else {
            playSFX('WRONG');
            vibrate(200);
        }

        const oldScore = q.word.score;
        let newScore = oldScore;

        if (isCorrect) {
            if (oldScore === 0) newScore = 5; 
            else newScore = Math.min(10, oldScore + 1);
        } else {
            if (oldScore >= 10) newScore = 4;
            else if (oldScore >= 5) newScore = (!panic && !isTimeout) ? 3 : 2;
            else if (oldScore >= 3) newScore = (!panic && !isTimeout) ? oldScore - 1 : oldScore - 2;
            else newScore = 1; 
        }
        
        if (newScore !== oldScore) {
            updateWord(q.word.id, { score: newScore });
        }

        setSessionResults(prev => [...prev, { ...q.word, score: newScore, correct: isCorrect }]);

        let delay = 1200; 
        if (audioSettings.tts) {
            setTimeout(() => {
                 speak(q.word.english);
            }, 400); 
            delay = 1800;
        }

        setTimeout(() => {
            if (current < questions.length - 1) {
                setCurrent(c => c + 1);
                setTimer(settings.timerDuration);
                setFeedback(null);
                setSelectedOpt(null);
                setIsPanic(false);
            } else {
                stopMusic(); 
                setShowSummary(true);
            }
        }, delay); 
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

    // --- מסך 1: לובי ---
    if (!isPlaying && !showSummary) {
        return (
            <GameLobby 
                title="Quiz"
                icon={Zap}
                subtitle="מבחן אמריקאי נגד הזמן"
                instructions="ענה מהר לפני שהזמן נגמר. תשובה נכונה מעלה ניקוד, טעות מורידה. האזנה למילה תתבצע אוטומטית לאחר המענה (אם מוגדר)."
                onPlay={startGame}
                onBack={() => setView('GAMES_MENU')}
                settingsContent={
                    <div className="space-y-6">
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-indigo-900 flex items-center gap-2"><Brain size={18}/> מצב חכם</span>
                                <button onClick={() => setSettings(prev => ({...prev, isSmartMode: !prev.isSmartMode}))} className={`w-12 h-6 rounded-full transition-colors relative ${settings.isSmartMode ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.isSmartMode ? 'left-1 translate-x-6' : 'left-1'}`} />
                                </button>
                            </div>
                            <p className="text-xs text-indigo-700">המערכת תבחר שאלות מאתגרות לפי הרמה שלך.</p>
                        </div>

                        {!settings.isSmartMode && (
                            <div className="animate-in slide-in-from-top-2 fade-in">
                                <label className="text-sm font-bold text-gray-700 block mb-2">מקור שאלות</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                                        <label key={key} className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer ${settings.wordSource[key] ? `border-${config.color}-200 bg-${config.color}-50 text-${config.color}-700` : 'border-gray-200 text-gray-400'}`}>
                                            <input type="checkbox" checked={settings.wordSource[key]} onChange={() => setSettings(prev => ({...prev, wordSource: {...prev.wordSource, [key]: !prev.wordSource[key]}}))} className="hidden"/>
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${settings.wordSource[key] ? `bg-${config.color}-500 border-${config.color}-500` : 'border-gray-300'}`}>{settings.wordSource[key] && <Check size={12} className="text-white"/>}</div>
                                            <span className="text-sm font-bold">{config.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* שינוי 4: ממשק בחירת שפה בלובי */}
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                             <div>
                                <label className="text-sm font-bold text-gray-700 block mb-2">שפת השאלה</label>
                                <div className="flex bg-gray-100 p-1 rounded-xl">
                                    {[
                                        {id: 'MIX', label: 'מעורב'},
                                        {id: 'EN', label: 'אנגלית'}, 
                                        {id: 'HE', label: 'עברית'}
                                    ].map(opt => (
                                        <button 
                                            key={opt.id} 
                                            onClick={() => setSettings({...settings, languageMode: opt.id})} 
                                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${settings.languageMode === opt.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-bold text-gray-700">זמן לשאלה</label>
                                    <span className="text-indigo-600 font-bold">{settings.timerDuration} שניות</span>
                                </div>
                                <input type="range" min="3" max="15" value={settings.timerDuration} onChange={(e) => setSettings({...settings, timerDuration: Number(e.target.value)})} className="w-full accent-indigo-600"/>
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-bold text-gray-700">כמות שאלות</label>
                                    <span className="text-indigo-600 font-bold">{settings.questionCount}</span>
                                </div>
                                <input type="range" min="10" max="50" step="5" value={settings.questionCount} onChange={(e) => setSettings({...settings, questionCount: Number(e.target.value)})} className="w-full accent-indigo-600"/>
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
              <Header title="סיכום מבחן" onBack={onGameFinish} subtitle={`ציון: ${scoreCount} מתוך ${questions.length}`} />
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {sessionResults.map((item, idx) => {
                      const isSpelling = words.find(w => w.id === item.id)?.flag_spelling;
                      const color = getScoreColorClass(item.score);
                      const label = getHebrewLabel(item.score);
                      return (
                        <div key={idx} className={`bg-white p-4 rounded-2xl shadow-sm border flex justify-between items-center ${item.correct ? 'border-gray-100' : 'border-red-100 bg-red-50/30'}`}>
                            <div className="flex-1 ml-4 overflow-hidden">
                                <div className="font-bold text-gray-800 truncate">{item.english}</div>
                                <div className="text-sm text-gray-500">{item.hebrew}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => toggleSpelling(item.id)} className={`p-2 rounded-lg border ${isSpelling ? 'bg-indigo-100 text-indigo-600 border-indigo-200' : 'bg-gray-50 text-gray-300 border-gray-100'}`}><Languages size={18}/></button>
                                <button onClick={() => toggleStatusManual(idx)} className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg border bg-${color}-50 text-${color}-700 border-${color}-200`}>{label} <Edit3 size={14} className="opacity-50"/></button>
                            </div>
                        </div>
                      );
                  })}
              </div>
              <div className="p-4 bg-white border-t border-gray-100">
                <Button onClick={onGameFinish} className="w-full py-4 text-lg">חזור לתפריט</Button>
            </div>
          </div>
        );
    }

    if (questions.length === 0) return <div className="flex h-screen items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-indigo-600"/></div>;
    const q = questions[current];
    
    const TimerDisplay = () => (
        <div className={`flex items-center gap-1 font-bold ${timer < 2 ? 'text-red-500 animate-pulse' : 'text-indigo-600'}`}>
            <span className="text-lg">{Math.ceil(timer)}</span>
            <Clock size={16}/>
        </div>
    );

    return (
        <div className="h-[100dvh] flex flex-col bg-gray-50 text-right overflow-hidden" dir="rtl">
            <Header 
                title="Quiz" 
                onBack={() => setView('GAMES_MENU')} 
                subtitle={`${current + 1} / ${questions.length}`}
                extraLeft={<TimerDisplay/>}
            />
            
            <div className="flex-none h-[35%] flex items-center justify-center w-full p-6 pb-2">
                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 w-full h-full flex flex-col items-center justify-center p-6 text-center overflow-hidden relative">
                    
                    {/* שינוי 5: שימוש בפונקציה החדשה getQuizStyle */}
                    <h2 
                        dir="ltr" 
                        style={getQuizStyle(q.questionText, q.isEngQuestion)} 
                        className="font-bold text-gray-800 w-full px-2"
                    >
                        {q.questionText}
                    </h2>
                    
                    <p className="text-gray-400 mt-2 text-sm font-medium">בחר את התרגום הנכון</p>
                    
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100">
                         <div className={`h-full transition-all linear ${timer < 2 ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${(timer / settings.timerDuration) * 100}%` }}></div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-start gap-3 p-6 pt-2">
                {q.options.map((opt) => {
                    let btnClass = "bg-white border-2 border-gray-100 text-gray-600 hover:border-gray-200";
                    if (feedback) {
                        if (opt.id === q.word.id) btnClass = "bg-green-50 border-green-500 text-green-800 font-bold";
                        else if (opt.id === selectedOpt) btnClass = "bg-red-50 border-red-500 text-red-800";
                        else btnClass = "opacity-40 bg-gray-50 border-transparent grayscale";
                    }

                    return (
                        <button 
                            key={opt.id} 
                            disabled={feedback !== null} 
                            onClick={() => handleAnswer(opt)} 
                            className={`flex-1 rounded-2xl text-xl font-medium transition-all shadow-sm outline-none active:scale-95 ${btnClass}`}
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                            {opt.text}
                        </button>
                    );
                })}
            </div>
            {feedback === 'WRONG' && isPanic && (
                 <div className="absolute bottom-4 left-0 right-0 text-center text-red-500 font-bold animate-pulse">
                     <AlertTriangle size={16} className="inline mr-1"/> לחץ זמן! ענישה כפולה
                 </div>
            )}
        </div>
    );
};