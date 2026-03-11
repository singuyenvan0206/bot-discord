const { t } = require('./i18n');

/**
 * Handles job-specific bonuses for the work command.
 * Modifies rewardData object and returns interaction messages.
 */
function handleWorkJobInteractions(user, lang, rewardData) {
    let messages = [];

    // Farmer Interaction: Bumper Crop (15% chance for 1.5x bonus)
    if (user.job === 'farmer' && Math.random() < 0.15) {
        const extra = Math.floor(rewardData.total * 0.5);
        rewardData.total += extra;
        rewardData.bonus += extra;
        messages.push(t('work.bumper_crop', lang));
    }

    // Police Interaction: Overtime (40% chance +2500 flat)
    if (user.job === 'police' && Math.random() < 0.40) {
        const extra = 2500;
        rewardData.total += extra;
        rewardData.bonus += extra;
        messages.push(t('work.overtime', lang));
    }

    // Teacher Interaction: Lesson Plan (30% chance +15% total reward)
    if (user.job === 'teacher' && Math.random() < 0.30) {
        const extra = Math.floor(rewardData.total * 0.15);
        rewardData.total += extra;
        rewardData.bonus += extra;
        messages.push(t('work.lesson_plan', lang));
    }

    // Recalculate percent after modifiers
    const base = rewardData.total - rewardData.bonus;
    if (base > 0) {
        rewardData.percent = Math.round((rewardData.bonus / base) * 100);
    }

    return messages.join('\n');
}

/**
 * Handles job-specific bonuses for the crime command.
 */
function handleCrimeJobInteractions(user, lang, rewardData) {
    let messages = [];

    // Hacker Interaction: 30% chance to double reward (2.5x)
    if (user.job === 'hacker' && Math.random() < 0.30) {
        const extra = Math.floor(rewardData.total * 1.5);
        rewardData.total += extra;
        rewardData.bonus += extra;
        messages.push(t('crime.hacker_hacked', lang));
    }

    // Criminal Interaction: 50% escape chance — reduces fine by 80%
    // Note: This modifies fine, so we return a slightly different structure or handle it inside

    // Recalculate percent
    const base = rewardData.total - rewardData.bonus;
    if (base > 0) {
        rewardData.percent = Math.round((rewardData.bonus / base) * 100);
    }

    return messages.join('\n');
}

/**
 * Handles job-specific bonuses for the search command.
 */
function handleSearchJobInteractions(user, lang, rewardData) {
    let messages = [];

    // Job Bonus: Hacker Data Mine (40% chance for 2x)
    if (user.job === 'hacker' && Math.random() < 0.40) {
        const extra = rewardData.total;
        rewardData.total += extra;
        rewardData.bonus += extra;
        messages.push(t('search.data_mine', lang));
    }

    // Hacker Interaction: Data Breach (20% chance +5000-10000 flat)
    if (user.job === 'hacker' && Math.random() < 0.20) {
        const extra = Math.floor(Math.random() * 5001) + 5000;
        rewardData.total += extra;
        rewardData.bonus += extra;
        messages.push(t('search.data_breach', lang, { amount: extra.toLocaleString() }));
    }

    // Job Bonus: Trader Market Tip (+3500 flat)
    if (user.job === 'trader') {
        const extra = 3500;
        rewardData.total += extra;
        rewardData.bonus += extra;
        messages.push(t('search.market_tip', lang));
    }

    // Police Interaction: Crime Scene Investigation (25% chance +2000 flat)
    if (user.job === 'police' && Math.random() < 0.25) {
        const extra = 2000;
        rewardData.total += extra;
        rewardData.bonus += extra;
        messages.push(t('search.csi_investigation', lang) || `\n🔍 **Crime Scene Investigation:** You found valuable evidence, receiving an additional **+2,000** coins!`);
    }

    // Recalculate percent
    const base = rewardData.total - rewardData.bonus;
    if (base > 0) {
        rewardData.percent = Math.round((rewardData.bonus / base) * 100);
    }

    return messages.join('\n');
}

module.exports = {
    handleWorkJobInteractions,
    handleCrimeJobInteractions,
    handleSearchJobInteractions
};
