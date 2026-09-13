<div align="center">

# 🏛️ CivicConnect — ನಾಗರಿಕ ಸಂಪರ್ಕ

### Your Voice. Your City. | ನಿಮ್ಮ ಧ್ವನಿ. ನಿಮ್ಮ ನಗರ.

A **multilingual civic technology platform** for transparent municipal governance — built for Bengaluru's 1.2 crore citizens.

Report civic issues, track government budgets, engage in community forums, and receive real-time local alerts — all in **English** and **ಕನ್ನಡ**.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![PostGIS](https://img.shields.io/badge/PostGIS-3.4-5CAE58)](https://postgis.net/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)


</div>

---

## 📑 Table of Contents

- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🛠️ Tech Stack](#️-tech-stack)
- [📋 Prerequisites](#-prerequisites)
- [🚀 Getting Started](#-getting-started)
- [📁 Project Structure](#-project-structure)
- [🔌 API Endpoints](#-api-endpoints)
- [🗄️ Database Schema](#️-database-schema)
- [🌐 Internationalization (i18n)](#-internationalization-i18n)
- [👥 User Roles](#-user-roles)
- [🤝 Contributing](#-contributing)

---

## ✨ Features

### 📍 Issue Reporting & Tracking
- **Geo-pinned Reports** — Pin civic issues (potholes, broken streetlights, garbage, water/sewage problems) directly on an interactive Leaflet map.
- **Photo Evidence** — Attach photos for better documentation of civic problems.
- **Real-time Status Tracking** — Track issue status from `pending` → `in_progress` → `resolved`.
- **Community Upvoting** — Citizens can upvote issues to increase priority and visibility.
- **Comments & Discussions** — Threaded comments on each report for public discourse.

### 💰 Budget Transparency Dashboard
- **Department-wise Allocation** — View budget allocations for Roads, Water Supply, Waste Management, Street Lighting, Parks, and Health departments.
- **Interactive Charts** — Visualize spending vs allocation with Chart.js-powered doughnut and bar charts.
- **Utilization Tracking** — See real-time budget utilization rates per department and category.

### 💬 Community Forum
- **Ward-level Discussions** — Participate in discussions specific to your ward.
- **Threaded Replies** — Nested comment threads for organized conversations.
- **Post Upvoting** — Community-driven prioritization of topics.
- **Pinned Posts** — Important announcements pinned by moderators.

### 🔔 Local Alerts & Advisories
- **Real-time Notifications** — Road closures, weather warnings, water supply disruptions, and emergency alerts.
- **Bilingual Alerts** — All alerts available in English and Kannada.
- **Severity Levels** — Color-coded severity indicators (`info`, `warning`, `critical`).
- **Ward-specific Targeting** — Alerts targeted to specific wards for relevance.

### 🏠 Citizen Hub
- **Profile Management** — Manage your civic profile and ward information.
- **Residency Verification** — Verify your residency via OTP or address documentation.
- **One-stop Dashboard** — Access all government services from a single portal.

### 🛡️ Admin Dashboard
- **User Management** — View, manage, and remove users engaging in misinformation.
- **Issue Verification** — Approve or reject reported issues with configurable approval thresholds.
- **Video Call Integration** — Initiate video calls with citizens for issue verification.

### 🌐 Multilingual Support
- Full **English** and **ಕನ್ನಡ (Kannada)** support with real-time language switching via `i18next`.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│            Next.js 16 (React 19) + TypeScript                │
│      Leaflet Maps · Chart.js · GSAP Animations · i18next     │
│                    Port: 3000                                │
└──────────────────────┬───────────────────────────────────────┘
                       │ REST API (Axios)
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│              Express 5 (Node.js) REST API                    │
│    JWT Auth · Helmet · CORS · Rate Limiting · Morgan         │
│                    Port: 5000                                │
└──────────────────────┬───────────────────────────────────────┘
                       │ pg (node-postgres)
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                       DATABASE                               │
│           PostgreSQL 15 + PostGIS 3.4                        │
│      Spatial Queries · UUID Primary Keys · Triggers          │
│                    Port: 5432                                │
└──────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 16** | React framework with App Router |
| **React 19** | UI component library |
| **TypeScript** | Type safety |
| **Tailwind CSS 4** | Utility-first styling |
| **Leaflet / React-Leaflet** | Interactive maps with geo-pinning |
| **Chart.js / react-chartjs-2** | Budget visualization charts |
| **GSAP** | Scroll-triggered parallax animations |
| **i18next** | Internationalization (EN / KN) |
| **Lucide React** | Icon library |
| **Axios** | HTTP client for API calls |
| **React Hot Toast** | Toast notifications |

### Backend
| Technology | Purpose |
|---|---|
| **Express 5** | Web framework |
| **PostgreSQL 15** | Relational database |
| **PostGIS 3.4** | Geospatial queries & indexing |
| **JWT (jsonwebtoken)** | Authentication & authorization |
| **bcryptjs** | Password hashing |
| **Helmet** | HTTP security headers |
| **express-rate-limit** | API rate limiting |
| **Morgan** | HTTP request logging |
| **dotenv** | Environment variable management |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Docker Compose** | Container orchestration |
| **PostGIS Docker Image** | Database with spatial extensions |

---

## 📋 Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **Docker** & **Docker Compose** (for the database)
- **Git**

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/ChetanShebannavar/Civic-Website.git
cd Civic-Website
```

### 2. Start the Database (Docker)

```bash
docker-compose up -d db
```

This spins up a **PostgreSQL 15 + PostGIS 3.4** container and automatically runs the schema and seed scripts.

### 3. Configure Backend Environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your credentials:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://civicconnect:civicconnect_pass@localhost:5432/civicconnect
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
```

### 4. Install Dependencies & Start Backend

```bash
cd backend
npm install
npm run dev
```

The API will be available at `http://localhost:5000`.
Health check: `http://localhost:5000/health`

### 5. Install Dependencies & Start Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

### 6. (Alternative) Start Everything with Docker Compose

```bash
docker-compose up --build
```

This starts the database and backend services together.

---

## 📁 Project Structure

```
CivicConnect/
├── docker-compose.yml          # Container orchestration
│
├── frontend/                   # Next.js 16 frontend
│   ├── app/
│   │   ├── layout.tsx          # Root layout with i18n & meta
│   │   ├── page.tsx            # Landing page / Dashboard / Admin
│   │   ├── globals.css         # Global styles & design tokens
│   │   ├── login/              # Authentication page
│   │   ├── report/             # Issue reporting with map
│   │   ├── budget/             # Budget transparency dashboard
│   │   ├── forum/              # Community forum
│   │   ├── alerts/             # Local alerts & advisories
│   │   ├── hub/                # Citizen hub & profile
│   │   ├── complaints/         # Complaints management
│   │   └── video-call/         # Video call for verification
│   ├── components/
│   │   ├── Navbar.tsx          # Navigation bar
│   │   ├── LoginForm.tsx       # Auth form component
│   │   ├── ReportIssue.tsx     # Issue reporting form with map
│   │   ├── IssueCard.tsx       # Issue display card
│   │   ├── BudgetDashboard.tsx # Budget charts & tables
│   │   ├── ProfileSetup.tsx    # User profile management
│   │   ├── LanguageSwitcher.tsx# EN/KN language toggle
│   │   └── I18nProvider.tsx    # i18n context provider
│   ├── lib/
│   │   ├── api.ts              # Axios API client & endpoints
│   │   └── i18n.ts             # i18next configuration
│   └── public/
│       ├── locales/
│       │   ├── en/             # English translations
│       │   └── kn/             # Kannada translations
│       ├── videos/             # Background videos
│       └── hero-bg.jpeg        # Hero section background
│
├── backend/                    # Express 5 REST API
│   ├── src/
│   │   ├── index.js            # App entry point & middleware
│   │   ├── routes/
│   │   │   ├── auth.js         # Registration, login, JWT
│   │   │   ├── reports.js      # CRUD for civic issue reports
│   │   │   ├── budget.js       # Budget data endpoints
│   │   │   ├── forum.js        # Forum posts & threads
│   │   │   └── alerts.js       # Alerts & advisories
│   │   ├── models/
│   │   │   └── db.js           # PostgreSQL connection pool
│   │   └── middleware/         # Auth & validation middleware
│   ├── .env.example            # Environment template
│   └── package.json
│
└── database/
    ├── schema.sql              # Full database schema (PostGIS)
    └── seed.sql                # Sample data for development
```

---

## 🔌 API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new citizen |
| `POST` | `/api/auth/login` | Login & receive JWT |
| `GET` | `/api/auth/users` | List all users (admin) |
| `DELETE` | `/api/auth/users/:id` | Remove a user (admin) |

### Issue Reports (`/api/reports`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/reports` | Get all reports (with filters) |
| `POST` | `/api/reports` | Create a new issue report |
| `PATCH` | `/api/reports/:id` | Update report status |
| `POST` | `/api/reports/:id/like` | Upvote a report |
| `POST` | `/api/reports/:id/comments` | Add a comment |
| `PATCH` | `/api/reports/:id/verify` | Verify/reject a report (admin) |

### Budget (`/api/budget`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/budget` | Get all budget items |
| `POST` | `/api/budget` | Add budget item (government) |
| `PATCH` | `/api/budget/:id` | Update budget item |

### Community Forum (`/api/forum`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/forum` | Get forum posts |
| `POST` | `/api/forum` | Create a new post |
| `POST` | `/api/forum/:id/reply` | Reply to a post |
| `POST` | `/api/forum/:id/upvote` | Upvote a post |

### Alerts (`/api/alerts`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/alerts` | Get active alerts |
| `POST` | `/api/alerts` | Create an alert (admin) |

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | API health & mode status |

---

## 🗄️ Database Schema

The database uses **PostgreSQL 15** with the **PostGIS** extension for geospatial queries and **uuid-ossp** for UUID primary keys.

### Tables Overview

| Table | Description |
|-------|-------------|
| `users` | Citizens, admins, moderators, government officials |
| `government_entities` | Government departments with jurisdiction |
| `residency_verifications` | OTP/document-based residency verification |
| `reports` | Geo-tagged civic issue reports (PostGIS `GEOGRAPHY` column) |
| `report_comments` | Threaded comments on issue reports |
| `report_likes` | Upvote tracking (unique per user per report) |
| `budget_items` | Department-wise budget allocations & expenditures |
| `forum_posts` | Community forum with threaded replies |
| `alerts` | Bilingual alerts with severity levels and ward targeting |

### Spatial Indexing

Reports use PostGIS `GEOGRAPHY(POINT, 4326)` for location data with a **GIST index** for efficient proximity queries.

---

## 🌐 Internationalization (i18n)

CivicConnect supports two languages with real-time switching:

| Language | Code | Font |
|----------|------|------|
| English | `en` | Inter |
| ಕನ್ನಡ (Kannada) | `kn` | Noto Sans Kannada |

Translation files are located at:
- `frontend/public/locales/en/` — English
- `frontend/public/locales/kn/` — Kannada

The language preference is persisted and auto-detected via `i18next-browser-languagedetector`.

---

## 👥 User Roles

| Role | Permissions |
|------|-------------|
| **Citizen** | Report issues, comment, upvote, view budgets, participate in forums |
| **Government** | Manage budgets, update issue statuses, post alerts |
| **Moderator** | Pin/delete forum posts, manage community discussions |
| **Admin** | Full access — user management, issue verification, video calls, platform settings |

---

## 🖼️ Screenshots

> _Coming Soon — Screenshots of the landing page, dashboard, issue reporting map, budget charts, and admin panel._

---

## 🤝 Contributing

Contributions are welcome! To get started:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

Please ensure your code follows the existing code style and includes appropriate comments.

---

<div align="center">

**Built with ❤️ for Bengaluru | ಬೆಂಗಳೂರಿಗಾಗಿ ❤️ ಯಿಂದ ನಿರ್ಮಿಸಲಾಗಿದೆ**

🏛️ CivicConnect — Empowering citizens through technology

</div>
