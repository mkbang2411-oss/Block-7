const ROLES = ['user', 'admin'];

// Không xác thực thật: chỉ đọc role từ cookie do trang /login đặt
function attachRole(req, res, next) {
  const role = req.cookies && req.cookies.role;
  req.role = ROLES.includes(role) ? role : null;
  res.locals.role = req.role;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.role) return res.redirect(303, '/login');
  if (req.role !== 'admin') {
    return res
      .status(403)
      .render('error', { status: 403, message: 'Trang này chỉ dành cho role admin.' });
  }
  next();
}

module.exports = { ROLES, attachRole, requireAdmin };
