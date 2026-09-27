const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  if (req.session && req.session.user) {
    const role = req.session.user.role;
    if (role === 'ADMIN_UKS') return res.redirect('/admin/dashboard');
    if (role === 'PETUGAS_UKS') return res.redirect('/petugas/dashboard');
    if (role === 'SISWA') return res.redirect('/siswa/dashboard');
  }
  res.redirect('/login');
});

module.exports = router;
