const User = require('../models/User');

// Uso: requireRole('admin') o requireRole('trusted', 'admin')
// Debe ir DESPUES del middleware auth.
module.exports = function requireRole(...roles) {
  return async (req, res, next) => {
    const user = await User.findById(req.user.id).select('role enabled');
    if (!user || !user.enabled || !roles.includes(user.role)) {
      return res.status(403).json({ message: 'No tenés permisos para esta acción' });
    }
    req.user.role = user.role;
    next();
  };
};
