// src/constants/Themes.ts

export type ThemeColors = {
  primary: string;
  onPrimary: string;    // Color del texto sobre el primario
  secondary: string;
  onSecondary: string;  // Color del texto sobre el secundario
  background: string;
  text: string;         // Color del texto sobre el fondo
};

export const seasonalThemes: Record<string, ThemeColors> = {
  otoño: {
    primary: '#4B3621',
    onPrimary: '#FFFFFF', // Blanco para que se lea sobre el café oscuro
    secondary: '#8D6E63', // Un marrón más claro para acentos
    onSecondary: '#FFFFFF',
    background: '#F5F0E1',
    text: '#2D1B0D',      // Marrón casi negro para leer bien
  },
  invierno: {
    primary: '#1A1A1D',
    onPrimary: '#FFFFFF',
    secondary: '#0D47A1', // Azul fuerte
    onSecondary: '#FFFFFF',
    background: '#E5E7E9',
    text: '#1A1A1D',
  },
  primavera: {
    primary: '#D81B60',   // Cambiamos el coral por un rosa fuerte (más contraste)
    onPrimary: '#FFFFFF',
    secondary: '#43A047', // Verde primavera (se lee mucho mejor que el amarillo)
    onSecondary: '#FFFFFF',
    background: '#FFF5F8',
    text: '#2D3436',
  },
  verano: {
    primary: '#E65100',   // Naranja fuerte
    onPrimary: '#FFFFFF',
    secondary: '#00ACC1', // Turquesa
    onSecondary: '#FFFFFF',
    background: '#FFFDE7',
    text: '#3E2723',
  },
};