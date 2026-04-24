import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { 
  createDrawerNavigator, 
  DrawerContentScrollView, 
  DrawerItem,
  DrawerContentComponentProps 
} from '@react-navigation/drawer';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text, Divider } from 'react-native-paper';

// Firebase
import { auth, db } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, onSnapshot, query } from 'firebase/firestore';

// Pantallas
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { AdminScreen } from '../screens/AdminScreen';
import { ProductDetailScreen } from '../screens/ProductDetailScreen';
import { CartScreen } from '../screens/CartScreen'; 

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// --- ✨ COMPONENTE DE MENÚ DINÁMICO ✨ ---
const CustomDrawerContent = (props: DrawerContentComponentProps) => {
  const [categorias, setCategorias] = useState<string[]>(['Todas']);

  useEffect(() => {
    // Escuchamos la colección de productos en tiempo real
    const q = query(collection(db, 'productos'));
    const unsub = onSnapshot(q, (snapshot) => {
      const catsSet = new Set<string>();
      catsSet.add('Todas'); // La opción base siempre presente

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.categoria) {
          // Agregamos la categoría al Set (evita duplicados automáticamente)
          catsSet.add(data.categoria);
        }
      });

      // Convertimos el Set a Array y lo ordenamos (para que no salten de lugar)
      const listaFinal = Array.from(catsSet).sort((a, b) => {
        if (a === 'Todas') return -1; // "Todas" siempre primero
        if (b === 'Todas') return 1;
        return a.localeCompare(b);
      });

      setCategorias(listaFinal);
    });

    return () => unsub();
  }, []);

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
            props.navigation.navigate('Main', {
              screen: 'Home',
              params: { categoriaSeleccionada: cat, lastUpdate: Date.now() }
            });
            props.navigation.closeDrawer();
          }}
          activeTintColor="#CFAF68"
          inactiveTintColor="#002147"
        />
      ))}
    </DrawerContentScrollView>
  );
};

// --- EL STACK CON SEGURIDAD ---
const MainStack = () => {
  const [usuario, setUsuario] = useState<any>(null);
  const [rol, setRol] = useState<string | null>(null);
  const [inicializando, setInicializando] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setUsuario(user);
      if (user) {
        const docRef = doc(db, 'usuarios', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setRol(docSnap.data().rol);
        }
      } else {
        setRol(null);
      }
      setInicializando(false);
    });
    return unsub;
  }, []);

  if (inicializando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#FFFAED' }}>
        <ActivityIndicator color="#002147" size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
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

      {rol === 'admin' && (
        <Stack.Screen 
          name="Admin" 
          component={AdminScreen} 
          options={{ headerShown: false }} 
        />
      )}
    </Stack.Navigator>
  );
};

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
  drawerHeader: { padding: 30, alignItems: 'center' },
  drawerTitulo: { fontSize: 28, fontWeight: 'bold', color: '#002147', letterSpacing: 5 },
  drawerSub: { fontSize: 10, color: '#CFAF68', letterSpacing: 2, fontWeight: 'bold', marginTop: 5 },
  divider: { marginVertical: 10, backgroundColor: '#CFAF68', opacity: 0.2, height: 1, width: '80%', alignSelf: 'center' },
  seccionLabel: { paddingLeft: 20, fontSize: 12, color: '#002147', opacity: 0.5, marginVertical: 15, fontWeight: 'bold' },
  labelStyle: { fontWeight: 'bold', fontSize: 14 },
});