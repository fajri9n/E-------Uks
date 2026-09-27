const prisma = require('../config/database');

// Dashboard Petugas UKS
const getDashboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const visitsToday = await prisma.medicalRecord.count({
      where: { tglKunjungan: { gte: today } },
    });

    const activePatients = await prisma.medicalRecord.count({
      where: { status: 'DIRAWAT' },
    });

    const totalStudents = await prisma.user.count({
      where: { role: 'SISWA' },
    });

    const recentVisits = await prisma.medicalRecord.findMany({
      take: 8,
      orderBy: { tglKunjungan: 'desc' },
      include: {
        student: {
          include: { healthProfile: true },
        },
        petugas: true,
        prescriptions: {
          include: { medicine: true },
        },
      },
    });

    res.render('petugas/dashboard', {
      title: 'Dashboard Petugas UKS',
      user: req.session.user,
      stats: {
        visitsToday,
        activePatients,
        totalStudents,
      },
      recentVisits,
    });
  } catch (err) {
    console.error('Petugas Dashboard Error:', err);
    res.status(500).send('Internal Server Error');
  }
};

// Registrasi Kunjungan & List Kunjungan
const getVisits = async (req, res) => {
  try {
    const { search, status, date } = req.query;
    const where = {};

    if (status) where.status = status;
    if (date) {
      const selectedDate = new Date(date);
      const nextDay = new Date(date);
      nextDay.setDate(selectedDate.getDate() + 1);
      where.tglKunjungan = { gte: selectedDate, lt: nextDay };
    }
    if (search) {
      where.student = {
        OR: [
          { nama: { contains: search } },
          { nisn: { contains: search } },
        ],
      };
    }

    const visits = await prisma.medicalRecord.findMany({
      where,
      orderBy: { tglKunjungan: 'desc' },
      include: {
        student: {
          include: { healthProfile: true },
        },
        petugas: true,
        prescriptions: {
          include: { medicine: true },
        },
      },
    });

    const students = await prisma.user.findMany({
      where: { role: 'SISWA' },
      orderBy: { nama: 'asc' },
    });

    res.render('petugas/visits/index', {
      title: 'Daftar Kunjungan UKS',
      user: req.session.user,
      visits,
      students,
      search: search || '',
      statusFilter: status || '',
      dateFilter: date || '',
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (err) {
    console.error('Get Visits Error:', err);
    res.status(500).send('Internal Server Error');
  }
};

// Form Registrasi Kunjungan Baru
const getCreateVisit = async (req, res) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'SISWA' },
      include: { healthProfile: true },
      orderBy: { nama: 'asc' },
    });

    const medicines = await prisma.medicine.findMany({
      where: { stok: { gt: 0 } },
      orderBy: { namaObat: 'asc' },
    });

    res.render('petugas/visits/create', {
      title: 'Registrasi Kunjungan Siswa Masuk UKS',
      user: req.session.user,
      students,
      medicines,
      error: req.query.error || null,
    });
  } catch (err) {
    console.error('Get Create Visit Error:', err);
    res.status(500).send('Internal Server Error');
  }
};

