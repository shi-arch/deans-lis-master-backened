const { createLog } = require('../services/logging');

const loggerMiddleware = (reference, loginType, action) => async (req, res, next) => {
  const userId = req.user || null;
  const originalSend = res.send;

  console.log(`Logger middleware triggered for action: ${action}, userId: ${userId}`);

  res.send = async function (body) {
    const referenceId = res.referenceId || userId || null;
    const message = res.logMessage || (res.statusCode >= 200 && res.statusCode < 300 
      ? `${action} completed successfully` 
      : body.message || body.error || 'Action failed');

    await createLog(reference, referenceId, userId, loginType, message);

    return originalSend.call(this, body);
  };

  next();
};

module.exports = loggerMiddleware;