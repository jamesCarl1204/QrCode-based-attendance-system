# QR Code-Based Attendance System

A web-based attendance management system that uses session-based QR codes to record student attendance. It provides separate portals for administrators, teachers, and students, with email notifications for parents.

## Overview

The system is designed to make classroom attendance recording and monitoring easier through QR-code scanning and a centralized web application.

## Features

- **Role-based portals** for administrators, teachers, and students
- **Session-based QR attendance** for classroom attendance recording
- **QR scanning** through the web application
- **Parent email notifications** for attendance-related updates
- **Attendance management** backed by a MySQL database

> Feature availability may depend on the current deployment and configuration.

## Tech Stack

**Frontend**
- React
- Vite
- React Router
- Chart.js
- html5-qrcode

**Backend**
- Node.js
- Express
- MySQL (mysql2)
- Express sessions
- Nodemailer

## Project Structure

```text
.
├── config/             # Environment, CORS, and session configuration
├── controllers/        # Request handlers
├── middleware/         # Middleware and error handling
├── models/             # Database models
├── routes/             # API routes
├── services/           # Supporting services and scheduled jobs
├── utils/              # Shared utilities
├── public/             # Public backend assets
├── eduqr-frontend/     # React + Vite frontend
├── schema.sql          # Database schema
├── app.js              # Express application setup
├── server.js           # Backend entry point
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm
- MySQL
- Git

### 1. Clone the repository

```bash
git clone https://github.com/jamesCarl1204/QrCode-based-attendance-system.git
cd QrCode-based-attendance-system
```

### 2. Set up the database

Create a MySQL database, then import the schema:

```sql
SOURCE schema.sql;
```

You can also import `schema.sql` using MySQL Workbench. Make sure the database selected for the import matches the database configured in your environment variables.

### 3. Configure the backend

Create a `.env` file in the repository root. Use `.env.example` as a reference:

```env
NODE_ENV=development
PORT=3000
SESSION_SECRET=replace_with_a_long_random_secret

DB_HOST=localhost
DB_PORT=3306
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=your_database_name
DB_SSL=false

ALLOWED_ORIGINS=http://localhost:5173

BREVO_API_KEY=your_brevo_api_key
MAIL_FROM=your_verified_sender_email

GEMINI_API_KEY=your_gemini_api_key
```

Use the credentials and service keys required by your own environment. Do not commit your real `.env` file or expose secrets in the frontend.

### 4. Install and start the backend

From the repository root:

```bash
npm install
npm run dev
```

The backend uses the port configured in `PORT` (3000 by default).

### 5. Install and start the frontend

Open a second terminal:

```bash
cd eduqr-frontend
npm install
npm run dev
```

Vite will print the local frontend URL in the terminal.

## Environment Variables

| Variable | Purpose |
|---|---|
| `PORT` | Backend server port |
| `SESSION_SECRET` | Secret used for session configuration |
| `DB_HOST`, `DB_PORT` | MySQL connection address |
| `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL credentials and database |
| `DB_SSL` | Whether to use SSL for the database connection |
| `ALLOWED_ORIGINS` | Comma-separated list of permitted frontend origins |
| `BREVO_API_KEY`, `MAIL_FROM` | Email delivery configuration |
| `GEMINI_API_KEY` | Gemini API key for configured AI functionality |

## Development Scripts

Run these commands from the repository root:

- `npm run dev` — start the backend with Node.js watch mode
- `npm start` — start the backend
- `npm run migrate` — run the project's migration script

Run frontend commands from `eduqr-frontend/`:

- `npm run dev` — start the Vite development server
- `npm run build` — create a production build
- `npm run preview` — preview the production build locally

## Security Notes

- Keep database passwords, session secrets, and API keys in environment variables.
- Use HTTPS and secure cookie settings in production.
- Restrict `ALLOWED_ORIGINS` to trusted frontend domains.
- Never publish credentials or private student information in screenshots, logs, or source control.

## Project Goal

The goal of this project is to provide a more organized and efficient way to record and manage student attendance using QR-code technology and a centralized web application.

## Author

**James Carl Chouuser**

[GitHub Profile](https://github.com/jamesCarl1204)