// Post Registrasi & Catat Pemeriksaan + Pemberian Obat (Stok Terpotong Otomatis)
const postCreateVisit = async (req, res) => {
  try {
    const {
      studentId,
      jamMasuk,
      jamKeluar,
      keluhan,
      suhuTubuh,
      tensi,
      tindakan,
      status,
      catatanSurat,
      medicineId,
      jumlah,
      dosis,
    } = req.body;

    const parsedStudentId = parseInt(studentId, 10);
    const petugasId = req.session.user.id;

    // Handle medicine array / single item
    const medicineIds = Array.isArray(medicineId) ? medicineId : medicineId ? [medicineId] : [];
    const jumlahs = Array.isArray(jumlah) ? jumlah : jumlah ? [jumlah] : [];
    const dosises = Array.isArray(dosis) ? dosis : dosis ? [dosis] : [];

    // Execute within Prisma transaction to guarantee atomic stock reduction & record creation
    await prisma.$transaction(async (tx) => {
      // 1. Create Medical Record
      const record = await tx.medicalRecord.create({
        data: {
          studentId: parsedStudentId,
          petugasId,
          jamMasuk: jamMasuk || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          jamKeluar: jamKeluar || null,
          keluhan,
          suhuTubuh: suhuTubuh ? parseFloat(suhuTubuh) : null,
          tensi: tensi || null,
          tindakan: tindakan || null,
          status: status || 'DIRAWAT',
          catatanSurat: catatanSurat || null,
        },
      });

      // 2. Process Prescription & deduct medicine stock automatically
      for (let i = 0; i < medicineIds.length; i++) {
        const medId = parseInt(medicineIds[i], 10);
        const qty = parseInt(jumlahs[i], 10) || 1;
        const doseStr = dosises[i] || 'Sesuai petunjuk petugas UKS';

        if (medId && qty > 0) {
          const med = await tx.medicine.findUnique({ where: { id: medId } });
          if (!med) {
            throw new Error(`Obat dengan ID ${medId} tidak ditemukan.`);
          }
          if (med.stok < qty) {
            throw new Error(`Stok obat "${med.namaObat}" tidak mencukupi (tersisa ${med.stok} ${med.satuan}).`);
          }

          // Reduce stock
          await tx.medicine.update({
            where: { id: medId },
            data: { stok: { decrement: qty } },
          });

          // Create Prescription link
          await tx.medicinePrescription.create({
            data: {
              medicalRecordId: record.id,
              medicineId: medId,
              jumlah: qty,
              dosis: doseStr,
            },
          });
        }
      }
    });

    res.redirect('/petugas/visits?success=Pemeriksaan+dan+pemberian+obat+berhasil+dicatat');
  } catch (err) {
    console.error('Post Create Visit Error:', err);
    res.redirect(`/petugas/visits/create?error=${encodeURIComponent(err.message || 'Gagal menyimpan rekam medis')}`);
  }
};

// Detail & Edit / Examine Visit
const getExamineVisit = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const record = await prisma.medicalRecord.findUnique({
      where: { id },
      include: {
        student: {
          include: { healthProfile: true },
        },
        petugas: true,
        prescriptions: {
          include: { medicine: true },
        },
      },
    });

    if (!record) return res.redirect('/petugas/visits?error=Data+kunjungan+tidak+ditemukan');

    const medicines = await prisma.medicine.findMany({
      where: { stok: { gt: 0 } },
      orderBy: { namaObat: 'asc' },
    });

    res.render('petugas/visits/examine', {
      title: `Pemeriksaan UKS - ${record.student.nama}`,
      user: req.session.user,
      record,
      medicines,
      error: req.query.error || null,
      success: req.query.success || null,
    });
  } catch (err) {
    console.error('Get Examine Visit Error:', err);
    res.redirect('/petugas/visits');
  }
};

const postUpdateVisit = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { jamKeluar, keluhan, suhuTubuh, tensi, tindakan, status, catatanSurat, medicineId, jumlah, dosis } = req.body;

    const medicineIds = Array.isArray(medicineId) ? medicineId : medicineId ? [medicineId] : [];
    const jumlahs = Array.isArray(jumlah) ? jumlah : jumlah ? [jumlah] : [];
    const dosises = Array.isArray(dosis) ? dosis : dosis ? [dosis] : [];

    await prisma.$transaction(async (tx) => {
      // Update record details
      await tx.medicalRecord.update({
        where: { id },
        data: {
          jamKeluar: jamKeluar || null,
          keluhan,
          suhuTubuh: suhuTubuh ? parseFloat(suhuTubuh) : null,
          tensi: tensi || null,
          tindakan: tindakan || null,
          status,
          catatanSurat: catatanSurat || null,
        },
      });

      // Add new prescriptions if any
      for (let i = 0; i < medicineIds.length; i++) {
        const medId = parseInt(medicineIds[i], 10);
        const qty = parseInt(jumlahs[i], 10) || 1;
        const doseStr = dosises[i] || 'Sesuai petunjuk petugas UKS';

        if (medId && qty > 0) {
          const med = await tx.medicine.findUnique({ where: { id: medId } });
          if (!med) throw new Error(`Obat ID ${medId} tidak ditemukan.`);
          if (med.stok < qty) throw new Error(`Stok obat "${med.namaObat}" kurang (stok: ${med.stok}).`);

          await tx.medicine.update({
            where: { id: medId },
            data: { stok: { decrement: qty } },
          });

          await tx.medicinePrescription.create({
            data: {
              medicalRecordId: id,
              medicineId: medId,
              jumlah: qty,
              dosis: doseStr,
            },
          });
        }
      }
    });

    res.redirect(`/petugas/visits/${id}/examine?success=Hasil+pemeriksaan+berhasil+diperbarui`);
  } catch (err) {
    console.error('Post Update Visit Error:', err);
    res.redirect(`/petugas/visits/${req.params.id}/examine?error=${encodeURIComponent(err.message || 'Gagal mengedit data')}`);
  }
};

