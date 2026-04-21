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
  const [categoriaPersonalizada, setCategoriaPersonalizada] = useState(''); // <--- NUEVO
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
    
    // Si la categoría no es de las fijas, marcamos Accesorios y llenamos el personalizado
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
    setIdEdicion(null);
    setNombre('');
    setPrecio('');
    setCuotas('');
    setStock('');
    setCategoria('Carteras');
    setCategoriaPersonalizada('');
    setImagen(null);
    setVista('lista');
    obtenerProductos();
  };

  const ejecutarGuardado = async () => {
    // Definimos la categoría final basándonos en si es "Otros" (Accesorios)
    const categoriaFinal = categoria === 'Accesorios' ? categoriaPersonalizada : categoria;

    if (!nombre || !precio || !imagen || !stock || !categoriaFinal) {
      Alert.alert("ENZIRA", "Por favor, completá todos los campos y definí la categoría.");
      return;
    }
    setCargando(true);

    try {
      let urlFinal = imagen;
      if (imagen.includes('blob:') || imagen.includes('file:') || imagen.includes('data:')) {
        const data = new FormData();
        if (Platform.OS === 'web') {
          const res = await fetch(imagen);
          const blob = await res.blob();
          data.append('file', blob);
        } else {
          data.append('file', { uri: imagen, type: 'image/jpeg', name: 'foto.jpg' } as any);
        }
        data.append('upload_preset', 'ml_default');

        const cloudRes = await fetch('https://api.cloudinary.com/v1_1/dlwoie6yt/image/upload', {
          method: 'POST',
          body: data,
        });
        const file = await cloudRes.json();
        urlFinal = file.secure_url;
      }

      const payload = { 
        nombre, 
        precio: parseFloat(precio), 
        cuotas, 
        stock: parseInt(stock), 
        categoria: categoriaFinal, // <--- GUARDAMOS LA FINAL
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
      Alert.alert("ERROR", "No se pudo sincronizar con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  const marcarEntregado = async (id: string) => {
    await updateDoc(doc(db, 'pedidos', id), { estado: 'Entregado' });
  };

  const borrarPedido = (id: string) => {
    const eliminar = async () => { await deleteDoc(doc(db, 'pedidos', id)); };
    if (Platform.OS === 'web') {
      if (confirm("¿Borrar este registro de pedido?")) eliminar();
    } else {
      Alert.alert("Confirmar", "¿Eliminar pedido?", [{ text: "No" }, { text: "Eliminar", onPress: eliminar, style: 'destructive' }]);
    }
  };

  const confirmarBorrado = (id: string) => {
    const borrar = async () => { 
      await deleteDoc(doc(db, 'productos', id)); 
      obtenerProductos(); 
    };
    if (Platform.OS === 'web') {
      if (confirm("¿Eliminar este producto definitivamente?")) borrar();
    } else {
      Alert.alert("ENZIRA", "¿Eliminar producto?", [{ text: "No" }, { text: "Eliminar", onPress: borrar, style: 'destructive' }]);
    }
  };

  // --- RENDERS ---

  const renderConfiguracion = () => (
    <ScrollView contentContainerStyle={styles.formContainer}>
      <Card style={[styles.orderCard, { borderLeftColor: theme.secondary }]}>
        <Card.Title 
          title="ESTÉTICA DE LA TIENDA" 
          subtitle="Cambiá el color de toda la App según la estación"
          titleStyle={{ color: theme.primary, fontWeight: 'bold' }}
        />
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
            description={`${item.categoria || 'General'} | $${item.precio} | Stock: ${item.stock || 0}`}
            titleStyle={[styles.productoTitulo, { color: theme.primary }]}
            descriptionStyle={[styles.productoSub, { color: theme.secondary }]}
            left={() => (
              <View style={styles.miniImgContainer}>
                <Image source={{ uri: item.imagen }} style={styles.miniImg} />
                {(item.stock <= 3) && (
                  <Badge style={[styles.badgeStock, { backgroundColor: item.stock === 0 ? '#B00020' : theme.secondary, color: theme.primary }]}>
                    {item.stock}
                  </Badge>
                )}
              </View>
            )}
            right={() => (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
            <View style={styles.orderHeader}>
              <Text style={[styles.orderEmail, { color: theme.primary }]}>{item.clienteEmail}</Text>
              <Chip 
                textStyle={{ fontSize: 10, color: theme.background, fontWeight: 'bold' }} 
                style={{ backgroundColor: item.estado === 'Pendiente' ? theme.primary : '#25D366' }}
              >
                {item.estado.toUpperCase()}
              </Chip>
            </View>
            <Text style={styles.orderFecha}>{item.fecha?.toDate ? item.fecha.toDate().toLocaleString() : 'Recién cargado'}</Text>
            <Divider style={{ marginVertical: 10, backgroundColor: theme.secondary, opacity: 0.3 }} />
            {item.items?.map((prod: any, idx: number) => (
              <Text key={idx} style={[styles.orderProdText, { color: theme.text }]}>• {prod.nombre} (x{prod.cantidad})</Text>
            ))}
            <Text style={[styles.orderTotal, { color: theme.primary }]}>TOTAL: ${item.total}</Text>
          </Card.Content>
          <Card.Actions>
            <Button textColor="#B00020" onPress={() => borrarPedido(item.id)}>BORRAR</Button>
            {item.estado === 'Pendiente' && (
              <Button mode="contained" buttonColor={theme.primary} labelStyle={{ fontWeight: 'bold' }} onPress={() => marcarEntregado(item.id)}>
                MARCAR ENTREGADO
              </Button>
            )}
          </Card.Actions>
        </Card>
      )}
      ListEmptyComponent={<Text style={[styles.vacioText, { color: theme.primary }]}>No hay pedidos registrados.</Text>}
    />
  );

  const renderFormulario = () => (
    <ScrollView contentContainerStyle={styles.formContainer}>
      <TouchableOpacity onPress={seleccionarImagen} style={[styles.uploadArea, { borderColor: theme.primary }]}>
        {imagen ? (
          <Image source={{ uri: imagen }} style={styles.imgPreview} />
        ) : (
          <View style={{ alignItems: 'center' }}>
            <IconButton icon="camera-plus-outline" size={40} iconColor={theme.primary} />
            <Text style={[styles.uploadLabel, { color: theme.primary }]}>SUBIR FOTO DEL PRODUCTO</Text>
          </View>
        )}
      </TouchableOpacity>
      
      <TextInput label="Nombre del Artículo" value={nombre} onChangeText={setNombre} mode="outlined" style={styles.input} outlineColor={theme.primary} activeOutlineColor={theme.secondary} />
      
      <Text style={[styles.labelForm, { color: theme.primary }]}>CATEGORÍA</Text>
      <SegmentedButtons
        value={categoria}
        onValueChange={(val) => {
            setCategoria(val);
            if (val !== 'Accesorios') setCategoriaPersonalizada(''); // Limpiamos si no es "Otros"
        }}
        buttons={[
          { value: 'Carteras', label: 'Cart' },
          { value: 'Mochilas', label: 'Moc' },
          { value: 'Billeteras', label: 'Bill' },
          { value: 'Accesorios', label: 'Otro' },
        ]}
        style={{ marginBottom: 10 }}
        theme={{ colors: { secondaryContainer: theme.secondary, onSecondaryContainer: theme.primary } }}
      />

      {/* --- CAMPO CONDICIONAL PARA NUEVA CATEGORÍA --- */}
      {categoria === 'Accesorios' && (
          <TextInput 
            label="Escribí la nueva categoría" 
            value={categoriaPersonalizada} 
            onChangeText={setCategoriaPersonalizada} 
            mode="outlined" 
            style={[styles.input, { marginBottom: 20 }]} 
            outlineColor={theme.primary} 
            activeOutlineColor={theme.secondary}
            placeholder="Ej: Cinturones, Pañuelos..."
          />
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <TextInput label="Precio" value={precio} onChangeText={setPrecio} keyboardType="numeric" mode="outlined" style={[styles.input, { width: '48%' }]} outlineColor={theme.primary} activeOutlineColor={theme.secondary} />
        <TextInput label="Stock" value={stock} onChangeText={setStock} keyboardType="numeric" mode="outlined" style={[styles.input, { width: '48%' }]} outlineColor={theme.primary} activeOutlineColor={theme.secondary} />
      </View>
      
      <TextInput label="Cuotas (ej: 3 sin interés)" value={cuotas} onChangeText={setCuotas} mode="outlined" style={styles.input} outlineColor={theme.primary} activeOutlineColor={theme.secondary} />
      
      <Button 
        mode="contained" 
        onPress={ejecutarGuardado} 
        loading={cargando} 
        disabled={cargando} 
        style={styles.btnMain} 
        buttonColor={theme.primary} 
        textColor={theme.background}
      >
        {idEdicion ? "ACTUALIZAR ARTÍCULO" : "PUBLICAR EN TIENDA"}
      </Button>
      <Button mode="text" textColor={theme.primary} onPress={limpiarYSalir} style={{ marginTop: 10 }}>CANCELAR</Button>
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
          theme={{ colors: { secondaryContainer: theme.primary, onSecondaryContainer: theme.background } }}
        />
      </View>

      {vista === 'lista' && renderInventario()}
      {vista === 'formulario' && renderFormulario()}
      {vista === 'pedidos' && renderPedidos()}
      {vista === 'config' && renderConfiguracion()}

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2000}
        style={{ backgroundColor: theme.primary }}
        action={{ label: 'Cerrar', textColor: theme.background }}
      >
        ✨ ¡Estética de la tienda actualizada!
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 20, 
    paddingBottom: 15, 
    paddingHorizontal: 10,
  },
  tituloHeader: { fontSize: 16, fontWeight: 'bold', letterSpacing: 4 },
  formContainer: { padding: 25 },
  uploadArea: { 
    width: '100%', 
    height: 300, 
    backgroundColor: '#fff', 
    borderStyle: 'dashed', 
    borderWidth: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  uploadLabel: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  imgPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  input: { marginBottom: 15, backgroundColor: '#fff' },
  labelForm: { fontWeight: 'bold', fontSize: 11, marginBottom: 8, letterSpacing: 2 },
  btnMain: { paddingVertical: 8, borderRadius: 0, marginTop: 10 },
  cardItem: { backgroundColor: '#fff', marginBottom: 10, marginHorizontal: 5, borderRadius: 0 },
  productoTitulo: { fontWeight: 'bold', fontSize: 13, letterSpacing: 1 },
  productoSub: { fontSize: 11, fontWeight: 'bold' },
  miniImgContainer: { position: 'relative' },
  miniImg: { width: 50, height: 65, borderRadius: 0 },
  badgeStock: { position: 'absolute', top: -5, right: -5, fontWeight: 'bold' },
  orderCard: { marginBottom: 15, backgroundColor: '#fff', borderRadius: 0, borderLeftWidth: 4 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  orderEmail: { fontSize: 14, fontWeight: 'bold' },
  orderFecha: { fontSize: 10, color: '#888', fontStyle: 'italic' },
  orderProdText: { fontSize: 13, marginBottom: 2 },
  orderTotal: { fontSize: 18, fontWeight: 'bold', textAlign: 'right', marginTop: 10 },
  vacioText: { textAlign: 'center', marginTop: 50, opacity: 0.3, fontStyle: 'italic' }
});