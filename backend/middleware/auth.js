const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'retail-secret-key';

const signToken = (user) =>
  jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, SECRET, { expiresIn: '7d' });

function auth(requiredRoles) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    try {
      const payload = jwt.verify(token, SECRET);
      req.user = payload;
      if (requiredRoles && requiredRoles.length && !requiredRoles.includes(payload.role)) {
        return res.status(403).json({ error: 'You do not have permission for this action' });
      }
      next();
    } catch (e) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

module.exports = { auth, signToken, SECRET };