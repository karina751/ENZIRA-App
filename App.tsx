import React from 'react';
import { MD3LightTheme, Provider as PaperProvider } from 'react-native-paper';
import { AppNavigator } from './src/navigation/AppNavigator';
import { CartProvider } from './src/context/CartContext'; 

// 1. CREAMOS EL TEMA DE ENZIRA
const enziraTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#002147',      // Azul Marino (Botones, Header)
    secondary: '#CFAF68',    // Dorado (Acentos)
    background: '#FFFAED',   // Crema (Fondo de la app)
    surface: '#FFFAED',      // Crema (Para que las tarjetas no resalten como bloques)
    text: '#002147',         // Textos principales
    elevation: {
      level0: 'transparent',
      level1: 'transparent', // Apagamos las sombras para hacer un diseño "Flat" elegante
      level2: 'transparent',
      level3: 'transparent',
      level4: 'transparent',
      level5: 'transparent',
    }
  },
};

export default function App() {
  return (
    <CartProvider>
      {/* 2. LE PASAMOS EL TEMA A LA APP */}
      <PaperProvider theme={enziraTheme}>
        <AppNavigator />
      </PaperProvider>
    </CartProvider>
  );
}