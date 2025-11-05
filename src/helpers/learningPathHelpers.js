const { addDays } = require("./dateHelpers");

function ensureLearningPathState(applicant, { weekDurationDays = 7 } = {}) {
  let changed = false;
  const now = new Date();
  const lp = applicant.learningPath || [];
  const startDate = applicant.startDate ? new Date(applicant.startDate) : null;

  if (!lp.length) return changed;

  // Week1 unlock rule
  if (startDate) {
    if (now >= startDate && lp[0].locked) {
      lp[0].locked = false;
      lp[0].unlockDate = lp[0].unlockDate || now;
      changed = true;
    }
  } else {
    // If no startDate, keep week1 unlocked as fallback
    if (lp[0].locked) {
      lp[0].locked = false;
      lp[0].unlockDate = lp[0].unlockDate || now;
      changed = true;
    }
  }

  // For each week >1: require prev completed && time passed
  for (let i = 1; i < lp.length; i++) {
    const prev = lp[i - 1];
    const curr = lp[i];

    // compute when this week becomes *eligible* by time:
    // unlockAt = startDate + (i) * weekDurationDays? careful: for week 2 (i=1) unlockAt = startDate + 7 days -> (i)*weekDurationDays
    const unlockAt = startDate ? addDays(startDate, i * weekDurationDays) : null;

    const timeOk = unlockAt ? now >= unlockAt : true;
    const prevCompleted = !!prev.completed;

    // curr unlocked only when both prevCompleted && timeOk
    if (prevCompleted && timeOk && curr.locked) {
      curr.locked = false;
      curr.unlockDate = curr.unlockDate || now;
      changed = true;
    }
    // If either condition is not met, ensure it's locked (prevents accidental unlocking)
    if ((!prevCompleted || !timeOk) && !curr.locked) {
      curr.locked = true;
      changed = true;
    }
  }

  return changed;
}

module.exports = { ensureLearningPathState };