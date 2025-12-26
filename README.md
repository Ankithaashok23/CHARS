# CHARS — Complaint Handling & Resolution System 🏛️

A lightweight complaint management application designed for student campuses and small organizations. CHARS enables students to submit complaints, vote on community issues, and lets Admins and Technicians manage, assign, and resolve complaints with notifications and priority scoring.

---

## 🚀 Key Features

- **Submit Complaints** (students): provide title, description, category, severity (Low / Medium / High), and visibility (Public / Private).
- **Voting System**: community can upvote public complaints to increase priority.
- **Complaint Lifecycle**: Submit → Assigned → Resolved → Withdraw / Undo actions supported.
- **Roles**: Student, Admin, Technician with role-specific UIs and actions.
- **Assignment Workflow**: Admin can assign complaints to technicians; technicians receive notifications and can mark complaints resolved.
- **Notifications**: In-app notification documents for Admins, Technicians, and Students when key events happen (assignment, resolution, etc.).
- **Priority Scoring**: Priority is computed from votes and severity to help admins triage quickly.
- **Simple Authentication**: Demo username/password login (seeded users). Recommended: enable JWT-based auth for production.
- **Docker Compose** for local development and an included test suite (Jest + Supertest).

---

## 🛠 Tech Stack

- Backend: Node.js, Express, Mongoose (MongoDB)
- Database: MongoDB (containerized via Docker Compose or Atlas)
- Frontend: Static HTML/CSS/JS (served by Express)
- Testing: Jest + Supertest, mongodb-memory-server (fallback)
- Dev tooling: Docker, docker-compose

---

## Prerequisites

- Node.js 18+ and npm
- Docker & Docker Compose (for local stack)
- (Optional) MongoDB Atlas account for persistent DB

---

## Quickstart — Run Locally

1. Start MongoDB & backend with Docker Compose (recommended):

```bash
# from repo root
docker compose up --build
```

- Backend will be available at: http://localhost:3000
- Frontend pages are served by the backend (e.g. `http://localhost:3000/` → login page)

2. OR run backend directly (use MONGODB_URI env to point at your DB):

```bash
cd backend
npm install
# create backend/.env from backend/.env.example and set MONGODB_URI if needed
npm start
```

3. Open the app in your browser:

- http://localhost:3000/login.html (or just http://localhost:3000/ if root is routed to login)

---

## Configuration (Environment Variables)

Copy `backend/.env.example` to `backend/.env` and edit values as needed. Important env vars:

- PORT — backend port (default 3000)
- MONGODB_URI — connection string for MongoDB (local or Atlas)
- JWT_SECRET — (recommended) secret for JWT authentication (not required for demo)

> Note: Do NOT commit secrets into version control. Add `backend/.env` to `.gitignore`.

---

## API Overview

Basic endpoints (see server implementation for full details):

- POST /api/login — login with demo credentials
- GET /api/complaints — list complaints; supports query params to filter by user, admin view, assignedTo
- POST /api/complaints — create a complaint (title, description, severity, visibility)
- POST /api/complaints/:id/vote — vote on a complaint
- POST /api/complaints/:id/assign — assign to a technician (admin only)
- POST /api/complaints/:id/markResolved — mark the complaint resolved (technician)
- POST /api/complaints/:id/withdraw — withdraw a complaint (owner)
- GET /api/notifications — fetch notifications for a user
- GET /api/technicians — list available technicians

Use `curl` or Postman to interact with the API for debugging.

---

## Testing

Backend integration tests use Jest + Supertest and attempt to use mongodb-memory-server. If the in-memory server fails, tests fall back to the configured `MONGODB_URI`.

Run tests from repo root:

```bash
npm test --prefix backend
```

Tests cover complaint creation, voting, assignment, notifications, and resolution flows.

---

## Development Notes

- Frontend is simple static files under `frontend/` (HTML, CSS, JS). The backend serves static files and provides the API.
- Seeded users are available for demo/test purposes (e.g., `admin/admin`, `tech-a/password`, `student1/student`) — do not rely on this for production.
- Priority scoring uses a severity-weighted formula; adjust `computePriority` in `backend/server.js` if you want different behavior.

Security & Hardening (recommended next steps):
- Implement JWT authentication and role-based authorization for protected endpoints.
- Add CSRF protection or CORS restrictions in production.
- Add input validation and stronger password storage (bcrypt) for real signups.

---

## Docker & Deployment

- Local development: `docker compose up --build` (starts MongoDB + backend).
- For production, deploy backend to providers like Render, Railway, or Heroku and point `MONGODB_URI` to MongoDB Atlas.

---

## Contributing 🤝

Preferred workflow:

1. Create a new branch from `main`: `git checkout -b feat/your-change`
2. Implement changes, add tests where applicable
3. Commit with clear messages and open a Pull Request
4. Request reviews and address comments

Suggestions / files I can add on request:
- CONTRIBUTING.md, CODEOWNERS, and PR templates
- CI configuration (GitHub Actions) to run tests on PRs
- E2E tests (Playwright) that exercise the full UI flows

---

## Project Structure

```
CHARS/
├─ backend/
│  ├─ server.js         # Express server, API endpoints, models
│  ├─ package.json
│  └─ tests/            # Jest + Supertest tests
├─ frontend/
│  ├─ login.html
│  ├─ admin.html
│  ├─ technician.html
│  ├─ student_dayscholar.html
│  ├─ student_hosteler.html
│  ├─ script.js
│  └─ style.css
├─ docker-compose.yml
└─ README.md
```

---

## License

This project is **MIT licensed**.

---

## 👍 Wrap up

If you want, I can:

- Create a polished **CONTRIBUTING.md** and CI workflow for tests ✅
- Add PR templates and CODEOWNERS ✅
- Implement JWT authentication & proper password hashing (bcrypt) ⚠️

Tell me which of the follow-ups you'd like me to do next and I'll start working on it.