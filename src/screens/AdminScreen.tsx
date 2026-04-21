import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity, Alert, Platform, FlatList, Dimensions } from 'react-native';
import { Text, TextInput, Button, IconButton, Divider, List, SegmentedButtons, Badge, Card, Chip, Surface, Snackbar } from 'react-native-paper';
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
  const [cuotas, setCuotas] = useState('');
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
    return () => unsubTheme();
  }, []);

  const actualizarEstacion = async (nueva: string) => {
    try {
      await updateDoc(doc(db, 'configuracion', 'apariencia'), { estacionActual: nueva });
      setSnackbarVisible(true);
    } catch (e) {
      Alert.alert("Error", "No se pudo cambiar la estación.");
    }
  };

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
    obtenerProductos();
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

  const iniciarEdicion = (item: any) => {
    setIdEdicion(item.id);
    setNombre(item.nombre);
    setPrecio(item.precio.toString());
    setCuotas(item.cuotas || '');
    setStock(item.stock ? item.stock.toString() : '0');
    
    const fijas = ['Carteras', 'Mochilas', 'Billeteras'];
    if (fijas.includes(item.categoria)) {
        setCategoria(item.categoria);
        setCategoriaPersonalizada('');
    } else {
        setCategoria('Accesorios');
        setCategoriaPersonalizada(item.categoria);
    }
    
    setImagen(item.imagen);
    setVista('formulario'); 
  };

  const limpiarYSalir = () => {
    setIdEdicion(null); setNombre(''); setPrecio(''); setCuotas(''); setStock('');
    setCategoria('Carteras'); setCategoriaPersonalizada(''); setImagen(null);
    setVista('lista'); obtenerProductos();
  };

  // --- 🚀 FUNCIÓN DE GUARDADO CON TRUCO CLOUDINARY ---
  const ejecutarGuardado = async () => {
    const categoriaFinal = categoria === 'Accesorios' ? categoriaPersonalizada : categoria;

    if (!nombre || !precio || !imagen || !stock || !categoriaFinal) {
      Alert.alert("ENZIRA", "Por favor, completá todos los campos.");
      return;
    }
    setCargando(true);

    try {
      let urlFinal = imagen;
      
      // Si la imagen es nueva (local), la subimos y OPTIMIZAMOS
      if (imagen.includes('blob:') || imagen.includes('file:') || imagen.includes('data:')) {
        const data = new FormData();
        if (Platform.OS === 'web') {
          const res = await fetch(imagen);
          data.append('file', await res.blob());
        } else {
          data.append('file', { uri: imagen, type: 'image/jpeg', name: 'foto.jpg' } as any);
        }
        
        // Datos de tu Cloudinary
        data.append('upload_preset', 'ENZIRA-bags');

        const cloudRes = await fetch('https://api.cloudinary.com/v1_1/dlwoie6yt/image/upload', {
          method: 'POST',
          body: data,
        });
        
        const file = await cloudRes.json();
        
        // ✨ EL TRUCO: Reemplazamos la URL para activar f_auto (formato) y q_auto (calidad)
        urlFinal = file.secure_url.replace('/upload/', '/upload/f_auto,q_auto/');
      }

      const payload = { 
        nombre, 
        precio: parseFloat(precio), 
        cuotas, 
        stock: parseInt(stock), 
        categoria: categoriaFinal, 
        imagen: urlFinal 
      };

      if (idEdicion) {
        await updateDoc(doc(db, 'productos', idEdicion), payload);
        Alert.alert("ÉXITO", "Inventario actualizado.");
      } else {
        await addDoc(collection(db, 'productos'), { ...payload, fechaCreacion: new Date().toISOString() });
        Alert.alert("ÉXITO", "Producto publicado.");
      }
      limpiarYSalir();
    } catch (e) {
      Alert.alert("ERROR", "Fallo la sincronización.");
    } finally {
      setCargando(false);
    }
  };

  // --- RENDERS ---

  const renderConfiguracion = () => (
    <ScrollView contentContainerStyle={styles.formContainer}>
      <Card style={[styles.orderCard, { borderLeftColor: theme.secondary }]}>
        <Card.Title title="ESTÉTICA DE LA TIENDA" titleStyle={{ color: theme.primary, fontWeight: 'bold' }} />
        <Card.Content>
          <Text style={[styles.labelForm, { color: theme.primary, marginBottom: 20 }]}>ESTACIÓN ACTIVA</Text>
          <SegmentedButtons
            value={estacionActual}
            onValueChange={actualizarEstacion}
            buttons={[
              { value: 'otoño', label: 'OTOÑO', icon: 'leaf' },
              { value: 'invierno', label: 'INV', icon: 'snowflake' },
              { value: 'primavera', label: 'PRIM', icon: 'flower' },
              { value: 'verano', label: 'VER', icon: 'sun-side-with-face' },
            ]}
            theme={{ colors: { secondaryContainer: theme.secondary, onSecondaryContainer: theme.primary } }}
          />
        </Card.Content>
      </Card>
    </ScrollView>
  );

  const renderInventario = () => (
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
            description={`${item.categoria || 'General'} | $${item.precio}`}
            left={() => <Image source={{ uri: item.imagen }} style={styles.miniImg} />}
            right={() => (
              <View style={{ flexDirection: 'row' }}>
                <IconButton icon="pencil-outline" iconColor={theme.primary} onPress={() => iniciarEdicion(item)} />
                <IconButton icon="trash-can-outline" iconColor="#B00020" onPress={() => confirmarBorrado(item.id)} />
              </View>
            )}
          />
        </Surface>
      )}
    />
  );

  const renderPedidos = () => (
    <FlatList
      data={pedidos}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 15 }}
      renderItem={({ item }) => (
        <Card style={[styles.orderCard, { borderLeftColor: theme.secondary }]}>
          <Card.Content>
            <Text style={{ color: theme.primary, fontWeight: 'bold' }}>{item.clienteEmail}</Text>
            <Text style={{ fontSize: 10 }}>{item.fecha?.toDate ? item.fecha.toDate().toLocaleString() : 'Recién cargado'}</Text>
            <Divider style={{ marginVertical: 10 }} />
            {item.items?.map((prod: any, idx: number) => (
              <Text key={idx} style={{ fontSize: 13 }}>• {prod.nombre} (x{prod.cantidad})</Text>
            ))}
            <Text style={{ fontWeight: 'bold', textAlign: 'right', fontSize: 18 }}>TOTAL: ${item.total}</Text>
          </Card.Content>
          <Card.Actions>
            <Button textColor="#B00020" onPress={() => borrarPedido(item.id)}>BORRAR</Button>
            {item.estado === 'Pendiente' && <Button mode="contained" buttonColor={theme.primary} onPress={() => marcarEntregado(item.id)}>ENTREGAR</Button>}
          </Card.Actions>
        </Card>
      )}
    />
  );

  const renderFormulario = () => (
    <ScrollView contentContainerStyle={styles.formContainer}>
      <TouchableOpacity onPress={seleccionarImagen} style={[styles.uploadArea, { borderColor: theme.primary }]}>
        {imagen ? <Image source={{ uri: imagen }} style={styles.imgPreview} /> : <Text style={{ color: theme.primary }}>SUBIR FOTO</Text>}
      </TouchableOpacity>
      
      <TextInput label="Nombre" value={nombre} onChangeText={setNombre} mode="outlined" style={styles.input} outlineColor={theme.primary} />
      
      <Text style={[styles.labelForm, { color: theme.primary }]}>CATEGORÍA</Text>
      <SegmentedButtons
        value={categoria}
        onValueChange={(val) => { setCategoria(val); if (val !== 'Accesorios') setCategoriaPersonalizada(''); }}
        buttons={[{ value: 'Carteras', label: 'Cart' }, { value: 'Mochilas', label: 'Moc' }, { value: 'Billeteras', label: 'Bill' }, { value: 'Accesorios', label: 'Otro' }]}
        style={{ marginBottom: 10 }}
      />

      {categoria === 'Accesorios' && (
          <TextInput label="Nueva categoría" value={categoriaPersonalizada} onChangeText={setCategoriaPersonalizada} mode="outlined" style={styles.input} />
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <TextInput label="Precio" value={precio} onChangeText={setPrecio} keyboardType="numeric" mode="outlined" style={[styles.input, { width: '48%' }]} />
        <TextInput label="Stock" value={stock} onChangeText={setStock} keyboardType="numeric" mode="outlined" style={[styles.input, { width: '48%' }]} />
      </View>
      
      <Button mode="contained" onPress={ejecutarGuardado} loading={cargando} style={styles.btnMain} buttonColor={theme.primary} textColor={theme.background}>
        {idEdicion ? "ACTUALIZAR" : "PUBLICAR"}
      </Button>
      <Button mode="text" textColor={theme.primary} onPress={limpiarYSalir}>CANCELAR</Button>
    </ScrollView>
  );

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
        />
      </View>

      {vista === 'lista' && renderInventario()}
      {vista === 'formulario' && renderFormulario()}
      {vista === 'pedidos' && renderPedidos()}
      {vista === 'config' && renderConfiguracion()}

      <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={2000} style={{ backgroundColor: theme.primary }}>
        ✨ ¡Estética actualizada!
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 40, paddingBottom: 15, paddingHorizontal: 10 },
  tituloHeader: { fontSize: 16, fontWeight: 'bold', letterSpacing: 4 },
  formContainer: { padding: 25 },
  uploadArea: { width: '100%', height: 300, borderStyle: 'dashed', borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  imgPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  input: { marginBottom: 15, backgroundColor: '#fff' },
  labelForm: { fontWeight: 'bold', fontSize: 11, marginBottom: 8 },
  btnMain: { paddingVertical: 8, borderRadius: 0, marginTop: 10 },
  cardItem: { backgroundColor: '#fff', marginBottom: 10, marginHorizontal: 5 },
  miniImg: { width: 50, height: 65, marginLeft: 10 },
  orderCard: { marginBottom: 15, backgroundColor: '#fff', borderLeftWidth: 4 }
});