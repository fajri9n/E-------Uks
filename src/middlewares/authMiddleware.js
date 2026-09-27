// Authentication & RBAC Middleware

const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  return res.redirect('/login?error=Silakan+login+terlebih+dahulu');
};

const redirectIfAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    const role = req.session.user.role;
    if (role === 'ADMIN_UKS') return res.redirect('/admin/dashboard');
    if (role === 'PETUGAS_UKS') return res.redirect('/petugas/dashboard');
    if (role === 'SISWA') return res.redirect('/siswa/dashboard');
  }
  next();
};

const checkRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.redirect('/login?error=Sesi+telah+berakhir,+silakan+login+kembali');
    }

    const userRole = req.session.user.role;

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    // 403 Forbidden Response
    res.status(403).render('errors/403', {
      user: req.session.user,
      title: '403 - Akses Ditolak',
      message: `Role Anda (${userRole}) tidak memiliki wewenang untuk mengakses halaman ini.`,
    });
  };
};

module.exports = {
  isAuthenticated,
  redirectIfAuthenticated,
  checkRole,
};
