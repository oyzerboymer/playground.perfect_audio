import React, { useState } from 'react';
import { Play, Settings, Info, Volume2, X, Music, Bell, MessageSquare, Smartphone, ChevronDown } from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';
import { Button, Header } from './UIComponents';

export default function GameLobby({ title, subtitle, instructions, onPlay, onBack, settingsContent, icon: Icon = Play }) {
  const [showSettings, setShowSettings] = useState(false);
  const [showSound, setShowSound] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  
  const { audioSettings, toggleSetting, availableVoices, selectedVoice, setSelectedVoice } = useAudio();

  const ToggleRow = ({ label, icon: Icon, isOn, onToggle, extra }) => (
      <div className="flex flex-col py-3 border-b border-gray-100 last:border-0">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isOn ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                      <Icon size={20} />
                  </div>
                  <span className="font-medium text-gray-700">{label}</span>
              </div>
              <button onClick={onToggle} className={`w-12 h-6 rounded-full transition-colors relative ${isOn ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isOn ? 'left-1 translate-x-6' : 'left-1'}`} />
              </button>
          </div>
          {isOn && extra && <div className="mt-2 pr-11 pl-2 animate-in slide-in-from-top-1">{extra}</div>}
      </div>
  );

  return (
    <div className="h-[100dvh] bg-gray-50 flex flex-col relative overflow-hidden" dir="rtl">
        <Header title={title} onBack={onBack} />
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8 animate-in fade-in zoom-in duration-300">
            <div className="text-center space-y-2">
                <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-indigo-100 inline-block mb-4">
                    <Icon size={64} className="text-indigo-600 ml-1" />
                </div>
                <h1 className="text-4xl font-black text-gray-800 tracking-tight">{title}</h1>
                <p className="text-gray-500 text-lg font-medium">{subtitle}</p>
            </div>

            <button onClick={onPlay} className="w-full max-w-xs bg-indigo-600 text-white py-5 rounded-2xl text-2xl font-bold shadow-xl shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-3">
                התחל לשחק <Play size={24} className="transform rotate-180 fill-current"/>
            </button>

            <div className="flex gap-4">
                <button onClick={() => setShowSettings(true)} className="flex flex-col items-center gap-2 group">
                    <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center group-active:scale-90 transition-all text-gray-600 group-hover:text-indigo-600 group-hover:border-indigo-100"><Settings size={24} /></div>
                    <span className="text-xs font-bold text-gray-400">הגדרות</span>
                </button>
                <button onClick={() => setShowSound(true)} className="flex flex-col items-center gap-2 group">
                    <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center group-active:scale-90 transition-all text-gray-600 group-hover:text-indigo-600 group-hover:border-indigo-100"><Volume2 size={24} /></div>
                    <span className="text-xs font-bold text-gray-400">שמע</span>
                </button>
                <button onClick={() => setShowInfo(true)} className="flex flex-col items-center gap-2 group">
                    <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center group-active:scale-90 transition-all text-gray-600 group-hover:text-indigo-600 group-hover:border-indigo-100"><Info size={24} /></div>
                    <span className="text-xs font-bold text-gray-400">הוראות</span>
                </button>
            </div>
        </div>

        {showSettings && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setShowSettings(false)}>
                <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold flex items-center gap-2"><Settings className="text-indigo-600"/> הגדרות משחק</h3>
                        <button onClick={() => setShowSettings(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={20}/></button>
                    </div>
                    <div className="space-y-6 max-h-[60vh] overflow-y-auto">{settingsContent}</div>
                    <Button onClick={() => setShowSettings(false)} className="w-full mt-6 py-4 text-lg">שמור וסגור</Button>
                </div>
            </div>
        )}
        
        {showSound && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setShowSound(false)}>
                <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold flex items-center gap-2"><Volume2 className="text-indigo-600"/> מיקסר סאונד</h3>
                        <button onClick={() => setShowSound(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={20}/></button>
                    </div>
                    <div className="space-y-1">
                        <ToggleRow label="מוזיקת רקע" icon={Music} isOn={audioSettings.music} onToggle={() => toggleSetting('music')} />
                        <ToggleRow label="אפקטים קוליים" icon={Bell} isOn={audioSettings.sfx} onToggle={() => toggleSetting('sfx')} />
                        <ToggleRow label="הקראת מילים (TTS)" icon={MessageSquare} isOn={audioSettings.tts} onToggle={() => toggleSetting('tts')} extra={
                            <div className="space-y-4 pt-2">
                                {availableVoices.length > 0 && (
                                    <div className="relative">
                                        <select value={selectedVoice?.name || ''} onChange={(e) => {const voice = availableVoices.find(v => v.name === e.target.value); setSelectedVoice(voice);}} className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg p-2.5 pr-8 appearance-none focus:ring-2 focus:ring-indigo-500 outline-none">
                                            {availableVoices.map(v => (<option key={v.name} value={v.name}>{v.name.replace('Microsoft', '').replace('English', '')}</option>))}
                                        </select>
                                        <ChevronDown size={16} className="absolute left-3 top-3 text-gray-400 pointer-events-none"/>
                                    </div>
                                )}
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <label className="text-xs text-gray-500 font-bold">מהירות דיבור</label>
                                        <span className="text-xs font-bold text-indigo-600">x{audioSettings.voiceSpeed}</span>
                                    </div>
                                    <input type="range" min="0.5" max="1.5" step="0.1" value={audioSettings.voiceSpeed} onChange={(e) => toggleSetting('voiceSpeed', Number(e.target.value))} className="w-full accent-indigo-600 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                                </div>
                            </div>
                        } />
                        <ToggleRow label="רטט (Haptics)" icon={Smartphone} isOn={audioSettings.haptics} onToggle={() => toggleSetting('haptics')} />
                    </div>
                    <Button onClick={() => setShowSound(false)} className="w-full mt-6 py-4 text-lg">סגור</Button>
                </div>
            </div>
        )}
        
        {showInfo && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setShowInfo(false)}>
                <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 text-center" onClick={e => e.stopPropagation()}>
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4"><Info size={32}/></div>
                    <h3 className="text-xl font-bold mb-2">איך משחקים?</h3>
                    <p className="text-gray-600 leading-relaxed mb-8">{instructions}</p>
                    <Button onClick={() => setShowInfo(false)} className="w-full py-4 text-lg">הבנתי, בוא נתחיל!</Button>
                </div>
            </div>
        )}
    </div>
  );
}