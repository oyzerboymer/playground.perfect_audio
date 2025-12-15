// src/utils.js

// הגדרות הסטטוסים
export const VISUAL_STATUS = {
  UNSEEN: 'UNSEEN',
  LEARN: 'LEARN',
  WEAK: 'WEAK',
  KNOWN: 'KNOWN',
  DONE: 'DONE'
};

export const DEFAULT_SETTINGS = {
  timerDuration: 5,
  panicThreshold: 1.0,
  showSettings: false
};

// אלגוריתם ערבוב מקצועי
export const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

// תרגום ניקוד לסטטוס ויזואלי בעברית
export const getHebrewLabel = (score) => {
  if (score === 0) return 'חדש';
  if (score <= 2) return 'למידה';
  if (score <= 4) return 'לחיזוק';
  if (score >= 10) return 'מומחה';
  return 'יודע';
};

// קבלת צבע לפי ניקוד
export const getScoreColorClass = (score) => {
    if (score === 0) return 'gray';
    if (score <= 2) return 'indigo';
    if (score <= 4) return 'amber';
    if (score >= 10) return 'purple';
    return 'green';
};

// לוגיקת סבב ידני (עריכה)
export const getNextManualScore = (currentScore) => {
    // Learn (0-2) -> Weak (3) -> Known (5) -> Learn (1)
    if (currentScore <= 2) return 3;
    if (currentScore <= 4) return 5;
    return 1;
};

export const getQuizFontSize = (text) => text.length > 8 ? '1.6rem' : '2.1rem';