import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Landing from './pages/Landing/Landing.jsx';
import Login from './pages/Login/Login.jsx';
import Student from './pages/Student/Student.jsx';
import Teacher from './pages/Teacher/Teacher.jsx';
import Admin from './pages/Admin/Admin.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/student" element={<ProtectedRoute role="student"><Student /></ProtectedRoute>} />
      <Route path="/teacher" element={<ProtectedRoute role="teacher"><Teacher /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute role="admin"><Admin /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}