import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { 
  createDrawerNavigator, 
  DrawerContentScrollView, 
  DrawerItem,
  DrawerContentComponentProps 
} from '@react-navigation/drawer';
import { View, StyleSheet } from 'react-native';
import { Text, Divider } from 'react-native-paper';

// Importamos nuestras pantallas
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { AdminScreen } from '../screens/AdminScreen';
import { ProductDetailScreen } from '../screens/ProductDetailScreen';
import { CartScreen } from '../screens/CartScreen'; 

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// 1. CONTENIDO DEL MENÚ LATERAL
const CustomDrawerContent = (props: DrawerContentComponentProps) => {
  const categorias = ['Todas', 'Carteras', 'Mochilas', 'Billeteras', 'Accesorios'];

  return (
    <DrawerContentScrollView {...props} style={{ backgroundColor: '#FFFAED' }}>
      <View style={styles.drawerHeader}>
        <Text style={styles.drawerTitulo}>ENZIRA</Text>
        <Text style={styles.drawerSub}>ALTA COSTURA</Text>
      </View>
      
      <Divider style={styles.divider} />
      
      <Text style={styles.seccionLabel}>CATEGORÍAS</Text>
      
      {categorias.map((cat) => (
        <DrawerItem
          key={cat}
          label={cat.toUpperCase()}
          labelStyle={styles.labelStyle}
          onPress={() => {
            // --- FIX DE NAVEGACIÓN ANIDADA ---
            // Como 'Home' está dentro de 'Main', navegamos así:
            props.navigation.navigate('Main', {
              screen: 'Home',
              params: { 
                categoriaSeleccionada: cat,
                lastUpdate: Date.now() 
              }
            });
            props.navigation.closeDrawer();
          }}
          activeTintColor="#CFAF68"
          inactiveTintColor="#002147"
        />
      ))}

      <Divider style={[styles.divider, { marginTop: 30 }]} />
      <View style={{ padding: 20, alignItems: 'center' }}>
        <Text style={{ fontSize: 10, color: '#002147', opacity: 0.4 }}>Salta Capital, Argentina</Text>
      </View>
    </DrawerContentScrollView>
  );
};

// 2. STACK NAVIGATOR
const MainStack = () => {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Admin" component={AdminScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen 
        name="Cart" 
        component={CartScreen} 
        options={{ 
            title: 'MI CARRITO', 
            headerTintColor: '#002147', 
            headerStyle: { backgroundColor: '#FFFAED' },
            headerTitleStyle: { fontWeight: 'bold', fontSize: 18 }
        }} 
      />
    </Stack.Navigator>
  );
};

// 3. NAVEGADOR PRINCIPAL
export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Drawer.Navigator
        drawerContent={(props: DrawerContentComponentProps) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerStyle: { width: 280, backgroundColor: '#FFFAED' },
        }}
      >
        <Drawer.Screen name="Main" component={MainStack} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  drawerHeader: { padding: 30, alignItems: 'center', backgroundColor: '#FFFAED' },
  drawerTitulo: { fontSize: 28, fontWeight: 'bold', color: '#002147', letterSpacing: 5 },
  drawerSub: { fontSize: 10, color: '#CFAF68', letterSpacing: 2, fontWeight: 'bold', marginTop: 5 },
  divider: { marginVertical: 10, backgroundColor: '#CFAF68', opacity: 0.2, height: 1, width: '80%', alignSelf: 'center' },
  seccionLabel: { paddingLeft: 20, fontSize: 12, color: '#002147', opacity: 0.5, marginVertical: 15, letterSpacing: 1, fontWeight: 'bold' },
  labelStyle: { fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
});