import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

const AudioContext = createContext();

export const useAudio = () => useContext(AudioContext);

const DEFAULT_SETTINGS = { music: true, sfx: true, tts: true, haptics: true, voiceSpeed: 1.0 };

export const AudioProvider = ({ children }) => {
    // מנהל את ה"פרופיל" הנוכחי (GLOBAL / SWIPE / QUIZ / MATCH)
    const [scope, setScope] = useState('GLOBAL');

    // טעינת הגדרות ראשונית
    const [audioSettings, setAudioSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('audio_settings_GLOBAL');
            return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
        } catch (e) {
            return DEFAULT_SETTINGS;
        }
    });

    // שמירה אוטומטית בכל שינוי - תחת הפרופיל הנוכחי
    useEffect(() => {
        localStorage.setItem(`audio_settings_${scope}`, JSON.stringify(audioSettings));
    }, [audioSettings, scope]);

    // --- נגני המוזיקה ---
    const calmTrack = useRef(new Audio('/sounds/calm.mp3'));
    const tensionTrack = useRef(new Audio('/sounds/tension.mp3'));
    const currentTrack = useRef(null); 
    const activeTrackId = useRef(null); 

    useEffect(() => {
        calmTrack.current.loop = true;
        calmTrack.current.volume = 0.35;
        
        tensionTrack.current.loop = true;
        tensionTrack.current.volume = 0.5;
    }, []);

    // --- TTS ---
    const [availableVoices, setAvailableVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState(null);

    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            const englishVoices = voices.filter(v => v.lang.includes('en'));
            setAvailableVoices(englishVoices);
            
            const savedVoiceName = localStorage.getItem('selected_voice_name');
            let voiceToSet = englishVoices.find(v => v.name === savedVoiceName);
            if (!voiceToSet) voiceToSet = englishVoices.find(v => v.default) || englishVoices[0];
            
            setSelectedVoice(voiceToSet);
        };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }, []);

    const handleSetVoice = (voice) => {
        setSelectedVoice(voice);
        if (voice) localStorage.setItem('selected_voice_name', voice.name);
    };

    const vibrate = (pattern) => {
        if (audioSettings.haptics && navigator.vibrate) {
            navigator.vibrate(pattern || 40);
        }
    };

    const speak = (text, force = false) => {
        if ((!audioSettings.tts && !force) || !text) return;
        window.speechSynthesis.cancel(); 

        if (audioSettings.music && currentTrack.current) {
            currentTrack.current.volume = 0.05;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        if (selectedVoice) utterance.voice = selectedVoice;
        utterance.lang = 'en-US'; 
        utterance.rate = audioSettings.voiceSpeed; 

        utterance.onend = () => {
            if (audioSettings.music && currentTrack.current) {
                currentTrack.current.volume = (activeTrackId.current === 'TENSION') ? 0.5 : 0.35; 
            }
        };

        window.speechSynthesis.speak(utterance);
    };

    // --- SFX ---
    const playTone = (freq, type, duration) => {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type; 
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    };

    const playSFX = (type) => {
        if (!audioSettings.sfx) return;
        switch (type) {
            case 'SUCCESS': playTone(600, 'sine', 0.1); setTimeout(() => playTone(800, 'sine', 0.2), 100); break;
            case 'FAIL': playTone(300, 'sawtooth', 0.3); break;
            case 'CLICK': playTone(1000, 'triangle', 0.05); break;
            default: break;
        }
    };

    // --- ניהול מוזיקה ---
    const playMusic = (type = 'CALM') => {
        activeTrackId.current = type;
        if (!audioSettings.music) return;
        stopMusic(false); 

        let track = null;
        if (type === 'CALM') track = calmTrack.current;
        else if (type === 'TENSION') track = tensionTrack.current;

        if (track) {
            track.currentTime = 0; 
            track.play().catch(e => console.log("Music autoplay blocked:", e));
            currentTrack.current = track;
        }
    };

    const stopMusic = (clearIntent = true) => {
        if (currentTrack.current) {
            currentTrack.current.pause();
            currentTrack.current = null;
        }
        if (clearIntent) activeTrackId.current = null;
    };

    // --- פונקציה חדשה: שינוי פרופיל משחק ---
    const setGameScope = (newScope) => {
        if (scope === newScope) return; // אין שינוי

        // 1. טען את ההגדרות של הפרופיל החדש
        const saved = localStorage.getItem(`audio_settings_${newScope}`);
        const nextSettings = saved ? JSON.parse(saved) : { ...DEFAULT_SETTINGS }; // העתק של ברירת מחדל
        
        // 2. עדכן מצב
        setScope(newScope);
        setAudioSettings(nextSettings);

        // 3. אכוף את חוקי המוזיקה של הפרופיל החדש מיד
        if (!nextSettings.music) {
            stopMusic(false); // אם בפרופיל החדש מוזיקה כבויה -> תעצור
        }
    };

    const toggleSetting = (key, value) => {
        setAudioSettings(prev => {
            const newVal = value !== undefined ? value : !prev[key];
            if (key === 'music') {
                if (!newVal) {
                    if (currentTrack.current) currentTrack.current.pause();
                } else {
                    if (activeTrackId.current) {
                        const type = activeTrackId.current;
                        let track = (type === 'CALM') ? calmTrack.current : tensionTrack.current;
                        if (track) {
                            track.play().catch(()=>{});
                            currentTrack.current = track;
                        }
                    }
                }
            }
            return { ...prev, [key]: newVal };
        });
    };

    return (
        <AudioContext.Provider value={{
            audioSettings, toggleSetting, speak, playSFX, playMusic, stopMusic, vibrate,
            availableVoices, selectedVoice, setSelectedVoice: handleSetVoice,
            setGameScope // <--- חשיפת הפונקציה החדשה
        }}>
            {children}
        </AudioContext.Provider>
    );
};