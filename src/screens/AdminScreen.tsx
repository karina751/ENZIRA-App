import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity, Alert, Platform, FlatList } from 'react-native';
import { Text, TextInput, Button, IconButton, Divider, List, SegmentedButtons, Badge, Card, Chip } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';

// Herramientas de Firebase
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

export const AdminScreen = () => {
  const navigation = useNavigation<any>();

  // Estados de Control
  const [vista, setVista] = useState('lista'); 
  const [productos, setProductos] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  // Estados del Formulario
  const [idEdicion, setIdEdicion] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [cuotas, setCuotas] = useState('');
  const [stock, setStock] = useState(''); 
  const [categoria, setCategoria] = useState('Carteras'); // NUEVO: Estado para categoría
  const [imagen, setImagen] = useState<string | null>(null);

  // --- 1. CARGA DE PRODUCTOS ---
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
      alert("Error al sincronizar inventario.");
    } finally {
      setCargando(false);
    }
  };

  // --- 2. ESCUCHA DE PEDIDOS EN TIEMPO REAL ---
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
    setCategoria(item.categoria || 'Carteras'); // Cargamos la categoría al editar
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
    setImagen(null);
    setVista('lista');
    obtenerProductos();
  };

  const ejecutarGuardado = async () => {
    if (!nombre || !precio || !imagen || !stock || !categoria) {
      alert("Por favor, completa todos los campos.");
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

      // Payload actualizado con CATEGORÍA
      const payload = { 
        nombre, 
        precio: parseFloat(precio), 
        cuotas, 
        stock: parseInt(stock), 
        categoria, 
        imagen: urlFinal 
      };

      if (idEdicion) {
        await updateDoc(doc(db, 'productos', idEdicion), payload);
        alert("¡Inventario actualizado!");
      } else {
        await addDoc(collection(db, 'productos'), { ...payload, fechaCreacion: new Date().toISOString() });
        alert("¡Nuevo artículo cargado!");
      }
      limpiarYSalir();
    } catch (e) {
      alert("Error en el servidor");
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
      if (confirm("¿Borrar este registro?")) eliminar();
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
      if (confirm("¿Eliminar este producto?")) borrar();
    } else {
      Alert.alert("ENZIRA", "¿Eliminar producto?", [{ text: "No" }, { text: "Eliminar", onPress: borrar, style: 'destructive' }]);
    }
  };

  // --- VISTAS ---

  const renderInventario = () => (
    <FlatList
      data={productos}
      keyExtractor={(item) => item.id}
      refreshing={cargando}
      onRefresh={obtenerProductos}
      contentContainerStyle={{ padding: 20 }}
      renderItem={({ item }) => (
        <List.Item
          title={item.nombre.toUpperCase()}
          description={`${item.categoria || 'Sin Cat.'} | $${item.precio} | Stock: ${item.stock || 0}`}
          titleStyle={{ color: '#002147', fontWeight: '600', fontSize: 13 }}
          left={() => (
            <View>
              <Image source={{ uri: item.imagen }} style={styles.miniImg} />
              {(item.stock <= 3) && (
                <Badge style={{ backgroundColor: item.stock === 0 ? 'red' : 'orange', position: 'absolute', top: -5, right: -5 }}>
                  {item.stock === 0 ? '!' : item.stock}
                </Badge>
              )}
            </View>
          )}
          right={() => (
            <View style={{ flexDirection: 'row' }}>
              <IconButton icon="pencil-outline" iconColor="#002147" onPress={() => iniciarEdicion(item)} />
              <IconButton icon="trash-can-outline" iconColor="#B00020" onPress={() => confirmarBorrado(item.id)} />
            </View>
          )}
          style={styles.cardItem}
        />
      )}
    />
  );

  const renderPedidos = () => (
    <FlatList
      data={pedidos}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 15 }}
      renderItem={({ item }) => (
        <Card style={styles.orderCard}>
          <Card.Content>
            <View style={styles.orderHeader}>
              <Text style={styles.orderEmail}>{item.clienteEmail}</Text>
              <Chip textStyle={{ fontSize: 10, color: '#fff' }} style={{ backgroundColor: item.estado === 'Pendiente' ? '#CFAF68' : '#25D366' }}>{item.estado}</Chip>
            </View>
            <Text style={styles.orderFecha}>{item.fecha?.toDate ? item.fecha.toDate().toLocaleString() : '...'}</Text>
            <Divider style={{ marginVertical: 10 }} />
            {item.items.map((prod: any, idx: number) => (
              <Text key={idx} style={styles.orderProdText}>• {prod.nombre} (x{prod.cantidad})</Text>
            ))}
            <Text style={styles.orderTotal}>Total: ${item.total}</Text>
          </Card.Content>
          <Card.Actions>
            <Button textColor="#B00020" onPress={() => borrarPedido(item.id)}>BORRAR</Button>
            {item.estado === 'Pendiente' && <Button mode="contained" buttonColor="#002147" onPress={() => marcarEntregado(item.id)}>ENTREGADO</Button>}
          </Card.Actions>
        </Card>
      )}
      ListEmptyComponent={<Text style={styles.vacioText}>No hay pedidos registrados.</Text>}
    />
  );

  const renderFormulario = () => (
    <ScrollView contentContainerStyle={styles.formContainer}>
      <TouchableOpacity onPress={seleccionarImagen} style={styles.uploadArea}>
        {imagen ? <Image source={{ uri: imagen }} style={styles.imgPreview} /> : <View style={{ alignItems: 'center' }}><IconButton icon="image-plus" size={40} iconColor="#002147" /><Text style={{ color: '#002147', fontSize: 12 }}>FOTO PRODUCTO</Text></View>}
      </TouchableOpacity>
      
      <TextInput label="Nombre del Artículo" value={nombre} onChangeText={setNombre} mode="outlined" style={styles.input} outlineColor="#002147" activeOutlineColor="#CFAF68" />
      
      {/* NUEVO: SELECTOR DE CATEGORÍA */}
      <Text style={styles.labelForm}>CATEGORÍA</Text>
      <SegmentedButtons
        value={categoria}
        onValueChange={setCategoria}
        buttons={[
          { value: 'Carteras', label: 'Carteras' },
          { value: 'Mochilas', label: 'Mochilas' },
          { value: 'Billeteras', label: 'Billeteras' },
          { value: 'Accesorios', label: 'Otros' },
        ]}
        style={{ marginBottom: 20 }}
        theme={{ colors: { secondaryContainer: '#CFAF68', onSecondaryContainer: '#002147' } }}
      />

      <TextInput label="Precio" value={precio} onChangeText={setPrecio} keyboardType="numeric" mode="outlined" style={styles.input} outlineColor="#002147" activeOutlineColor="#CFAF68" />
      <TextInput label="Stock" value={stock} onChangeText={setStock} keyboardType="numeric" mode="outlined" style={styles.input} outlineColor="#002147" activeOutlineColor="#CFAF68" />
      <TextInput label="Cuotas (ej: 3 s/interés)" value={cuotas} onChangeText={setCuotas} mode="outlined" style={styles.input} outlineColor="#002147" activeOutlineColor="#CFAF68" />
      
      <Button mode="contained" onPress={ejecutarGuardado} loading={cargando} disabled={cargando} style={styles.btnMain} buttonColor="#002147" textColor="#FFFAED">
        {idEdicion ? "ACTUALIZAR ARTÍCULO" : "PUBLICAR EN TIENDA"}
      </Button>
      <Button mode="text" textColor="#CFAF68" onPress={limpiarYSalir} style={{ marginTop: 10 }}>CANCELAR</Button>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="#002147" onPress={() => navigation.goBack()} />
        <Text style={styles.tituloHeader}>PANEL CONTROL</Text>
      </View>
      <View style={{ paddingHorizontal: 15, marginBottom: 15 }}>
        <SegmentedButtons
          value={vista}
          onValueChange={setVista}
          buttons={[
            { value: 'lista', label: 'Stock', icon: 'format-list-bulleted' },
            { value: 'formulario', label: idEdicion ? 'Editando' : 'Nuevo', icon: 'plus' },
            { value: 'pedidos', label: 'Pedidos', icon: 'clipboard-list' },
          ]}
          theme={{ colors: { secondaryContainer: '#002147', onSecondaryContainer: '#FFFAED' } }}
        />
      </View>
      {vista === 'lista' && renderInventario()}
      {vista === 'formulario' && renderFormulario()}
      {vista === 'pedidos' && renderPedidos()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFAED' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 40, paddingBottom: 10, paddingHorizontal: 10 },
  tituloHeader: { fontSize: 20, fontWeight: 'bold', color: '#002147', letterSpacing: 3, flex: 1, textAlign: 'center', marginRight: 40 },
  formContainer: { padding: 25 },
  uploadArea: { width: '100%', height: 300, backgroundColor: '#fff', borderStyle: 'dashed', borderWidth: 1, borderColor: '#002147', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  imgPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  input: { marginBottom: 15, backgroundColor: '#fff' },
  labelForm: { color: '#002147', fontWeight: 'bold', fontSize: 12, marginBottom: 8, letterSpacing: 1 },
  btnMain: { paddingVertical: 8, borderRadius: 0, marginTop: 10 },
  cardItem: { backgroundColor: '#fff', marginBottom: 10, borderRadius: 4, elevation: 1 },
  miniImg: { width: 60, height: 60, borderRadius: 2 },
  orderCard: { marginBottom: 15, backgroundColor: '#fff', borderRadius: 0 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  orderEmail: { fontSize: 14, fontWeight: 'bold', color: '#002147' },
  orderFecha: { fontSize: 11, color: '#888' },
  orderProdText: { fontSize: 13, color: '#444', marginBottom: 2 },
  orderTotal: { fontSize: 18, fontWeight: 'bold', color: '#002147', textAlign: 'right', marginTop: 10 },
  vacioText: { textAlign: 'center', marginTop: 50, color: '#888', fontStyle: 'italic' }
});