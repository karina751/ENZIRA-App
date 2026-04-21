// src/context/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase'; 
import { seasonalThemes, ThemeColors } from '../constants/Themes';

const ThemeContext = createContext<{ theme: ThemeColors }>({
  theme: seasonalThemes.otoño, // Valor inicial por si falla el internet
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeColors>(seasonalThemes.otoño);

  useEffect(() => {
    // Escuchamos la colección "configuracion" y el documento "apariencia"
    const unsub = onSnapshot(doc(db, 'configuracion', 'apariencia'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const estacion = data.estacionActual; // ej: "verano"
        
        if (seasonalThemes[estacion]) {
          setCurrentTheme(seasonalThemes[estacion]);
        }
      }
    }, (error) => {
      console.error("Error escuchando el tema:", error);
    });

    return () => unsub();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: currentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);