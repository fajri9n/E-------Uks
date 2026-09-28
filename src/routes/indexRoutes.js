const express = require('express');
const router = express.Router();

const { isAuthenticated } = require('../middlewares/authMiddleware');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', (req, res) => {
  if (req.session && req.session.user) {
    const role = req.session.user.role;
    if (role === 'ADMIN_UKS') return res.redirect('/admin/dashboard');
    if (role === 'PETUGAS_UKS') return res.redirect('/petugas/dashboard');
    if (role === 'SISWA') return res.redirect('/siswa/dashboard');
  }
  res.redirect('/login');
});

// Shared Permit Print Route (Aman diakses Petugas, Admin, & Siswa pemilik surat)
router.get('/permit/:id/print', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const user = req.session.user;

    const record = await prisma.medicalRecord.findUnique({
      where: { id },
      include: {
        student: { include: { healthProfile: true } },
        petugas: true,
        prescriptions: { include: { medicine: true } },
      },
    });

    if (!record) {
      if (user.role === 'SISWA') return res.redirect('/siswa/permits?error=Surat+izin+tidak+ditemukan');
      return res.redirect('/petugas/visits?error=Surat+izin+tidak+ditemukan');
    }

    // Siswa hanya boleh melihat surat izin miliknya sendiri
    if (user.role === 'SISWA' && record.studentId !== user.id) {
      return res.status(403).render('errors/403', {
        title: '403 - Akses Ditolak',
        user: req.session.user,
        message: 'Anda hanya berhak melihat surat izin milik akun Anda sendiri.',
      });
    }

    res.render('print/permit-print', {
      title: `Surat Izin Digital - ${record.student.nama}`,
      record,
    });
  } catch (err) {
    console.error('Print Permit Shared Route Error:', err);
    res.redirect('/');
  }
});

module.exports = router;
