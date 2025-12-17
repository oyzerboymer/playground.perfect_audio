import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

const AudioContext = createContext();

export const useAudio = () => useContext(AudioContext);

const DEFAULT_LOCAL_SETTINGS = { music: true, sfx: true, tts: true, haptics: true, voiceSpeed: 1.0 };
const DEFAULT_GLOBAL_SETTINGS = { isMuted: false, isVibrationEnabled: true };

export const AudioProvider = ({ children }) => {
    // אתחול ה-Scope (איזה משחק רץ עכשיו)
    const [scope, setScope] = useState('GLOBAL');
    
    // הגדרות גלובליות (מיוט כללי, רטט)
    const [globalSettings, setGlobalSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('vocab_global_audio');
            return saved ? JSON.parse(saved) : DEFAULT_GLOBAL_SETTINGS;
        } catch (e) { return DEFAULT_GLOBAL_SETTINGS; }
    });

    // הגדרות מקומיות (לכל משחק בנפרד)
    const [audioSettings, setAudioSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('audio_settings_GLOBAL');
            return saved ? JSON.parse(saved) : DEFAULT_LOCAL_SETTINGS;
        } catch (e) { return DEFAULT_LOCAL_SETTINGS; }
    });

    // רכיבי האודיו
    const audioCtxRef = useRef(null);
    const calmTrack = useRef(new Audio('/sounds/calm.mp3'));
    const tensionTrack = useRef(new Audio('/sounds/tension.mp3'));
    const currentTrack = useRef(null); 
    const activeTrackId = useRef(null); 
    const isPlayingRef = useRef(false); // מעקב אחרי כוונת הניגון למניעת התנגשויות

    // TTS State
    const [availableVoices, setAvailableVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState(null);

    // אתחול ראשוני של רצועות השמע
    useEffect(() => {
        calmTrack.current.loop = true;
        calmTrack.current.volume = 0.35;
        calmTrack.current.preload = 'auto';

        tensionTrack.current.loop = true;
        tensionTrack.current.volume = 0.5;
        tensionTrack.current.preload = 'auto';
    }, []);

    // שמירה ויישום של הגדרות גלובליות
    useEffect(() => {
        localStorage.setItem('vocab_global_audio', JSON.stringify(globalSettings));
        if (globalSettings.isMuted) {
            stopMusic(false);
            window.speechSynthesis.cancel();
        } else {
            // אם ביטלנו מיוט, נסה להחזיר את המוזיקה
            if (audioSettings.music && activeTrackId.current) playMusic(activeTrackId.current);
        }
    }, [globalSettings]);

    // החלפת Scope (כניסה למשחק חדש)
    const setGameScope = (newScope) => {
        if (scope === newScope) return;
        const savedNew = localStorage.getItem(`audio_settings_${newScope}`);
        const nextSettings = savedNew ? JSON.parse(savedNew) : { ...DEFAULT_LOCAL_SETTINGS };
        setScope(newScope);
        setAudioSettings(nextSettings);

        // ניהול מוזיקה לפי ההגדרות של המשחק החדש
        if (!nextSettings.music || globalSettings.isMuted) {
            stopMusic(false);
        } else if (nextSettings.music && !globalSettings.isMuted && activeTrackId.current) {
            playMusic(activeTrackId.current);
        }
    };

    // שינוי הגדרה ספציפית
    const toggleSetting = (key, value) => {
        setAudioSettings(prev => {
            const newVal = value !== undefined ? value : !prev[key];
            const newSettings = { ...prev, [key]: newVal };
            localStorage.setItem(`audio_settings_${scope}`, JSON.stringify(newSettings));

            if (key === 'music') {
                if (!newVal) {
                    if (currentTrack.current) currentTrack.current.pause();
                } else {
                    // תיקון התאוששות: אם הדלקנו מוזיקה, נסה לנגן מיד (Force play)
                    if (!globalSettings.isMuted && activeTrackId.current) {
                        playMusic(activeTrackId.current, true);
                    }
                }
            }
            return newSettings;
        });
    };

    // איפוס הגדרות ברירת מחדל
    const resetToDefaults = () => {
        setAudioSettings(DEFAULT_LOCAL_SETTINGS);
        setGlobalSettings(DEFAULT_GLOBAL_SETTINGS);
        localStorage.removeItem(`audio_settings_${scope}`);
        localStorage.removeItem('vocab_global_audio');
        localStorage.removeItem('selected_voice_name');
        
        const defaultVoice = availableVoices.find(v => v.default) || availableVoices[0];
        if (defaultVoice) setSelectedVoice(defaultVoice);

        if (activeTrackId.current) {
            setTimeout(() => playMusic(activeTrackId.current), 50);
        }
    };

    // אתחול Web Audio API (לאפקטים)
    const initAudioCtx = () => {
        if (!audioCtxRef.current) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (Ctx) audioCtxRef.current = new Ctx();
        }
        if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
        return audioCtxRef.current;
    };

    // מנגנון האפקטים (Synthesizer)
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
                nGain.gain.setValueAtTime(3.0, t); 
                nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4); 
                noise.connect(filter);
                filter.connect(nGain);
                nGain.connect(ctx.destination);
                noise.start(t);
                
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
                const sNoise = ctx.createBufferSource();
                const sBuff = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
                const sData = sBuff.getChannelData(0);
                for (let i = 0; i < sBuff.length; i++) sData[i] = Math.random() * 2 - 1;
                sNoise.buffer = sBuff;
                const sFilter = ctx.createBiquadFilter();
                sFilter.type = 'lowpass'; 
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

    // Safe Play: ניגון מוזיקה עם מנגנון הגנה מפני קריסות
    const playMusic = async (type = 'CALM', force = false) => {
        activeTrackId.current = type;
        if (globalSettings.isMuted || !audioSettings.music) return;

        // אם כבר מנגן, לא עושים כלום אלא אם זה בכוח (Force)
        if (!force && currentTrack.current && !currentTrack.current.paused && activeTrackId.current === type) {
            return;
        }

        // עוצרים בזהירות טראק קודם
        if (currentTrack.current) {
            currentTrack.current.pause();
        }

        let track = (type === 'CALM') ? calmTrack.current : tensionTrack.current;
        
        // מוודאים ווליום נכון לפני הניגון
        track.volume = (type === 'TENSION') ? 0.5 : 0.35;
        
        currentTrack.current = track;

        try {
            isPlayingRef.current = true;
            await track.play();
        } catch (e) {
            console.warn("Audio play interrupted, retrying...", e);
            // מנגנון Retry חכם במקום איפוס הנגן
            if (activeTrackId.current === type && isPlayingRef.current) {
                setTimeout(() => {
                    if (activeTrackId.current === type) track.play().catch(err => console.error("Retry failed", err));
                }, 100);
            }
        }
    };

    const stopMusic = (clearIntent = true) => {
        isPlayingRef.current = false;
        if (currentTrack.current) {
            currentTrack.current.pause();
            currentTrack.current.currentTime = 0; 
        }
        if (clearIntent) activeTrackId.current = null;
    };

    // --- TTS (דיבור) ---
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

        // תיקון קריטי: שחזור ווליום *לפני* התחלת דיבור חדש
        // מונע באג שבו הווליום נשאר נמוך אם הדיבור הקודם נקטע
        if (audioSettings.music && currentTrack.current && !globalSettings.isMuted) {
             const targetVol = (activeTrackId.current === 'TENSION') ? 0.5 : 0.35;
             currentTrack.current.volume = targetVol;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        if (selectedVoice) utterance.voice = selectedVoice;
        utterance.lang = 'en-US'; 
        utterance.rate = audioSettings.voiceSpeed; 

        // הנמכת ווליום כשהדיבור מתחיל
        utterance.onstart = () => {
            if (audioSettings.music && currentTrack.current && !globalSettings.isMuted) {
                currentTrack.current.volume = 0.05;
            }
        };

        // החזרת ווליום כשהדיבור מסתיים
        utterance.onend = () => {
            if (audioSettings.music && currentTrack.current && !globalSettings.isMuted) {
                const targetVol = (activeTrackId.current === 'TENSION') ? 0.5 : 0.35;
                currentTrack.current.volume = targetVol;
            }
        };
        
        // החזרת ווליום גם במקרה של שגיאה
        utterance.onerror = () => {
             if (audioSettings.music && currentTrack.current) {
                const targetVol = (activeTrackId.current === 'TENSION') ? 0.5 : 0.35;
                currentTrack.current.volume = targetVol;
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