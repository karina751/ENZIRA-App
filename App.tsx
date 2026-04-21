// App.tsx
import React from 'react';
import { MD3LightTheme, Provider as PaperProvider } from 'react-native-paper';
import { AppNavigator } from './src/navigation/AppNavigator';
import { CartProvider } from './src/context/CartContext'; 
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext'; // Importamos lo nuevo

// Creamos un componente "Main" para poder usar el hook useAppTheme
function Main() {
  const { theme } = useAppTheme(); // ¡Acá recibimos los colores de Firebase!

  // Combinamos el MD3LightTheme con los colores de la estación actual
  const dynamicTheme = {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      primary: theme.primary,
      secondary: theme.secondary,
      background: theme.background,
      surface: theme.background, // Usamos el fondo de la estación
      text: theme.text,
      // Mantenemos tu estilo de elevación flat
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

// El componente principal solo envuelve a Main con el ThemeProvider
export default function App() {
  return (
    <ThemeProvider>
      <Main />
    </ThemeProvider>
  );
}