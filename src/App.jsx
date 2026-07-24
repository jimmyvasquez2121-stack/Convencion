import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AuthProvider } from './context/AuthContext';
import { EventProvider } from './context/EventContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Registro from './pages/Registro';
import Dashboard from './pages/Dashboard';
import Eventos from './features/events/pages/Eventos';
import Participantes from './features/participants/pages/Participantes';
import Pagos from './features/payments/pages/Pagos';
import Hospedaje from './features/lodging/pages/Hospedaje';
import Grupos from './features/groups/pages/Grupos';
import Camisetas from './features/tshirts/pages/Camisetas';
import Credenciales from './features/credentials/pages/Credenciales';
import CheckIn from './features/checkin/pages/CheckIn';
import Reportes from './features/reports/pages/Reportes';
import Usuarios from './features/users/pages/Usuarios';

function RutaInicio() {
  const { isNacional, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <svg className="animate-spin h-10 w-10 text-primary-800" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
  return isNacional() ? <Dashboard /> : <Navigate to="/participantes" replace />;
}
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <EventProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/" element={<RutaInicio />} />
                <Route path="/participantes" element={<Participantes />} />
                <Route path="/pagos" element={<Pagos />} />
                <Route path="/hospedaje" element={<Hospedaje />} />
                <Route path="/grupos" element={<Grupos />} />
                <Route path="/camisetas" element={<Camisetas />} />
                <Route path="/credenciales" element={<Credenciales />} />
                <Route path="/checkin" element={<CheckIn />} />
                <Route path="/reportes" element={<Reportes />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute rolesPermitidos={['nacional']} />}>
              <Route element={<MainLayout />}>
                <Route path="/eventos" element={<Eventos />} />
                <Route path="/usuarios" element={<Usuarios />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </EventProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}