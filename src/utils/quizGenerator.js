/**
 * Quiz Loader
 * 
 * Loads quiz questions from quiz.json and serves them to emojiquiz.js
 */

const fs = require('fs');
const path = require('path');

const QUIZ_PATH = path.join(__dirname, '../data/quiz.json');

let quizCache = [];
let lastLoaded = 0;
const CACHE_TTL_MS = 60 * 1000; // refresh from disk every 60s

/** Load quiz list from disk (with TTL cache) */
function loadQuiz() {
    const now = Date.now();
    if (quizCache.length > 0 && now - lastLoaded < CACHE_TTL_MS) {
        return quizCache;
    }
    try {
        const raw = fs.readFileSync(QUIZ_PATH, 'utf8');
        quizCache = JSON.parse(raw);
        lastLoaded = now;
    } catch (e) {
        console.error('[Quiz] Failed to load quiz.json:', e.message);
    }
    return quizCache;
}

/** Get a random question from the pool */
function getRandomQuestion() {
    const pool = loadQuiz();
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
}

module.exports = { getRandomQuestion, loadQuiz };
