import React, { useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  Image, 
  TouchableOpacity, 
  Linking, 
  Alert, 
  Platform, 
  useWindowDimensions,
  Dimensions 
} from 'react-native';
import { Text, IconButton, TextInput, Divider, Badge } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native'; 

// Firebase y Carrito
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useCart } from '../context/CartContext';

export const HomeScreen = () => {
  const navigation = useNavigation<any>(); 
  const route = useRoute<any>();
  const { totalItems } = useCart();
  const { width } = useWindowDimensions();

  // Estados
  const [productos, setProductos] = useState<any[]>([]);
  const [productosFiltrados, setProductosFiltrados] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [catSeleccionada, setCatSeleccionada] = useState('Todas');
  const [cargando, setCargando] = useState(true);
  const [mostrarBuscador, setMostrarBuscador] = useState(false);
  const [usuario, setUsuario] = useState<any>(null);
  const [rol, setRol] = useState<string | null>(null);

  const esMobile = width < 700;
  const numColumnas = esMobile ? 2 : 4;

  useEffect(() => {
    if (route.params?.categoriaSeleccionada) {
      setCatSeleccionada(route.params.categoriaSeleccionada);
    }
  }, [route.params?.categoriaSeleccionada, route.params?.lastUpdate]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setUsuario(user);
      if (user) {
        const docRef = doc(db, 'usuarios', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setRol(docSnap.data().rol);
      } else { 
        setRol(null); 
      }
    });
    return unsub; 
  }, []);

  const obtenerProductos = async () => {
    try {
      const q = query(collection(db, 'productos'), orderBy('fechaCreacion', 'desc'));
      const querySnapshot = await getDocs(q);
      const listaTemp: any[] = [];
      querySnapshot.forEach((doc) => {
        listaTemp.push({ id: doc.id, ...doc.data() });
      });
      setProductos(listaTemp);
    } catch (error) { console.log(error); } finally { setCargando(false); }
  };

  useEffect(() => { obtenerProductos(); }, []);

  useEffect(() => {
    let filtrados = productos;
    if (catSeleccionada !== 'Todas') {
      filtrados = filtrados.filter(p => p.categoria === catSeleccionada);
    }
    if (searchQuery) {
      filtrados = filtrados.filter(p => p.nombre.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    setProductosFiltrados(filtrados);
  }, [searchQuery, catSeleccionada, productos]);

  const manejarAccesoCliente = () => {
    if (!usuario) { navigation.navigate('Login'); return; }
    const mensaje = `Sesión: ${usuario.email}\n¿Deseas cerrar sesión?`;
    if (Platform.OS === 'web') {
        if(confirm(mensaje)) signOut(auth);
    } else {
        Alert.alert("MI CUENTA", mensaje, [{ text: "Salir", onPress: () => signOut(auth), style: 'destructive' }, { text: "Cerrar", style: 'cancel' }]);
    }
  };

  const manejarAccesoAdmin = () => {
    if (usuario && rol === 'admin') { navigation.navigate('Admin'); }
    else { navigation.navigate('Login'); }
  };

  const HeaderApp = () => (
    <View style={styles.headerContainer}>
      <View style={styles.logoRow}>
        <Text style={styles.logoText}>ENZIRA</Text>
        
        {/* FIX: Lógica de saludo exclusivo para Mariel */}
        <Text style={styles.sloganText}>
          {usuario && rol === 'admin' 
            ? '✨ BIENVENIDA MARIEL - GESTIÓN DIRECTIVA ✨' 
            : catSeleccionada === 'Todas' 
              ? '✨ LLEVA TU MUNDO CON VOS ✨' 
              : `COLECCIÓN ${catSeleccionada.toUpperCase()}`
          }
        </Text>
      </View>

      <View style={styles.actionRow}>
        <View style={styles.leftActions}>
          <IconButton icon="menu" iconColor="#002147" onPress={() => navigation.openDrawer()} />
          <IconButton icon="magnify" iconColor="#002147" onPress={() => setMostrarBuscador(!mostrarBuscador)} />
        </View>

        {mostrarBuscador && (
          <TextInput
            placeholder="Buscar..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            mode="flat"
            style={styles.inputBusqueda}
            autoFocus
            activeUnderlineColor="#CFAF68"
          />
        )}

        <View style={styles.rightActions}>
          <View>
            <IconButton icon="cart" iconColor="#002147" onPress={() => navigation.navigate('Cart')} />
            {totalItems > 0 ? <Badge style={styles.badgeEstilo} size={14}>{totalItems}</Badge> : null}
          </View>
          
          {/* FIX: El maletín solo aparece si es Admin para evitar confusiones al cliente */}
          {rol === 'admin' && (
            <IconButton icon="briefcase" iconColor="#CFAF68" onPress={manejarAccesoAdmin} />
          )}
          
          <IconButton 
            icon={usuario ? "account-check" : "account-outline"} 
            iconColor={usuario ? "#CFAF68" : "#002147"} 
            onPress={manejarAccesoCliente} 
          />
        </View>
      </View>
      <Divider style={{ backgroundColor: '#CFAF68', opacity: 0.1 }} />
    </View>
  );

  const FooterApp = () => (
    <View style={styles.footerContainer}>
      <Divider style={styles.dividerFooter} />
      <Text style={styles.footerTitulo}>ENZIRA - ALTA COSTURA</Text>
      <View style={styles.socialIcons}>
        <IconButton icon="instagram" iconColor="#002147" onPress={() => Linking.openURL('https://www.instagram.com/enzira.bags')} />
        <IconButton icon="whatsapp" iconColor="#25D366" onPress={() => Linking.openURL('https://wa.me/5493875222620')} />
      </View>
      <Text style={styles.copyright}>© 2026 ENZIRA</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.contentMaxWidth, { maxWidth: width > 1200 ? 1200 : '100%' }]}>
        {cargando ? (
          <ActivityIndicator size="large" color="#002147" style={{ flex: 1, marginTop: 50 }} />
        ) : (
          <FlatList 
            ListHeaderComponent={HeaderApp} 
            data={productosFiltrados} 
            keyExtractor={(item) => item.id} 
            numColumns={numColumnas} 
            key={`grid-${numColumnas}`} 
            columnWrapperStyle={styles.filaGrilla} 
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.tarjeta, { width: esMobile ? '48%' : '23%' }]} 
                onPress={() => navigation.navigate('ProductDetail', { producto: item })}
              >
                <View style={styles.contenedorImagen}>
                  <Image 
                    source={{ uri: item.imagen }} 
                    style={styles.imagenTarjeta} 
                    resizeMode="cover" 
                  />
                </View>
                <View style={styles.contenidoTarjeta}>
                  <Text style={styles.nombreProducto} numberOfLines={1}>{item.nombre.toUpperCase()}</Text>
                  <Text style={styles.precio}>${item.precio}</Text>
                </View>
              </TouchableOpacity>
            )}
            ListFooterComponent={FooterApp}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<Text style={styles.vacio}>No hay productos disponibles.</Text>}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFAED' },
  contentMaxWidth: { flex: 1, alignSelf: 'center', width: '100%' },
  headerContainer: { backgroundColor: '#FFFAED', paddingTop: 20 },
  logoRow: { alignItems: 'center', marginBottom: 15 },
  logoText: { fontSize: Platform.OS === 'web' ? 52 : 42, fontWeight: 'bold', color: '#002147', letterSpacing: 8 },
  sloganText: { fontSize: 10, color: '#CFAF68', letterSpacing: 3, fontWeight: 'bold', marginTop: 5 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, height: 60 },
  leftActions: { flexDirection: 'row' },
  rightActions: { flexDirection: 'row' },
  inputBusqueda: { flex: 1, height: 40, backgroundColor: 'transparent', fontSize: 13, marginHorizontal: 10 },
  filaGrilla: { justifyContent: 'flex-start', paddingHorizontal: 10, marginTop: 15 }, 
  tarjeta: { marginHorizontal: '1%', marginBottom: 25, backgroundColor: '#fff', overflow: 'hidden' },
  contenedorImagen: { width: '100%', height: 250, backgroundColor: '#f9f9f9' },
  imagenTarjeta: { width: '100%', height: '100%' },
  contenidoTarjeta: { padding: 10, alignItems: 'center' },
  nombreProducto: { color: '#002147', fontSize: 11, fontWeight: 'bold' },
  precio: { color: '#002147', fontSize: 13, marginTop: 4 },
  badgeEstilo: { position: 'absolute', top: 5, right: 5, backgroundColor: '#CFAF68', color: '#002147' },
  footerContainer: { padding: 40, alignItems: 'center', backgroundColor: '#FFFAED' },
  dividerFooter: { width: '40%', marginBottom: 15, backgroundColor: '#CFAF68', opacity: 0.3 },
  footerTitulo: { color: '#002147', fontWeight: 'bold', letterSpacing: 1, fontSize: 10 },
  socialIcons: { flexDirection: 'row', marginVertical: 10 },
  copyright: { fontSize: 8, color: '#002147', opacity: 0.3 },
  vacio: { textAlign: 'center', marginTop: 50, color: '#002147', opacity: 0.5 }
});