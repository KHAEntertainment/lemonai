
/**
 * Token 校验中间件
 * 除了指定的不需要校验的接口外，其他接口均需校验 Token
 * @param {Array} excludePaths - 不需要校验 Token 的接口路径数组
 */

const REQUIRE_AUTH = process.env.REQUIRE_AUTH === 'true';
const ALLOW_REGISTRATION = process.env.ALLOW_REGISTRATION !== 'false'; // Default true

// Public endpoints that don't require authentication
const publicPatterns = [
  '/api/agent_store/last/',
  '/api/version',
  '/swagger',
  '/swagger.json',
  '/uploads/',
  '/api/file/upload_public' // Allow public file uploads for branding
];

// Auth-related endpoints
const authPatterns = [
  '/api/user/login',
  '/api/user/register',
  '/api/user/google',
  '/api/user/refresh'
];

function matchesPattern(path, patterns) {
  return patterns.some(pattern => path.startsWith(pattern));
}

module.exports = () => {
  return async (ctx, next) => {
    const path = ctx.path;
    
    // Allow public endpoints
    if (matchesPattern(path, publicPatterns)) {
      ctx.state.user = { id: 1 };
      await next();
      return;
    }

    // Handle auth endpoints
    if (matchesPattern(path, authPatterns)) {
      // Block registration if disabled
      if (path.includes('/register') && !ALLOW_REGISTRATION) {
        ctx.status = 403;
        ctx.body = { code: 403, msg: 'Registration is disabled' };
        return;
      }
      ctx.state.user = { id: 1 };
      await next();
      return;
    }

    // If auth not required, set default user and continue
    if (!REQUIRE_AUTH) {
      ctx.state.user = { id: 1 };
      await next();
      return;
    }

    // Auth is required - check for token
    const token = ctx.headers.authorization?.replace('Bearer ', '') || 
                  ctx.cookies.get('access_token') ||
                  ctx.query.token;

    if (!token) {
      ctx.status = 401;
      ctx.body = { code: 401, msg: 'Authentication required' };
      return;
    }

    // TODO: Implement actual token validation here
    // For now, accept any token and set user ID to 1
    // In production, decode JWT and validate
    try {
      // const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // ctx.state.user = { id: decoded.userId };
      ctx.state.user = { id: 1 };
      await next();
    } catch (error) {
      ctx.status = 401;
      ctx.body = { code: 401, msg: 'Invalid token' };
    }
  };
};
