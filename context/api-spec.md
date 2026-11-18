# API Spec (living document — update after each feature)

Base: /api   Auth: Bearer access token on everything except login, refresh, health.

## Error shape (all errors)
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...]? } }
Status codes: 400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict, 429 rate limit, 500 unexpected.

## Auth
POST /auth/login     {email,password} -> {accessToken,user}  + sets httpOnly refreshToken cookie (path /api/auth). Access token in body ONLY — no accessToken cookie.
POST /auth/refresh   httpOnly refreshToken cookie -> {accessToken} + rotates refreshToken cookie. Returns 403 if Origin present and not allowlisted.
POST /auth/logout    clears refreshToken cookie. Returns 403 if Origin present and not allowlisted.
GET  /auth/me        -> {user}

## Doctors
POST   /doctors                       body: name, specialization, hospital, phone, email
POST   /doctors/bulk-delete           body: { ids: string[], cascade?: boolean } -> { data: { requested, deleted, deletedPatients, skipped: [...], notFound: [...] } }
GET    /doctors                       ?page&limit&search&specialization&hospital&from&to&sort
GET    /doctors/:id
GET    /doctors/:id/patients          ?page&limit&search
POST   /doctors/:id/patients          body: name, age, gender, phone, condition, admittedAt
DELETE /doctors/:id/patients/:patientId

## Patients
GET    /patients                      ?page&limit&search&condition&doctorId&from&to&sort
POST   /patients/bulk-delete          body: { ids: string[] } -> { data: { requested, deleted, notFound: [...] } }
PATCH  /patients/:id
DELETE /patients/:id

## Dashboard
GET /dashboard/summary                -> {data:{totalDoctors,totalPatients,avgPatientsPerDoctor,admissionsLast30d,admissionsPrev30d,newDoctorsLast30d}}
GET /dashboard/patients-per-doctor    -> top 10 [{doctorId,name,count,specialization,hospital}]
GET /dashboard/patients-over-time     ?range=7d|30d|12m -> [{date,count}]
GET /dashboard/conditions             -> [{condition,count}]
GET /dashboard/gender                 -> [{gender,count}]
GET /dashboard/age-groups             -> [{ageGroup,count}]  (0-17, 18-34, 35-49, 50-64, 65+)
GET /dashboard/specialties            -> top 8 [{specialization,doctors,patients}]
GET /dashboard/hospitals              -> top 5 [{hospital,doctors,patients}]
GET /dashboard/recent-admissions      ?limit=1..20 (default 8) -> [{_id,name,age,gender,condition,admittedAt,doctorId,doctorName,doctorSpecialization}]

GET /health -> {status:"ok"}

## Implemented status
- [x] GET /health (and /api/health) -> {status:"ok"} [verified with curl]
- [x] POST /auth/login {email,password} -> {accessToken,user} + sets httpOnly refreshToken cookie (path /api/auth). Access token in JSON body, NOT a cookie. [verified with curl/unit test]
- [x] POST /auth/refresh httpOnly refreshToken cookie -> {accessToken} + rotates refreshToken cookie. 403 on non-allowlisted Origin. [verified with curl]
- [x] POST /auth/logout clears refreshToken cookie. 403 on non-allowlisted Origin. [verified with curl]
- [x] GET /auth/me -> {user} [verified with curl 401 on missing/invalid token]
- [x] POST /doctors body: name, specialization, hospital, phone, email [verified live]
- [x] POST /doctors/bulk-delete body: { ids, cascade } [verified with live test suite]
- [x] GET /doctors ?page&limit&search&specialization&hospital&from&to&sort [verified live]
- [x] GET /doctors/:id [verified live]
- [x] GET /doctors/:id/patients ?page&limit&search [verified live]
- [x] POST /doctors/:id/patients body: name, age, gender, phone, condition, admittedAt [verified live]
- [x] DELETE /doctors/:id/patients/:patientId [verified with subagent audit]
- [x] GET /patients ?page&limit&search&condition&doctorId&from&to&sort [verified live]
- [x] POST /patients/bulk-delete body: { ids } [verified with live test suite]
- [x] PATCH /patients/:id [verified live]
- [x] DELETE /patients/:id [verified with subagent audit]
- [x] GET /dashboard/summary -> {totalDoctors,totalPatients,avgPatientsPerDoctor,admissionsLast30d,admissionsPrev30d,newDoctorsLast30d} [verified live]
- [x] GET /dashboard/patients-per-doctor -> top 10 [{doctorId,name,count,specialization,hospital}] [verified live]
- [x] GET /dashboard/patients-over-time ?range=7d|30d|12m -> [{date,count}] [verified live]
- [x] GET /dashboard/conditions -> [{condition,count}] [verified live]
- [x] GET /dashboard/gender -> [{gender,count}] [verified live]
- [x] GET /dashboard/age-groups -> [{ageGroup,count}] [verified live]
- [x] GET /dashboard/specialties -> top 8 [{specialization,doctors,patients}] [verified live]
- [x] GET /dashboard/hospitals -> top 5 [{hospital,doctors,patients}] [verified live]
- [x] GET /dashboard/recent-admissions ?limit=1..20 -> [{_id,name,age,gender,condition,admittedAt,doctorId,doctorName,doctorSpecialization}] [verified live]
