const db = require('../database');

/**
 * Tính toán cấp độ hiện tại dựa trên số XP.
 * Công thức: Level = 0.1 * sqrt(XP)  =>  XP = (Level / 0.1)^2
 */
function calculateLevel(xp) {
    return Math.floor(0.1 * Math.sqrt(xp));
}

/**
 * Thêm XP cho người dùng. 
 * Hàm này sẽ tự động cập nhật cả XP và Level trong database nhưng KHÔNG in ra thông báo thăng cấp.
 * 
 * @param {string} userId - ID người dùng
 * @param {number} amount - Số XP muốn cộng
 * @returns {object} - Object chứa thông tin cấp độ hiện tại và việc có thăng cấp hay không { level, leveledUp }
 */
function addXp(userId, amount) {
    const user = db.getUser(userId);
    const newXp = user.xp + amount;
    const newLevel = calculateLevel(newXp);

    const leveledUp = newLevel > user.level;

    db.updateUser(userId, {
        xp: newXp,
        level: newLevel
    });

    return {
        level: newLevel,
        leveledUp: leveledUp
    };
}

/**
 * Trả về hệ số nhân (multiplier) dựa trên cấp độ hiện tại.
 * Mỗi cấp độ thưởng thêm 1% (0.01).
 * Giới hạn tối đa là +100% (x2.0) ở cấp 100.
 * 
 * @param {number} level - Cấp độ người dùng 
 * @returns {number} - Hệ số bonus, ví dụ: level 10 -> return 0.10 (tức +10%)
 */
function getLevelMultiplier(level) {
    const cap = 2.0; // Max 100% bonus
    const multiplier = level * 0.05;
    return Math.min(multiplier, cap);
}

module.exports = {
    calculateLevel,
    addXp,
    getLevelMultiplier
};
