// App.tsx
import React from 'react';
import { MD3LightTheme, Provider as PaperProvider } from 'react-native-paper';
import { AppNavigator } from './src/navigation/AppNavigator';
import { CartProvider } from './src/context/CartContext'; 
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';

// 1. Componente de lógica de renderizado
function Main() {
  const { theme } = useAppTheme(); // Recibe la estación activa de Firebase

  // 2. Construcción del tema dinámico con refuerzo de contraste
  const dynamicTheme = {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      primary: theme.primary,
      onPrimary: theme.onPrimary,         // Texto sobre botones primarios
      secondary: theme.secondary,
      onSecondary: theme.onSecondary,     // Texto sobre botones secundarios
      background: theme.background,
      surface: theme.background,
      onSurface: theme.text,              // Color de textos generales
      onSurfaceVariant: theme.text,       // Textos secundarios o iconos
      outline: theme.secondary,           // Bordes de inputs
      // Tu estilo Flat sin sombras para elegancia total
      elevation: {
        level0: 'transparent',
        level1: 'transparent',
        level2: 'transparent',
        level3: 'transparent',
        level4: 'transparent',
        level5: 'transparent',
      }
    },
  };

  return (
    <CartProvider>
      <PaperProvider theme={dynamicTheme}>
        <AppNavigator />
      </PaperProvider>
    </CartProvider>
  );
}

// 3. Punto de entrada con el Proveedor de Tema global
export default function App() {
  return (
    <ThemeProvider>
      <Main />
    </ThemeProvider>
  );
}