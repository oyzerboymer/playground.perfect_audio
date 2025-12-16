import React, { useState, useEffect, useRef } from 'react';
import { Lightbulb, Languages, Edit3, Clock, Zap, Brain, Check, Flame, Files, TimerOff } from 'lucide-react';
import { Header, Button } from './UIComponents';
import GameLobby from './GameLobby';
import { useAudio } from '../contexts/AudioContext';
import { shuffleArray, getHebrewLabel, getScoreColorClass, getNextManualScore } from '../utils';

const DEFAULT_MATCH_SETTINGS = {
    isSmartMode: true,
    isTimedMode: true, 
    wordSource: { unseen: true, learn: true, weak: true, known: true },
};

const CATEGORY_CONFIG = {
    unseen: { label: 'חדש', color: 'gray' },
    learn: { label: 'למידה', color: 'indigo' },
    weak: { label: 'לחיזוק', color: 'amber' },
    known: { label: 'יודע', color: 'green' }
};

export default function MatchGame({ words, updateWord, setView, onGameFinish } ) {
    const [settings, setSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('match_settings');
            return saved ? JSON.parse(saved) : DEFAULT_MATCH_SETTINGS;
        } catch (e) { return DEFAULT_MATCH_SETTINGS; }
    });

    useEffect(() => { localStorage.setItem('match_settings', JSON.stringify(settings)); }, [settings]);

    const [isPlaying, setIsPlaying] = useState(false);
    const [board, setBoard] = useState(Array(12).fill(null));
    const [selected, setSelected] = useState([]);
    const [matchesFound, setMatchesFound] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [hintIndices, setHintIndices] = useState([]);
    const [showSummary, setShowSummary] = useState(false);
    const [sessionResults, setSessionResults] = useState([]);
    
    // טיימרים וסטייטים חדשים
    const [timer, setTimer] = useState(30); 
    const [streak, setStreak] = useState(0);
    const [showCombo, setShowCombo] = useState(false);
    const [showTimeout, setShowTimeout] = useState(false); // סטייט להודעת "הזמן נגמר"
    const [implodingIds, setImplodingIds] = useState([]); 
    const [isBankPulsing, setIsBankPulsing] = useState(false); 

    const hintedWords = useRef(new Set()); 
    const sessionHistory = useRef(new Set()); 

    const { playSFX, playMusic, stopMusic, vibrate, speak, audioSettings, setGameScope } = useAudio();

    useEffect(() => {
        setGameScope('MATCH');
        return () => {
            stopMusic();
            setGameScope('GLOBAL');
        };
    }, []);

    // לוגיקת טיימר משודרגת
    useEffect(() => {
        if (!isPlaying || !settings.isTimedMode || showSummary || showTimeout) return;
        
        if (timer <= 0) {
            stopMusic();
            setShowTimeout(true); // קודם מציגים "הזמן נגמר"
            playSFX('FAIL'); // אפקט סיום
            
            setTimeout(() => {
                setShowTimeout(false);
                setShowSummary(true); // ורק אחרי 2 שניות עוברים לסיכום
            }, 2000);
            return;
        }

        const interval = setInterval(() => {
            setTimer(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, [timer, isPlaying, showSummary, showTimeout, settings.isTimedMode]);

    // === אלגוריתם המילוי המקורי ===
    const getNextWord = (currentBoard) => {
        const activeCards = currentBoard.filter(c => c !== null);
        const hardCardsCount = activeCards.filter(c => c.wordScore >= 1 && c.wordScore <= 4).length;
        const totalActive = activeCards.length || 1;
        const hardRatio = hardCardsCount / totalActive;

        let targetPoolType = 'BALANCED';
        if (hardRatio > 0.6) targetPoolType = 'COOLDOWN'; 
        if (hardRatio < 0.2) targetPoolType = 'HEATUP';   

        const availableWords = words.filter(w => !sessionHistory.current.has(w.id));
        
        if (availableWords.length === 0) {
            sessionHistory.current.clear();
            return words[Math.floor(Math.random() * words.length)];
        }

        const pools = {
            unseen: availableWords.filter(w => w.score === 0),
            hard: availableWords.filter(w => w.score >= 1 && w.score <= 4),
            known: availableWords.filter(w => w.score >= 5).sort((a,b) => a.score - b.score) 
        };

        let finalPool = [];
        if (settings.isSmartMode) {
            if (targetPoolType === 'COOLDOWN') {
                if (pools.unseen.length > 0) finalPool = [...finalPool, ...pools.unseen];
                if (pools.known.length > 0) finalPool = [...finalPool, ...pools.known];
                if (finalPool.length === 0) finalPool = availableWords; 
            } else if (targetPoolType === 'HEATUP') {
                if (pools.hard.length > 0) finalPool = pools.hard;
                else finalPool = [...pools.unseen, ...pools.known];
            } else {
                const rand = Math.random();
                if (rand < 0.2 && pools.unseen.length) finalPool = pools.unseen;
                else if (rand < 0.7 && pools.hard.length) finalPool = pools.hard;
                else if (pools.known.length) finalPool = pools.known;
                else finalPool = availableWords;
            }
        } else {
             finalPool = availableWords; 
        }

        if (finalPool.length === 0) finalPool = availableWords;
        const selectedWord = finalPool[Math.floor(Math.random() * finalPool.length)];
        sessionHistory.current.add(selectedWord.id);
        return selectedWord;
    };

    const createCard = (word, type) => ({
        id: `c_${word.id}_${type}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        wordId: word.id,
        text: type === 'EN' ? word.english : word.hebrew,
        type,
        wordScore: word.score 
    });

    const refillBoard = (currentBoard) => {
        let nextBoard = [...currentBoard];
        let emptyIndices = nextBoard.map((c, i) => c === null ? i : -1).filter(i => i !== -1);
        if (emptyIndices.length === 0) return nextBoard;

        const newCardsBuffer = [];
        const activeCards = nextBoard.filter(c => c !== null);
        
        if (activeCards.length === 0) {
            const initWords = [];
            while(initWords.length < 8) {
                const w = getNextWord(nextBoard);
                if(!initWords.find(exist => exist.id === w.id)) initWords.push(w);
            }
            for (let i = 0; i < 4; i++) {
                newCardsBuffer.push(createCard(initWords[i], 'EN'));
                newCardsBuffer.push(createCard(initWords[i], 'HE'));
            }
            newCardsBuffer.push(createCard(initWords[4], 'EN'));
            newCardsBuffer.push(createCard(initWords[5], 'EN'));
            newCardsBuffer.push(createCard(initWords[6], 'HE'));
            newCardsBuffer.push(createCard(initWords[7], 'HE'));
        } else {
            const idCounts = {};
            activeCards.forEach(c => idCounts[c.wordId] = (idCounts[c.wordId] || 0) + 1);
            let availableOrphans = activeCards.filter(c => idCounts[c.wordId] === 1);

            const enCount = activeCards.filter(c => c.type === 'EN').length;
            const heCount = activeCards.filter(c => c.type === 'HE').length;
            let neededEn = 6 - enCount;
            let neededHe = 6 - heCount;

            let slots = emptyIndices.length;
            const maxOrphansToMatch = Math.max(1, Math.floor(slots / 2));
            let orphansMatchedThisRefill = 0;

            while (slots > 0) {
                let cardAdded = false;
                if (availableOrphans.length > 0 && orphansMatchedThisRefill < maxOrphansToMatch) {
                    const candidates = availableOrphans.filter(o => {
                        const neededType = o.type === 'EN' ? 'HE' : 'EN';
                        return neededType === 'EN' ? neededEn > 0 : neededHe > 0;
                    });
                    if (candidates.length > 0) {
                        const orphan = candidates[Math.floor(Math.random() * candidates.length)];
                        const typeToAdd = orphan.type === 'EN' ? 'HE' : 'EN';
                        const w = words.find(x => x.id === orphan.wordId);
                        if (w) {
                            newCardsBuffer.push(createCard(w, typeToAdd));
                            if (typeToAdd === 'EN') neededEn--; else neededHe--;
                            const orphanIndexInAvailable = availableOrphans.findIndex(o => o.id === orphan.id);
                            if (orphanIndexInAvailable > -1) availableOrphans.splice(orphanIndexInAvailable, 1);
                            cardAdded = true;
                            orphansMatchedThisRefill++;
                        }
                    }
                }
                if (!cardAdded) {
                    const newWord = getNextWord(nextBoard);
                    let typeToAdd = 'EN';
                    if (neededHe > neededEn) typeToAdd = 'HE';
                    else if (neededEn > neededHe) typeToAdd = 'EN';
                    else typeToAdd = Math.random() > 0.5 ? 'EN' : 'HE';
                    newCardsBuffer.push(createCard(newWord, typeToAdd));
                    if (typeToAdd === 'EN') neededEn--; else neededHe--;
                }
                slots--;
            }
        }
        const shuffledBuffer = shuffleArray(newCardsBuffer);
        emptyIndices.forEach((boardIndex, i) => { nextBoard[boardIndex] = shuffledBuffer[i]; });
        return nextBoard;
    };

    const startGame = () => {
        setBoard(refillBoard(Array(12).fill(null)));
        setMatchesFound(0);
        setTimer(30); 
        setStreak(0);
        setSessionResults([]);
        setIsPlaying(true);
        setShowTimeout(false);
        playMusic('CALM');
    };

    const handleCardClick = (card, index) => {
        if (isLocked || !card || implodingIds.includes(card.id)) return;
        
        if (selected.length === 1 && selected[0].index === index) { setSelected([]); return; }
        if (selected.find(s => s.index === index)) return;
        
        playSFX('MATCH_POP');
        
        const newSelected = [...selected, { ...card, index }];
        setSelected(newSelected);

        if (newSelected.length === 2) {
            setIsLocked(true);
            const [c1, c2] = newSelected;
            const w1 = words.find(w => w.id === c1.wordId);

            if (c1.wordId === c2.wordId && c1.type !== c2.type) {
                // SUCCESS
                playSFX('SUCCESS');
                vibrate(40);
                setMatchesFound(p => p + 1);
                
                if (settings.isTimedMode) setTimer(t => t + 3); 
                
                const newStreak = streak + 1;
                setStreak(newStreak);
                
                // COMBO
                if (newStreak % 5 === 0 && newStreak > 0) {
                    setShowCombo(true);
                    if (settings.isTimedMode) setTimer(t => t + 5); 
                    playSFX('COMBO', Math.min(newStreak / 5, 8));
                    setTimeout(() => setShowCombo(false), 700);
                }

                let newScore = w1.score;
                if (!hintedWords.current.has(c1.wordId)) {
                    if (w1.score === 0) newScore = 5; else newScore = w1.score + 1;
                } else {
                    if (w1.score === 0) newScore = 1;
                }
                updateWord(c1.wordId, { score: newScore });
                addToSummary(c1.wordId, newScore);

                let delay = 650;
                if (audioSettings.tts) {
                    speak(w1.english);
                    delay = 1600;
                }

                setTimeout(() => {
                    playSFX('MATCH_SUCTION');
                    setImplodingIds([c1.id, c2.id]);
                    
                    setTimeout(() => {
                        const nextBoard = [...board];
                        nextBoard[c1.index] = null;
                        nextBoard[c2.index] = null;
                        
                        setBoard(refillBoard(nextBoard));
                        setSelected([]);
                        setImplodingIds([]);
                        setIsLocked(false);
                        setHintIndices([]);
                        
                        setIsBankPulsing(true);
                        setTimeout(() => setIsBankPulsing(false), 300);
                    }, 300); 
                }, delay);

            } else {
                // FAIL
                playSFX('FAIL');
                vibrate(200);
                setStreak(0); 
                if (settings.isTimedMode) setTimer(t => Math.max(0, t - 2));

                [c1, c2].forEach(c => {
                    const w = words.find(x => x.id === c.wordId);
                    let newScore = w.score;
                    if (w.score === 0) newScore = 1; else newScore = Math.max(1, w.score - 1); 
                    updateWord(c.wordId, { score: newScore });
                    addToSummary(c.wordId, newScore);
                });

                setTimeout(() => {
                    const nextBoard = [...board];
                    const idsToBurn = [c1.wordId, c2.wordId];
                    for (let i = 0; i < nextBoard.length; i++) {
                        if (nextBoard[i] && idsToBurn.includes(nextBoard[i].wordId)) nextBoard[i] = null;
                    }
                    setBoard(refillBoard(nextBoard));
                    setSelected([]);
                    setIsLocked(false);
                }, 1000);
            }
        }
    };

    const handleHint = () => {
        if (hintIndices.length > 0 || isLocked) return;
        let pairIndices = [];
        for (let i = 0; i < board.length; i++) {
            if (!board[i]) continue;
            for (let j = i + 1; j < board.length; j++) {
                if (board[j] && board[i].wordId === board[j].wordId) { pairIndices = [i, j]; break; }
            }
            if (pairIndices.length > 0) break;
        }
        if (pairIndices.length === 2) {
            hintedWords.current.add(board[pairIndices[0]].wordId);
            setHintIndices(pairIndices);
            setTimeout(() => setHintIndices([]), 800);
        }
    };

    const addToSummary = (wordId, score) => {
        setSessionResults(prev => {
            const word = words.find(w => w.id === wordId);
            if (!word) return prev;
            return [...prev.filter(item => item.id !== wordId), { ...word, score }];
        });
    };

    const toggleStatusManual = (idx) => {
        const item = sessionResults[idx];
        const nextScore = getNextManualScore(item.score);
        const newResults = [...sessionResults];
        newResults[idx] = { ...item, score: nextScore };
        setSessionResults(newResults);
        updateWord(item.id, { score: nextScore });
    };

    const toggleSpelling = (id) => {
        const currentFlag = words.find(w => w.id === id)?.flag_spelling;
        updateWord(id, { flag_spelling: !currentFlag });
    };

    if (!isPlaying && !showSummary) {
        return (
            <GameLobby 
                title="Match"
                icon={Zap}
                subtitle="מצא את הזוגות"
                instructions="התאם בין מילה לתרגום שלה. במצב 'נגד הזמן', התאמה מוסיפה זמן וטעות מורידה. שימו לב: טעות גם 'שורפת' את הקלפים מהלוח!"
                onPlay={startGame}
                onBack={() => setView('GAMES_MENU')}
                settingsContent={
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 rounded-xl border bg-white border-gray-200">
                            <span className="font-bold text-gray-800 flex items-center gap-2"><Clock size={20} className="text-indigo-600"/> נגד הזמן</span>
                            <button onClick={() => setSettings(prev => ({...prev, isTimedMode: !prev.isTimedMode}))} className={`w-12 h-6 rounded-full transition-colors relative ${settings.isTimedMode ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.isTimedMode ? 'left-1 translate-x-6' : 'left-1'}`} />
                            </button>
                        </div>
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-indigo-900 flex items-center gap-2"><Brain size={18}/> מצב חכם</span>
                                <button onClick={() => setSettings(prev => ({...prev, isSmartMode: !prev.isSmartMode}))} className={`w-12 h-6 rounded-full transition-colors relative ${settings.isSmartMode ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.isSmartMode ? 'left-1 translate-x-6' : 'left-1'}`} />
                                </button>
                            </div>
                            <p className="text-xs text-indigo-700">המערכת תאזן אוטומטית בין מילים חדשות למילים שצריך לחזק.</p>
                        </div>
                        {!settings.isSmartMode && (
                            <div className="animate-in slide-in-from-top-2 fade-in">
                                <label className="text-sm font-bold text-gray-700 block mb-2">מקור מילים (ידני)</label>
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
                    </div>
                }
            />
        );
    }

    if (showSummary) {
        return (
            <div className="h-[100dvh] bg-gray-50 flex flex-col text-right" dir="rtl">
                <Header title="סיכום משחק" onBack={onGameFinish} subtitle={`בוצעו ${matchesFound} התאמות`} />
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {sessionResults.map((item, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                            <div><div className="font-bold text-gray-800">{item.english}</div><div className="text-sm text-gray-500">{item.hebrew}</div></div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => toggleSpelling(item.id)} className={`p-2 rounded-lg border ${words.find(w => w.id === item.id)?.flag_spelling ? 'bg-indigo-100 text-indigo-600 border-indigo-200' : 'bg-gray-50 text-gray-300 border-gray-100'}`}><Languages size={18}/></button>
                                <button onClick={() => toggleStatusManual(idx)} className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg border bg-${getScoreColorClass(item.score)}-50 text-${getScoreColorClass(item.score)}-700 border-${getScoreColorClass(item.score)}-200`}>{getHebrewLabel(item.score)} <Edit3 size={14} className="opacity-50"/></button>
                            </div>
                        </div>
                    ))}
                </div>
                {/* כאן משתמשים בפונקציה שמתקבלת מה-App, שבזכות התיקון היא לא מקפיצה מודאל */}
                <div className="p-4 bg-white border-t border-gray-100">
                <Button onClick={onGameFinish} variant="outline" className="w-full">חזור לתפריט</Button>
            </div>
            </div>
        );
    }

    return (
        <div className="h-[100dvh] bg-gray-50 flex flex-col text-right" dir="rtl">
             <Header 
                title="Match" 
                onBack={() => { stopMusic(); setShowSummary(true); }} 
                subtitle={
                  <div className={`flex items-center gap-2 px-4 py-1.5 bg-green-100 text-green-700 rounded-full shadow-sm border border-green-200 transition-all duration-300 ${isBankPulsing ? 'scale-125 bg-green-200 border-green-300' : ''}`}>
                      <Files size={22} className="stroke-2"/> 
                      <span className="text-xl font-black">{matchesFound}</span>
                  </div>
              }
                extraLeft={
                    <div className="flex items-center gap-2">
                        {settings.isTimedMode && (
                            <div className={`flex items-center gap-1 font-bold ${timer < 10 ? 'text-red-500 animate-pulse' : 'text-indigo-600'}`}>
                                <span>{timer}</span><Clock size={16}/>
                            </div>
                        )}
                        <button onClick={handleHint} className="bg-amber-100 text-amber-700 p-2 rounded-full hover:bg-amber-200 transition-colors"><Lightbulb size={20}/></button>
                    </div>
                } 
            />
            
            <div className="grid grid-cols-3 gap-3 p-4 content-start flex-1 overflow-y-auto relative">
                {/* הודעת הזמן נגמר */}
                {showTimeout && (
                     <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white text-red-600 font-black text-4xl px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-2 animate-bounce">
                            <TimerOff size={60} />
                            <div>הזמן נגמר!</div>
                        </div>
                    </div>
                )}
                
                {showCombo && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none animate-in zoom-in fade-in duration-300">
                        <div className="bg-orange-500 text-white font-black text-4xl px-8 py-4 rounded-3xl shadow-xl transform rotate-[-5deg] border-4 border-yellow-300 flex items-center gap-2">
                            <Flame size={40} className="fill-yellow-300 text-yellow-300"/> 
                            <div><div>COMBO!</div><div className="text-sm font-medium opacity-90 text-center">{streak} ברצף</div></div>
                        </div>
                    </div>
                )}

                {board.map((card, idx) => {
                    if (!card) return <div key={idx} className="h-24 rounded-2xl bg-gray-100/50 border-2 border-dashed border-gray-200"></div>;
                    const isSelected = selected.find(s => s.index === idx);
                    const isHinted = hintIndices.includes(idx);
                    const isWrong = selected.length === 2 && selected[0].wordId !== selected[1].wordId && isSelected;
                    const isImploding = implodingIds.includes(card.id);

                    return (
                        <button 
                            key={card.id} 
                            onClick={() => handleCardClick(card, idx)} 
                            className={`h-24 rounded-2xl font-bold shadow-sm text-sm p-1 break-words flex items-center justify-center transition-all duration-300 border-b-4 active:border-b-0 active:translate-y-1 outline-none focus:outline-none ring-0 select-none
                                ${isImploding ? 'scale-0 opacity-0 bg-green-100 border-green-300' : ''} 
                                ${isWrong ? 'bg-red-500 text-white border-red-700 animate-shake' : 
                                  isHinted ? 'bg-amber-100 text-amber-800 border-amber-300 ring-4 ring-amber-400 scale-105' : 
                                  isSelected ? 'bg-indigo-600 text-white border-indigo-800 scale-95' : 
                                  'bg-white text-gray-700 border-gray-200 hover:border-indigo-200 hover:text-indigo-600'}`}
                        >
                            {card.text}
                        </button>
                    );
                })}
            </div>
            
            <div className="p-4 bg-white border-t border-gray-100"><Button onClick={() => { stopMusic(); setShowSummary(true); }} variant="outline" className="w-full">סיום משחק</Button></div>
        </div>
    );
};