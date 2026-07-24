import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

const EventContext = createContext(null);

export function EventProvider({ children }) {
  const [eventos, setEventos] = useState([]);
  const [eventoActivo, setEventoActivo] = useState(null);
  const [loading, setLoading] = useState(true);
  const inicializado = useRef(false);

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('startDate', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setEventos(lista);

      if (!inicializado.current && lista.length > 0) {
        inicializado.current = true;

        // Intentar restaurar desde localStorage
        let restaurado = false;
        try {
          const guardadoId = localStorage.getItem('eventoActivoId');
          if (guardadoId) {
            const evento = lista.find((e) => e.id === guardadoId);
            if (evento) {
              setEventoActivo(evento);
              restaurado = true;
            }
          }
        } catch (e) {}

        // Si no se restauró, seleccionar automáticamente
        if (!restaurado) {
          const abierto = lista.find((e) => e.status === 'Open');
          const seleccionado = abierto || lista[0];
          if (seleccionado) {
            setEventoActivo(seleccionado);
            try {
              localStorage.setItem('eventoActivoId', seleccionado.id);
            } catch (e) {}
          }
        }
      } else if (inicializado.current) {
        // Actualizar el evento activo si cambió en Firestore
        setEventoActivo(prev => {
          if (!prev) return prev;
          const actualizado = lista.find(e => e.id === prev.id);
          return actualizado || prev;
        });
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const seleccionarEvento = (eventoId) => {
    const evento = eventos.find((e) => e.id === eventoId);
    if (evento) {
      setEventoActivo(evento);
      try {
        localStorage.setItem('eventoActivoId', eventoId);
      } catch (e) {}
    }
  };

  const value = {
    eventos,
    eventoActivo,
    seleccionarEvento,
    loading
  };

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