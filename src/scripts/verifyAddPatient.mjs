/**
 * Add-Patient Endpoint Deep Verification
 * READ-ONLY audit: creates test records and cleans them up.
 * Reports doctor/patient counts before and after — they must match.
 */

const BASE = `http://localhost:${process.env.PORT || 5000}/api`;

let token = "";
let refreshCookie = "";
let passed = 0;
let failed = 0;

function pass(label, detail = "") {
  passed++;
  console.log(`  ✅  ${label}${detail ? " — " + detail : ""}`);
}
function fail(label, detail = "") {
  failed++;
  console.log(`  ❌  ${label}${detail ? " — " + detail : ""}`);
}
function section(title) {
  console.log(`\n── ${title} ──`);
}

async function req(method, path, body, extraHeaders = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(refreshCookie ? { Cookie: refreshCookie } : {}),
    ...extraHeaders,
  };
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    if (setCookie.includes("refreshToken=")) {
      const val = setCookie.split("refreshToken=")[1].split(";")[0];
      refreshCookie = `refreshToken=${val}`;
    }
  }
  let json;
  try { json = await res.json(); } catch { json = {}; }
  if (json?.accessToken) token = json.accessToken;
  return { status: res.status, json };
}

async function run() {
  console.log("🔬 Add-Patient Endpoint Deep Verification (READ-ONLY audit)");
  console.log("=".repeat(60));

  // ── LOGIN ──
  section("Auth setup");
  const loginR = await req("POST", "/auth/login", {
    email: "admin@doctor-tracker.com",
    password: "AdminPassword123!",
  });
  if (loginR.status === 200 && token) {
    pass("Login", `HTTP ${loginR.status}`);
  } else {
    fail("Login", `HTTP ${loginR.status} — aborting`);
    process.exit(1);
  }

  // ── BEFORE COUNTS ──
  section("Baseline counts (before)");
  const summaryBefore = await req("GET", "/dashboard/summary");
  const docsBefore = summaryBefore.json?.data?.totalDoctors;
  const ptsBefore = summaryBefore.json?.data?.totalPatients;
  console.log(`  Doctors before: ${docsBefore}  |  Patients before: ${ptsBefore}`);

  // ── SETUP: get a valid doctor id ──
  section("Get a valid doctor id");
  const doctorsR = await req("GET", "/doctors?limit=5");
  const targetDoctorId = doctorsR.json?.data?.[0]?._id;
  if (targetDoctorId) {
    pass("Got real doctor id", targetDoctorId);
  } else {
    fail("Failed to get a doctor id — aborting");
    process.exit(1);
  }

  // ── TEST 1: No token → 401 ──
  section("Test 1 — No token → 401");
  {
    const r = await fetch(`${BASE}/doctors/${targetDoctorId}/patients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "X", age: 30, gender: "Male", phone: "+8800000", condition: "Test" }),
    });
    const j = await r.json();
    r.status === 401 && j?.error?.code === "UNAUTHENTICATED"
      ? pass("No token → 401 UNAUTHENTICATED", `HTTP ${r.status}`)
      : fail("No token → 401 UNAUTHENTICATED", `HTTP ${r.status} code=${j?.error?.code}`);
  }

  // ── TEST 2: Valid body → 201, check shape ──
  section("Test 2 — Valid body → 201");
  let createdPatientId = "";
  {
    const body = {
      name: "Audit Test Patient",
      age: 35,
      gender: "Female",
      phone: "+8801900000001",
      condition: "Hypertension",
      admittedAt: "2026-11-01",
    };
    const r = await req("POST", `/doctors/${targetDoctorId}/patients`, body);
    const d = r.json?.data;
    createdPatientId = d?._id ?? "";
    if (r.status === 201 && d?._id) {
      pass("Creates patient → 201", `id=${d._id}`);
    } else {
      fail("Creates patient → 201", `HTTP ${r.status} body=${JSON.stringify(r.json)}`);
    }
    // Check response shape
    d?.name === "Audit Test Patient" ? pass("name in response") : fail("name in response", `got ${d?.name}`);
    d?.nameLower === "audit test patient" ? pass("nameLower set correctly") : fail("nameLower set correctly", `got '${d?.nameLower}'`);
    d?.doctorId === targetDoctorId || d?.doctorId?.toString() === targetDoctorId
      ? pass("doctorId matches") : fail("doctorId matches", `got ${d?.doctorId}`);
    d?.createdAt ? pass("createdAt present") : fail("createdAt present", "missing");
    !d?.passwordHash ? pass("passwordHash not in response") : fail("passwordHash not in response — leaked");
    d?.age === 35 ? pass("age=35 correct") : fail("age", `got ${d?.age}`);
    d?.condition === "Hypertension" ? pass("condition correct") : fail("condition", `got ${d?.condition}`);
  }

  // ── TEST 3: Check doctor's patient list reflects new patient ──
  section("Test 3 — Doctor patient list reflects new patient");
  if (createdPatientId) {
    const r = await req("GET", `/doctors/${targetDoctorId}/patients?limit=100`);
    const found = r.json?.data?.some((p) => p._id === createdPatientId);
    r.status === 200 ? pass("GET /doctors/:id/patients → 200", `count=${r.json?.data?.length}`) : fail("GET /doctors/:id/patients → 200", `HTTP ${r.status}`);
    found ? pass("New patient appears in doctor's list") : fail("New patient appears in doctor's list", "not found");
  }

  // ── TEST 4: Dashboard summary reflects new patient ──
  section("Test 4 — Dashboard summary reflects new patient");
  if (createdPatientId) {
    const r = await req("GET", "/dashboard/summary");
    const ptsNow = r.json?.data?.totalPatients;
    ptsNow === ptsBefore + 1
      ? pass("totalPatients incremented by 1", `${ptsBefore} → ${ptsNow}`)
      : fail("totalPatients incremented by 1", `expected ${ptsBefore + 1} got ${ptsNow}`);
  }

  // ── TEST 5: Unknown doctor id → 404 ──
  section("Test 5 — Unknown doctor id → 404");
  {
    const r = await req("POST", "/doctors/000000000000000000000000/patients", {
      name: "Ghost Patient", age: 30, gender: "Male", phone: "+8800000", condition: "Test",
    });
    r.status === 404 && r.json?.error?.code === "DOCTOR_NOT_FOUND"
      ? pass("Unknown ObjectId → 404 DOCTOR_NOT_FOUND", `HTTP ${r.status}`)
      : fail("Unknown ObjectId → 404 DOCTOR_NOT_FOUND", `HTTP ${r.status} code=${r.json?.error?.code}`);
  }

  // ── TEST 6: Malformed (non-ObjectId) doctor id → 400 ──
  section("Test 6 — Malformed doctor id → 400");
  {
    const r = await req("POST", "/doctors/not-a-valid-objectid/patients", {
      name: "Ghost", age: 30, gender: "Male", phone: "+8800000", condition: "Test",
    });
    r.status === 400 && r.json?.error?.code === "VALIDATION_ERROR"
      ? pass("Malformed id → 400 VALIDATION_ERROR", `HTTP ${r.status}`)
      : fail("Malformed id → 400 VALIDATION_ERROR", `HTTP ${r.status} code=${r.json?.error?.code}`);
  }

  // ── TEST 7: Missing required fields ──
  section("Test 7 — Missing required fields → 400");
  {
    // Missing name, age, gender, condition
    const r = await req("POST", `/doctors/${targetDoctorId}/patients`, { phone: "+8800000" });
    r.status === 400 && r.json?.error?.code === "VALIDATION_ERROR"
      ? pass("Missing fields → 400 VALIDATION_ERROR", `HTTP ${r.status}`)
      : fail("Missing fields → 400 VALIDATION_ERROR", `HTTP ${r.status} code=${r.json?.error?.code}`);
  }

  // ── TEST 8: Wrong types ──
  section("Test 8 — Wrong types → 400");
  {
    // age as string non-numeric
    const r = await req("POST", `/doctors/${targetDoctorId}/patients`, {
      name: "Bad Type", age: "not-a-number", gender: "Male", phone: "+8800000", condition: "Test",
    });
    r.status === 400 && r.json?.error?.code === "VALIDATION_ERROR"
      ? pass("Wrong type (age=string) → 400", `HTTP ${r.status}`)
      : fail("Wrong type (age=string) → 400", `HTTP ${r.status} code=${r.json?.error?.code} body=${JSON.stringify(r.json)}`);
  }

  // ── TEST 9: Extra/unknown keys → 400 (strict schema) ──
  section("Test 9 — Extra unknown keys → 400");
  {
    const r = await req("POST", `/doctors/${targetDoctorId}/patients`, {
      name: "Extra Fields", age: 25, gender: "Male", phone: "+8800000", condition: "Test",
      injectedField: "malicious",
    });
    r.status === 400 && r.json?.error?.code === "VALIDATION_ERROR"
      ? pass("Extra key → 400 VALIDATION_ERROR (strict schema)", `HTTP ${r.status}`)
      : fail("Extra key → 400 VALIDATION_ERROR (strict schema)", `HTTP ${r.status} code=${r.json?.error?.code}`);
  }

  // ── TEST 10: Negative age ──
  section("Test 10 — Negative age → 400");
  {
    const r = await req("POST", `/doctors/${targetDoctorId}/patients`, {
      name: "Neg Age", age: -5, gender: "Male", phone: "+8800000", condition: "Test",
    });
    r.status === 400 && r.json?.error?.code === "VALIDATION_ERROR"
      ? pass("Negative age → 400 VALIDATION_ERROR", `HTTP ${r.status}`)
      : fail("Negative age → 400 VALIDATION_ERROR", `HTTP ${r.status} code=${r.json?.error?.code}`);
  }

  // ── TEST 11: Huge age (beyond reasonable) ──
  section("Test 11 — Huge age (999) → check handling");
  {
    // Schema only enforces min(0), not max — this is a known gap, observe what happens
    const r = await req("POST", `/doctors/${targetDoctorId}/patients`, {
      name: "Huge Age", age: 999, gender: "Male", phone: "+8800000", condition: "Test",
    });
    if (r.status === 400) {
      pass("Huge age → 400 (capped by schema)", `HTTP ${r.status}`);
    } else if (r.status === 201) {
      fail("Huge age (999) → 201 accepted — no max age validation", `HTTP ${r.status} — schema missing max()`);
      // Must clean up this record
      const id = r.json?.data?._id;
      if (id) {
        const del = await req("DELETE", `/doctors/${targetDoctorId}/patients/${id}`);
        console.log(`    (cleanup huge-age record: DELETE → ${del.status})`);
      }
    }
  }

  // ── TEST 12: Invalid admittedAt format ──
  section("Test 12 — Invalid admittedAt format → 400");
  {
    const r = await req("POST", `/doctors/${targetDoctorId}/patients`, {
      name: "Bad Date", age: 30, gender: "Male", phone: "+8800000", condition: "Test",
      admittedAt: "not-a-date",
    });
    r.status === 400 && r.json?.error?.code === "VALIDATION_ERROR"
      ? pass("Invalid admittedAt → 400 VALIDATION_ERROR", `HTTP ${r.status}`)
      : fail("Invalid admittedAt → 400 VALIDATION_ERROR", `HTTP ${r.status} code=${r.json?.error?.code}`);
  }

  // ── TEST 13: GET /doctors?limit=100 works ──
  section("Test 13 — GET /doctors?limit=100 works");
  {
    const r = await req("GET", "/doctors?limit=100");
    r.status === 200 && r.json?.meta?.limit <= 100
      ? pass("GET /doctors?limit=100 → 200", `returned ${r.json?.data?.length} of ${r.json?.meta?.total}`)
      : fail("GET /doctors?limit=100 → 200", `HTTP ${r.status}`);
  }

  // ── TEST 14: GET /doctors?limit=101 → capped or rejected ──
  section("Test 14 — GET /doctors?limit=101 → capped or rejected");
  {
    const r = await req("GET", "/doctors?limit=101");
    if (r.status === 400) {
      pass("limit=101 → 400 rejected", `HTTP ${r.status}`);
    } else if (r.status === 200 && (r.json?.meta?.limit ?? r.json?.meta?.pageSize) <= 100) {
      pass("limit=101 capped to ≤100", `actual limit=${r.json?.meta?.limit}`);
    } else {
      fail("limit=101 → capped or 400", `HTTP ${r.status} limit=${r.json?.meta?.limit}`);
    }
  }

  // ── CLEANUP ──
  section("Cleanup — delete test-created patient");
  if (createdPatientId) {
    const r = await req("DELETE", `/doctors/${targetDoctorId}/patients/${createdPatientId}`);
    r.status === 200 || r.status === 204
      ? pass(`DELETE patient ${createdPatientId}`, `HTTP ${r.status}`)
      : fail(`DELETE patient ${createdPatientId}`, `HTTP ${r.status}`);
  }

  // ── AFTER COUNTS ──
  section("Counts after (must match before)");
  // Re-login (token expired after logout in some cases)
  const loginR2 = await req("POST", "/auth/login", {
    email: "admin@doctor-tracker.com", password: "AdminPassword123!",
  });
  const summaryAfter = await req("GET", "/dashboard/summary");
  const docsAfter = summaryAfter.json?.data?.totalDoctors;
  const ptsAfter = summaryAfter.json?.data?.totalPatients;
  console.log(`  Doctors after:  ${docsAfter}  |  Patients after:  ${ptsAfter}`);
  docsAfter === docsBefore ? pass("Doctor count unchanged") : fail("Doctor count changed", `${docsBefore} → ${docsAfter}`);
  ptsAfter === ptsBefore ? pass("Patient count unchanged (cleanup verified)") : fail("Patient count changed", `${ptsBefore} → ${ptsAfter}`);

  // ── SUMMARY ──
  console.log("\n" + "=".repeat(60));
  console.log(`Total: ${passed + failed} checks | ✅ ${passed} passed | ❌ ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch(e => { console.error("Fatal:", e); process.exit(1); });
