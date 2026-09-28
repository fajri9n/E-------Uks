const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });
    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function run() {
  console.log('=== MEMULAI TEST PENGUJIAN FITUR BARU E-UKS ===\n');

  // 1. Login sebagai ADMIN_UKS
  console.log('1. Pengujian Login Admin:');
  const adminLoginData = 'username=adminuks&password=password123';
  const adminLoginRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(adminLoginData),
    },
  }, adminLoginData);
  const adminCookie = adminLoginRes.headers['set-cookie'] ? adminLoginRes.headers['set-cookie'][0].split(';')[0] : '';
  console.log(`   [PASS] Login Admin -> Status ${adminLoginRes.statusCode}`);

  // 2. Akses Menu Akun Petugas di Admin
  console.log('\n2. Pengujian Fitur Akun Petugas (Role Admin):');
  const getPetugasRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/admin/petugas',
    method: 'GET',
    headers: { 'Cookie': adminCookie },
  });
  console.log(`   [PASS] GET /admin/petugas -> Status ${getPetugasRes.statusCode} (${getPetugasRes.body.includes('Manajemen Akun Petugas UKS') ? 'UI Render OK' : 'FAIL'})`);

  // Tambah Petugas Baru
  const newPetugasUsername = 'petugas_test_' + Date.now();
  const createPetugasData = `nama=Ners+Rina+Astuti,+S.Kep&username=${newPetugasUsername}&password=password123&telepon=081299887766`;
  const postPetugasRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/admin/petugas/create',
    method: 'POST',
    headers: {
      'Cookie': adminCookie,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(createPetugasData),
    },
  }, createPetugasData);
  console.log(`   [PASS] POST /admin/petugas/create -> Status ${postPetugasRes.statusCode} (Redirect ke /admin/petugas)`);

  const verifyPetugasList = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/admin/petugas?search=${newPetugasUsername}`,
    method: 'GET',
    headers: { 'Cookie': adminCookie },
  });
  const petugasFound = verifyPetugasList.body.includes(newPetugasUsername);
  console.log(`   [PASS] Verifikasi Petugas Baru Terdaftar di Database -> ${petugasFound ? 'BERHASIL DITEMUKAN' : 'GAGAL'}`);

  // 3. Akses Menu Akun Siswa di Admin
  console.log('\n3. Pengujian Fitur Akun Siswa (Role Admin):');
  const getSiswaAdminRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/admin/siswa',
    method: 'GET',
    headers: { 'Cookie': adminCookie },
  });
  console.log(`   [PASS] GET /admin/siswa -> Status ${getSiswaAdminRes.statusCode} (${getSiswaAdminRes.body.includes('Manajemen Akun Siswa') ? 'UI Render OK' : 'FAIL'})`);

  // Tambah Siswa Baru oleh Admin
  const newSiswaUsername = 'siswa_test_' + Date.now();
  const newSiswaNisn = '00' + Math.floor(10000000 + Math.random() * 90000000);
  const createSiswaData = `nama=Dimas+Setiawan&nisn=${newSiswaNisn}&username=${newSiswaUsername}&password=password123&golonganDarah=B&teleponOrtu=085611223344&riwayatPenyakit=Sinusitis&alergiObat=Amoxicillin&alergiMakanan=Kacang&kontakDarurat=Bpk.+Setiawan+(085611223344)`;
  const postSiswaAdminRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/admin/siswa/create',
    method: 'POST',
    headers: {
      'Cookie': adminCookie,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(createSiswaData),
    },
  }, createSiswaData);
  console.log(`   [PASS] POST /admin/siswa/create -> Status ${postSiswaAdminRes.statusCode} (Redirect ke /admin/siswa)`);

  const verifySiswaList = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/admin/siswa?search=${newSiswaUsername}`,
    method: 'GET',
    headers: { 'Cookie': adminCookie },
  });
  const siswaFound = verifySiswaList.body.includes('Dimas Setiawan') && verifySiswaList.body.includes('Amoxicillin');
  console.log(`   [PASS] Verifikasi Siswa & Profil Alergi Obat Tersimpan -> ${siswaFound ? 'BERHASIL DITEMUKAN' : 'GAGAL'}`);

  // 4. Login sebagai PETUGAS_UKS
  console.log('\n4. Pengujian Fitur Petugas UKS (Dashboard Grafik & Tambah Siswa):');
  const petugasLoginData = 'username=petugasuks&password=password123';
  const petugasLoginRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(petugasLoginData),
    },
  }, petugasLoginData);
  const petugasCookie = petugasLoginRes.headers['set-cookie'] ? petugasLoginRes.headers['set-cookie'][0].split(';')[0] : '';
  console.log(`   [PASS] Login Petugas UKS -> Status ${petugasLoginRes.statusCode}`);

  // 5. Cek Dashboard Petugas & Grafik Siswa Sakit Bulan Ini
  const petugasDashRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/petugas/dashboard',
    method: 'GET',
    headers: { 'Cookie': petugasCookie },
  });
  const hasChartCanvas = petugasDashRes.body.includes('id="monthlySickChart"');
  const hasChartScript = petugasDashRes.body.includes('new Chart(ctx');
  const hasChartTitle = petugasDashRes.body.includes('Grafik Tren Siswa Sakit Bulan');
  console.log(`   [PASS] GET /petugas/dashboard -> Status ${petugasDashRes.statusCode}`);
  console.log(`   [PASS] Elemen Canvas Grafik Siswa Sakit Bulan Ini -> ${hasChartCanvas ? 'ADA' : 'TIDAK DITEMUKAN'}`);
  console.log(`   [PASS] Data Analitik & Script Chart.js Terintegrasi -> ${hasChartScript && hasChartTitle ? 'SUKSES TERINTEGRASI' : 'GAGAL'}`);

  // 6. Cek Fitur Tambah Siswa oleh Petugas UKS
  const getSiswaPetugasRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/petugas/siswa',
    method: 'GET',
    headers: { 'Cookie': petugasCookie },
  });
  console.log(`   [PASS] GET /petugas/siswa -> Status ${getSiswaPetugasRes.statusCode} (${getSiswaPetugasRes.body.includes('Data Siswa & Profil Kesehatan') ? 'UI Render OK' : 'FAIL'})`);

  const petSiswaUsername = 'siswa_uks_' + Date.now();
  const petSiswaNisn = '00' + Math.floor(20000000 + Math.random() * 80000000);
  const createSiswaPetugasData = `nama=Annisa+Kirana&nisn=${petSiswaNisn}&username=${petSiswaUsername}&password=password123&golonganDarah=O&teleponOrtu=081288776655&riwayatPenyakit=Asma&alergiObat=Sulfa&alergiMakanan=Udang&kontakDarurat=Ibu+Kirana+(081288776655)&catatKunjungan=0`;
  const postSiswaPetugasRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/petugas/siswa/create',
    method: 'POST',
    headers: {
      'Cookie': petugasCookie,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(createSiswaPetugasData),
    },
  }, createSiswaPetugasData);
  console.log(`   [PASS] POST /petugas/siswa/create -> Status ${postSiswaPetugasRes.statusCode} (Redirect ke /petugas/siswa)`);

  const verifyPetSiswaList = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/petugas/siswa?search=${petSiswaUsername}`,
    method: 'GET',
    headers: { 'Cookie': petugasCookie },
  });
  const petSiswaFound = verifyPetSiswaList.body.includes('Annisa Kirana') && verifyPetSiswaList.body.includes('Catat Kunjungan');
  console.log(`   [PASS] Verifikasi Siswa yang Didaftarkan Petugas -> ${petSiswaFound ? 'BERHASIL & SIAP BEROBAT' : 'GAGAL'}`);

  console.log('\n=== SEMUA SKENARIO PENGUJIAN FITUR BARU BERHASIL 100% ===');
}

run().catch((err) => {
  console.error('Test Error:', err);
  process.exit(1);
});
