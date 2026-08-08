import { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useEvent } from '../../../context/EventContext';
import { useAuth } from '../../../context/AuthContext';
import Swal from 'sweetalert2';
import FormGrupo from '../components/FormGrupo';
import DetalleGrupo from '../components/DetalleGrupo';

const COLORES = [
  { name: 'Rojo',     bg: 'bg-red-500',    light: 'bg-red-100',    text: 'text-red-700' },
  { name: 'Azul',     bg: 'bg-blue-500',   light: 'bg-blue-100',   text: 'text-blue-700' },
  { name: 'Verde',    bg: 'bg-green-500',  light: 'bg-green-100',  text: 'text-green-700' },
  { name: 'Amarillo', bg: 'bg-yellow-400', light: 'bg-yellow-100', text: 'text-yellow-700' },
  { name: 'Morado',   bg: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-700' },
  { name: 'Rosa',     bg: 'bg-pink-500',   light: 'bg-pink-100',   text: 'text-pink-700' },
];

export { COLORES };

export default function Grupos() {
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState('lista');
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null);

  const { eventoActivo } = useEvent();
  const { canEdit,isNacional,userData } = useAuth();

  useEffect(() => {
    if (!eventoActivo) { setGrupos([]); setLoading(false); return; }
    const q = query(collection(db, 'groups'), where('eventId', '==', eventoActivo.id));
    const unsub = onSnapshot(q, (snap) => {
      setGrupos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [eventoActivo]);

  const guardarGrupo = async (datos) => {
    try {
      if (grupoSeleccionado) {
        await updateDoc(doc(db, 'groups', grupoSeleccionado.id), { ...datos, updatedAt: serverTimestamp() });
        Swal.fire({ icon: 'success', title: 'Grupo actualizado', timer: 1500, showConfirmButton: false });
      } else {
        await addDoc(collection(db, 'groups'), {
          ...datos, eventId: eventoActivo.id, eventName: eventoActivo.name,
          memberCount: 0, createdAt: serverTimestamp()
        });
        Swal.fire({ icon: 'success', title: 'Grupo creado', timer: 1500, showConfirmButton: false });
      }
      setVista('lista');
      setGrupoSeleccionado(null);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    }
  };

  const eliminarGrupo = async (grupo) => {
    const result = await Swal.fire({
      title: '¿Eliminar grupo?', text: `¿Estás seguro que deseas eliminar "${grupo.name}"?`,
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar', confirmButtonColor: '#dc2626', cancelButtonColor: '#9ca3af'
    });
    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, 'groups', grupo.id));
        Swal.fire({ icon: 'success', title: 'Grupo eliminado', timer: 1500, showConfirmButton: false });
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: error.message });
      }
    }
  };

  if (!eventoActivo) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="text-5xl mb-4">📅</div>
        <p className="text-gray-500 font-medium">No hay evento activo seleccionado</p>
      </div>
    );
  }

  if (vista === 'form') {
    return (
      <FormGrupo
        grupo={grupoSeleccionado}
        colores={COLORES}
        onGuardar={guardarGrupo}
        onCancelar={() => { setVista('lista'); setGrupoSeleccionado(null); }}
      />
    );
  }

  if (vista === 'detalle') {
    return (
      <DetalleGrupo
        grupo={grupoSeleccionado}
        evento={eventoActivo}
        colores={COLORES}
        onVolver={() => { setVista('lista'); setGrupoSeleccionado(null); }}
        onEditar={() => setVista('form')}
      />
    );
  }

  const totalMiembros = grupos.reduce((sum, g) => sum + (g.memberCount || 0), 0);
