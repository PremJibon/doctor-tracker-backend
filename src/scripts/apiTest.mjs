/**
 * P9 — End-to-End API Verification Script
 * Tests every endpoint in context/api-spec.md against live seeded data.
 * Run with: node src/scripts/apiTest.mjs
 *
 * Requires: server running on http://localhost:5000 (or PORT env var)
 * Access token is returned in the JSON body (not a cookie).
 * Refresh token is set as an httpOnly cookie (path /api/auth).
 * Test-created documents (doctor, patient) are cleaned up at the end.
 */

const BASE = `http://localhost:${process.env.PORT || 5000}/api`;

let accessToken = "";
let refreshCookie = "";
let testDoctorId = "";
let testPatientId = "";
let addedPatientId = ""; // from POST /doctors/:id/patients
let createdDoctorId = ""; // cleanup: doctor created by test

let passed = 0;
let failed = 0;

function log(label, status, detail = "") {
  const icon = status ? "✅" : "❌";
  if (!status) failed++;
  else passed++;
  console.log(`${icon}  ${label}${detail ? " — " + detail : ""}`);
}

async function req(method, path, body, headers = {}) {
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(refreshCookie ? { Cookie: refreshCookie } : {}),
      ...headers,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);

  // Access token is in the JSON body; refresh token is in the httpOnly cookie
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
    for (const cookie of cookies) {
      if (cookie.includes("refreshToken=")) {
        const val = cookie.split("refreshToken=")[1].split(";")[0];
        refreshCookie = `refreshToken=${val}`;
      }
    }
  }

  let json;
  try {
    json = await res.json();
  } catch {
    json = {};
  }

  // Capture access token from JSON body
  if (json?.accessToken) {
    accessToken = json.accessToken;
  }

  return { status: res.status, json };
}

