const prisma = require('../config/database');
const bcrypt = require('bcryptjs');

// Dashboard Admin (Analitik & Tren Keluhan Sekolah)
const getDashboard = async (req, res) => {
  try {
    const totalMedicines = await prisma.medicine.count();
    const lowStockCount = await prisma.medicine.count({
      where: { stok: { lte: 10 } },
    });

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const expiredCount = await prisma.medicine.count({
      where: { tglKadaluarsa: { lte: now } },
    });

    const expiringSoonCount = await prisma.medicine.count({
      where: {
        tglKadaluarsa: {
          gt: now,
          lte: thirtyDaysFromNow,
        },
      },
    });

    const totalVisits = await prisma.medicalRecord.count();
    const visitsToday = await prisma.medicalRecord.count({
      where: {
        tglKunjungan: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    // Recent visits for audit
    const recentVisits = await prisma.medicalRecord.findMany({
      take: 5,
      orderBy: { tglKunjungan: 'desc' },
      include: {
        student: true,
        petugas: true,
      },
    });

    // Breakdown status kunjungan
    const statusCounts = await prisma.medicalRecord.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    // Low stock medicines list
    const lowStockMedicines = await prisma.medicine.findMany({
      where: {
        OR: [
          { stok: { lte: 10 } },
          { tglKadaluarsa: { lte: thirtyDaysFromNow } },
        ],
      },
      take: 5,
    });

    res.render('admin/dashboard', {
      title: 'Dashboard Admin UKS',
      user: req.session.user,
      stats: {
        totalMedicines,
        lowStockCount,
        expiredCount,
        expiringSoonCount,
        totalVisits,
        visitsToday,
      },
      recentVisits,
      statusCounts,
      lowStockMedicines,
    });
  } catch (err) {
    console.error('Admin Dashboard Error:', err);
    res.status(500).send('Internal Server Error');
  }
};

// CRUD Master Data Obat & Alat P3K
const getMedicines = async (req, res) => {
  try {
    const { search, kategori } = req.query;
    const where = {};

    if (search) {
      where.namaObat = { contains: search };
    }
    if (kategori) {
      where.kategori = kategori;
    }

    const medicines = await prisma.medicine.findMany({
      where,
      orderBy: { namaObat: 'asc' },
    });

    res.render('admin/medicines/index', {
      title: 'Kelola Obat & Alat P3K',
      user: req.session.user,
      medicines,
      search: search || '',
      kategori: kategori || '',
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (err) {
    console.error('Get Medicines Error:', err);
    res.status(500).send('Internal Server Error');
  }
};

const getCreateMedicine = (req, res) => {
  res.render('admin/medicines/create', {
    title: 'Tambah Obat / Alat P3K Baru',
    user: req.session.user,
  });
};

const postCreateMedicine = async (req, res) => {
  try {
    const { namaObat, kategori, stok, satuan, tglKadaluarsa, aturanPakai } = req.body;

    await prisma.medicine.create({
      data: {
        namaObat,
        kategori,
        stok: parseInt(stok, 10) || 0,
        satuan,
        tglKadaluarsa: new Date(tglKadaluarsa),
        aturanPakai,
      },
    });

    res.redirect('/admin/medicines?success=Obat+berhasil+ditambahkan');
  } catch (err) {
    console.error('Create Medicine Error:', err);
    res.redirect('/admin/medicines/create?error=Gagal+menambah+obat');
  }
};

const getEditMedicine = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const medicine = await prisma.medicine.findUnique({ where: { id } });

    if (!medicine) return res.redirect('/admin/medicines?error=Obat+tidak+ditemukan');

    res.render('admin/medicines/edit', {
      title: 'Edit Obat / Alat P3K',
      user: req.session.user,
      medicine,
    });
  } catch (err) {
    console.error('Get Edit Medicine Error:', err);
    res.redirect('/admin/medicines');
  }
};

const postEditMedicine = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { namaObat, kategori, stok, satuan, tglKadaluarsa, aturanPakai } = req.body;

    await prisma.medicine.update({
      where: { id },
      data: {
        namaObat,
        kategori,
        stok: parseInt(stok, 10) || 0,
        satuan,
        tglKadaluarsa: new Date(tglKadaluarsa),
        aturanPakai,
      },
    });

    res.redirect('/admin/medicines?success=Data+obat+berhasil+diperbarui');
  } catch (err) {
    console.error('Post Edit Medicine Error:', err);
    res.redirect(`/admin/medicines/${req.params.id}/edit?error=Gagal+mengedit+obat`);
  }
};

const postDeleteMedicine = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.medicine.delete({ where: { id } });

    res.redirect('/admin/medicines?success=Obat+berhasil+dihapus');
  } catch (err) {
    console.error('Delete Medicine Error:', err);
    res.redirect('/admin/medicines?error=Gagal+menghapus+obat+(terikat+dengan+resep)');
  }
};

