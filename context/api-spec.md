# API Spec (living document — update after each feature)

Base: /api   Auth: Bearer access token on everything except login, refresh, health.

## Error shape (all errors)
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...]? } }
Status codes: 400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict, 429 rate limit, 500 unexpected.

## Auth
POST /auth/login     {email,password} -> {accessToken,user}  + sets httpOnly refresh cookie
POST /auth/refresh   cookie -> {accessToken}
POST /auth/logout    clears cookie
GET  /auth/me        -> {user}

## Doctors
POST   /doctors                       body: name, specialization, hospital, phone, email
GET    /doctors                       ?page&limit&search&specialization&hospital&from&to&sort
GET    /doctors/:id
GET    /doctors/:id/patients          ?page&limit&search
POST   /doctors/:id/patients          body: name, age, gender, phone, condition, admittedAt
DELETE /doctors/:id/patients/:patientId

## Patients
GET    /patients                      ?page&limit&search&condition&doctorId&from&to&sort
PATCH  /patients/:id
DELETE /patients/:id

## Dashboard
GET /dashboard/summary                -> {data:{totalDoctors,totalPatients,avgPatientsPerDoctor}}
GET /dashboard/patients-per-doctor    -> top 10 [{doctorId,name,count}]
GET /dashboard/patients-over-time     ?range=7d|30d|12m -> [{date,count}]
GET /dashboard/conditions             -> [{condition,count}]

GET /health -> {status:"ok"}

## Implemented status
- [x] GET /health (and /api/health) -> {status:"ok"} [verified with curl]
- [x] POST /auth/login {email,password} -> {accessToken,user} + sets httpOnly refresh cookie [verified with curl/unit test]
- [x] POST /auth/refresh cookie -> {accessToken} [verified with unit test]
- [x] POST /auth/logout clears cookie [verified with unit test]
- [x] GET /auth/me -> {user} [verified with curl 401 on missing/invalid token]
- [x] POST /doctors body: name, specialization, hospital, phone, email [verified live]
- [x] GET /doctors ?page&limit&search&specialization&hospital&from&to&sort [verified live]
- [x] GET /doctors/:id [verified live]
- [x] GET /doctors/:id/patients ?page&limit&search [verified live]
- [x] POST /doctors/:id/patients body: name, age, gender, phone, condition, admittedAt [verified live]
- [x] DELETE /doctors/:id/patients/:patientId [verified with subagent audit]
- [x] GET /patients ?page&limit&search&condition&doctorId&from&to&sort [verified live]
- [x] PATCH /patients/:id [verified live]
- [x] DELETE /patients/:id [verified with subagent audit]
- [x] GET /dashboard/summary -> {totalDoctors,totalPatients,avgPatientsPerDoctor} [verified live]
- [x] GET /dashboard/patients-per-doctor -> top 10 [{doctorId,name,count}] [verified live]
- [x] GET /dashboard/patients-over-time ?range=7d|30d|12m -> [{date,count}] [verified live]
- [x] GET /dashboard/conditions -> [{condition,count}] [verified live]
