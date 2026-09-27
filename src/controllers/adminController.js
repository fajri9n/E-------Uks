const prisma = require('../config/database');

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

module.exports = {
  getDashboard,
  getMedicines,
  getCreateMedicine,
  postCreateMedicine,
  getEditMedicine,
  postEditMedicine,
  postDeleteMedicine,
  getStockAlerts,
};
