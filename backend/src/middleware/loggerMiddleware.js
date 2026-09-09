// HTTP Request & Activity Logger Middleware

function loggerMiddleware(req, res, next) {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  res.on("finish", () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const teamInfo = req.team ? `[Team: ${req.team.teamId || req.team.teamName}]` : "[Guest]";
    console.log(`[HTTP Log] ${method} ${originalUrl} ${statusCode} ${duration}ms - IP: ${ip} ${teamInfo}`);
  });

  next();
}

module.exports = loggerMiddleware;
