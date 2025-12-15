import React, { useState } from 'react';
import { Brain, User, ArrowRight } from 'lucide-react';
import { Button } from './UIComponents';

export default function LoginView({ onLogin }) {
    const [name, setName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim().length > 1) {
            onLogin(name.trim());
        }
    };

    return (
        <div className="h-[100dvh] bg-white flex flex-col items-center justify-center p-8 text-center" dir="rtl">
            <div className="mb-8 bg-indigo-50 p-6 rounded-full animate-bounce">
                <Brain size={64} className="text-indigo-600" />
            </div>
            
            <h1 className="text-4xl font-bold text-gray-800 mb-2">VocabMaster</h1>
            <p className="text-gray-500 mb-10 text-lg">המקום שלך לשלוט באוצר המילים</p>

            <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
                <div className="relative">
                    <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="איך לקרוא לך?" 
                        className="w-full bg-gray-50 border-2 border-gray-100 text-gray-800 text-lg rounded-2xl py-4 px-12 outline-none focus:border-indigo-500 focus:bg-white transition-all text-right"
                        autoFocus
                    />
                    <User className="absolute top-1/2 right-4 transform -translate-y-1/2 text-gray-400" size={20}/>
                </div>

                <Button 
                    onClick={handleSubmit} 
                    disabled={name.trim().length < 2}
                    className="w-full py-4 text-xl shadow-xl shadow-indigo-100"
                >
                    התחל ללמוד <ArrowRight size={20} className="transform rotate-180"/>
                </Button>
            </form>
            
            <p className="mt-12 text-xs text-gray-400 font-medium">
                ✨ שכוייח לעויזר, אהרן, וג'מיני
            </p>
        </div>
    );
}