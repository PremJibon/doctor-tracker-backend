# Product Requirements Document (PRD) — Doctor Tracker

**Source Document**: `Fullstack_Task_Frontend_Focused_Updated_1 (1) (1).pdf`  
**Classification**: Official Assessment Specification (Care Guide BD)  
**System Type**: Administrative Healthcare Management Portal (REST API Backend & Next.js Client)

---

## 1. Project Overview & Objectives
**Doctor Tracker** is a secure administrative web application designed for healthcare clinic administrators to manage medical practitioners and their patient rosters while providing visual analytics on patient intake and distribution.

### Core Objectives
1. **Security & Access Control**: Restrict all portal features to authenticated administrative users.
2. **Data Integrity & Relational Management**: Model real-world relationships between doctors and their assigned patients with cascade/consistency safety.
3. **Query Performance Optimization**: Enforce sub-millisecond query execution on searching, filtering, and pagination using dedicated MongoDB index coverage (`IXSCAN`).
4. **Clean RESTful API Contracts**: Provide robust, validated endpoints serving structured JSON responses and standard error envelopes.

---

## 2. Technical Stack & Architecture Boundary
* **Backend API**: Node.js 20+, Express, TypeScript (Strict), Mongoose, Zod, bcryptjs, jsonwebtoken, helmet, cors, cookie-parser, express-rate-limit.
* **Database**: MongoDB (Atlas cloud cluster) with explicit schema indexing.
* **Frontend**: Next.js (Separate client repository communicating over cross-domain REST API with CORS credentials).
* **Deployment Target**: Render (Backend Web Service) connected to MongoDB Atlas.

---

## 3. Core Feature Requirements

### 3.1 Authentication & Authorization
* **Access Boundary**: Only authenticated users can access data and management endpoints.
* **Authentication Mechanism**:
  * Secure credential login (`POST /api/auth/login`) with bcrypt password hashing (cost factor $\ge 10$).
  * Constant-time verification to prevent timing-based user enumeration.
  * Dual-secret JWT architecture:
    * **Access Token**: Short-lived (15 minutes), transported in JSON response, sent via `Authorization: Bearer <token>`.
    * **Refresh Token**: Long-lived (7 days), stored in an `httpOnly`, `Secure` (production), `SameSite=None`/`Lax` cookie restricted to `/api/auth`.
  * Token refresh (`POST /api/auth/refresh`) and secure logout (`POST /api/auth/logout`) clearing the cookie.
  * Identity verification (`GET /api/auth/me`).
* **Route Protection**: `requireAuth` middleware applied to all operational data routes.
* **Brute-Force Protection**: IP-based rate limiting (10 attempts / 15 min) on the login route.

---

### 3.2 Doctor Management
* **Fields**:
  * `name`: string (required)
  * `nameLower`: string (auto-synced lowercase for prefix search)
  * `specialization`: string (required)
  * `hospital`: string (required)
  * `phone`: string (required)
  * `email`: string (required, unique)
  * `createdAt` / `updatedAt`: timestamps
* **Capabilities**:
  * **Create Doctor** (`POST /api/doctors`): Strict body validation, email uniqueness check.
  * **List Doctors** (`GET /api/doctors`):
    * Prefix search on name (`?search=...`).
    * Filtering by medical specialty (`?specialization=...`) and hospital (`?hospital=...`).
    * Date range filtering (`?from=...&to=...` on `createdAt`).
    * Sorting (`?sort=createdAt:desc` etc.).
    * Pagination (`?page=1&limit=10`, limit capped at 100).
    * Returns `{ data: Doctor[], meta: { page, limit, total, totalPages } }`.
  * **Doctor Detail** (`GET /api/doctors/:id`): Single doctor profile with projection.
  * **Doctor's Patients Sub-Roster**:
    * **List Patients for Doctor** (`GET /api/doctors/:id/patients`): Paginated, searchable patient list belonging to doctor `:id`.
    * **Add Patient under Doctor** (`POST /api/doctors/:id/patients`): Creates and binds patient to doctor `:id`.
    * **Delete Patient from Doctor List** (`DELETE /api/doctors/:id/patients/:patientId`): Verifies relationship and removes patient.

