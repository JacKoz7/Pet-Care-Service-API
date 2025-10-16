# Pet Care Service (Work in Progress)

**Overview:** Pet Care Service is a backend API for a pet care service and advertisement platform. The frontend in this repository is only a sample client for testing endpoints — it is not the official UI.

> Note: This README is structured so that a new developer can run the project in ~5–15 minutes.

---

## Table of Contents
- [Features](#features)
- [Technologies](#technologies)
- [Application Flow](#application-flow)
- [Requirements](#requirements)
- [Quick Start (Docker)](#quick-start-docker)
- [Environment Variables](#environment-variables)
- [Swagger / API Documentation](#swagger--api-documentation)
- [Seeding / Testing Instructions](#seeding--testing-instructions)
- [Roles and Authorization](#roles-and-authorization)
- [Planned Features / TODO](#planned-features--todo)

---

## Features
- User registration and login via **Firebase Authentication**.
- User profile: edit data and avatar.
- Manage pets — CRUD operations; pet images stored in **Firebase Storage**.
- Service Provider: users can become providers and post ads (ads become inactive when provider is no longer active).
- Dashboard: list cities and latest ads, filter by name and city.
- Unauthenticated users can browse ads but cannot book services.
- Archive deleted ads (can be restored).
- Additional (experimental) feature: quick “pet health check” — enter attributes/symptoms, get a health verdict (encourages service providers to accept pets).
- Full API documented using **Swagger / OpenAPI**.

---

## Technologies
- **Next.js** (API routes) + **TypeScript**
- **PostgreSQL**
- **Prisma** (ORM)
- **Firebase Authentication** + **Firebase Storage**
- **Docker & docker-compose**
- **Swagger / OpenAPI**

---

## Application Flow
1. User registers (email + password + attributes: city, first name, last name, phone). Verification email is sent via Firebase.
2. Upon verification, account is created in both Firebase (auth) and database (profile).
3. Login via Firebase — backend verifies JWT token.
4. After login, user can:
   - edit profile,
   - manage pets (upload images to Firebase Storage),
   - become a service provider and post ads.
5. Booking (planned): client clicks `book`, provides pet info and contact; service provider can accept or reject.
6. Admin panel (planned): view and delete users, pets, ads.

---

## Requirements
- Docker & docker-compose (recommended)
- Node.js >= 18 (if running locally)
- PostgreSQL (if not using container)
- Firebase account with Authentication and Storage configured

---

## Quick Start (Docker)
1. Clone the repo:
   ```bash
   git clone <REPO_URL>
   cd <repo-folder>
   ```
2. Copy environment files:
   - `.env.local` (frontend / test variables)
   - `.env` (backend / services)
3. Start containers:
   ```bash
   docker compose up --build
   ```
4. (Optional, clean start):
   ```bash
   docker compose down -v && docker compose up --build
   ```

After starting:
- API available at `http://localhost:3000` 
- Swagger docs: `http://localhost:<3000/docs`
- Sample frontend: `http://localhost:3000`

---

## Environment Variables
Example variables — fill your `.env` / `.env.local`:

```
# Database
DATABASE_URL=postgresql://user:password@postgres:5432/petcare?schema=public

# Firebase
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=...

## Swagger / API Documentation
All endpoints are documented via OpenAPI / Swagger. Visit `/docs` after server start to explore and test endpoints.

---

## Testing Instructions
- After registration, user receives verification email (check spam folder).
- After clicking `Become service provider`, re-run seed if needed to populate example ads (ads only created for service-provider role accounts).
- Debug JWT button in sample frontend logs token; use `check-role` endpoint to see user roles (`client`, `admin`, `service-provider`).

---

## Roles and Authorization
- **client** — regular user, can create pet profiles, browse and book services after login.
- **service-provider** — can create / edit / delete ads. Ads become inactive if provider is removed.
- **admin** — planned, access to admin panel to view / remove users, pets, ads.

Authorization: Firebase JWT + server-side role verification.

---

## Planned Features / TODO
- [ ] Unit and integration tests 
- [ ] Service booking flow + feedback
- [ ] Admin panel (view / moderation)
- [ ] Extended validation / rate limiting
- [ ] Payment integration (optional)
- [ ] Monitoring / health checks / alerts