import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

const AudioContext = createContext();

export const useAudio = () => useContext(AudioContext);

const DEFAULT_LOCAL_SETTINGS = { music: true, sfx: true, tts: true, haptics: true, voiceSpeed: 1.0 };
const DEFAULT_GLOBAL_SETTINGS = { isMuted: false, isVibrationEnabled: true };

export const AudioProvider = ({ children }) => {
    // אתחול ה-Scope
    const [scope, setScope] = useState('GLOBAL');
    
    // אתחול הגדרות גלובליות
    const [globalSettings, setGlobalSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('vocab_global_audio');
            return saved ? JSON.parse(saved) : DEFAULT_GLOBAL_SETTINGS;
        } catch (e) { return DEFAULT_GLOBAL_SETTINGS; }
    });

    // אתחול הגדרות מקומיות
    const [audioSettings, setAudioSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('audio_settings_GLOBAL');
            return saved ? JSON.parse(saved) : DEFAULT_LOCAL_SETTINGS;
        } catch (e) { return DEFAULT_LOCAL_SETTINGS; }
    });

    const audioCtxRef = useRef(null);
    const calmTrack = useRef(new Audio('/sounds/calm.mp3'));
    const tensionTrack = useRef(new Audio('/sounds/tension.mp3'));
    const currentTrack = useRef(null); 
    const activeTrackId = useRef(null); 
    const playPromiseRef = useRef(null);
    
    // State לקולות TTS
    const [availableVoices, setAvailableVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState(null);

    // אתחול ווליום ראשוני
    useEffect(() => {
        calmTrack.current.loop = true;
        calmTrack.current.volume = 0.35;
        tensionTrack.current.loop = true;
        tensionTrack.current.volume = 0.5;
    }, []);

    // שמירה של הגדרות גלובליות (Mute/Vibrate) בלבד ב-useEffect
    useEffect(() => {
        localStorage.setItem('vocab_global_audio', JSON.stringify(globalSettings));
        if (globalSettings.isMuted) {
            stopMusic(false);
            window.speechSynthesis.cancel();
        } else {
            if (audioSettings.music && activeTrackId.current) playMusic(activeTrackId.current);
        }
    }, [globalSettings]);

    // *** השינוי הגדול: מחקנו את ה-useEffect ששמר את audioSettings באופן אוטומטי ***
    // זה מונע את דריסת ההגדרות במעבר בין משחקים

    // --- החלפת SCOPE (משחק חדש) ---
    const setGameScope = (newScope) => {
        if (scope === newScope) return;

        // 1. קריאה מהזיכרון עבור המשחק החדש
        const savedNew = localStorage.getItem(`audio_settings_${newScope}`);
        const nextSettings = savedNew ? JSON.parse(savedNew) : { ...DEFAULT_LOCAL_SETTINGS };

        // 2. עדכון ה-State (בלי לשמור לזיכרון!)
        setScope(newScope);
        setAudioSettings(nextSettings);

        // 3. טיפול במוזיקה בהתאם להגדרות החדשות שנטענו
        if (!nextSettings.music || globalSettings.isMuted) {
            stopMusic(false);
        } else if (nextSettings.music && !globalSettings.isMuted && activeTrackId.current) {
            playMusic(activeTrackId.current);
        }
    };

    // --- שינוי הגדרה (לחיצה של משתמש) ---
    const toggleSetting = (key, value) => {
        setAudioSettings(prev => {
            const newVal = value !== undefined ? value : !prev[key];
            const newSettings = { ...prev, [key]: newVal };
            
            // *** שמירה לזיכרון מתבצעת רק כאן, בפעולה יזומה ***
            localStorage.setItem(`audio_settings_${scope}`, JSON.stringify(newSettings));

            // לוגיקה ספציפית למוזיקה
            if (key === 'music') {
                if (!newVal) {
                    if (currentTrack.current) currentTrack.current.pause();
                } else {
                    if (!globalSettings.isMuted && activeTrackId.current) playMusic(activeTrackId.current);
                }
            }
            return newSettings;
        });
    };

    // --- איפוס הגדרות ---
    const resetToDefaults = () => {
        // איפוס State
        setAudioSettings(DEFAULT_LOCAL_SETTINGS);
        setGlobalSettings(DEFAULT_GLOBAL_SETTINGS);
        
        // מחיקה מהזיכרון
        localStorage.removeItem(`audio_settings_${scope}`);
        localStorage.removeItem('vocab_global_audio');
        localStorage.removeItem('selected_voice_name');

        // איפוס קול
        const defaultVoice = availableVoices.find(v => v.default) || availableVoices[0];
        if (defaultVoice) setSelectedVoice(defaultVoice);

        // הפעלת מוזיקה מחדש אם צריך
        if (activeTrackId.current) {
            setTimeout(() => playMusic(activeTrackId.current), 50);
        }
    };

    const initAudioCtx = () => {
        if (!audioCtxRef.current) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (Ctx) audioCtxRef.current = new Ctx();
        }
        if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
        return audioCtxRef.current;
    };

    // --- אפקטים קוליים (הגרסה המתוקנת והמלאה) ---
    const playSFX = (type, value = 0) => {
        if (globalSettings.isMuted || !audioSettings.sfx) return;
        const ctx = initAudioCtx();
        if (!ctx) return;

        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        switch (type) {
            case 'MATCH_POP': 
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, t);
                osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);
                gain.gain.setValueAtTime(0.8, t); 
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
                osc.start(t);
                osc.stop(t + 0.15);
                break;

            case 'MATCH_SUCTION': 
                // רעש לבן עם ווליום אגרסיבי (3.0)
                const bufferSize = ctx.sampleRate * 0.6; 
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
                const noise = ctx.createBufferSource();
                noise.buffer = buffer;
                
                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(300, t);
                filter.frequency.exponentialRampToValueAtTime(1800, t + 0.4); 
                
                const nGain = ctx.createGain();
                nGain.gain.setValueAtTime(3.0, t); // בוסט לווליום
                nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4); 
                
                noise.connect(filter);
                filter.connect(nGain);
                nGain.connect(ctx.destination);
                noise.start(t);

                // בום נמוך
                const thud = ctx.createOscillator();
                const thudGain = ctx.createGain();
                thud.type = 'sine';
                thud.frequency.setValueAtTime(120, t);
                thud.frequency.exponentialRampToValueAtTime(40, t + 0.25);
                thudGain.gain.setValueAtTime(1.5, t); 
                thudGain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
                thud.connect(thudGain);
                thudGain.connect(ctx.destination);
                thud.start(t);
                thud.stop(t + 0.25);
                break;

            case 'COMBO': 
                osc.type = 'triangle'; 
                const cFilter = ctx.createBiquadFilter();
                cFilter.type = 'lowpass';
                cFilter.frequency.value = 1000;
                osc.disconnect();
                osc.connect(cFilter);
                cFilter.connect(gain);
                const baseFreq = 220; 
                const pitch = baseFreq + (value * 60); 
                osc.frequency.setValueAtTime(pitch, t);
                gain.gain.setValueAtTime(0.6, t); 
                gain.gain.linearRampToValueAtTime(0, t + 0.5);
                osc.start(t);
                osc.stop(t + 0.5);
                break;

            case 'SWIPE_RIGHT': 
                // Lowpass (אוויר) במקום סנר
                const sNoise = ctx.createBufferSource();
                const sBuff = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
                const sData = sBuff.getChannelData(0);
                for (let i = 0; i < sBuff.length; i++) sData[i] = Math.random() * 2 - 1;
                sNoise.buffer = sBuff;
                
                const sFilter = ctx.createBiquadFilter();
                sFilter.type = 'lowpass'; // Lowpass
                sFilter.frequency.setValueAtTime(600, t);
                sFilter.frequency.linearRampToValueAtTime(100, t + 0.2);
                
                const sGain = ctx.createGain();
                sGain.gain.setValueAtTime(0.8, t);
                sGain.gain.linearRampToValueAtTime(0, t + 0.2);
                
                sNoise.connect(sFilter);
                sFilter.connect(sGain);
                sGain.connect(ctx.destination);
                sNoise.start(t);
                break;
            
            case 'SWIPE_LEFT': 
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(250, t);
                osc.frequency.linearRampToValueAtTime(100, t + 0.15);
                gain.gain.setValueAtTime(0.8, t);
                gain.gain.linearRampToValueAtTime(0, t + 0.15);
                osc.start(t);
                osc.stop(t + 0.15);
                break;

            case 'CORRECT': 
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, t);
                osc.frequency.exponentialRampToValueAtTime(1200, t + 0.1); 
                gain.gain.setValueAtTime(0.5, t); 
                gain.gain.linearRampToValueAtTime(0, t + 0.3);
                osc.start(t);
                osc.stop(t + 0.3);
                break;

            case 'WRONG': 
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, t);
                osc.frequency.linearRampToValueAtTime(50, t + 0.3);
                gain.gain.setValueAtTime(0.4, t); 
                gain.gain.linearRampToValueAtTime(0, t + 0.3);
                osc.start(t);
                osc.stop(t + 0.3);
                break;

            case 'CLICK':
                osc.type = 'square';
                osc.frequency.setValueAtTime(800, t);
                gain.gain.setValueAtTime(0.15, t);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
                osc.start(t);
                osc.stop(t + 0.05);
                break;
            default: break;
        }
    };

    const playMusic = async (type = 'CALM') => {
        activeTrackId.current = type;
        if (globalSettings.isMuted || !audioSettings.music) return;
        if (currentTrack.current) {
            currentTrack.current.pause();
            currentTrack.current.currentTime = 0;
        }
        let track = null;
        if (type === 'CALM') track = calmTrack.current;
        else if (type === 'TENSION') track = tensionTrack.current;

        if (track) {
            currentTrack.current = track;
            try {
                playPromiseRef.current = track.play();
                await playPromiseRef.current;
            } catch (e) {
                calmTrack.current.load();
                tensionTrack.current.load();
            }
        }
    };

    const stopMusic = (clearIntent = true) => {
        if (currentTrack.current) {
            if (playPromiseRef.current !== undefined) {
                playPromiseRef.current.then(() => currentTrack.current.pause()).catch(() => {});
            } else {
                currentTrack.current.pause();
            }
        }
        if (clearIntent) activeTrackId.current = null;
    };

    // --- TTS ---
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

    const speak = (text, force = false) => {
        if (globalSettings.isMuted || (!audioSettings.tts && !force) || !text) return;
        window.speechSynthesis.cancel(); 
        if (audioSettings.music && currentTrack.current && !globalSettings.isMuted) currentTrack.current.volume = 0.05;
        const utterance = new SpeechSynthesisUtterance(text);
        if (selectedVoice) utterance.voice = selectedVoice;
        utterance.lang = 'en-US'; 
        utterance.rate = audioSettings.voiceSpeed; 
        utterance.onend = () => {
            if (audioSettings.music && currentTrack.current && !globalSettings.isMuted) {
                currentTrack.current.volume = (activeTrackId.current === 'TENSION') ? 0.5 : 0.35; 
            }
        };
        window.speechSynthesis.speak(utterance);
    };

    const vibrate = (pattern) => {
        if (globalSettings.isVibrationEnabled && audioSettings.haptics && navigator.vibrate) navigator.vibrate(pattern || 40);
    };

    const toggleGlobalSetting = (key) => setGlobalSettings(prev => ({ ...prev, [key]: !prev[key] }));

    return (
        <AudioContext.Provider value={{
            audioSettings, toggleSetting, globalSettings, toggleGlobalSetting,
            speak, playSFX, playMusic, stopMusic, vibrate,
            availableVoices, selectedVoice, setSelectedVoice: handleSetVoice, setGameScope,
            resetToDefaults
        }}>
            {children}
        </AudioContext.Provider>
    );
};