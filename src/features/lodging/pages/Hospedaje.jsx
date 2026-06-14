import { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useEvent } from '../../../context/EventContext';
import { useAuth } from '../../../context/AuthContext';
import Swal from 'sweetalert2';
import FormHospedaje from '../components/FormHospedaje';
import DetalleHospedaje from '../components/DetalleHospedaje';

const TIPO_ICONS = {
  'Cabaña':          '🏠',
  'Cuarto':          '🛏️',
  'Tipi':            '⛺',
  'Casa':            '🏡',
  'Área de Camping': '🌲',
};

export default function Hospedaje() {
  const [lugares, setLugares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState('lista');
  const [lugarSeleccionado, setLugarSeleccionado] = useState(null);

  const { eventoActivo } = useEvent();
  const { canEdit } = useAuth();

  useEffect(() => {
    if (!eventoActivo) { setLugares([]); setLoading(false); return; }
    const q = query(collection(db, 'lodging'), where('eventId', '==', eventoActivo.id));
    const unsub = onSnapshot(q, (snap) => {
      setLugares(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [eventoActivo]);

  const guardarLugar = async (datos) => {
    try {
      if (lugarSeleccionado) {
        await updateDoc(doc(db, 'lodging', lugarSeleccionado.id), { ...datos, updatedAt: serverTimestamp() });
        Swal.fire({ icon: 'success', title: 'Lugar actualizado', timer: 1500, showConfirmButton: false });
      } else {
        await addDoc(collection(db, 'lodging'), {
          ...datos, eventId: eventoActivo.id, eventName: eventoActivo.name,
          occupiedSpaces: 0, createdAt: serverTimestamp()
        });
        Swal.fire({ icon: 'success', title: 'Lugar creado', timer: 1500, showConfirmButton: false });
      }
      setVista('lista');
      setLugarSeleccionado(null);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    }
  };

  const eliminarLugar = async (lugar) => {
    const result = await Swal.fire({
      title: '¿Eliminar lugar?', text: `¿Estás seguro que deseas eliminar "${lugar.name}"?`,
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar', confirmButtonColor: '#dc2626', cancelButtonColor: '#9ca3af'
    });
    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, 'lodging', lugar.id));
        Swal.fire({ icon: 'success', title: 'Lugar eliminado', timer: 1500, showConfirmButton: false });
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: error.message });
      }
    }
  };

  const totalCapacidad = lugares.reduce((sum, l) => sum + (l.capacity || 0), 0);
  const totalOcupados = lugares.reduce((sum, l) => sum + (l.occupiedSpaces || 0), 0);
  const totalDisponibles = totalCapacidad - totalOcupados;
  const porcentajeOcupacion = totalCapacidad > 0 ? Math.round((totalOcupados / totalCapacidad) * 100) : 0;

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
      <FormHospedaje
        lugar={lugarSeleccionado}
        onGuardar={guardarLugar}
        onCancelar={() => { setVista('lista'); setLugarSeleccionado(null); }}
      />
    );
  }

  if (vista === 'detalle') {
    return (
      <DetalleHospedaje
        lugar={lugarSeleccionado}
        evento={eventoActivo}
        onVolver={() => { setVista('lista'); setLugarSeleccionado(null); }}
        onEditar={() => setVista('form')}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Hospedaje</h1>
          <p className="text-gray-500 text-sm mt-0.5">{eventoActivo.name}</p>
        </div>
        {canEdit() && (
          <button onClick={() => { setLugarSeleccionado(null); setVista('form'); }}
            className="flex items-center gap-2 bg-primary-800 hover:bg-primary-900 text-white px-4 py-2.5 rounded-lg font-medium transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Lugar
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Capacidad Total', value: totalCapacidad, color: 'text-primary-800' },
          { label: 'Ocupados', value: totalOcupados, color: 'text-orange-600' },
          { label: 'Disponibles', value: totalDisponibles, color: 'text-green-600' },
          { label: 'Ocupación', value: `${porcentajeOcupacion}%`, color: 'text-blue-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-gray-500 text-xs mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {totalCapacidad > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span className="font-medium">Ocupación general</span>
            <span>{totalOcupados} / {totalCapacidad}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${porcentajeOcupacion >= 90 ? 'bg-red-500' : porcentajeOcupacion >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${porcentajeOcupacion}%` }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-primary-800" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : lugares.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-5xl mb-4">🏠</div>
          <p className="text-gray-500 font-medium">No hay lugares de hospedaje creados</p>
          <p className="text-gray-400 text-sm mt-1">Toca "Nuevo Lugar" para agregar cabañas, cuartos, etc.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lugares.map(lugar => {
            const disponibles = (lugar.capacity || 0) - (lugar.occupiedSpaces || 0);
            const porcentaje = lugar.capacity > 0 ? Math.round((lugar.occupiedSpaces / lugar.capacity) * 100) : 0;
            const lleno = disponibles <= 0;
            return (
              <div key={lugar.id} className={`bg-white rounded-xl border p-5 flex flex-col gap-3 hover:shadow-md transition ${lleno ? 'border-red-200' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{TIPO_ICONS[lugar.type] || '🏠'}</span>
                    <div>
                      <h3 className="font-bold text-gray-800">{lugar.name}</h3>
                      <p className="text-xs text-gray-400">{lugar.type}</p>
                    </div>
                  </div>
                  {lleno && <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700">Lleno</span>}
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{lugar.occupiedSpaces || 0} ocupados</span>
                    <span>{disponibles} disponibles</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${porcentaje >= 90 ? 'bg-red-500' : porcentaje >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(porcentaje, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1 text-right">Capacidad: {lugar.capacity}</p>
                </div>
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button onClick={() => { setLugarSeleccionado(lugar); setVista('detalle'); }}
                    className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 transition">
                    Ver asignaciones
                  </button>
                  {canEdit() && (
                    <>
                      <button onClick={() => { setLugarSeleccionado(lugar); setVista('form'); }}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => eliminarLugar(lugar)}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:bg-red-50 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}