const bcrypt = require('bcryptjs');
const prisma = require('../config/database');

const showLogin = (req, res) => {
  const error = req.query.error || null;
  const success = req.query.success || null;

  res.render('auth/login', {
    title: 'Login E-UKS & Rekam Medis',
    error,
    success,
  });
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.render('auth/login', {
        title: 'Login E-UKS',
        error: 'Username dan Password wajib diisi',
        success: null,
      });
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return res.render('auth/login', {
        title: 'Login E-UKS',
        error: 'Username tidak ditemukan',
        success: null,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('auth/login', {
        title: 'Login E-UKS',
        error: 'Password salah',
        success: null,
      });
    }

    // Set session
    req.session.user = {
      id: user.id,
      username: user.username,
      nama: user.nama,
      role: user.role,
      nisn: user.nisn,
      golonganDarah: user.golonganDarah,
      teleponOrtu: user.teleponOrtu,
    };

    if (user.role === 'ADMIN_UKS') return res.redirect('/admin/dashboard');
    if (user.role === 'PETUGAS_UKS') return res.redirect('/petugas/dashboard');
    if (user.role === 'SISWA') return res.redirect('/siswa/dashboard');

    res.redirect('/login');
  } catch (err) {
    console.error('Login error:', err);
    res.render('auth/login', {
      title: 'Login E-UKS',
      error: 'Terjadi kesalahan sistem',
      success: null,
    });
  }
};

const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Logout error:', err);
    res.redirect('/login?success=Anda+berhasil+keluar+sistem');
  });
};

module.exports = {
  showLogin,
  login,
  logout,
};
