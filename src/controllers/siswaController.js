const prisma = require('../config/database');

// Dashboard Siswa
const getDashboard = async (req, res) => {
  try {
    const studentId = req.session.user.id;

    // Fetch student's health profile
    let healthProfile = await prisma.healthProfile.findUnique({
      where: { studentId },
    });

    if (!healthProfile) {
      healthProfile = await prisma.healthProfile.create({
        data: {
          studentId,
          riwayatPenyakit: 'Belum diisi',
          alergiObat: 'Belum diisi',
          alergiMakanan: 'Belum diisi',
          kontakDarurat: req.session.user.teleponOrtu || 'Belum diisi',
        },
      });
    }

    // Total visits & latest visit status
    const totalVisits = await prisma.medicalRecord.count({
      where: { studentId },
    });

    const recentRecords = await prisma.medicalRecord.findMany({
      where: { studentId },
      orderBy: { tglKunjungan: 'desc' },
      take: 5,
      include: {
        petugas: true,
        prescriptions: {
          include: { medicine: true },
        },
      },
    });

    const activePermits = recentRecords.filter(r => r.status === 'DIRAWAT' || r.status === 'PULANG' || r.status === 'DIRUJUK');

    res.render('siswa/dashboard', {
      title: 'Dashboard Siswa - E-UKS',
      user: req.session.user,
      healthProfile,
      totalVisits,
      recentRecords,
      activePermits,
    });
  } catch (err) {
    console.error('Siswa Dashboard Error:', err);
    res.status(500).send('Internal Server Error');
  }
};

// Feature #10: Melihat Riwayat Rekam Medis Kunjungan UKS Pribadi
const getMedicalRecords = async (req, res) => {
  try {
    const studentId = req.session.user.id;

    const records = await prisma.medicalRecord.findMany({
      where: { studentId },
      orderBy: { tglKunjungan: 'desc' },
      include: {
        petugas: true,
        prescriptions: {
          include: { medicine: true },
        },
      },
    });

    res.render('siswa/medical-records', {
      title: 'Riwayat Rekam Medis Saya',
      user: req.session.user,
      records,
    });
  } catch (err) {
    console.error('Siswa Records Error:', err);
    res.status(500).send('Internal Server Error');
  }
};

// Feature #11: Mengisi & Memperbarui Informasi Riwayat Alergi & Penyakit Bawaan
const getHealthProfile = async (req, res) => {
  try {
    const studentId = req.session.user.id;

    let profile = await prisma.healthProfile.findUnique({
      where: { studentId },
    });

    if (!profile) {
      profile = await prisma.healthProfile.create({
        data: {
          studentId,
          riwayatPenyakit: '',
          alergiObat: '',
          alergiMakanan: '',
          kontakDarurat: req.session.user.teleponOrtu || '',
        },
      });
    }

    res.render('siswa/health-profile', {
      title: 'Profil Kesehatan & Alergi Saya',
      user: req.session.user,
      profile,
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (err) {
    console.error('Get Health Profile Error:', err);
    res.status(500).send('Internal Server Error');
  }
};

const postHealthProfile = async (req, res) => {
  try {
    const studentId = req.session.user.id;
    const { riwayatPenyakit, alergiObat, alergiMakanan, kontakDarurat } = req.body;

    await prisma.healthProfile.upsert({
      where: { studentId },
      update: {
        riwayatPenyakit,
        alergiObat,
        alergiMakanan,
        kontakDarurat,
      },
      create: {
        studentId,
        riwayatPenyakit,
        alergiObat,
        alergiMakanan,
        kontakDarurat,
      },
    });

    res.redirect('/siswa/health-profile?success=Riwayat+kesehatan+dan+alergi+berhasil+diperbarui');
  } catch (err) {
    console.error('Post Health Profile Error:', err);
    res.redirect('/siswa/health-profile?error=Gagal+memperbarui+profil+kesehatan');
  }
};

// Feature #12: Memantau Status Izin Istirahat UKS Digital
const getPermits = async (req, res) => {
  try {
    const studentId = req.session.user.id;

    const permits = await prisma.medicalRecord.findMany({
      where: {
        studentId,
        status: { in: ['PULANG', 'DIRAWAT', 'DIRUJUK'] },
      },
      orderBy: { tglKunjungan: 'desc' },
      include: {
        petugas: true,
        prescriptions: { include: { medicine: true } },
      },
    });

    res.render('siswa/permits', {
      title: 'Status Izin Istirahat Digital',
      user: req.session.user,
      permits,
    });
  } catch (err) {
    console.error('Siswa Permits Error:', err);
    res.status(500).send('Internal Server Error');
  }
};

module.exports = {
  getDashboard,
  getMedicalRecords,
  getHealthProfile,
  postHealthProfile,
  getPermits,
};
