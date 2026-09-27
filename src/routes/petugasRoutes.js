const express = require('express');
const router = express.Router();
const petugasController = require('../controllers/petugasController');
const { isAuthenticated, checkRole } = require('../middlewares/authMiddleware');

// Protect all petugas routes with PETUGAS_UKS role
router.use(isAuthenticated);
router.use(checkRole(['PETUGAS_UKS']));

router.get('/dashboard', petugasController.getDashboard);

// Feature #5: Registrasi Kunjungan Siswa Masuk Ruang UKS
router.get('/visits', petugasController.getVisits);
router.get('/visits/create', petugasController.getCreateVisit);

// Feature #6 & #7: Catat Hasil Pemeriksaan & Input Pemberian Obat (Stok Otomatis Terpotong)
router.post('/visits/create', petugasController.postCreateVisit);
router.get('/visits/:id/examine', petugasController.getExamineVisit);
router.post('/visits/:id/examine', petugasController.postUpdateVisit);

// Feature #8: Terbitkan Surat Izin Istirahat / Rujukan Pulang Digital
router.get('/permit/:id/print', petugasController.getPrintPermit);

// Feature #9: Cetak Laporan Rekapitulasi Kunjungan UKS Bulanan
router.get('/reports', petugasController.getMonthlyReports);
router.get('/reports/print', petugasController.getPrintMonthlyReport);

module.exports = router;
