const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const indexRoutes = require('./src/routes/indexRoutes');
const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const petugasRoutes = require('./src/routes/petugasRoutes');
const siswaRoutes = require('./src/routes/siswaRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Set EJS View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Body Parser & Static Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'e_uks_rekam_medis_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      secure: false,
    },
  })
);

// Global user variable for EJS views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Register Routes
app.use('/', indexRoutes);
app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/petugas', petugasRoutes);
app.use('/siswa', siswaRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).render('errors/404', {
    title: '404 - Halaman Tidak Ditemukan',
    user: req.session.user || null,
  });
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🏥 E-UKS & Rekam Medis Siswa Server Running on: http://localhost:${PORT}`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
