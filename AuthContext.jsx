import { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext(null);

// Roles disponibles en el sistema
export const ROLES = {
  NACIONAL: 'nacional',
  REGIONAL: 'regional',
  DISTRITAL: 'distrital',
  VIEWER: 'viewer'
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Buscar datos adicionales del usuario (rol, región, distrito) en Firestore
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setUser(firebaseUser);
            setUserData({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              nombre: data.nombre || '',
              rol: data.rol || ROLES.VIEWER,
              region: data.region || null,
              distrito: data.distrito || null,
              activo: data.activo !== false
            });
          } else {
            // El usuario existe en Auth pero no tiene perfil en Firestore
            setUser(firebaseUser);
            setUserData({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              nombre: '',
              rol: null,
              region: null,
              distrito: null,
              activo: false
            });
          }
        } catch (error) {
          console.error('Error cargando datos del usuario:', error);
          setUser(firebaseUser);
          setUserData(null);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    return signOut(auth);
  };

  // Funciones de ayuda para verificar permisos
  const isNacional = () => userData?.rol === ROLES.NACIONAL;
  const isRegional = () => userData?.rol === ROLES.REGIONAL;
  const isDistrital = () => userData?.rol === ROLES.DISTRITAL;
  const isViewer = () => userData?.rol === ROLES.VIEWER;

  // ¿Puede editar datos? (todos excepto viewer)
  const canEdit = () => userData?.rol && userData.rol !== ROLES.VIEWER;

  // ¿Puede ver datos de una región específica?
  const canAccessRegion = (region) => {
    if (isNacional()) return true;
    if (isRegional() || isDistrital()) return userData.region === region;
    return false;
  };

  // ¿Puede ver datos de un distrito específico?
  const canAccessDistrito = (distrito) => {
    if (isNacional() || isRegional()) return true;
    if (isDistrital()) return userData.distrito === distrito;
    return false;
  };

  const value = {
    user,
    userData,
    loading,
    login,
    logout,
    isNacional,
    isRegional,
    isDistrital,
    isViewer,
    canEdit,
    canAccessRegion,
    canAccessDistrito
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
