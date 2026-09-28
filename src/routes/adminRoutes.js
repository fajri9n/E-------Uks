const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAuthenticated, checkRole } = require('../middlewares/authMiddleware');

// Protect all admin routes with ADMIN_UKS role
router.use(isAuthenticated);
router.use(checkRole(['ADMIN_UKS']));

// Feature #4: Dashboard Analitik Tren Keluhan Sekolah
router.get('/dashboard', adminController.getDashboard);

// Feature #2: CRUD Master Data Obat-Obatan & Alat P3K
router.get('/medicines', adminController.getMedicines);
router.get('/medicines/create', adminController.getCreateMedicine);
router.post('/medicines/create', adminController.postCreateMedicine);
router.get('/medicines/:id/edit', adminController.getEditMedicine);
router.post('/medicines/:id/edit', adminController.postEditMedicine);
router.post('/medicines/:id/delete', adminController.postDeleteMedicine);

// Feature #3: Monitoring Kadaluarsa & Ambang Batas Stok Obat
router.get('/stock-alerts', adminController.getStockAlerts);

// Fitur: Manajemen Akun Petugas UKS (Lihat & Tambah Petugas)
router.get('/petugas', adminController.getPetugas);
router.get('/petugas/create', adminController.getCreatePetugas);
router.post('/petugas/create', adminController.postCreatePetugas);
router.get('/petugas/:id/edit', adminController.getEditPetugas);
router.post('/petugas/:id/edit', adminController.postEditPetugas);
router.post('/petugas/:id/delete', adminController.postDeletePetugas);

// Fitur: Manajemen Akun Siswa (Lihat & Tambah Akun Siswa)
router.get('/siswa', adminController.getSiswa);
router.get('/siswa/create', adminController.getCreateSiswa);
router.post('/siswa/create', adminController.postCreateSiswa);
router.get('/siswa/:id/edit', adminController.getEditSiswa);
router.post('/siswa/:id/edit', adminController.postEditSiswa);
router.post('/siswa/:id/delete', adminController.postDeleteSiswa);

module.exports = router;