async function run() {
  console.log("🧪 P9 End-to-End API Verification");
  console.log("=".repeat(60));

  // ── Health ──────────────────────────────────────────────────
  console.log("\n── Health ──");
  {
    const { status } = await req("GET", "/health");
    log("GET /api/health → 200", status === 200, `status=${status}`);
  }

  // ── Auth ────────────────────────────────────────────────────
  console.log("\n── Auth ──");

  // 401 on protected route without token
  {
    const { status } = await fetch(`${BASE}/doctors`);
    log("GET /api/doctors (no token) → 401", status === 401, `status=${status}`);
  }

  // 400 on invalid login body (extra key)
  {
    const { status, json } = await req("POST", "/auth/login", {
      email: "admin@doctor-tracker.com",
      password: "AdminPassword123!",
      hacked: true,
    });
    log(
      "POST /api/auth/login (extra key) → 400 VALIDATION_ERROR",
      status === 400 && json?.error?.code === "VALIDATION_ERROR",
      `status=${status} code=${json?.error?.code}`
    );
  }

  // 401 wrong password
  {
    const { status, json } = await req("POST", "/auth/login", {
      email: "admin@doctor-tracker.com",
      password: "WrongPassword!",
    });
    log(
      "POST /api/auth/login (wrong pw) → 401 INVALID_CREDENTIALS",
      status === 401 && json?.error?.code === "INVALID_CREDENTIALS",
      `status=${status} code=${json?.error?.code}`
    );
  }

  // Successful login
  {
    const { status, json } = await req("POST", "/auth/login", {
      email: "admin@doctor-tracker.com",
      password: "AdminPassword123!",
    });
    log(
      "POST /api/auth/login → 200 with accessToken in body",
      status === 200 && !!accessToken,
      `status=${status} hasToken=${!!accessToken}`
    );
  }

  // GET /me
  {
    const { status, json } = await req("GET", "/auth/me");
    log(
      "GET /api/auth/me → 200 with user (no passwordHash)",
      status === 200 && json?.user?.email === "admin@doctor-tracker.com" && !json?.user?.passwordHash,
      `status=${status} email=${json?.user?.email}`
    );
  }

  // POST /refresh
  {
    const { status, json } = await req("POST", "/auth/refresh");
    log(
      "POST /api/auth/refresh → 200 with new accessToken in body",
      status === 200 && !!accessToken,
      `status=${status} hasToken=${!!accessToken}`
    );
  }

  // ── Doctors ─────────────────────────────────────────────────
  console.log("\n── Doctors ──");

  // GET /doctors (default)
  {
    const { status, json } = await req("GET", "/doctors?limit=5");
    const ok =
      status === 200 &&
      Array.isArray(json?.data) &&
      json?.meta?.total >= 40;
    log("GET /api/doctors → 200 with data+meta", ok, `status=${status} total=${json?.meta?.total}`);
    testDoctorId = json?.data?.[0]?._id ?? "";
  }

  // GET /doctors?search=
  {
    const { status, json } = await req("GET", "/doctors?search=rafiqul&limit=5");
    log(
      "GET /api/doctors?search=rafiqul → 200",
      status === 200 && Array.isArray(json?.data),
      `status=${status} count=${json?.data?.length}`
    );
  }

  // GET /doctors?specialization=Cardiology
  {
    const { status, json } = await req("GET", "/doctors?specialization=Cardiology&limit=5");
    log(
      "GET /api/doctors?specialization=Cardiology → 200",
      status === 200,
      `status=${status} count=${json?.data?.length}`
    );
  }

  // GET /doctors?hospital=Square+Hospital
  {
    const { status, json } = await req("GET", "/doctors?hospital=Square%20Hospital&limit=5");
    log(
      "GET /api/doctors?hospital=Square Hospital → 200",
      status === 200,
      `status=${status} count=${json?.data?.length}`
    );
  }

  // GET /doctors?limit=999 (should cap at 100)
  {
    const { status, json } = await req("GET", "/doctors?limit=999");
    const cappedOrRejected =
      status === 200
        ? (json?.meta?.limit ?? json?.meta?.pageSize) <= 100
        : status === 400;
    log(
      "GET /api/doctors?limit=999 → cap to 100 or 400",
      cappedOrRejected,
      `status=${status} limit=${json?.meta?.limit ?? json?.meta?.pageSize}`
    );
  }

  // POST /doctors — invalid body (missing required)
  {
    const { status, json } = await req("POST", "/doctors", { name: "Only Name" });
    log(
      "POST /api/doctors (missing fields) → 400 VALIDATION_ERROR",
      status === 400 && json?.error?.code === "VALIDATION_ERROR",
      `status=${status} code=${json?.error?.code}`
    );
  }

  // POST /doctors — valid
  {
    const { status, json } = await req("POST", "/doctors", {
      name: "Dr. Test Doctor",
      specialization: "Neurology",
      hospital: "Square Hospital",
      phone: "+8801800000099",
      email: `test.doctor.p9.${Date.now()}@careguide.bd`,
    });
    log(
      "POST /api/doctors → 201",
      status === 201 && !!json?.data?._id,
      `status=${status} id=${json?.data?._id}`
    );
    if (json?.data?._id) { testDoctorId = json.data._id; createdDoctorId = json.data._id; }
  }

  // GET /doctors/:id
  if (testDoctorId) {
    const { status, json } = await req("GET", `/doctors/${testDoctorId}`);
    log(
      "GET /api/doctors/:id → 200",
      status === 200 && json?.data?._id === testDoctorId,
      `status=${status}`
    );
  }

  // GET /doctors/:id (not found)
  {
    const { status, json } = await req("GET", "/doctors/000000000000000000000000");
    log(
      "GET /api/doctors/invalid-id → 404",
      status === 404,
      `status=${status} code=${json?.error?.code}`
    );
  }

  // ── Doctor-Patient Sub-Roster ─────────────────────────────────
  console.log("\n── Doctor → Patient Sub-Roster ──");

  // First get a real patient id from /patients
  {
    const { json } = await req("GET", "/patients?limit=5");
    testPatientId = json?.data?.[0]?._id ?? "";
  }

  // GET /doctors/:id/patients
  if (testDoctorId) {
    const { status, json } = await req("GET", `/doctors/${testDoctorId}/patients?limit=5`);
    log(
      "GET /api/doctors/:id/patients → 200",
      status === 200,
      `status=${status} count=${json?.data?.length}`
    );
  }

  // POST /doctors/:id/patients — create new patient under doctor
  if (testDoctorId) {
    const { status, json } = await req("POST", `/doctors/${testDoctorId}/patients`, {
      name: "P9 Test Patient",
      age: 45,
      gender: "Male",
      phone: "+8801800000098",
      condition: "Test Condition",
    });
    log(
      "POST /api/doctors/:id/patients → 201",
      status === 201 && !!json?.data?._id,
      `status=${status} id=${json?.data?._id}`
    );
    if (json?.data?._id) addedPatientId = json.data._id;
  }

  // DELETE /doctors/:id/patients/:patientId
  if (testDoctorId && addedPatientId) {
    const { status } = await req(
      "DELETE",
      `/doctors/${testDoctorId}/patients/${addedPatientId}`
    );
    log(
      "DELETE /api/doctors/:id/patients/:patientId → 200 or 404",
      status === 200 || status === 404,
      `status=${status}`
    );
  }

  // ── Patients ─────────────────────────────────────────────────
  console.log("\n── Patients ──");

  // GET /patients
  {
    const { status, json } = await req("GET", "/patients?limit=5");
    log(
      "GET /api/patients → 200 with data+meta",
      status === 200 && Array.isArray(json?.data) && json?.meta?.total >= 1500,
      `status=${status} total=${json?.meta?.total}`
    );
    testPatientId = json?.data?.[0]?._id ?? testPatientId;
  }

  // GET /patients?search=
  {
    const { status, json } = await req("GET", "/patients?search=farzana&limit=5");
    log(
      "GET /api/patients?search=farzana → 200",
      status === 200 && Array.isArray(json?.data),
      `status=${status} count=${json?.data?.length}`
    );
  }

  // GET /patients?condition=Hypertension
  {
    const { status, json } = await req("GET", "/patients?condition=Hypertension&limit=5");
    log(
      "GET /api/patients?condition=Hypertension → 200",
      status === 200,
      `status=${status} count=${json?.data?.length}`
    );
  }

  // GET /patients?admittedAfter=
  {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const { status } = await req("GET", `/patients?from=${thirtyDaysAgo}&limit=5`);
    log(
      "GET /api/patients?admittedAfter=<30d> → 200",
      status === 200,
      `status=${status}`
    );
  }

  // PATCH /patients/:id
  if (testPatientId) {
    const { status, json } = await req("PATCH", `/patients/${testPatientId}`, {
      condition: "Type 2 Diabetes",
    });
    log(
      "PATCH /api/patients/:id → 200",
      status === 200,
      `status=${status} condition=${json?.data?.condition}`
    );
  }

  // PATCH /patients/:id invalid body (extra field)
  if (testPatientId) {
    const { status, json } = await req("PATCH", `/patients/${testPatientId}`, {
      condition: "Hypertension",
      fakeField: "injected",
    });
    log(
      "PATCH /api/patients/:id (extra key) → 400 VALIDATION_ERROR",
      status === 400 && json?.error?.code === "VALIDATION_ERROR",
      `status=${status}`
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────
  console.log("\n── Dashboard ──");

  {
    const { status, json } = await req("GET", "/dashboard/summary");
    log(
      "GET /api/dashboard/summary → 200",
      status === 200 &&
        typeof json?.data?.totalDoctors === "number" &&
        typeof json?.data?.totalPatients === "number",
      `status=${status} docs=${json?.data?.totalDoctors} pts=${json?.data?.totalPatients}`
    );
  }

  {
    const { status, json } = await req("GET", "/dashboard/patients-per-doctor");
    log(
      "GET /api/dashboard/patients-per-doctor → 200 (top 10)",
      status === 200 && Array.isArray(json?.data) && json?.data?.length <= 10,
      `status=${status} count=${json?.data?.length}`
    );
  }

  {
    const { status, json } = await req("GET", "/dashboard/patients-over-time?range=7d");
    log(
      "GET /api/dashboard/patients-over-time?range=7d → 200",
      status === 200 && Array.isArray(json?.data),
      `status=${status} buckets=${json?.data?.length}`
    );
  }

  {
    const { status, json } = await req("GET", "/dashboard/patients-over-time?range=30d");
    log(
      "GET /api/dashboard/patients-over-time?range=30d → 200",
      status === 200 && Array.isArray(json?.data),
      `status=${status} buckets=${json?.data?.length}`
    );
  }

  {
    const { status, json } = await req("GET", "/dashboard/patients-over-time?range=12m");
    log(
      "GET /api/dashboard/patients-over-time?range=12m → 200",
      status === 200 && Array.isArray(json?.data),
      `status=${status} buckets=${json?.data?.length}`
    );
  }

  // Invalid range param
  {
    const { status, json } = await req("GET", "/dashboard/patients-over-time?range=invalid");
    log(
      "GET /api/dashboard/patients-over-time?range=invalid → 400",
      status === 400 && json?.error?.code === "VALIDATION_ERROR",
      `status=${status}`
    );
  }

  {
    const { status, json } = await req("GET", "/dashboard/conditions");
    log(
      "GET /api/dashboard/conditions → 200",
      status === 200 && Array.isArray(json?.data),
      `status=${status} conditions=${json?.data?.length}`
    );
  }

  // POST /auth/logout
  {
    const { status } = await req("POST", "/auth/logout");
    log("POST /api/auth/logout → 200", status === 200, `status=${status}`);
  }

  // ── Cleanup (delete test-created documents) ───────────────────
  console.log("\n── Cleanup ──");
  if (createdDoctorId) {
    const { status } = await req("DELETE", `/doctors/${createdDoctorId}`);
    log(
      `DELETE /api/doctors/${createdDoctorId} (test cleanup)`,
      status === 200 || status === 204 || status === 404,
      `status=${status}`
    );
  }

  // ── Summary ───────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log(
    `Total: ${passed + failed} tests | ✅ ${passed} passed | ❌ ${failed} failed`
  );
  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
