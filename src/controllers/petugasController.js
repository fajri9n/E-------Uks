const prisma = require('../config/database');
const bcrypt = require('bcryptjs');

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

    // Analitik Bulan Ini (Banyaknya siswa yang sakit di bulan ini)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    const startOfMonth = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    const monthlyVisits = await prisma.medicalRecord.findMany({
      where: {
        tglKunjungan: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      orderBy: { tglKunjungan: 'asc' },
      include: {
        student: true,
      },
    });

    const totalSickThisMonth = monthlyVisits.length;
    const uniqueSickStudentIds = new Set(monthlyVisits.map((v) => v.studentId));
    const uniqueSickStudentsThisMonth = uniqueSickStudentIds.size;

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthShortNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
    ];
    const currentMonthName = monthNames[currentMonth];
    const currentMonthShort = monthShortNames[currentMonth];

    const dailyCounts = {};
    for (let d = 1; d <= daysInMonth; d++) {
      dailyCounts[d] = 0;
    }

    monthlyVisits.forEach((v) => {
      const day = new Date(v.tglKunjungan).getDate();
      if (dailyCounts[day] !== undefined) {
        dailyCounts[day]++;
      }
    });

    const chartLabels = [];
    const chartData = [];
    for (let d = 1; d <= daysInMonth; d++) {
      chartLabels.push(`${d} ${currentMonthShort}`);
      chartData.push(dailyCounts[d]);
    }

    const monthlyStatusCounts = {
      DIRAWAT: monthlyVisits.filter((v) => v.status === 'DIRAWAT').length,
      KEMBALI_KELAS: monthlyVisits.filter((v) => v.status === 'KEMBALI_KELAS').length,
      PULANG: monthlyVisits.filter((v) => v.status === 'PULANG').length,
      DIRUJUK: monthlyVisits.filter((v) => v.status === 'DIRUJUK').length,
    };

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
      monthlySickAnalytics: {
        currentMonthName,
        currentYear,
        totalSickThisMonth,
        uniqueSickStudentsThisMonth,
        chartLabels,
        chartData,
        statusCounts: monthlyStatusCounts,
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

    const selectedStudentId = req.query.studentId ? parseInt(req.query.studentId, 10) : null;

    res.render('petugas/visits/create', {
      title: 'Registrasi Kunjungan Siswa Masuk UKS',
      user: req.session.user,
      students,
      medicines,
      selectedStudentId,
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
    const medRaw = req.body.medicineId || req.body['medicineId[]'];
    const qtyRaw = req.body.jumlah || req.body['jumlah[]'];
    const doseRaw = req.body.dosis || req.body['dosis[]'];

    // Handle medicine array / single item
    const medicineIds = Array.isArray(medRaw) ? medRaw : medRaw ? [medRaw] : [];
    const jumlahs = Array.isArray(qtyRaw) ? qtyRaw : qtyRaw ? [qtyRaw] : [];
    const dosises = Array.isArray(doseRaw) ? doseRaw : doseRaw ? [doseRaw] : [];

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
    const { jamKeluar, keluhan, suhuTubuh, tensi, tindakan, status, catatanSurat } = req.body;
    const medRaw = req.body.medicineId || req.body['medicineId[]'];
    const qtyRaw = req.body.jumlah || req.body['jumlah[]'];
    const doseRaw = req.body.dosis || req.body['dosis[]'];

    const medicineIds = Array.isArray(medRaw) ? medRaw : medRaw ? [medRaw] : [];
    const jumlahs = Array.isArray(qtyRaw) ? qtyRaw : qtyRaw ? [qtyRaw] : [];
    const dosises = Array.isArray(doseRaw) ? doseRaw : doseRaw ? [doseRaw] : [];

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

// ==========================================
// FITUR DATA & TAMBAH SISWA (ROLE PETUGAS)
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

    const students = await prisma.user.findMany({
      where,
      orderBy: { nama: 'asc' },
      include: {
        healthProfile: true,
        _count: {
          select: { medicalRecordsAsStudent: true },
        },
      },
    });

    res.render('petugas/siswa/index', {
      title: 'Data Siswa & Profil Kesehatan',
      user: req.session.user,
      students,
      search: search || '',
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (err) {
    console.error('Petugas Get Siswa Error:', err);
    res.status(500).send('Internal Server Error');
  }
};

const getCreateSiswa = (req, res) => {
  res.render('petugas/siswa/create', {
    title: 'Daftarkan Siswa Baru di UKS',
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
      catatKunjungan,
    } = req.body;

    if (!nama) {
      return res.redirect('/petugas/siswa/create?error=Nama+siswa+wajib+diisi');
    }

    let cleanUsername = username ? username.trim().toLowerCase() : '';
    if (!cleanUsername) {
      if (nisn && nisn.trim() !== '') {
        cleanUsername = nisn.trim();
      } else {
        cleanUsername = 'siswa_' + nama.trim().toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(100 + Math.random() * 900);
      }
    }

    const existingUser = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });
    if (existingUser) {
      return res.redirect('/petugas/siswa/create?error=Username+' + encodeURIComponent(cleanUsername) + '+sudah+digunakan,+silakan+ganti');
    }

    const cleanNisn = nisn && nisn.trim() !== '' ? nisn.trim() : null;
    if (cleanNisn) {
      const existingNisn = await prisma.user.findUnique({
        where: { nisn: cleanNisn },
      });
      if (existingNisn) {
        return res.redirect('/petugas/siswa/create?error=NISN+sudah+terdaftar+dalam+sistem');
      }
    }

    const defaultPass = password && password.trim() !== '' ? password.trim() : 'password123';
    const hashedPassword = await bcrypt.hash(defaultPass, 10);

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

    await prisma.healthProfile.create({
      data: {
        studentId: newStudent.id,
        riwayatPenyakit: riwayatPenyakit ? riwayatPenyakit.trim() : 'Tidak Ada',
        alergiObat: alergiObat ? alergiObat.trim() : 'Tidak Ada',
        alergiMakanan: alergiMakanan ? alergiMakanan.trim() : 'Tidak Ada',
        kontakDarurat: kontakDarurat ? kontakDarurat.trim() : (teleponOrtu ? `Ortu (${teleponOrtu.trim()})` : '-'),
      },
    });

    if (catatKunjungan === '1' || catatKunjungan === 'on' || catatKunjungan === true) {
      return res.redirect(`/petugas/visits/create?studentId=${newStudent.id}`);
    }

    res.redirect('/petugas/siswa?success=Siswa+' + encodeURIComponent(newStudent.nama) + '+berhasil+didaftarkan');
  } catch (err) {
    console.error('Petugas Post Create Siswa Error:', err);
    res.redirect('/petugas/siswa/create?error=Gagal+mendaftarkan+siswa');
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
  // Siswa Management for Petugas
  getSiswa,
  getCreateSiswa,
  postCreateSiswa,
};
