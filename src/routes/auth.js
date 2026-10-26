const express = require('express');
const { ROLES } = require('../middleware/auth');

const router = express.Router();

// GET /login  -> form chọn role (không cần mật khẩu)
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// POST /login -> lưu role vào cookie, redirect 303
router.post('/login', (req, res) => {
  const role = req.body.role;
  if (!ROLES.includes(role)) {
    return res.status(400).render('login', { error: 'Vui lòng chọn role hợp lệ (user hoặc admin).' });
  }
  res.cookie('role', role, { httpOnly: true, sameSite: 'lax' });
  res.redirect(303, role === 'admin' ? '/admin/dishes' : '/khach');
});

// POST /logout -> xóa role, về lại con phố, redirect 303
router.post('/logout', (req, res) => {
  res.clearCookie('role');
  res.redirect(303, '/');
});

module.exports = router;