// Monitoring Kadaluarsa & Ambang Batas Stok Obat
const getStockAlerts = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDays = new Date();
    thirtyDays.setDate(now.getDate() + 30);

    const lowStockMedicines = await prisma.medicine.findMany({
      where: { stok: { lte: 10 } },
      orderBy: { stok: 'asc' },
    });

    const expiredMedicines = await prisma.medicine.findMany({
      where: { tglKadaluarsa: { lte: now } },
      orderBy: { tglKadaluarsa: 'asc' },
    });

    const expiringSoonMedicines = await prisma.medicine.findMany({
      where: {
        tglKadaluarsa: {
          gt: now,
          lte: thirtyDays,
        },
      },
      orderBy: { tglKadaluarsa: 'asc' },
    });

    res.render('admin/stock-alerts', {
      title: 'Monitoring Stok & Kadaluarsa Obat',
      user: req.session.user,
      lowStockMedicines,
      expiredMedicines,
      expiringSoonMedicines,
    });
  } catch (err) {
    console.error('Stock Alerts Error:', err);
    res.status(500).send('Internal Server Error');
  }
};

// ==========================================
// MANAJEMEN AKUN PETUGAS UKS (ROLE ADMIN)
// ==========================================

const getPetugas = async (req, res) => {
  try {
    const { search } = req.query;
    const where = { role: 'PETUGAS_UKS' };

    if (search) {
      where.OR = [
        { nama: { contains: search } },
        { username: { contains: search } },
        { teleponOrtu: { contains: search } },
      ];
    }

    const petugasList = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { medicalRecordsAsPetugas: true },
        },
      },
    });

    res.render('admin/petugas/index', {
      title: 'Manajemen Akun Petugas UKS',
      user: req.session.user,
      petugasList,
      search: search || '',
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (err) {
    console.error('Get Petugas Error:', err);
    res.status(500).send('Internal Server Error');
  }
};

const getCreatePetugas = (req, res) => {
  res.render('admin/petugas/create', {
    title: 'Tambah Akun Petugas UKS Baru',
    user: req.session.user,
    error: req.query.error || null,
  });
};

const postCreatePetugas = async (req, res) => {
  try {
    const { nama, username, password, telepon } = req.body;

    if (!nama || !username || !password) {
      return res.redirect('/admin/petugas/create?error=Nama,+Username,+dan+Password+wajib+diisi');
    }

    const cleanUsername = username.trim().toLowerCase();

    // Cek username unik
    const existingUser = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existingUser) {
      return res.redirect('/admin/petugas/create?error=Username+sudah+digunakan+oleh+pengguna+lain');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        nama: nama.trim(),
        username: cleanUsername,
        password: hashedPassword,
        role: 'PETUGAS_UKS',
        teleponOrtu: telepon ? telepon.trim() : null,
      },
    });

    res.redirect('/admin/petugas?success=Akun+petugas+UKS+berhasil+ditambahkan');
  } catch (err) {
    console.error('Create Petugas Error:', err);
    res.redirect('/admin/petugas/create?error=Gagal+menambah+akun+petugas');
  }
};

const getEditPetugas = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const petugas = await prisma.user.findFirst({
      where: { id, role: 'PETUGAS_UKS' },
    });

    if (!petugas) {
      return res.redirect('/admin/petugas?error=Akun+petugas+tidak+ditemukan');
    }

    res.render('admin/petugas/edit', {
      title: 'Edit Akun Petugas UKS',
      user: req.session.user,
      petugas,
      error: req.query.error || null,
    });
  } catch (err) {
    console.error('Get Edit Petugas Error:', err);
    res.redirect('/admin/petugas');
  }
};

const postEditPetugas = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { nama, username, password, telepon } = req.body;

    const cleanUsername = username.trim().toLowerCase();

    // Cek duplikasi username untuk ID lain
    const existing = await prisma.user.findFirst({
      where: {
        username: cleanUsername,
        NOT: { id },
      },
    });

    if (existing) {
      return res.redirect(`/admin/petugas/${id}/edit?error=Username+sudah+dipakai+pengguna+lain`);
    }

    const updateData = {
      nama: nama.trim(),
      username: cleanUsername,
      teleponOrtu: telepon ? telepon.trim() : null,
    };

    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }

    await prisma.user.update({
      where: { id },
      data: updateData,
    });

    res.redirect('/admin/petugas?success=Data+petugas+berhasil+diperbarui');
  } catch (err) {
    console.error('Post Edit Petugas Error:', err);
    res.redirect(`/admin/petugas/${req.params.id}/edit?error=Gagal+memperbarui+petugas`);
  }
};

