import { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

const EventContext = createContext(null);

// Funciones de almacenamiento con fallback
const guardarId = (id) => {
  try { localStorage.setItem('eventoActivoId', id); } catch (e) {}
  try { sessionStorage.setItem('eventoActivoId', id); } catch (e) {}
};

const obtenerIdGuardado = () => {
  try {
    const id = localStorage.getItem('eventoActivoId');
    if (id) return id;
  } catch (e) {}
  try {
    const id = sessionStorage.getItem('eventoActivoId');
    if (id) return id;
  } catch (e) {}
  return null;
};

export function EventProvider({ children }) {
  const [eventos, setEventos] = useState([]);
  const [eventoActivo, setEventoActivo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [eventoActivoId, setEventoActivoId] = useState(null);

  // Cargar el ID guardado al inicio
  useEffect(() => {
    const id = obtenerIdGuardado();
    if (id) setEventoActivoId(id);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('startDate', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setEventos(lista);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Seleccionar evento activo cuando cambien los eventos o el ID guardado
  useEffect(() => {
    if (eventos.length === 0) return;

    // Si ya hay un evento activo y sigue existiendo, mantenerlo
    if (eventoActivo) {
      const sigueExistiendo = eventos.find(e => e.id === eventoActivo.id);
      if (sigueExistiendo) {
        setEventoActivo(sigueExistiendo);
        return;
      }
    }

    // Intentar restaurar el evento guardado
    const idGuardado = eventoActivoId || obtenerIdGuardado();
    if (idGuardado) {
      const evento = eventos.find(e => e.id === idGuardado);
      if (evento) {
        setEventoActivo(evento);
        return;
      }
    }

    // Seleccionar automáticamente: Abierto o el primero
    const abierto = eventos.find(e => e.status === 'Open');
    const seleccionado = abierto || eventos[0];
    if (seleccionado) {
      setEventoActivo(seleccionado);
      guardarId(seleccionado.id);
    }
  }, [eventos, eventoActivoId]);

  const seleccionarEvento = (eventoId) => {
    const evento = eventos.find(e => e.id === eventoId);
    if (evento) {
      setEventoActivo(evento);
      setEventoActivoId(eventoId);
      guardarId(eventoId);
    }
  };

  const value = { eventos, eventoActivo, seleccionarEvento, loading };

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvent() {
  const context = useContext(EventContext);
  if (!context) throw new Error('useEvent debe usarse dentro de un EventProvider');
  return context;
}