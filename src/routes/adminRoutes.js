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

module.exports = router;
