import { useAuth } from '../context/AuthContext';
import { useEvent } from '../context/EventContext';

export default function Dashboard() {
  const { userData } = useAuth();
  const { eventoActivo } = useEvent();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">
        Bienvenido, {userData?.nombre || userData?.email}
      </h1>
      <p className="text-gray-500 mb-6">
        {eventoActivo
          ? `Estás viendo datos del evento: ${eventoActivo.name}`
          : 'No hay un evento activo. Crea un evento para comenzar.'}
      </p>
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400">
        <p className="font-medium">📊 Dashboard completo</p>
        <p className="text-sm mt-1">Se construirá en un bloque posterior.</p>
      </div>
    </div>
  );
}