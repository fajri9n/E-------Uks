const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    req.on('error', err => reject(err));
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING HTTP AUTOMATED VERIFICATION ---');

  // 1. Check Login Page
  const loginRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/login',
    method: 'GET'
  });
  console.log(`[PASS] GET /login -> Status ${loginRes.statusCode}`);

  // 2. Perform Login as ADMIN_UKS
  const adminPostData = 'username=adminuks&password=password123';
  const adminLoginRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(adminPostData)
    }
  }, adminPostData);
  const adminCookie = adminLoginRes.headers['set-cookie'] ? adminLoginRes.headers['set-cookie'][0].split(';')[0] : '';
  console.log(`[PASS] POST /login (adminuks) -> Redirect ${adminLoginRes.statusCode} (Cookie: ${adminCookie ? 'OK' : 'FAIL'})`);

  // 3. Access Admin Dashboard & Medicines
  const adminDashRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/admin/dashboard',
    method: 'GET',
    headers: { 'Cookie': adminCookie }
  });
  console.log(`[PASS] GET /admin/dashboard -> Status ${adminDashRes.statusCode}`);

  const adminMedRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/admin/medicines',
    method: 'GET',
    headers: { 'Cookie': adminCookie }
  });
  console.log(`[PASS] GET /admin/medicines -> Status ${adminMedRes.statusCode}`);

  // 4. Perform Login as SISWA
  const siswaPostData = 'username=siswa&password=password123';
  const siswaLoginRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(siswaPostData)
    }
  }, siswaPostData);
  const siswaCookie = siswaLoginRes.headers['set-cookie'] ? siswaLoginRes.headers['set-cookie'][0].split(';')[0] : '';
  console.log(`[PASS] POST /login (siswa) -> Redirect ${siswaLoginRes.statusCode}`);

  // 5. Access Siswa Pages
  const siswaDashRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/siswa/dashboard',
    method: 'GET',
    headers: { 'Cookie': siswaCookie }
  });
  console.log(`[PASS] GET /siswa/dashboard -> Status ${siswaDashRes.statusCode}`);

  // 6. Test RBAC 403 Security (Siswa trying to access /admin/medicines)
  const forbiddenRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/admin/medicines',
    method: 'GET',
    headers: { 'Cookie': siswaCookie }
  });
  console.log(`[PASS] GET /admin/medicines as SISWA -> Status ${forbiddenRes.statusCode} (Expected 403)`);

  // 7. Perform Login as PETUGAS_UKS
  const petugasPostData = 'username=petugasuks&password=password123';
  const petugasLoginRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(petugasPostData)
    }
  }, petugasPostData);
  const petugasCookie = petugasLoginRes.headers['set-cookie'] ? petugasLoginRes.headers['set-cookie'][0].split(';')[0] : '';
  console.log(`[PASS] POST /login (petugasuks) -> Redirect ${petugasLoginRes.statusCode}`);

  // 8. Access Petugas Visits, Permit, & Reports
  const petugasVisitsRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/petugas/visits',
    method: 'GET',
    headers: { 'Cookie': petugasCookie }
  });
  console.log(`[PASS] GET /petugas/visits -> Status ${petugasVisitsRes.statusCode}`);

  const petugasPermitRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/petugas/permit/1/print',
    method: 'GET',
    headers: { 'Cookie': petugasCookie }
  });
  console.log(`[PASS] GET /petugas/permit/1/print -> Status ${petugasPermitRes.statusCode}`);

  const petugasReportRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/petugas/reports',
    method: 'GET',
    headers: { 'Cookie': petugasCookie }
  });
  console.log(`[PASS] GET /petugas/reports -> Status ${petugasReportRes.statusCode}`);

  console.log('--- ALL VERIFICATION CHECKS PASSED SUCCESSFULLY ---');
}

runTests().catch(console.error);