// Feature #8: Cetak / Terbitkan Surat Izin Istirahat & Rujukan Pulang
const getPrintPermit = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const record = await prisma.medicalRecord.findUnique({
      where: { id },
      include: {
        student: { include: { healthProfile: true } },
        petugas: true,
        prescriptions: { include: { medicine: true } },
      },
    });

    if (!record) return res.redirect('/petugas/visits?error=Data+kunjungan+tidak+ditemukan');

    res.render('print/permit-print', {
      title: `Surat Izin Digital - ${record.student.nama}`,
      record,
    });
  } catch (err) {
    console.error('Print Permit Error:', err);
    res.redirect('/petugas/visits');
  }
};

// Feature #9: Cetak Laporan Rekapitulasi Kunjungan UKS Bulanan
const getMonthlyReports = async (req, res) => {
  try {
    const month = parseInt(req.query.month, 10) || (new Date().getMonth() + 1);
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const visits = await prisma.medicalRecord.findMany({
      where: {
        tglKunjungan: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { tglKunjungan: 'asc' },
      include: {
        student: { include: { healthProfile: true } },
        petugas: true,
        prescriptions: { include: { medicine: true } },
      },
    });

    const totalKunjungan = visits.length;
    const countPulang = visits.filter(v => v.status === 'PULANG').length;
    const countDirawat = visits.filter(v => v.status === 'DIRAWAT').length;
    const countKembali = visits.filter(v => v.status === 'KEMBALI_KELAS').length;
    const countDirujuk = visits.filter(v => v.status === 'DIRUJUK').length;

    res.render('petugas/reports', {
      title: 'Laporan Rekapitulasi Kunjungan UKS',
      user: req.session.user,
      visits,
      month,
      year,
      summary: {
        totalKunjungan,
        countPulang,
        countDirawat,
        countKembali,
        countDirujuk,
      },
    });
  } catch (err) {
    console.error('Get Monthly Reports Error:', err);
    res.status(500).send('Internal Server Error');
  }
};

const getPrintMonthlyReport = async (req, res) => {
  try {
    const month = parseInt(req.query.month, 10) || (new Date().getMonth() + 1);
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const visits = await prisma.medicalRecord.findMany({
      where: {
        tglKunjungan: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { tglKunjungan: 'asc' },
      include: {
        student: { include: { healthProfile: true } },
        petugas: true,
        prescriptions: { include: { medicine: true } },
      },
    });

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    res.render('print/monthly-report-print', {
      title: `Laporan Rekapitulasi UKS ${monthNames[month - 1]} ${year}`,
      visits,
      monthName: monthNames[month - 1],
      year,
      user: req.session.user,
    });
  } catch (err) {
    console.error('Print Report Error:', err);
    res.redirect('/petugas/reports');
  }
};

module.exports = {
  getDashboard,
  getVisits,
  getCreateVisit,
  postCreateVisit,
  getExamineVisit,
  postUpdateVisit,
  getPrintPermit,
  getMonthlyReports,
  getPrintMonthlyReport,
};
