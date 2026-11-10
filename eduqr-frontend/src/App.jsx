import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Landing, { SiteNav } from './pages/Landing/Landing.jsx';
import Login from './pages/Login/Login.jsx';
import Student from './pages/Student/Student.jsx';
import Teacher from './pages/Teacher/Teacher.jsx';
import Admin from './pages/Admin/Admin.jsx';
import s from './pages/Landing/Landing.module.css';

export default function App() {
  const location = useLocation();

  return (
    <div key={location.pathname} className={s.routeFade}>
      <Routes location={location}>
        <Route path="/" element={<Landing />} />
        <Route
          path="/login"
          element={
            <div className={s.loginShell}>
              <SiteNav hideAuth />
              <Login />
            </div>
          }
        />
        <Route path="/student" element={<ProtectedRoute role="student"><Student /></ProtectedRoute>} />
        <Route path="/teacher" element={<ProtectedRoute role="teacher"><Teacher /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute role="admin"><Admin /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}