import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { EventProvider } from './context/EventContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <EventProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/" element={<Dashboard />} />
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