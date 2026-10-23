# EduQR Frontend (React + Vite, CSS Modules)

## Run locally
1. `npm install`
2. Start your Express backend on port 3000 (`node server.js`)
3. `npm run dev` -> http://localhost:5173  (Vite proxies `/api` to localhost:3000)

## Deploy to Vercel
1. Open `vercel.json` and replace `YOUR-APP-NAME.onrender.com` with your Render URL.
2. Push this folder to GitHub, import in Vercel (Framework: Vite, build `npm run build`, output `dist`).
3. Done. Browser talks only to the Vercel domain; `/api/*` is proxied to Render, so
   session cookies work without any server.js change.

## Backend notes (Render)
- Keep `NODE_ENV=production` and `SESSION_SECRET` set on Render.
- `app.set('trust proxy', 1)` is already in server.js (needed for secure cookies behind a proxy).
- You no longer need `public/` on the server; the React app replaces it.
- Routes: `/` login, `/student`, `/teacher`, `/admin` (protected via `/api/me`).

## Structure
src/
  api.js, utils.js, App.jsx, main.jsx
  context/      AuthContext, ToastContext
  components/   PortalLayout, Modal, ClassCard, DetailFrame, DataTable, ProtectedRoute
  styles/       global.css (theme tokens), Portal.module.css (shared portal styles)
  pages/
    Login/      Login.jsx + Login.module.css
    Student/    Student.jsx
    Teacher/    Teacher.jsx, ClassDetail.jsx, Dashboard.jsx, AiChat.jsx
    Admin/      Admin.jsx
