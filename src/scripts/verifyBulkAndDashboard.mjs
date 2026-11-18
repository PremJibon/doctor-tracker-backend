/**
 * Verification script for Bulk Delete & Dashboard Additions
 * Ensures:
 * 1. Zero leaked records (count before === count after)
 * 2. Proper validation, status codes, and response shapes
 * 3. Cascade vs non-cascade logic
 */

const BASE_URL = `http://localhost:${process.env.PORT || 5000}/api`;

async function main() {
  console.log("=================================================");
  console.log(" Verifying Bulk Delete & Dashboard Additions");
  console.log("=================================================");

  // 1. Authenticate as admin
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@doctor-tracker.com",
      password: "AdminPassword123!",
    }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed with status ${loginRes.status}`);
  }

  const loginData = await loginRes.json();
  const token = loginData.accessToken;
  if (!token) throw new Error("No access token returned in JSON body");
  console.log("✓ Admin authentication successful (token extracted from body)");

  const authHeader = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // 2. Record initial counts
  const summaryBeforeRes = await fetch(`${BASE_URL}/dashboard/summary`, {
    headers: authHeader,
  });
  const summaryBefore = await summaryBeforeRes.json();
  const initialDoctorCount = summaryBefore.data.totalDoctors;
  const initialPatientCount = summaryBefore.data.totalPatients;
  console.log(`Initial DB counts: Doctors = ${initialDoctorCount}, Patients = ${initialPatientCount}`);

  // Test tracking
  let passed = 0;
  let failed = 0;
  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // ==========================================
    // 3. Test Dashboard Additions
    // ==========================================
    console.log("\n--- Testing Dashboard Endpoints ---");

    // 3.1 GET /dashboard/summary extensions
    assert("admissionsLast30d" in summaryBefore.data, "summary has admissionsLast30d");
    assert("admissionsPrev30d" in summaryBefore.data, "summary has admissionsPrev30d");
    assert("newDoctorsLast30d" in summaryBefore.data, "summary has newDoctorsLast30d");
    assert("totalDoctors" in summaryBefore.data, "summary retains totalDoctors");
    assert("totalPatients" in summaryBefore.data, "summary retains totalPatients");
    assert("avgPatientsPerDoctor" in summaryBefore.data, "summary retains avgPatientsPerDoctor");

    // 3.2 GET /dashboard/patients-per-doctor
    const ppdRes = await fetch(`${BASE_URL}/dashboard/patients-per-doctor`, {
      headers: authHeader,
    });
    const ppdData = await ppdRes.json();
    assert(ppdRes.status === 200, "GET /dashboard/patients-per-doctor returned 200");
    assert(Array.isArray(ppdData.data), "patients-per-doctor returns array");
    if (ppdData.data.length > 0) {
      const first = ppdData.data[0];
      assert("doctorId" in first && "name" in first && "count" in first, "item has doctorId, name, count");
      assert("specialization" in first, "item has specialization field");
      assert("hospital" in first, "item has hospital field");
    }

    // 3.3 GET /dashboard/gender
    const genderRes = await fetch(`${BASE_URL}/dashboard/gender`, { headers: authHeader });
    const genderData = await genderRes.json();
    assert(genderRes.status === 200, "GET /dashboard/gender returned 200");
    assert(Array.isArray(genderData.data), "gender returns array");
    assert(
      genderData.data.every((g) => typeof g.gender === "string" && typeof g.count === "number"),
      "gender items have string gender and number count"
    );

    // 3.4 GET /dashboard/age-groups
    const ageRes = await fetch(`${BASE_URL}/dashboard/age-groups`, { headers: authHeader });
    const ageData = await ageRes.json();
    assert(ageRes.status === 200, "GET /dashboard/age-groups returned 200");
    assert(Array.isArray(ageData.data), "age-groups returns array");
    assert(
      ageData.data.every((a) => typeof a.ageGroup === "string" && typeof a.count === "number"),
      "ageGroup items have string ageGroup and number count"
    );

    // 3.5 GET /dashboard/specialties
    const specRes = await fetch(`${BASE_URL}/dashboard/specialties`, { headers: authHeader });
    const specData = await specRes.json();
    assert(specRes.status === 200, "GET /dashboard/specialties returned 200");
    assert(Array.isArray(specData.data) && specData.data.length <= 8, "specialties returns array <= 8 items");
    if (specData.data.length > 0) {
      const s = specData.data[0];
      assert("specialization" in s && typeof s.doctors === "number" && typeof s.patients === "number",
        "specialties item has specialization, doctors, patients"
      );
    }

    // 3.6 GET /dashboard/hospitals
    const hospRes = await fetch(`${BASE_URL}/dashboard/hospitals`, { headers: authHeader });
    const hospData = await hospRes.json();
    assert(hospRes.status === 200, "GET /dashboard/hospitals returned 200");
    assert(Array.isArray(hospData.data) && hospData.data.length <= 5, "hospitals returns array <= 5 items");
    if (hospData.data.length > 0) {
      const h = hospData.data[0];
      assert("hospital" in h && typeof h.doctors === "number" && typeof h.patients === "number",
        "hospitals item has hospital, doctors, patients"
      );
    }

    // 3.7 GET /dashboard/recent-admissions
    const recentRes = await fetch(`${BASE_URL}/dashboard/recent-admissions`, { headers: authHeader });
    const recentData = await recentRes.json();
    assert(recentRes.status === 200, "GET /dashboard/recent-admissions returned 200");
    assert(Array.isArray(recentData.data) && recentData.data.length <= 8, "recent-admissions defaults to <= 8 items");
    if (recentData.data.length > 0) {
      const r = recentData.data[0];
      assert("name" in r && "age" in r && "admittedAt" in r, "recent item has patient fields");
      assert("doctorName" in r && "doctorSpecialization" in r, "recent item includes joined doctor fields");
    }

    // Limit validation on recent-admissions
    const recentLimit20 = await fetch(`${BASE_URL}/dashboard/recent-admissions?limit=20`, { headers: authHeader });
    assert(recentLimit20.status === 200, "recent-admissions?limit=20 returns 200");
    const recentLimit21 = await fetch(`${BASE_URL}/dashboard/recent-admissions?limit=21`, { headers: authHeader });
    assert(recentLimit21.status === 400, "recent-admissions?limit=21 returns 400 VALIDATION_ERROR");

    // Unauthenticated check
    const noAuthRecent = await fetch(`${BASE_URL}/dashboard/recent-admissions`);
    assert(noAuthRecent.status === 401, "GET /dashboard/recent-admissions without token returns 401");

    // ==========================================
    // 4. Test Bulk Delete Patients
    // ==========================================
    console.log("\n--- Testing Bulk Delete Patients ---");

    // 4.1 Create temporary doctor and temporary patients
    const tempDocRes = await fetch(`${BASE_URL}/doctors`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({
        name: "Dr. Temp Bulk Patient Tester",
        email: `dr.temp.bulk.${Date.now()}@example.com`,
        phone: "+8801700998877",
        specialization: "Cardiology",
        hospital: "Dhaka Medical College Hospital",
      }),
    });
    const tempDocData = await tempDocRes.json();
    const tempDocId = tempDocData.data._id;

    // Create 3 patients under temp doctor
    const p1Res = await fetch(`${BASE_URL}/doctors/${tempDocId}/patients`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({
        name: "Temp Patient One",
        age: 25,
        gender: "Male",
        phone: "+8801811223344",
        condition: "Hypertension",
      }),
    });
    const p1 = (await p1Res.json()).data;

    const p2Res = await fetch(`${BASE_URL}/doctors/${tempDocId}/patients`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({
        name: "Temp Patient Two",
        age: 40,
        gender: "Female",
        phone: "+8801811223355",
        condition: "Asthma",
      }),
    });
    const p2 = (await p2Res.json()).data;

    const p3Res = await fetch(`${BASE_URL}/doctors/${tempDocId}/patients`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({
        name: "Temp Patient Three",
        age: 60,
        gender: "Other",
        phone: "+8801811223366",
        condition: "Diabetes",
      }),
    });
    const p3 = (await p3Res.json()).data;

    // 4.2 Test input validation for patient bulk delete
    const emptyBulkP = await fetch(`${BASE_URL}/patients/bulk-delete`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({ ids: [] }),
    });
    assert(emptyBulkP.status === 400, "POST /patients/bulk-delete empty ids rejected with 400");

    const invalidIdBulkP = await fetch(`${BASE_URL}/patients/bulk-delete`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({ ids: ["not-a-mongo-id"] }),
    });
    assert(invalidIdBulkP.status === 400, "POST /patients/bulk-delete invalid ObjectId rejected with 400");

    const noAuthBulkP = await fetch(`${BASE_URL}/patients/bulk-delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [p1._id] }),
    });
    assert(noAuthBulkP.status === 401, "POST /patients/bulk-delete without auth rejected with 401");

    // 4.3 Test valid deletion with duplicate ids
    const bulkPRes = await fetch(`${BASE_URL}/patients/bulk-delete`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({ ids: [p1._id, p2._id, p1._id] }), // duplicate p1._id
    });
    const bulkPData = await bulkPRes.json();
    assert(bulkPRes.status === 200, "POST /patients/bulk-delete returns 200");
    assert(bulkPData.data.requested === 2, "Duplicate ids deduplicated: requested === 2");
    assert(bulkPData.data.deleted === 2, "Deleted count === 2");
    assert(bulkPData.data.notFound.length === 0, "notFound is empty");

    // 4.4 Test notFound detection with already-deleted id + fake ObjectId
    const fakeObjectId = "507f1f77bcf86cd799439011";
    const bulkPNotFoundRes = await fetch(`${BASE_URL}/patients/bulk-delete`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({ ids: [p1._id, fakeObjectId, p3._id] }),
    });
    const bulkPNotFoundData = await bulkPNotFoundRes.json();
    assert(bulkPNotFoundData.data.deleted === 1, "Deleted only remaining p3 (deleted === 1)");
    assert(bulkPNotFoundData.data.notFound.includes(p1._id), "p1._id reported in notFound");
    assert(bulkPNotFoundData.data.notFound.includes(fakeObjectId), "fakeObjectId reported in notFound");

    // Clean up temp doctor (currently has 0 patients now)
    await fetch(`${BASE_URL}/doctors/bulk-delete`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({ ids: [tempDocId] }),
    });

    // ==========================================
    // 5. Test Bulk Delete Doctors
    // ==========================================
    console.log("\n--- Testing Bulk Delete Doctors ---");

    // 5.1 Create Doctor A (with a patient) and Doctor B (without patients)
    const docARes = await fetch(`${BASE_URL}/doctors`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({
        name: "Dr. Doctor A With Patients",
        email: `dr.a.${Date.now()}@example.com`,
        phone: "+8801711001122",
        specialization: "Neurology",
        hospital: "Square Hospital",
      }),
    });
    const docAId = (await docARes.json()).data._id;

    const docBRes = await fetch(`${BASE_URL}/doctors`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({
        name: "Dr. Doctor B Empty",
        email: `dr.b.${Date.now()}@example.com`,
        phone: "+8801711001133",
        specialization: "Dermatology",
        hospital: "Apollo Hospital",
      }),
    });
    const docBId = (await docBRes.json()).data._id;

    // Add patient to Doctor A
    await fetch(`${BASE_URL}/doctors/${docAId}/patients`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({
        name: "Patient of Doctor A",
        age: 33,
        gender: "Female",
        phone: "+8801999888777",
        condition: "Migraine",
      }),
    });

    // 5.2 Test cascade=false (default): Doctor A must be SKIPPED, Doctor B must be DELETED
    const bulkDocNoCascadeRes = await fetch(`${BASE_URL}/doctors/bulk-delete`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({ ids: [docAId, docBId], cascade: false }),
    });
    const bulkDocNoCascade = await bulkDocNoCascadeRes.json();
    assert(bulkDocNoCascadeRes.status === 200, "POST /doctors/bulk-delete default cascade returns 200");
    assert(bulkDocNoCascade.data.deleted === 1, "Only docB deleted (deleted === 1)");
    assert(bulkDocNoCascade.data.skipped.length === 1, "docA skipped (skipped.length === 1)");
    assert(bulkDocNoCascade.data.skipped[0].id === docAId, "skipped entry matches docA id");
    assert(bulkDocNoCascade.data.skipped[0].reason === "HAS_PATIENTS", "skipped reason === HAS_PATIENTS");
    assert(bulkDocNoCascade.data.skipped[0].patientCount === 1, "skipped patientCount === 1");

    // 5.3 Test cascade=true: Doctor A and their patient must be deleted
    const bulkDocCascadeRes = await fetch(`${BASE_URL}/doctors/bulk-delete`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({ ids: [docAId], cascade: true }),
    });
    const bulkDocCascade = await bulkDocCascadeRes.json();
    assert(bulkDocCascadeRes.status === 200, "POST /doctors/bulk-delete cascade=true returns 200");
    assert(bulkDocCascade.data.deleted === 1, "Doctor A deleted (deleted === 1)");
    assert(bulkDocCascade.data.deletedPatients === 1, "Doctor A's patient cascaded (deletedPatients === 1)");
    assert(bulkDocCascade.data.skipped.length === 0, "No doctors skipped when cascade=true");

    // ==========================================
    // 6. DB Integrity and Count Verification
    // ==========================================
    console.log("\n--- Verifying DB Count Integrity ---");
    const summaryAfterRes = await fetch(`${BASE_URL}/dashboard/summary`, {
      headers: authHeader,
    });
    const summaryAfter = await summaryAfterRes.json();
    const finalDoctorCount = summaryAfter.data.totalDoctors;
    const finalPatientCount = summaryAfter.data.totalPatients;

    console.log(`Final DB counts:   Doctors = ${finalDoctorCount}, Patients = ${finalPatientCount}`);
    assert(initialDoctorCount === finalDoctorCount, `Doctor count unchanged (${initialDoctorCount} === ${finalDoctorCount})`);
    assert(initialPatientCount === finalPatientCount, `Patient count unchanged (${initialPatientCount} === ${finalPatientCount})`);

  } catch (err) {
    console.error("Test execution threw error:", err);
    failed++;
  }

  console.log("\n=================================================");
  console.log(` Results: ${passed} passed, ${failed} failed`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

main();
