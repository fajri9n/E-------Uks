const express = require('express');
const router = express.Router();
const siswaController = require('../controllers/siswaController');
const { isAuthenticated, checkRole } = require('../middlewares/authMiddleware');

// Protect all siswa routes with SISWA role
router.use(isAuthenticated);
router.use(checkRole(['SISWA']));

router.get('/dashboard', siswaController.getDashboard);

// Feature #10: Melihat Riwayat Rekam Medis Kunjungan UKS Pribadi
router.get('/medical-records', siswaController.getMedicalRecords);

// Feature #11: Mengisi Informasi Riwayat Alergi & Penyakit Bawaan
router.get('/health-profile', siswaController.getHealthProfile);
router.post('/health-profile', siswaController.postHealthProfile);

// Feature #12: Memantau Status Izin Istirahat UKS Digital
router.get('/permits', siswaController.getPermits);

module.exports = router;