---

### 3.3 Patient Management
* **Fields**:
  * `name`: string (required)
  * `nameLower`: string (auto-synced lowercase for prefix search)
  * `age`: number (required, non-negative)
  * `gender`: string (required)
  * `phone`: string (required)
  * `condition`: string (required)
  * `doctorId`: ObjectId ref to Doctor (required)
  * `admittedAt`: Date (required, default `Date.now`)
  * `createdAt` / `updatedAt`: timestamps
* **Capabilities (Dedicated Patient Page)**:
  * **List All Patients** (`GET /api/patients`):
    * Global patient search (`?search=...` anchored prefix on `nameLower`).
    * Filtering by condition (`?condition=...`) and assigned doctor (`?doctorId=...`).
    * Date-wise admission filter (`?from=...&to=...` on `admittedAt`).
    * Offset pagination (`?page=1&limit=10`, limit capped at 100).
    * Returns `{ data: Patient[], meta: { page, limit, total, totalPages } }`.
  * **Edit Patient Information** (`PATCH /api/patients/:id`): Partial update with validation; auto-updates `nameLower` if name changes.
  * **Delete Patient** (`DELETE /api/patients/:id`): Removes patient record.

---

### 3.4 Dashboard & Data Visualization Analytics
Analytics computed strictly via MongoDB Aggregation Pipelines (zero in-memory loops):
* **Overview Summary** (`GET /api/dashboard/summary`):
  * `totalDoctors`: integer
  * `totalPatients`: integer
  * `avgPatientsPerDoctor`: float (computed dynamically)
* **Doctor Workload** (`GET /api/dashboard/patients-per-doctor`):
  * Top 10 doctors ranked by patient count with joined doctor name: `[{ doctorId, name, count }]`.
* **Date-Based Statistics** (`GET /api/dashboard/patients-over-time?range=7d|30d|12m`):
  * Time-series bucketed counts of patient admissions by day or month: `[{ date, count }]`.
* **Clinical Condition Distribution** (`GET /api/dashboard/conditions`):
  * Diagnostic breakdown by disease/condition: `[{ condition, count }]`.

---

## 4. Performance, Optimization & Security Standards
1. **Database Indexing**:
   * Doctor indexes: `{ nameLower: 1 }`, `{ specialization: 1, createdAt: -1 }`, `{ hospital: 1 }`, `{ createdAt: -1 }`, unique `{ email: 1 }`.
   * Patient indexes: `{ doctorId: 1, createdAt: -1 }`, `{ condition: 1, createdAt: -1 }`, `{ nameLower: 1 }`, `{ admittedAt: -1 }`.
   * **Verification Criterion**: Execution plans must prove `IXSCAN` with zero `COLLSCAN` via `.explain("executionStats")`.
2. **Defense-in-Depth**:
   * Zod `.strict()` schema enforcement rejecting unexpected fields on all endpoints.
   * Central error format: `{ error: { code, message, details? } }`.
   * Regex metacharacter escaping on user queries to prevent ReDoS and injection.
   * `select: false` and schema sanitization ensuring `passwordHash` is never exposed.
3. **Data Seeding**:
   * Realistic dataset comprising 1 Admin, 40 Doctors, and ~1,500 Patients spanning 12 months for comprehensive dashboard and performance testing.

---

## 5. Evaluation & Documentation Checklist
- [x] Description: Clear elevator pitch in README.md.
- [ ] Setup Guide: Step-by-step local installation + `.env.example`.
- [ ] System Architecture: High-level overview of layers and data flow.
- [ ] Technical Decisions: Deep dive into 2 specific architectural decisions (dual-token cookie auth, index-backed prefix search).
- [ ] Query Verification: Index execution stats evidence (`IXSCAN`).
