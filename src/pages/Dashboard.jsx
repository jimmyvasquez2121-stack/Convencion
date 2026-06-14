import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useEvent } from '../context/EventContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#1e3a8a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function Dashboard() {
  const [participantes, setParticipantes] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [hospedaje, setHospedaje] = useState([]);
  const [loading, setLoading] = useState(true);

  const { userData } = useAuth();
  const { eventoActivo } = useEvent();

  useEffect(() => {
    if (!eventoActivo) { setLoading(false); return; }
    const unsubs = [];
    unsubs.push(onSnapshot(query(collection(db, 'participants'), where('eventId', '==', eventoActivo.id)), snap => {
      setParticipantes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }));
    unsubs.push(onSnapshot(query(collection(db, 'checkins'), where('eventId', '==', eventoActivo.id)), snap => {
      setCheckins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }));
    unsubs.push(onSnapshot(query(collection(db, 'groups'), where('eventId', '==', eventoActivo.id)), snap => {
      setGrupos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }));
    unsubs.push(onSnapshot(query(collection(db, 'lodging'), where('eventId', '==', eventoActivo.id)), snap => {
      setHospedaje(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }));
    return () => unsubs.forEach(u => u());
  }, [eventoActivo]);

  if (!eventoActivo) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Bienvenido, {userData?.nombre || userData?.email}</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-5xl mb-4">📅</div>
          <p className="text-gray-500 font-medium">No hay evento activo</p>
          <p className="text-gray-400 text-sm mt-1">Ve a Eventos para crear o seleccionar un evento</p>
        </div>
      </div>
    );
  }

  const totalParticipantes = participantes.length;
  const totalNinos = participantes.filter(p => p.participantType === 'Niño').length;
  const totalAdultos = totalParticipantes - totalNinos;
  const totalCheckins = checkins.length;
  const totalRecaudado = participantes.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const totalEsperado = totalParticipantes * (eventoActivo.registrationFee || 0);
  const saldoPendiente = totalEsperado - totalRecaudado;
  const pagados = participantes.filter(p => p.paymentStatus === 'paid').length;
  const parciales = participantes.filter(p => p.paymentStatus === 'partial').length;
  const pendientes = participantes.filter(p => p.paymentStatus === 'pending').length;
  const totalCapacidad = hospedaje.reduce((sum, h) => sum + (h.capacity || 0), 0);
  const totalOcupados = hospedaje.reduce((sum, h) => sum + (h.occupiedSpaces || 0), 0);

  const tiposData = ['Niño', 'Maestro', 'Líder de Niños', 'Pastor', 'Padre/Madre', 'Voluntario', 'Invitado']
    .map(tipo => ({ name: tipo, value: participantes.filter(p => p.participantType === tipo).length }))
    .filter(d => d.value > 0);

  const pagosData = [
    { name: 'Pagados', value: pagados, color: '#10b981' },
    { name: 'Parciales', value: parciales, color: '#f59e0b' },
    { name: 'Pendientes', value: pendientes, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const porDistrito = participantes.reduce((acc, p) => {
    const d = p.district || 'Sin distrito';
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});
  const distritoData = Object.entries(porDistrito)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">{eventoActivo.name}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Registrados', value: totalParticipantes, color: 'text-primary-800', bg: 'bg-primary-50', icon: '👥' },
          { label: 'Niños', value: totalNinos, color: 'text-blue-600', bg: 'bg-blue-50', icon: '👶' },
          { label: 'Adultos', value: totalAdultos, color: 'text-purple-600', bg: 'bg-purple-50', icon: '👨' },
          { label: 'Check-Ins', value: totalCheckins, color: 'text-green-600', bg: 'bg-green-50', icon: '✅' },
        ].map(card => (
          <div key={card.label} className={`${card.bg} rounded-xl border border-gray-200 p-4`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{card.icon}</span>
              <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
            </div>
            <p className="text-gray-500 text-xs font-medium">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <p className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">Total Recaudado</p>
          <p className="text-2xl font-bold text-green-700">${totalRecaudado.toLocaleString()}</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <p className="text-xs text-red-600 font-semibold uppercase tracking-wide mb-1">Saldo Pendiente</p>
          <p className="text-2xl font-bold text-red-700">${saldoPendiente.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Total Esperado</p>
          <p className="text-2xl font-bold text-gray-700">${totalEsperado.toLocaleString()}</p>
        </div>
      </div>

      {totalParticipantes > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span className="font-medium">Progreso de Check-In</span>
            <span>{totalCheckins} / {totalParticipantes} ({Math.round((totalCheckins / totalParticipantes) * 100)}%)</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className="bg-green-500 h-3 rounded-full transition-all"
              style={{ width: `${Math.min((totalCheckins / totalParticipantes) * 100, 100)}%` }} />
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        {tiposData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-700 mb-4">Tipos de Participante</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={tiposData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ value }) => value}>
                  {tiposData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {pagosData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-700 mb-4">Estado de Pagos</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pagosData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ value }) => value}>
                  {pagosData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {distritoData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-gray-700 mb-4">Participantes por Distrito</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={distritoData} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-35} textAnchor="end" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-3">Hospedaje</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">{totalOcupados}</p>
              <p className="text-xs text-gray-500 mt-1">Ocupados</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{totalCapacidad - totalOcupados}</p>
              <p className="text-xs text-gray-500 mt-1">Disponibles</p>
            </div>
          </div>
          {totalCapacidad > 0 && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full"
                  style={{ width: `${Math.min((totalOcupados / totalCapacidad) * 100, 100)}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1 text-right">{totalOcupados}/{totalCapacidad}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-3">Grupos</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{grupos.length}</p>
              <p className="text-xs text-gray-500 mt-1">Grupos</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{grupos.reduce((sum, g) => sum + (g.memberCount || 0), 0)}</p>
              <p className="text-xs text-gray-500 mt-1">Miembros</p>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            {grupos.slice(0, 3).map(g => (
              <div key={g.id} className="flex justify-between text-xs text-gray-600">
                <span>{g.name}</span>
                <span className="font-semibold">{g.memberCount || 0} miembros</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}