const postDeletePetugas = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    // Cek apakah akun diri sendiri
    if (req.session.user && req.session.user.id === id) {
      return res.redirect('/admin/petugas?error=Tidak+dapat+menghapus+akun+Anda+sendiri');
    }

    // Cek apakah memiliki riwayat rekam medis pasien
    const recordCount = await prisma.medicalRecord.count({
      where: { petugasId: id },
    });

    if (recordCount > 0) {
      return res.redirect('/admin/petugas?error=Petugas+ini+memiliki+riwayat+rekam+medis+pemeriksaan+pasien+dan+tidak+dapat+dihapus+demi+integritas+data');
    }

    await prisma.user.delete({
      where: { id },
    });

    res.redirect('/admin/petugas?success=Akun+petugas+berhasil+dihapus');
  } catch (err) {
    console.error('Delete Petugas Error:', err);
    res.redirect('/admin/petugas?error=Gagal+menghapus+petugas');
  }
};

// ==========================================
// MANAJEMEN AKUN SISWA (ROLE ADMIN)
// ==========================================

const getSiswa = async (req, res) => {
  try {
    const { search } = req.query;
    const where = { role: 'SISWA' };

    if (search) {
      where.OR = [
        { nama: { contains: search } },
        { nisn: { contains: search } },
        { username: { contains: search } },
      ];
    }

    const siswaList = await prisma.user.findMany({
      where,
      orderBy: { nama: 'asc' },
      include: {
        healthProfile: true,
        _count: {
          select: { medicalRecordsAsStudent: true },
        },
      },
    });

    res.render('admin/siswa/index', {
      title: 'Manajemen Akun Siswa',
      user: req.session.user,
      siswaList,
      search: search || '',
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (err) {
    console.error('Get Siswa Error:', err);
    res.status(500).send('Internal Server Error');
  }
};

const getCreateSiswa = (req, res) => {
  res.render('admin/siswa/create', {
    title: 'Tambah Akun Siswa Baru',
    user: req.session.user,
    error: req.query.error || null,
  });
};

const postCreateSiswa = async (req, res) => {
  try {
    const {
      nama,
      nisn,
      username,
      password,
      golonganDarah,
      teleponOrtu,
      riwayatPenyakit,
      alergiObat,
      alergiMakanan,
      kontakDarurat,
    } = req.body;

    if (!nama || !username) {
      return res.redirect('/admin/siswa/create?error=Nama+dan+Username+wajib+diisi');
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanNisn = nisn && nisn.trim() !== '' ? nisn.trim() : null;

    // Cek username
    const existingUser = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });
    if (existingUser) {
      return res.redirect('/admin/siswa/create?error=Username+sudah+digunakan');
    }

    // Cek NISN jika diisi
    if (cleanNisn) {
      const existingNisn = await prisma.user.findUnique({
        where: { nisn: cleanNisn },
      });
      if (existingNisn) {
        return res.redirect('/admin/siswa/create?error=NISN+sudah+terdaftar');
      }
    }

    const finalPassword = password && password.trim() !== '' ? password.trim() : 'password123';
    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    const newStudent = await prisma.user.create({
      data: {
        nama: nama.trim(),
        username: cleanUsername,
        password: hashedPassword,
        role: 'SISWA',
        nisn: cleanNisn,
        golonganDarah: golonganDarah || null,
        teleponOrtu: teleponOrtu ? teleponOrtu.trim() : null,
      },
    });

    // Buat profil kesehatan awal
    await prisma.healthProfile.create({
      data: {
        studentId: newStudent.id,
        riwayatPenyakit: riwayatPenyakit ? riwayatPenyakit.trim() : 'Tidak Ada',
        alergiObat: alergiObat ? alergiObat.trim() : 'Tidak Ada',
        alergiMakanan: alergiMakanan ? alergiMakanan.trim() : 'Tidak Ada',
        kontakDarurat: kontakDarurat ? kontakDarurat.trim() : (teleponOrtu ? `Ortu (${teleponOrtu.trim()})` : '-'),
      },
    });

    res.redirect('/admin/siswa?success=Akun+siswa+berhasil+ditambahkan');
  } catch (err) {
    console.error('Create Siswa Error:', err);
    res.redirect('/admin/siswa/create?error=Gagal+menambah+siswa');
  }
};

const getEditSiswa = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const siswa = await prisma.user.findFirst({
      where: { id, role: 'SISWA' },
      include: { healthProfile: true },
    });

    if (!siswa) {
      return res.redirect('/admin/siswa?error=Siswa+tidak+ditemukan');
    }

    res.render('admin/siswa/edit', {
      title: 'Edit Akun Siswa',
      user: req.session.user,
      siswa,
      error: req.query.error || null,
    });
  } catch (err) {
    console.error('Get Edit Siswa Error:', err);
    res.redirect('/admin/siswa');
  }
};