const autoAsignarNinos = async () => {
    if (grupos.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Sin grupos', text: 'Primero crea los grupos antes de auto-asignar.', confirmButtonColor: '#1e3a8a' });
      return;
    }

    const result = await Swal.fire({
      title: '¿Auto-asignar niños?',
      text: 'Se distribuirán todos los niños sin grupo asignado, balanceando edades y manteniendo familias juntas.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, auto-asignar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#1e3a8a',
      cancelButtonColor: '#9ca3af'
    });

    if (!result.isConfirmed) return;

    try {
      // 1. Obtener todos los niños del evento sin grupo asignado
      const qNinos = query(
        collection(db, 'participants'),
        where('eventId', '==', eventoActivo.id),
        where('participantType', '==', 'Niño')
      );
      const snapNinos = await getDocs(qNinos);
      const todosNinos = snapNinos.docs.map(d => ({ id: d.id, ...d.data() }));

      // 2. Obtener niños que ya tienen grupo
      const qMiembros = query(
        collection(db, 'groupMembers'),
        where('eventId', '==', eventoActivo.id)
      );
      const snapMiembros = await getDocs(qMiembros);
      const idsConGrupo = new Set(snapMiembros.docs.map(d => d.data().participantId));

      // 3. Filtrar solo los que NO tienen grupo
      const ninosSinGrupo = todosNinos.filter(n => !idsConGrupo.has(n.id));

      if (ninosSinGrupo.length === 0) {
        Swal.fire({ icon: 'info', title: 'Sin niños pendientes', text: 'Todos los niños ya tienen grupo asignado.', confirmButtonColor: '#1e3a8a' });
        return;
      }

      // 4. Agrupar por grupoFamiliarId
      const familias = {};
      const sinFamilia = [];
      ninosSinGrupo.forEach(n => {
        if (n.grupoFamiliarId) {
          if (!familias[n.grupoFamiliarId]) familias[n.grupoFamiliarId] = [];
          familias[n.grupoFamiliarId].push(n);
        } else {
          sinFamilia.push(n);
        }
      });

      // 5. Crear lista de unidades a distribuir (familia o niño individual)
      const unidades = [
        ...Object.values(familias),
        ...sinFamilia.map(n => [n])
      ];

      // Ordenar unidades por edad promedio para mejor balance
      unidades.sort((a, b) => {
        const edadA = a.reduce((s, n) => s + (n.age || 10), 0) / a.length;
        const edadB = b.reduce((s, n) => s + (n.age || 10), 0) / b.length;
        return edadA - edadB;
      });

      // 6. Distribuir en grupos balanceando edades (snake draft)
      const gruposOrdenados = [...grupos].sort((a, b) => (a.memberCount || 0) - (b.memberCount || 0));
      const asignaciones = gruposOrdenados.map(g => ({ grupo: g, ninos: [] }));

      let direccion = 1;
      let indice = 0;

      for (const unidad of unidades) {
        // Verificar capacidad
        const grupoActual = asignaciones[indice];
        const capacidadDisponible = grupoActual.grupo.capacity > 0
          ? grupoActual.grupo.capacity - (grupoActual.grupo.memberCount || 0) - grupoActual.ninos.length
          : Infinity;

        if (capacidadDisponible >= unidad.length) {
          grupoActual.ninos.push(...unidad);
        }

        indice += direccion;
        if (indice >= asignaciones.length) { indice = asignaciones.length - 1; direccion = -1; }
        if (indice < 0) { indice = 0; direccion = 1; }
      }

      // 7. Guardar en Firestore
      let totalAsignados = 0;
      for (const { grupo, ninos } of asignaciones) {
        if (ninos.length === 0) continue;
        for (const nino of ninos) {
          await addDoc(collection(db, 'groupMembers'), {
            groupId: grupo.id, groupName: grupo.name,
            participantId: nino.id, participantName: nino.fullName,
            registrationNumber: nino.registrationNumber,
            participantType: nino.participantType,
            eventId: eventoActivo.id,
            assignedAt: serverTimestamp(), assignedBy: userData.uid
          });
          totalAsignados++;
        }
        await updateDoc(doc(db, 'groups', grupo.id), {
          memberCount: (grupo.memberCount || 0) + ninos.length
        });
      }

      Swal.fire({
        icon: 'success',
        title: '¡Auto-asignación completada!',
        text: `${totalAsignados} niños distribuidos en ${grupos.length} grupos.`,
        confirmButtonColor: '#1e3a8a'
      });

    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    }
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Grupos de Niños</h1>
          <p className="text-gray-500 text-sm mt-0.5">{eventoActivo.name} — {grupos.length} grupos, {totalMiembros} miembros</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isNacional() && grupos.length > 0 && (
            <button onClick={autoAsignarNinos}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Auto-asignar niños
            </button>
          )}
          {isNacional() && (
            <button onClick={() => { setGrupoSeleccionado(null); setVista('form'); }}
              className="flex items-center gap-2 bg-primary-800 hover:bg-primary-900 text-white px-4 py-2.5 rounded-lg font-medium transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Grupo
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-primary-800" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : grupos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-5xl mb-4">👥</div>
          <p className="text-gray-500 font-medium">No hay grupos creados todavía</p>
          <p className="text-gray-400 text-sm mt-1">Toca "Nuevo Grupo" para crear el primero</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {grupos.map(grupo => {
            const color = COLORES.find(c => c.name === grupo.color) || COLORES[0];
            const porcentaje = grupo.capacity > 0 ? Math.round(((grupo.memberCount || 0) / grupo.capacity) * 100) : 0;
            return (
              <div key={grupo.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition">
                <div className={`h-2 ${color.bg}`} />
                <div className="p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">{grupo.name}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color.light} ${color.text}`}>
                        {grupo.color}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-800">{grupo.memberCount || 0}</p>
                      <p className="text-xs text-gray-400">miembros</p>
                    </div>
                  </div>
                  {grupo.teacher && <p className="text-sm text-gray-600"><span className="font-medium">Maestro:</span> {grupo.teacher}</p>}
                  {grupo.leader && <p className="text-sm text-gray-600"><span className="font-medium">Líder:</span> {grupo.leader}</p>}
                  {grupo.capacity > 0 && (
                    <div>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{grupo.memberCount || 0} / {grupo.capacity}</span>
                        <span>{porcentaje}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${color.bg}`} style={{ width: `${Math.min(porcentaje, 100)}%` }} />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button onClick={() => { setGrupoSeleccionado(grupo); setVista('detalle'); }}
                      className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 transition">
                      Ver miembros
                    </button>
                    {isNacional() && (
                      <>
                        <button onClick={() => { setGrupoSeleccionado(grupo); setVista('form'); }}
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => eliminarGrupo(grupo)}
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:bg-red-50 transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}