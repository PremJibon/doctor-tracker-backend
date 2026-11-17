# Project Overview

**Doctor Tracker API** — secure admin API to manage doctors and their patients, plus
dashboard analytics. Built for the Care Guide BD full-stack assessment.

## Users
One role: `admin`. Only authenticated admins reach any data endpoint.

## Scope (in)
- Auth: login, refresh, logout, me
- Doctors: create, list (search, filters, pagination), detail
- Doctor's patients: list, add, delete
- Patients: list (search, filters, pagination), edit, delete
- Dashboard: totals, patients per doctor, patients over time, condition distribution
- Seed script with realistic data

## Scope (out)
Roles beyond admin, file uploads, email, websockets, frontend code.

## Success criteria
- Every endpoint works on seeded data (~40 doctors, ~1500 patients)
- All list queries use indexes (explain shows IXSCAN, not COLLSCAN)
- Unauthenticated requests get 401
- Deployed on Render, connected to MongoDB Atlas