const postEditSiswa = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const {
      nama,
      nisn,
      username,
      password,
      golonganDarah,
      teleponOrtu,
      riwayatPenyakit,
      alergiObat,
      alergiMakanan,
      kontakDarurat,
    } = req.body;

    const cleanUsername = username.trim().toLowerCase();
    const cleanNisn = nisn && nisn.trim() !== '' ? nisn.trim() : null;

    // Cek username jika diubah
    const existingUser = await prisma.user.findFirst({
      where: { username: cleanUsername, NOT: { id } },
    });
    if (existingUser) {
      return res.redirect(`/admin/siswa/${id}/edit?error=Username+sudah+dipakai`);
    }

    // Cek NISN jika diisi
    if (cleanNisn) {
      const existingNisn = await prisma.user.findFirst({
        where: { nisn: cleanNisn, NOT: { id } },
      });
      if (existingNisn) {
        return res.redirect(`/admin/siswa/${id}/edit?error=NISN+sudah+terdaftar`);
      }
    }

    const updateData = {
      nama: nama.trim(),
      username: cleanUsername,
      nisn: cleanNisn,
      golonganDarah: golonganDarah || null,
      teleponOrtu: teleponOrtu ? teleponOrtu.trim() : null,
    };

    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }

    await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Update / upsert HealthProfile
    await prisma.healthProfile.upsert({
      where: { studentId: id },
      create: {
        studentId: id,
        riwayatPenyakit: riwayatPenyakit ? riwayatPenyakit.trim() : 'Tidak Ada',
        alergiObat: alergiObat ? alergiObat.trim() : 'Tidak Ada',
        alergiMakanan: alergiMakanan ? alergiMakanan.trim() : 'Tidak Ada',
        kontakDarurat: kontakDarurat ? kontakDarurat.trim() : '-',
      },
      update: {
        riwayatPenyakit: riwayatPenyakit ? riwayatPenyakit.trim() : 'Tidak Ada',
        alergiObat: alergiObat ? alergiObat.trim() : 'Tidak Ada',
        alergiMakanan: alergiMakanan ? alergiMakanan.trim() : 'Tidak Ada',
        kontakDarurat: kontakDarurat ? kontakDarurat.trim() : '-',
      },
    });

    res.redirect('/admin/siswa?success=Data+siswa+berhasil+diperbarui');
  } catch (err) {
    console.error('Post Edit Siswa Error:', err);
    res.redirect(`/admin/siswa/${req.params.id}/edit?error=Gagal+memperbarui+data+siswa`);
  }
};

const postDeleteSiswa = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    await prisma.$transaction(async (tx) => {
      // Hapus profil kesehatan terlebih dahulu
      await tx.healthProfile.deleteMany({ where: { studentId: id } });

      // Ambil dan hapus resep obat terkait rekam medis siswa
      const records = await tx.medicalRecord.findMany({
        where: { studentId: id },
        select: { id: true },
      });
      const recordIds = records.map((r) => r.id);
      if (recordIds.length > 0) {
        await tx.medicinePrescription.deleteMany({
          where: { medicalRecordId: { in: recordIds } },
        });
        await tx.medicalRecord.deleteMany({
          where: { id: { in: recordIds } },
        });
      }

      // Hapus user siswa
      await tx.user.delete({ where: { id } });
    });

    res.redirect('/admin/siswa?success=Akun+siswa+berhasil+dihapus');
  } catch (err) {
    console.error('Delete Siswa Error:', err);
    res.redirect('/admin/siswa?error=Gagal+menghapus+akun+siswa');
  }
};

module.exports = {
  getDashboard,
  getMedicines,
  getCreateMedicine,
  postCreateMedicine,
  getEditMedicine,
  postEditMedicine,
  postDeleteMedicine,
  getStockAlerts,
  // Petugas Management
  getPetugas,
  getCreatePetugas,
  postCreatePetugas,
  getEditPetugas,
  postEditPetugas,
  postDeletePetugas,
  // Siswa Management
  getSiswa,
  getCreateSiswa,
  postCreateSiswa,
  getEditSiswa,
  postEditSiswa,
  postDeleteSiswa,
};
