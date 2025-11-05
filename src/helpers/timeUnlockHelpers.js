const { addDays } = require("./dateHelpers");

function ensureTimeBasedUnlocks(applicant, { weekDurationDays = 7 } = {}) {
  const now = new Date();
  let changed = false;
  const lp = applicant.learningPath || [];
  if (!lp.length || !applicant.startDate) return changed;

  for (let i = 0; i < lp.length; i++) {
    const week = lp[i];
    const unlockAt = addDays(applicant.startDate, i * weekDurationDays);
    if (!week.unlockDate || new Date(week.unlockDate).getTime() !== unlockAt.getTime()) {
      week.unlockDate = unlockAt;
      changed = true;
    }
    const shouldBeLocked = now < unlockAt;
    if (week.locked !== shouldBeLocked) {
      week.locked = shouldBeLocked;
      changed = true;
    }
  }
  return changed;
}

module.exports = { ensureTimeBasedUnlocks };