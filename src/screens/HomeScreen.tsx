import React, { useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  Image, 
  TouchableOpacity, 
  Linking, 
  Platform, 
  useWindowDimensions 
} from 'react-native';
import { Text, IconButton, TextInput, Divider, Badge, Portal, Dialog, Button } from 'react-native-paper'; // <--- AGREGAMOS PORTAL Y DIALOG
import { useNavigation, useRoute } from '@react-navigation/native'; 

// Firebase, Carrito y Tema
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useCart } from '../context/CartContext';
import { useAppTheme } from '../context/ThemeContext';

export const HomeScreen = () => {
  const { theme } = useAppTheme(); 
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
  
  // NUEVO: Estado para controlar el diálogo de cerrar sesión
  const [mostrarDialog, setMostrarDialog] = useState(false);

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
      } else { setRol(null); }
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

  // CORREGIDO: Lógica de acceso con Diálogo Pro
  const manejarAccesoCliente = () => {
    if (!usuario) { 
      navigation.navigate('Login'); 
    } else {
      setMostrarDialog(true); // Abrimos el diálogo en lugar de usar confirm/alert
    }
  };

  const manejarAccesoAdmin = () => {
    if (usuario && rol === 'admin') { navigation.navigate('Admin'); }
    else { navigation.navigate('Login'); }
  };

  const HeaderApp = () => (
    <View style={[styles.headerContainer, { backgroundColor: theme.background }]}>
      <View style={styles.logoRow}>
        <Text style={[styles.logoText, { color: theme.primary }]}>ENZIRA</Text>
        <Text style={[styles.sloganText, { color: theme.secondary }]}>
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
          <IconButton icon="menu" iconColor={theme.primary} onPress={() => navigation.openDrawer()} />
          <IconButton icon="magnify" iconColor={theme.primary} onPress={() => setMostrarBuscador(!mostrarBuscador)} />
        </View>

        {mostrarBuscador && (
          <TextInput
            placeholder="Buscar..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            mode="flat"
            style={[styles.inputBusqueda, { color: theme.text }]}
            autoFocus
            activeUnderlineColor={theme.secondary}
          />
        )}

        <View style={styles.rightActions}>
          <View>
            <IconButton icon="cart" iconColor={theme.primary} onPress={() => navigation.navigate('Cart')} />
            {totalItems > 0 ? (
              <Badge style={[styles.badgeEstilo, { backgroundColor: theme.secondary, color: theme.primary }]} size={14}>
                {totalItems}
              </Badge>
            ) : null}
          </View>
          
          {rol === 'admin' && (
            <IconButton icon="briefcase" iconColor={theme.secondary} onPress={manejarAccesoAdmin} />
          )}
          
          <IconButton 
            icon={usuario ? "account-check" : "account-outline"} 
            iconColor={usuario ? theme.secondary : theme.primary} 
            onPress={manejarAccesoCliente} 
          />
        </View>
      </View>
      <Divider style={{ backgroundColor: theme.secondary, opacity: 0.2 }} />
    </View>
  );

  const FooterApp = () => (
    <View style={[styles.footerContainer, { backgroundColor: theme.background }]}>
      <Divider style={[styles.dividerFooter, { backgroundColor: theme.secondary }]} />
      <Text style={[styles.footerTitulo, { color: theme.primary }]}>ENZIRA - ALTA COSTURA</Text>
      <View style={styles.socialIcons}>
        <IconButton icon="instagram" iconColor={theme.primary} onPress={() => Linking.openURL('https://www.instagram.com/enzira.bags')} />
        <IconButton icon="whatsapp" iconColor="#25D366" onPress={() => Linking.openURL('https://wa.me/5493875222620')} />
      </View>
      <Text style={[styles.copyright, { color: theme.primary }]}>© 2026 ENZIRA</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.contentMaxWidth, { maxWidth: width > 1200 ? 1200 : '100%' }]}>
        {cargando ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ flex: 1, marginTop: 50 }} />
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
                style={[styles.tarjeta, { width: esMobile ? '48%' : '23%', backgroundColor: theme.background }]} 
                onPress={() => navigation.navigate('ProductDetail', { producto: item })}
              >
                <View style={styles.contenedorImagen}>
                  <Image source={{ uri: item.imagen }} style={styles.imagenTarjeta} resizeMode="cover" />
                </View>
                <View style={styles.contenidoTarjeta}>
                  <Text style={[styles.nombreProducto, { color: theme.text }]} numberOfLines={1}>
                    {item.nombre.toUpperCase()}
                  </Text>
                  <Text style={[styles.precio, { color: theme.text }]}>${item.precio}</Text>
                </View>
              </TouchableOpacity>
            )}
            ListFooterComponent={FooterApp}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<Text style={[styles.vacio, { color: theme.text }]}>No hay productos disponibles.</Text>}
          />
        )}
      </View>

      {/* --- DIÁLOGO DE CIERRE DE SESIÓN (MODAL PRO) --- */}
      <Portal>
        <Dialog 
          visible={mostrarDialog} 
          onDismiss={() => setMostrarDialog(false)}
          style={{ backgroundColor: theme.background, borderRadius: 0 }}
        >
          <Dialog.Title style={{ color: theme.primary, letterSpacing: 2, fontSize: 18 }}>
            MI CUENTA
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: theme.text, fontSize: 14 }}>
              Sesión activa: <Text style={{ fontWeight: 'bold' }}>{usuario?.email}</Text>
              {'\n\n'}¿Deseas cerrar tu sesión actual en ENZIRA?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setMostrarDialog(false)} textColor={theme.primary}>
              CANCELAR
            </Button>
            <Button 
              onPress={() => {
                setMostrarDialog(false);
                signOut(auth);
              }} 
              mode="contained"
              buttonColor={theme.primary}
              textColor={theme.onPrimary}
              style={{ borderRadius: 0 }}
            >
              CERRAR SESIÓN
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentMaxWidth: { flex: 1, alignSelf: 'center', width: '100%' },
  headerContainer: { paddingTop: 20 },
  logoRow: { alignItems: 'center', marginBottom: 15 },
  logoText: { fontSize: Platform.OS === 'web' ? 52 : 42, fontWeight: 'bold', letterSpacing: 8 },
  sloganText: { fontSize: 10, letterSpacing: 3, fontWeight: 'bold', marginTop: 5 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, height: 60 },
  leftActions: { flexDirection: 'row' },
  rightActions: { flexDirection: 'row' },
  inputBusqueda: { flex: 1, height: 40, backgroundColor: 'transparent', fontSize: 13, marginHorizontal: 10 },
  filaGrilla: { justifyContent: 'flex-start', paddingHorizontal: 10, marginTop: 15 }, 
  tarjeta: { marginHorizontal: '1%', marginBottom: 25, overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  contenedorImagen: { width: '100%', height: 250, backgroundColor: 'rgba(0,0,0,0.02)' },
  imagenTarjeta: { width: '100%', height: '100%' },
  contenidoTarjeta: { padding: 10, alignItems: 'center' },
  nombreProducto: { fontSize: 11, fontWeight: 'bold' },
  precio: { fontSize: 13, marginTop: 4 },
  badgeEstilo: { position: 'absolute', top: 5, right: 5 },
  footerContainer: { padding: 40, alignItems: 'center' },
  dividerFooter: { width: '40%', marginBottom: 15, opacity: 0.3 },
  footerTitulo: { fontWeight: 'bold', letterSpacing: 1, fontSize: 10 },
  socialIcons: { flexDirection: 'row', marginVertical: 10 },
  copyright: { fontSize: 8, opacity: 0.3 },
  vacio: { textAlign: 'center', marginTop: 50, opacity: 0.5 }
});