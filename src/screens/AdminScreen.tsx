import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity, Alert, Platform, FlatList, Dimensions } from 'react-native';
import { Text, TextInput, Button, IconButton, Divider, List, SegmentedButtons, Badge, Card, Chip, Surface, Snackbar, Portal } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';

// Herramientas de Firebase y Tema
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAppTheme } from '../context/ThemeContext'; 

const { width } = Dimensions.get('window');

export const AdminScreen = () => {
  const navigation = useNavigation<any>();
  const { theme } = useAppTheme(); 

  // Estados de Control
  const [vista, setVista] = useState('lista'); 
  const [productos, setProductos] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  // Estados del Formulario
  const [idEdicion, setIdEdicion] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState(''); 
  const [categoria, setCategoria] = useState('Carteras');
  const [categoriaPersonalizada, setCategoriaPersonalizada] = useState('');
  const [imagen, setImagen] = useState<string | null>(null);

  // --- 1. LÓGICA DE ESTACIÓN ---
  const [estacionActual, setEstacionActual] = useState('');

  useEffect(() => {
    const unsubTheme = onSnapshot(doc(db, 'configuracion', 'apariencia'), (docSnap) => {
      if (docSnap.exists()) setEstacionActual(docSnap.data().estacionActual);
    });
    obtenerProductos();
    return () => unsubTheme();
  }, []);

  // --- 2. CARGA DE DATOS ---
  const obtenerProductos = async () => {
    setCargando(true);
    try {
      const q = query(collection(db, 'productos'), orderBy('fechaCreacion', 'desc'));
      const querySnapshot = await getDocs(q);
      const listaTemp: any[] = [];
      querySnapshot.forEach((doc) => {
        listaTemp.push({ id: doc.id, ...doc.data() });
      });
      setProductos(listaTemp);
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    const qOrders = query(collection(db, 'pedidos'), orderBy('fecha', 'desc'));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      const listaPedidos: any[] = [];
      snapshot.forEach(doc => listaPedidos.push({ id: doc.id, ...doc.data() }));
      setPedidos(listaPedidos);
    });
    return () => unsubOrders();
  }, []);

  const seleccionarImagen = async () => {
    let resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.7,
    });
    if (!resultado.canceled) {
      setImagen(resultado.assets[0].uri);
    }
  };

  // --- 3. LÓGICA DE GUARDADO Y CLOUDINARY ---
  const ejecutarGuardado = async () => {
    const categoriaFinal = categoria === 'Accesorios' ? categoriaPersonalizada : categoria;

    // Validación con Alerta para saber por qué no avanza
    if (!nombre || !precio || !imagen || !categoriaFinal) {
      Alert.alert("ENZIRA", "Faltan datos obligatorios para publicar.");
      return;
    }

    setCargando(true);

    try {
      let urlFinal = imagen;

      // Si la imagen es local, la subimos a tu Cloudinary
      if (imagen.includes('blob:') || imagen.includes('file:') || imagen.includes('data:')) {
        const data = new FormData();
        if (Platform.OS === 'web') {
          const res = await fetch(imagen);
          data.append('file', await res.blob());
        } else {
          data.append('file', { uri: imagen, type: 'image/jpeg', name: 'foto.jpg' } as any);
        }
        
        // Tus datos reales de Cloudinary
        data.append('upload_preset', 'ENZIRA-bags');

        const cloudRes = await fetch('https://api.cloudinary.com/v1_1/dlwoie6yt/image/upload', {
          method: 'POST',
          body: data,
        });
        
        const file = await cloudRes.json();
        
        // ✨ OPTIMIZACIÓN: f_auto y q_auto para que pesen poco
        urlFinal = file.secure_url.replace('/upload/', '/upload/f_auto,q_auto/');
      }

      const payload = { 
        nombre: nombre.trim(), 
        precio: parseFloat(precio) || 0, 
        stock: parseInt(stock) || 0, 
        categoria: categoriaFinal, 
        imagen: urlFinal 
      };

      if (idEdicion) {
        await updateDoc(doc(db, 'productos', idEdicion), payload);
        Alert.alert("ÉXITO", "Inventario actualizado correctamente.");
      } else {
        await addDoc(collection(db, 'productos'), { ...payload, fechaCreacion: new Date().toISOString() });
        Alert.alert("ÉXITO", "Nuevo artículo publicado.");
      }
      limpiarYSalir();
    } catch (e) {
      Alert.alert("ERROR", "No se pudo guardar en el servidor.");
    } finally {
      setCargando(false);
    }
  };

  const limpiarYSalir = () => {
    setIdEdicion(null); setNombre(''); setPrecio(''); setStock('');
    setCategoria('Carteras'); setCategoriaPersonalizada(''); setImagen(null);
    setVista('lista'); obtenerProductos();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* HEADER DINÁMICO */}
      <Surface style={[styles.header, { backgroundColor: theme.background }]} elevation={1}>
        <IconButton icon="arrow-left" iconColor={theme.primary} onPress={() => navigation.goBack()} />
        <Text style={[styles.tituloHeader, { color: theme.primary }]}>GESTIÓN DIRECTIVA</Text>
        <View style={{ width: 48 }} /> 
      </Surface>

      {/* SELECTOR DE VISTAS */}
      <View style={{ paddingHorizontal: 15, marginVertical: 15 }}>
        <SegmentedButtons
          value={vista}
          onValueChange={setVista}
          buttons={[
            { value: 'lista', label: 'STOCK', icon: 'package-variant' },
            { value: 'formulario', label: idEdicion ? 'EDITAR' : 'NUEVO', icon: 'plus' },
            { value: 'pedidos', label: 'PEDIDOS', icon: 'bell-outline' },
            { value: 'config', label: 'ESTILO', icon: 'palette-outline' }, 
          ]}
          theme={{ colors: { secondaryContainer: theme.primary, onSecondaryContainer: theme.background } }}
        />
      </View>

      {/* VISTA: LISTA DE PRODUCTOS */}
      {vista === 'lista' && (
        <FlatList
          data={productos}
          keyExtractor={(item) => item.id}
          refreshing={cargando}
          onRefresh={obtenerProductos}
          contentContainerStyle={{ padding: 15 }}
          renderItem={({ item }) => (
            <Surface style={styles.cardItem} elevation={1}>
              <List.Item
                title={item.nombre.toUpperCase()}
                description={`${item.categoria} | $${item.precio}`}
                left={() => <Image source={{ uri: item.imagen }} style={styles.miniImg} />}
                right={() => (
                  <IconButton icon="pencil-outline" iconColor={theme.primary} onPress={() => {
                    setIdEdicion(item.id); setNombre(item.nombre); setPrecio(item.precio.toString());
                    setStock(item.stock?.toString() || '0'); setImagen(item.imagen);
                    if(['Carteras', 'Mochilas', 'Billeteras'].includes(item.categoria)) {
                        setCategoria(item.categoria); setCategoriaPersonalizada('');
                    } else {
                        setCategoria('Accesorios'); setCategoriaPersonalizada(item.categoria);
                    }
                    setVista('formulario');
                  }} />
                )}
              />
            </Surface>
          )}
        />
      )}

      {/* VISTA: FORMULARIO (JSX Directo para que el teclado no pierda foco) */}
      {vista === 'formulario' && (
        <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={seleccionarImagen} style={[styles.uploadArea, { borderColor: theme.primary }]}>
            {imagen ? <Image source={{ uri: imagen }} style={styles.imgPreview} /> : <Text style={{ color: theme.primary }}>SUBIR FOTO</Text>}
          </TouchableOpacity>
          
          <TextInput label="Nombre" value={nombre} onChangeText={setNombre} mode="outlined" style={styles.input} outlineColor={theme.primary} />
          
          <Text style={[styles.labelForm, { color: theme.primary }]}>CATEGORÍA</Text>
          <SegmentedButtons
            value={categoria}
            onValueChange={(val) => { setCategoria(val); if (val !== 'Accesorios') setCategoriaPersonalizada(''); }}
            buttons={[{ value: 'Carteras', label: 'Cart' }, { value: 'Mochilas', label: 'Moc' }, { value: 'Billeteras', label: 'Bill' }, { value: 'Accesorios', label: 'Otro' }]}
            style={{ marginBottom: 15 }}
          />

          {categoria === 'Accesorios' && (
              <TextInput label="Nueva categoría" value={categoriaPersonalizada} onChangeText={setCategoriaPersonalizada} mode="outlined" style={styles.input} outlineColor={theme.primary} />
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TextInput label="Precio" value={precio} onChangeText={setPrecio} keyboardType="numeric" mode="outlined" style={[styles.input, { width: '48%' }]} />
            <TextInput label="Stock" value={stock} onChangeText={setStock} keyboardType="numeric" mode="outlined" style={[styles.input, { width: '48%' }]} />
          </View>
          
          <Button mode="contained" onPress={ejecutarGuardado} loading={cargando} style={styles.btnMain} buttonColor={theme.primary} textColor={theme.onPrimary}>
            {idEdicion ? "ACTUALIZAR ARTÍCULO" : "PUBLICAR EN TIENDA"}
          </Button>
          <Button mode="text" textColor={theme.primary} onPress={limpiarYSalir}>CANCELAR</Button>
        </ScrollView>
      )}

      {/* VISTA: ESTILO Y TEMPORADA */}
      {vista === 'config' && (
        <ScrollView contentContainerStyle={styles.formContainer}>
          <Card style={[styles.orderCard, { borderLeftColor: theme.secondary }]}>
            <Card.Title title="ESTÉTICA TEMPORAL" titleStyle={{ color: theme.primary, fontWeight: 'bold' }} />
            <Card.Content>
              <SegmentedButtons
                value={estacionActual}
                onValueChange={async (v) => {
                    await updateDoc(doc(db, 'configuracion', 'apariencia'), { estacionActual: v });
                    setSnackbarVisible(true);
                }}
                buttons={[{ value: 'otoño', label: '🍂' }, { value: 'invierno', label: '❄️' }, { value: 'primavera', label: '🌸' }, { value: 'verano', label: '☀️' }]}
                theme={{ colors: { secondaryContainer: theme.secondary, onSecondaryContainer: theme.primary } }}
              />
            </Card.Content>
          </Card>
        </ScrollView>
      )}

      {/* VISTA: PEDIDOS */}
      {vista === 'pedidos' && (
        <FlatList
          data={pedidos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card style={[styles.orderCard, { borderLeftColor: theme.secondary, margin: 10 }]}>
              <Card.Content>
                <Text style={{ fontWeight: 'bold', color: theme.primary }}>{item.clienteEmail}</Text>
                <Divider style={{ marginVertical: 10 }} />
                {item.items?.map((p: any, i: number) => <Text key={i}>• {p.nombre} (x{p.cantidad})</Text>)}
                <Text style={{ textAlign: 'right', fontWeight: 'bold', fontSize: 18 }}>TOTAL: ${item.total}</Text>
              </Card.Content>
            </Card>
          )}
        />
      )}

      <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={2000} style={{ backgroundColor: theme.primary }}>
        ✨ ¡Estética actualizada para todos los clientes!
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 15, paddingHorizontal: 10 },
  tituloHeader: { fontSize: 16, fontWeight: 'bold', letterSpacing: 4 },
  formContainer: { padding: 25 },
  uploadArea: { width: '100%', height: 300, backgroundColor: '#fff', borderStyle: 'dashed', borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  imgPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  input: { marginBottom: 15, backgroundColor: '#fff' },
  labelForm: { fontWeight: 'bold', fontSize: 11, marginBottom: 8 },
  btnMain: { paddingVertical: 8, borderRadius: 0, marginTop: 10 },
  cardItem: { backgroundColor: '#fff', marginBottom: 10, marginHorizontal: 5 },
  miniImg: { width: 50, height: 65, marginLeft: 10 },
  orderCard: { marginBottom: 15, backgroundColor: '#fff', borderLeftWidth: 4 }
});