const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.js')) {
            results.push(file);
        }
    });
    return results;
}

const dbMethods = [
    'getDb', 'saveDb', 'createGiveaway', 'getGiveaway', 'getGiveawayById',
    'getActiveGiveaways', 'getExpiredGiveaways', 'getScheduledGiveaways',
    'endGiveaway', 'pauseGiveaway', 'resumeGiveaway', 'updateGiveaway',
    'deleteGiveaway', 'addParticipant', 'removeParticipant', 'getParticipants',
    'getParticipantUserIds', 'getParticipantCount', 'getTotalEntries',
    'addBonusEntry', 'getBonusEntries', 'getUser', 'updateUser', 'addBalance',
    'removeBalance', 'getTopUsers', 'addItem', 'removeItem', 'getRandomUserByJob',
    'getGuildUser', 'updateGuildUser', 'isOwner', 'getGuild', 'updateGuild',
    'getGlobalSetting', 'setGlobalSetting', 'getUserCount', 'distributeBalanceToAll',
    'distributeBalanceRandomly', 'clearAllData', 'resetUser', 'getMarriage',
    'createMarriage', 'deleteMarriage', 'addLotteryTicket', 'getLotteryTickets',
    'clearLotteryTickets', 'getLotteryJackpot', 'addLotteryJackpot', 'setLotteryJackpot',
    'addGuildRole', 'removeGuildRole', 'getGuildRoles', 'getGuildRole',
    'getGuildSetting', 'setGuildSetting', 'getGlobalUser', 'updateGlobalUser', 'addGlobalBalance', 'removeGlobalBalance', 'addGlobalItem', 'removeGlobalItem'
];

const utilMethods = [
    'getLanguage', 'getUserMultiplier', 'getTotalIncomeMultiplier',
    'hasActiveItem', 'calculateReward', 'getLevelMultiplier',
    'calculateMultiplierFromBuffs'
];

const files = walk(srcDir);
let changedFiles = 0;

for (const file of files) {
    // Skip this script itself and database.js (will manually rewrite db)
    if (file.includes('database.js') || file.endsWith('refactor.js')) continue;

    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // 1. Replace db.METHOD() with await db.METHOD()
    const dbRegex = new RegExp(`(?<!await\\s+)db\\.(${dbMethods.join('|')})\\(`, 'g');
    content = content.replace(dbRegex, 'await db.$1(');

    // 2. Replace UTIL_METHOD() with await UTIL_METHOD() 
    // Using positive lookahead \s*\( to ensure it's a function call, and negative lookbehind 
    // to avoid matching `function getLanguage(` or `require(...)`
    for (const method of utilMethods) {
        // Only replace if it's a call like getLanguage( or method( 
        // Do NOT replace `function getLanguage` or `module.exports = { getLanguage }`
        const utilRegex = new RegExp(`(?<!await\\s+|function\\s+)\\b(${method})\\s*\\(`, 'g');
        content = content.replace(utilRegex, 'await $1(');
    }

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        changedFiles++;
        console.log(`Updated ${path.relative(srcDir, file)}`);
    }
}

console.log(`\nSuccessfully refactored ${changedFiles} files!`);
