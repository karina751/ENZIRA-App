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
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('Carteras');
  const [categoriaPersonalizada, setCategoriaPersonalizada] = useState('');
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [fotoPrincipal, setFotoPrincipal] = useState(0); // <--- NUEVO: Índice de la foto portada

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
    if (imagenes.length >= 3) {
        Alert.alert("ENZIRA", "Máximo 3 fotos por producto.");
        return;
    }

    let resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.7,
    });

    if (!resultado.canceled) {
      setImagenes([...imagenes, resultado.assets[0].uri]);
    }
  };

  const eliminarImagenDeLista = (index: number) => {
    const nuevaLista = [...imagenes];
    nuevaLista.splice(index, 1);
    setImagenes(nuevaLista);
    // Si borramos la que era principal, reseteamos a la primera disponible
    if (fotoPrincipal === index) setFotoPrincipal(0);
  };

  // --- 3. LÓGICA DE GUARDADO CON REORDENAMIENTO ---
  const ejecutarGuardado = async () => {
    const categoriaFinal = categoria === 'Accesorios' ? categoriaPersonalizada : categoria;

    if (!nombre || !precio || imagenes.length === 0 || !categoriaFinal) {
      Alert.alert("ENZIRA", "Faltan datos o fotos para publicar.");
      return;
    }

    setCargando(true);

    try {
      // 1. Subida a Cloudinary
      const urlsSubidas = await Promise.all(
        imagenes.map(async (uri) => {
          if (uri.startsWith('http')) return uri;

          const data = new FormData();
          if (Platform.OS === 'web') {
            const res = await fetch(uri);
            data.append('file', await res.blob());
          } else {
            data.append('file', { uri, type: 'image/jpeg', name: 'foto.jpg' } as any);
          }
          data.append('upload_preset', 'ENZIRA-bags');

          const cloudRes = await fetch('https://api.cloudinary.com/v1_1/dlwoie6yt/image/upload', {
            method: 'POST',
            body: data,
          });
          
          const file = await cloudRes.json();
          return file.secure_url.replace('/upload/', '/upload/f_auto,q_auto/');
        })
      );

      // 2. ✨ TRUCO DE ANALISTA: Reordenar el array según la elección de Mariel
      const urlsFinales = [...urlsSubidas];
      const [fotoElegida] = urlsFinales.splice(fotoPrincipal, 1);
      urlsFinales.unshift(fotoElegida); // La elegida ahora es la posición 0 (Portada)

      const payload = { 
        nombre: nombre.trim(), 
        precio: parseFloat(precio) || 0, 
        stock: parseInt(stock) || 0, 
        descripcion: descripcion.trim(),
        categoria: categoriaFinal, 
        imagenes: urlsFinales 
      };

      if (idEdicion) {
        await updateDoc(doc(db, 'productos', idEdicion), payload);
        Alert.alert("ÉXITO", "Tienda actualizada correctamente.");
      } else {
        await addDoc(collection(db, 'productos'), { ...payload, fechaCreacion: new Date().toISOString() });
        Alert.alert("ÉXITO", "Producto publicado con éxito.");
      }
      limpiarYSalir();
    } catch (e) {
      Alert.alert("ERROR", "Hubo un fallo en la subida.");
    } finally {
      setCargando(false);
    }
  };

  const limpiarYSalir = () => {
    setIdEdicion(null); setNombre(''); setPrecio(''); setStock(''); setDescripcion('');
    setCategoria('Carteras'); setCategoriaPersonalizada(''); setImagenes([]);
    setFotoPrincipal(0); setVista('lista'); obtenerProductos();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Surface style={[styles.header, { backgroundColor: theme.background }]} elevation={1}>
        <IconButton icon="arrow-left" iconColor={theme.primary} onPress={() => navigation.goBack()} />
        <Text style={[styles.tituloHeader, { color: theme.primary }]}>GESTIÓN DIRECTIVA</Text>
        <View style={{ width: 48 }} /> 
      </Surface>

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
                left={() => <Image source={{ uri: item.imagenes ? item.imagenes[0] : item.imagen }} style={styles.miniImg} />}
                right={() => (
                  <IconButton icon="pencil-outline" iconColor={theme.primary} onPress={() => {
                    setIdEdicion(item.id); setNombre(item.nombre); setPrecio(item.precio.toString());
                    setStock(item.stock?.toString() || '0'); setDescripcion(item.descripcion || '');
                    setImagenes(item.imagenes || [item.imagen]);
                    setFotoPrincipal(0); // Al editar, la 0 siempre es la portada guardada
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

      {/* VISTA: FORMULARIO */}
      {vista === 'formulario' && (
        <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
          
          <Text style={[styles.labelForm, { color: theme.primary }]}>FOTOS (TOCÁ LA PORTADA ⭐)</Text>
          <View style={styles.multiImageContainer}>
            {imagenes.map((uri, index) => (
              <TouchableOpacity 
                key={index} 
                onPress={() => setFotoPrincipal(index)}
                style={[
                    styles.wrapperImagen, 
                    fotoPrincipal === index && { borderColor: theme.secondary, borderWidth: 2, borderRadius: 5 }
                ]}
              >
                <Image source={{ uri }} style={styles.previewChica} />
                {fotoPrincipal === index && (
                  <Badge size={20} style={[styles.badgeEstrella, { backgroundColor: theme.secondary }]}>⭐</Badge>
                )}
                <IconButton 
                    icon="close-circle" 
                    size={18} 
                    iconColor="red" 
                    style={styles.btnBorrarImg} 
                    onPress={() => eliminarImagenDeLista(index)} 
                />
              </TouchableOpacity>
            ))}
            {imagenes.length < 3 && (
              <TouchableOpacity onPress={seleccionarImagen} style={[styles.btnAgregarImg, { borderColor: theme.primary }]}>
                <IconButton icon="camera-plus" iconColor={theme.primary} />
              </TouchableOpacity>
            )}
          </View>
          
          <TextInput label="Nombre del Artículo" value={nombre} onChangeText={setNombre} mode="outlined" style={styles.input} outlineColor={theme.primary} />
          
          <Text style={[styles.labelForm, { color: theme.primary, marginTop: 10 }]}>CATEGORÍA</Text>
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

          <TextInput 
            label="Detalles y Medidas" 
            value={descripcion} 
            onChangeText={setDescripcion} 
            mode="outlined" 
            multiline 
            numberOfLines={5} 
            style={[styles.input, { height: 120 }]} 
            outlineColor={theme.primary} 
          />
          
          <Button mode="contained" onPress={ejecutarGuardado} loading={cargando} style={styles.btnMain} buttonColor={theme.primary} textColor={theme.onPrimary}>
            {idEdicion ? "ACTUALIZAR ARTÍCULO" : "PUBLICAR EN TIENDA"}
          </Button>
          <Button mode="text" textColor={theme.primary} onPress={limpiarYSalir}>CANCELAR</Button>
        </ScrollView>
      )}

      {/* VISTAS DE CONFIG Y PEDIDOS */}
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
        ✨ ¡Tienda actualizada!
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 15, paddingHorizontal: 10 },
  tituloHeader: { fontSize: 16, fontWeight: 'bold', letterSpacing: 4 },
  formContainer: { padding: 25 },
  multiImageContainer: { flexDirection: 'row', marginBottom: 20, marginTop: 10 },
  wrapperImagen: { position: 'relative', marginRight: 15, padding: 2 },
  previewChica: { width: 80, height: 100, borderRadius: 5 },
  badgeEstrella: { position: 'absolute', top: -10, left: -10 },
  btnBorrarImg: { position: 'absolute', bottom: -15, right: -15 },
  btnAgregarImg: { width: 80, height: 100, borderStyle: 'dashed', borderWidth: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 5 },
  input: { marginBottom: 15, backgroundColor: '#fff' },
  labelForm: { fontWeight: 'bold', fontSize: 10, letterSpacing: 2 },
  btnMain: { paddingVertical: 8, borderRadius: 0, marginTop: 10 },
  cardItem: { backgroundColor: '#fff', marginBottom: 10, marginHorizontal: 5 },
  miniImg: { width: 50, height: 65, marginLeft: 10 },
  orderCard: { marginBottom: 15, backgroundColor: '#fff', borderLeftWidth: 4 }
});