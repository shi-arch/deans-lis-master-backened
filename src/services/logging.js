const Log = require('../models/Log');

async function createLog(reference, referenceId, userId, loginType, message) {
  try {
    const log = new Log({
      reference,
      referenceId,
      userId,
      loginType,
      message,
    });
    await log.save();
    console.log(`Log created: ${message} for ${loginType} ${userId || 'unknown'}`);
  } catch (error) {
    console.error('Error creating log:', error);
  }
}

module.exports = { createLog };