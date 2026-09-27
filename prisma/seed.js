const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database E-UKS...');

  // Clean existing data
  await prisma.medicinePrescription.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.healthProfile.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create Users
  const admin = await prisma.user.create({
    data: {
      username: 'adminuks',
      password: hashedPassword,
      nama: 'Drs. H. Ahmad Pembina, M.Pd',
      role: 'ADMIN_UKS',
      teleponOrtu: '081234567890',
    },
  });

  const petugas = await prisma.user.create({
    data: {
      username: 'petugasuks',
      password: hashedPassword,
      nama: 'Siti Nurhaliza, A.Md.Kep',
      role: 'PETUGAS_UKS',
      teleponOrtu: '081987654321',
    },
  });

  const siswa1 = await prisma.user.create({
    data: {
      username: 'siswa',
      password: hashedPassword,
      nama: 'Budi Santoso',
      role: 'SISWA',
      nisn: '0051234567',
      teleponOrtu: '081122334455',
      golonganDarah: 'O',
    },
  });

  const siswa2 = await prisma.user.create({
    data: {
      username: 'siswa2',
      password: hashedPassword,
      nama: 'Siti Rahma',
      role: 'SISWA',
      nisn: '0057654321',
      teleponOrtu: '085566778899',
      golonganDarah: 'A',
    },
  });

  const siswa3 = await prisma.user.create({
    data: {
      username: 'siswa3',
      password: hashedPassword,
      nama: 'Rizky Pratama',
      role: 'SISWA',
      nisn: '0059876543',
      teleponOrtu: '087788990011',
      golonganDarah: 'B',
    },
  });

  console.log('Users created successfully.');

  // 2. Create Health Profiles
  await prisma.healthProfile.create({
    data: {
      studentId: siswa1.id,
      riwayatPenyakit: 'Asma Ringan, Maag',
      alergiObat: 'Penisilin',
      alergiMakanan: 'Udang / Seafood',
      kontakDarurat: 'Bpk. Santoso (Ayah) - 081122334455',
    },
  });

  await prisma.healthProfile.create({
    data: {
      studentId: siswa2.id,
      riwayatPenyakit: 'Vertigo, Migrain',
      alergiObat: 'Tidak Ada',
      alergiMakanan: 'Kacang Tanah',
      kontakDarurat: 'Ibu Rahma (Ibu) - 085566778899',
    },
  });

  await prisma.healthProfile.create({
    data: {
      studentId: siswa3.id,
      riwayatPenyakit: 'Tidak Ada',
      alergiObat: 'Sulfonamida',
      alergiMakanan: 'Tidak Ada',
      kontakDarurat: 'Bpk. Pratama (Ayah) - 087788990011',
    },
  });

  console.log('Health profiles created.');

  // 3. Create Medicines (Master Data)
  const med1 = await prisma.medicine.create({
    data: {
      namaObat: 'Paracetamol 500mg',
      kategori: 'TABLET',
      stok: 100,
      satuan: 'Tablet',
      tglKadaluarsa: new Date('2027-12-31'),
      aturanPakai: '3x1 tablet sesudah makan bila demam/pusing',
    },
  });

  const med2 = await prisma.medicine.create({
    data: {
      namaObat: 'Amoxicillin 500mg',
      kategori: 'TABLET',
      stok: 5, // Stok menipis / low stock alert (< 10)
      satuan: 'Tablet',
      tglKadaluarsa: new Date('2026-10-15'),
      aturanPakai: '3x1 tablet sesudah makan (harus habis)',
    },
  });

  const med3 = await prisma.medicine.create({
    data: {
      namaObat: 'Antasida Doen Chewable',
      kategori: 'TABLET',
      stok: 45,
      satuan: 'Tablet',
      tglKadaluarsa: new Date('2025-11-01'), // Sudah kadaluarsa (expired alert)
      aturanPakai: '3x1 tablet dikunyah 1 jam sebelum makan',
    },
  });

  const med4 = await prisma.medicine.create({
    data: {
      namaObat: 'OBH Batuk & Flu Syrup 100ml',
      kategori: 'SIRUP',
      stok: 18,
      satuan: 'Botol',
      tglKadaluarsa: new Date('2027-06-30'),
      aturanPakai: '3x1 sendok makan (15ml) sesudah makan',
    },
  });

  const med5 = await prisma.medicine.create({
    data: {
      namaObat: 'Salep Bioplacenton 15g',
      kategori: 'SALEP',
      stok: 12,
      satuan: 'Tube',
      tglKadaluarsa: new Date('2027-09-15'),
      aturanPakai: 'Oleskan tipis 2-3 kali sehari pada luka bakar/lecet',
    },
  });

  const med6 = await prisma.medicine.create({
    data: {
      namaObat: 'Perban Steril Hydrofil 10cm',
      kategori: 'ALAT',
      stok: 25,
      satuan: 'Roll',
      tglKadaluarsa: new Date('2028-12-31'),
      aturanPakai: 'Bebat luka luar yang sudah dibersihkan',
    },
  });

  const med7 = await prisma.medicine.create({
    data: {
      namaObat: 'Betadine Antiseptik 60ml',
      kategori: 'ALAT',
      stok: 8,
      satuan: 'Botol',
      tglKadaluarsa: new Date('2027-04-20'),
      aturanPakai: 'Teteskan pada kasa steril lalu usapkan pada luka',
    },
  });

  const med8 = await prisma.medicine.create({
    data: {
      namaObat: 'Minyak Kayu Putih Cap Lang 60ml',
      kategori: 'ALAT',
      stok: 14,
      satuan: 'Botol',
      tglKadaluarsa: new Date('2028-08-31'),
      aturanPakai: 'Balurkan pada dada, perut, dan leher saat mual/pusing',
    },
  });

  console.log('Medicines inventory created.');

  // 4. Create Medical Records & Prescriptions
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  const twoDaysAgo = new Date(Date.now() - 172800000);

  // Visit 1: Budi Santoso (Demam & Pusing) - Status PULANG (Izin Pulang)
  const record1 = await prisma.medicalRecord.create({
    data: {
      studentId: siswa1.id,
      petugasId: petugas.id,
      tglKunjungan: yesterday,
      jamMasuk: '08:15',
      jamKeluar: '09:30',
      keluhan: 'Demam tinggi, pusing berat, dan lemas setelah olahraga',
      suhuTubuh: 38.5,
      tensi: '110/70',
      tindakan: 'Kompres hangat, istirahat di bed UKS, berikan Paracetamol & minum air hangat',
      status: 'PULANG',
      catatanSurat: 'Siswa mengalami demam tinggi (38.5°C). Disarankan beristirahat di rumah dan dirujuk ke faskes jika demam berlanjut > 2 hari.',
    },
  });

  await prisma.medicinePrescription.create({
    data: {
      medicalRecordId: record1.id,
      medicineId: med1.id,
      jumlah: 1,
      dosis: '1 tablet diminum di UKS sesudah makan',
    },
  });

  // Visit 2: Siti Rahma (Sakit Perut / Maag) - Status KEMBALI_KELAS
  const record2 = await prisma.medicalRecord.create({
    data: {
      studentId: siswa2.id,
      petugasId: petugas.id,
      tglKunjungan: twoDaysAgo,
      jamMasuk: '10:00',
      jamKeluar: '10:45',
      keluhan: 'Nyeri ulu hati, mual, belum sarapan pagi',
      suhuTubuh: 36.6,
      tensi: '120/80',
      tindakan: 'Diberikan teh hangat manis, istirahat 30 menit, dan oles minyak kayu putih',
      status: 'KEMBALI_KELAS',
      catatanSurat: 'Kondisi membaik setelah istirahat dan makan biskuit. Diizinkan kembali ke kelas.',
    },
  });

  await prisma.medicinePrescription.create({
    data: {
      medicalRecordId: record2.id,
      medicineId: med8.id,
      jumlah: 1,
      dosis: 'Balurkan di bagian perut',
    },
  });

  // Visit 3: Rizky Pratama (Luka Lecet Terjatuh) - Status DIRAWAT
  const record3 = await prisma.medicalRecord.create({
    data: {
      studentId: siswa3.id,
      petugasId: petugas.id,
      tglKunjungan: today,
      jamMasuk: '11:20',
      jamKeluar: null,
      keluhan: 'Luka lecet pada lutut kanan akibat terpeleset di lapangan',
      suhuTubuh: 36.5,
      tensi: '115/75',
      tindakan: 'Pembersihan luka dengan NaCl, antiseptik Betadine, dan balut perban steril',
      status: 'DIRAWAT',
      catatanSurat: 'Sedang observasi luka dan istirahat sementara di ruang UKS.',
    },
  });

  await prisma.medicinePrescription.create({
    data: {
      medicalRecordId: record3.id,
      medicineId: med7.id,
      jumlah: 1,
      dosis: 'Dioleskan pada luka lecet',
    },
  });

  await prisma.medicinePrescription.create({
    data: {
      medicalRecordId: record3.id,
      medicineId: med6.id,
      jumlah: 1,
      dosis: 'Dipasang pada lutut kanan',
    },
  });

  console.log('Medical records & prescriptions seeded successfully!');
  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
