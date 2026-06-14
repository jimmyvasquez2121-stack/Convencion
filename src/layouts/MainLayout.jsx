import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import { useEvent } from '../context/EventContext';

const ROL_LABELS = {
  nacional: 'Administrador Nacional',
  regional: 'Administrador Regional',
  distrital: 'Administrador Distrital',
  viewer: 'Visualizador'
};

const STATUS_LABELS = {
  Draft: { label: 'Borrador', color: 'bg-gray-200 text-gray-700' },
  Open: { label: 'Abierto', color: 'bg-green-100 text-green-700' },
  Closed: { label: 'Cerrado', color: 'bg-red-100 text-red-700' },
  Completed: { label: 'Completado', color: 'bg-blue-100 text-blue-700' }
};

const MENU_ITEMS = [
  { to: '/', label: 'Dashboard', icon: 'home' },
  { to: '/eventos', label: 'Eventos', icon: 'calendar', roles: ['nacional'] },
  { to: '/participantes', label: 'Participantes', icon: 'users' },
  { to: '/pagos', label: 'Pagos', icon: 'cash' },
  { to: '/hospedaje', label: 'Hospedaje', icon: 'building' },
  { to: '/grupos', label: 'Grupos', icon: 'group' },
  { to: '/camisetas', label: 'Camisetas', icon: 'tshirt' },
  { to: '/credenciales', label: 'Credenciales', icon: 'qr' },
  { to: '/checkin', label: 'Check-In', icon: 'check' },
  { to: '/reportes', label: 'Reportes', icon: 'report' },
  { to: '/usuarios', label: 'Usuarios', icon: 'user-cog', roles: ['nacional'] },
];

function Icon({ name }) {
  const icons = {
    home: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10M9 21h6" />,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    users: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-7.13a4 4 0 11-8 0 4 4 0 018 0zm6 4a4 4 0 11-8 0 4 4 0 018 0z" />,
    cash: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-9c-1.11 0-2.08.402-2.599 1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    building: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m-1 4h1m4-8h1m-1 4h1m-1 4h1m-5 4v-3a1 1 0 011-1h2a1 1 0 011 1v3" />,
    group: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
    tshirt: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7l4-4 5 3 5-3 4 4-3 3v11H6V10L3 7z" />,
    qr: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m-6-4H4v4m0-10h.01M4 12h.01M12 8h.01M12 12h.01M12 16h.01M16 8h.01M16 12h2m-2 4h.01M4 4h6v6H4V4zm10 0h6v6h-6V4zm0 10h6v6h-6v-6zM4 14h6v6H4v-6z" />,
    check: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
    report: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6M9 3h6l5 5v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z" />,
    'user-cog': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 0v3m0 4v1m6.364-1.636l-.707-.707M19 12h1M5 12H4m1.343-5.657l.707.707m12.02-.707l-.707.707M12 21a9 9 0 100-18 9 9 0 000 18z" />,
  };
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {icons[name] || icons.home}
    </svg>
  );
}

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [eventMenuOpen, setEventMenuOpen] = useState(false);
  const { userData, logout } = useAuth();
  const { eventos, eventoActivo, seleccionarEvento } = useEvent();
  const navigate = useNavigate();

  const menuFiltrado = MENU_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(userData?.rol)
  );

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: '¿Cerrar sesión?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#1e3a8a',
      cancelButtonColor: '#9ca3af'
    });
    if (result.isConfirmed) {
      await logout();
      navigate('/login', { replace: true });
    }
  };

  const statusInfo = eventoActivo ? STATUS_LABELS[eventoActivo.status] : null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:static z-40 inset-y-0 left-0 w-64 bg-primary-900 text-white flex flex-col transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-3 px-5 py-5 border-b border-primary-800">
          <div className="w-10 h-10 rounded-full bg-gold-400 flex items-center justify-center shrink-0">
            <Icon name="calendar" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight">Convención Nacional</p>
            <p className="text-primary-300 text-xs leading-tight">de Niños</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {menuFiltrado.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition
                ${isActive ? 'bg-gold-400 text-primary-900' : 'text-primary-100 hover:bg-primary-800'}`
              }
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-primary-800 p-3">
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-semibold truncate">{userData?.nombre || userData?.email}</p>
            <p className="text-xs text-primary-300">{ROL_LABELS[userData?.rol] || ''}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-primary-100 hover:bg-primary-800 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="flex items-center justify-between px-4 py-3 gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="relative flex-1 max-w-md">
              <button
                onClick={() => setEventMenuOpen(!eventMenuOpen)}
                className="w-full flex items-center justify-between gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition text-left"
              >
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 leading-none mb-0.5">Evento Activo</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {eventoActivo ? eventoActivo.name : 'Sin eventos creados'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {statusInfo && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  )}
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {eventMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setEventMenuOpen(false)} />
                  <div className="absolute mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-72 overflow-y-auto">
                    {eventos.length === 0 && (
                      <p className="px-4 py-3 text-sm text-gray-400">No hay eventos creados todavía.</p>
                    )}
                    {eventos.map((evento) => {
                      const info = STATUS_LABELS[evento.status] || STATUS_LABELS.Draft;
                      return (
                        <button
                          key={evento.id}
                          onClick={() => { seleccionarEvento(evento.id); setEventMenuOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition flex items-center justify-between gap-2 ${eventoActivo?.id === evento.id ? 'bg-primary-50' : ''}`}
                        >
                          <span className="text-sm font-medium text-gray-700 truncate">{evento.name}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${info.color}`}>
                            {info.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-800 font-semibold text-sm">
                {(userData?.nombre || userData?.email || '?').charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}