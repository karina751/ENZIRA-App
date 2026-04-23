import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Image, 
  ActivityIndicator, 
  TouchableOpacity, 
  Platform, 
  FlatList, 
  Dimensions 
} from 'react-native';
import { 
  Text, 
  TextInput, 
  Button, 
  IconButton, 
  Divider, 
  List, 
  SegmentedButtons, 
  Badge, 
  Card, 
  Surface, 
  Snackbar, 
  Portal,
  Dialog,
  Chip
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';

// Firebase y Tema
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
  
  // Alertas Lindas
  const [avisoVisible, setAvisoVisible] = useState(false);
  const [avisoConfig, setAvisoConfig] = useState({ titulo: '', mensaje: '', esError: false, accion: () => {} });

  // Estados del Formulario
  const [idEdicion, setIdEdicion] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState(''); 
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('Carteras');
  const [categoriaPersonalizada, setCategoriaPersonalizada] = useState('');
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [fotoPrincipal, setFotoPrincipal] = useState(0); 

  // --- 🛠️ FUNCIONES DE GESTIÓN DE PEDIDOS ---
  const marcarEntregado = async (id: string) => {
    try {
      await updateDoc(doc(db, 'pedidos', id), { estado: 'Entregado' });
      setAvisoVisible(false);
    } catch (e) {
      mostrarAviso("ERROR", "No se pudo actualizar el pedido.");
    }
  };

  const borrarPedido = (id: string) => {
    mostrarAviso("ELIMINAR REGISTRO", "¿Borrar este pedido de la lista definitivamente?", async () => {
      await deleteDoc(doc(db, 'pedidos', id));
      setAvisoVisible(false);
    });
  };

  const mostrarAviso = (titulo: string, mensaje: string, accion?: () => void, error = false) => {
    setAvisoConfig({ 
      titulo, 
      mensaje, 
      esError: error,
      accion: accion ? accion : () => setAvisoVisible(false) 
    });
    setAvisoVisible(true);
  };

  // --- 🔥 CARGA DE DATOS REAL TIME ---
  useEffect(() => {
    // Escuchar Productos
    const qProd = query(collection(db, 'productos'), orderBy('fechaCreacion', 'desc'));
    const unsubProd = onSnapshot(qProd, (snap) => {
        const listaTemp: any[] = [];
        snap.forEach((doc) => listaTemp.push({ id: doc.id, ...doc.data() }));
        setProductos(listaTemp);
    });

    // Escuchar Pedidos
    const qOrders = query(collection(db, 'pedidos'), orderBy('fecha', 'desc'));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      const listaPedidos: any[] = [];
      snapshot.forEach(doc => listaPedidos.push({ id: doc.id, ...doc.data() }));
      setPedidos(listaPedidos);
    });

    return () => { unsubProd(); unsubOrders(); };
  }, []);

  // --- 📸 LÓGICA DE IMÁGENES ---
  const seleccionarImagen = async () => {
    if (imagenes.length >= 3) {
        mostrarAviso("ENZIRA", "Máximo 3 fotos por producto.");
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
    if (fotoPrincipal === index) setFotoPrincipal(0);
  };

  const ejecutarGuardado = async () => {
    const categoriaFinal = categoria === 'Accesorios' ? categoriaPersonalizada : categoria;
    if (!nombre || !precio || imagenes.length === 0 || !categoriaFinal) {
      mostrarAviso("⚠️ ATENCIÓN", "Faltan datos o fotos.", undefined, true);
      return;
    }
    setCargando(true);
    try {
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
            method: 'POST', body: data,
          });
          const file = await cloudRes.json();
          return file.secure_url.replace('/upload/', '/upload/f_auto,q_auto/');
        })
      );

      const urlsFinales = [...urlsSubidas];
      const [fotoElegida] = urlsFinales.splice(fotoPrincipal, 1);
      urlsFinales.unshift(fotoElegida);

      const payload = { 
        nombre: nombre.trim(), precio: parseFloat(precio) || 0, 
        stock: parseInt(stock) || 0, descripcion: descripcion.trim(),
        categoria: categoriaFinal, imagenes: urlsFinales 
      };

      if (idEdicion) {
        await updateDoc(doc(db, 'productos', idEdicion), payload);
        setCargando(false);
        mostrarAviso("✨ ÉXITO", "Producto actualizado.", () => limpiarYSalir());
      } else {
        await addDoc(collection(db, 'productos'), { ...payload, fechaCreacion: new Date().toISOString() });
        setCargando(false);
        mostrarAviso("✨ ÉXITO", "Artículo publicado.", () => limpiarYSalir());
      }
    } catch (e) {
      setCargando(false);
      mostrarAviso("❌ ERROR", "Falló la subida.", undefined, true);
    }
  };

  const limpiarYSalir = () => {
    setIdEdicion(null); setNombre(''); setPrecio(''); setStock(''); setDescripcion('');
    setCategoria('Carteras'); setCategoriaPersonalizada(''); setImagenes([]);
    setFotoPrincipal(0); setVista('lista');
    setAvisoVisible(false);
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

      {/* --- VISTA: LISTA DE STOCK --- */}
      {vista === 'lista' && (
        <FlatList
          data={productos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 15 }}
          renderItem={({ item }) => (
            <Surface style={styles.cardItem} elevation={1}>
              <List.Item
                title={item.nombre.toUpperCase()}
                description={`${item.categoria} | $${item.precio} | Stock: ${item.stock || 0}`}
                left={() => (
                  <View style={styles.miniImgContainer}>
                    <Image source={{ uri: item.imagenes ? item.imagenes[0] : item.imagen }} style={styles.miniImg} />
                    {(item.stock <= 3) && (
                      <Badge style={[styles.badgeStock, { backgroundColor: item.stock === 0 ? '#B00020' : theme.secondary, color: theme.primary }]}>
                        {item.stock}
                      </Badge>
                    )}
                  </View>
                )}
                right={() => (
                  <View style={{ flexDirection: 'row' }}>
                    <IconButton icon="pencil-outline" iconColor={theme.primary} onPress={() => {
                        setIdEdicion(item.id); setNombre(item.nombre); setPrecio(item.precio.toString());
                        setStock(item.stock?.toString() || '0'); setDescripcion(item.descripcion || '');
                        setImagenes(item.imagenes || [item.imagen]); setFotoPrincipal(0);
                        if(['Carteras', 'Mochilas', 'Billeteras'].includes(item.categoria)) {
                            setCategoria(item.categoria); setCategoriaPersonalizada('');
                        } else {
                            setCategoria('Accesorios'); setCategoriaPersonalizada(item.categoria);
                        }
                        setVista('formulario');
                    }} />
                  </View>
                )}
              />
            </Surface>
          )}
        />
      )}

      {/* --- VISTA: PEDIDOS (RESTABLECIDA) --- */}
      {vista === 'pedidos' && (
        <FlatList
          data={pedidos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 15 }}
          renderItem={({ item }) => (
            <Card style={[styles.orderCard, { borderLeftColor: item.estado === 'Pendiente' ? theme.primary : '#25D366' }]}>
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
                <Text style={styles.orderFecha}>
                  {item.fecha?.toDate ? item.fecha.toDate().toLocaleString() : 'Recién cargado'}
                </Text>
                <Divider style={{ marginVertical: 10, opacity: 0.3 }} />
                {item.items?.map((prod: any, idx: number) => (
                  <Text key={idx} style={{ fontSize: 13, color: theme.text }}>• {prod.nombre} (x{prod.cantidad})</Text>
                ))}
                <Text style={[styles.orderTotal, { color: theme.primary }]}>TOTAL: ${item.total}</Text>
              </Card.Content>
              <Card.Actions>
                <Button textColor="#B00020" onPress={() => borrarPedido(item.id)}>BORRAR</Button>
                {item.estado === 'Pendiente' && (
                  <Button mode="contained" buttonColor={theme.primary} onPress={() => marcarEntregado(item.id)}>
                    MARCAR ENTREGADO
                  </Button>
                )}
              </Card.Actions>
            </Card>
          )}
          ListEmptyComponent={<Text style={styles.vacioText}>No hay pedidos registrados aún.</Text>}
        />
      )}

      {/* --- VISTA: FORMULARIO --- */}
      {vista === 'formulario' && (
        <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
          <Text style={[styles.labelForm, { color: theme.primary }]}>FOTOS (TOCÁ LA PORTADA ⭐)</Text>
          <View style={styles.multiImageContainer}>
            {imagenes.map((uri, index) => (
              <TouchableOpacity key={index} onPress={() => setFotoPrincipal(index)}
                style={[styles.wrapperImagen, fotoPrincipal === index && { borderColor: theme.secondary, borderWidth: 2, borderRadius: 5 }]}
              >
                <Image source={{ uri }} style={styles.previewChica} />
                {fotoPrincipal === index && <Badge size={20} style={[styles.badgeEstrella, { backgroundColor: theme.secondary }]}>⭐</Badge>}
                <IconButton icon="close-circle" size={18} iconColor="red" style={styles.btnBorrarImg} onPress={() => eliminarImagenDeLista(index)} />
              </TouchableOpacity>
            ))}
            {imagenes.length < 3 && (
              <TouchableOpacity onPress={seleccionarImagen} style={[styles.btnAgregarImg, { borderColor: theme.primary }]}>
                <IconButton icon="camera-plus" iconColor={theme.primary} />
              </TouchableOpacity>
            )}
          </View>
          <TextInput label="Nombre" value={nombre} onChangeText={setNombre} mode="outlined" style={styles.input} outlineColor={theme.primary} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TextInput label="Precio" value={precio} onChangeText={setPrecio} keyboardType="numeric" mode="outlined" style={[styles.input, { width: '48%' }]} />
            <TextInput label="Stock" value={stock} onChangeText={setStock} keyboardType="numeric" mode="outlined" style={[styles.input, { width: '48%' }]} />
          </View>
          <TextInput label="Detalles Técnicos" value={descripcion} onChangeText={setDescripcion} mode="outlined" multiline numberOfLines={5} style={[styles.input, { height: 120 }]} outlineColor={theme.primary} />
          <Button mode="contained" onPress={ejecutarGuardado} loading={cargando} style={styles.btnMain} buttonColor={theme.primary} textColor={theme.onPrimary}>
            {idEdicion ? "ACTUALIZAR" : "PUBLICAR"}
          </Button>
          <Button mode="text" textColor={theme.primary} onPress={limpiarYSalir}>CANCELAR</Button>
        </ScrollView>
      )}

      {/* DIÁLOGO ELEGANTE */}
      <Portal>
        <Dialog visible={avisoVisible} onDismiss={() => setAvisoVisible(false)} style={{ borderRadius: 0, backgroundColor: theme.background }}>
          <Dialog.Title style={{ color: theme.primary, letterSpacing: 2 }}>{avisoConfig.titulo}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: theme.text }}>{avisoConfig.mensaje}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAvisoVisible(false)} textColor={theme.secondary}>VOLVER</Button>
            <Button mode="contained" buttonColor={theme.primary} onPress={avisoConfig.accion} textColor={theme.onPrimary}>CONFIRMAR</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 40, paddingBottom: 15, paddingHorizontal: 10 },
  tituloHeader: { fontSize: 16, fontWeight: 'bold', letterSpacing: 4 },
  formContainer: { padding: 25 },
  multiImageContainer: { flexDirection: 'row', marginBottom: 20, marginTop: 10 },
  wrapperImagen: { position: 'relative', marginRight: 15, padding: 2 },
  previewChica: { width: 80, height: 100, borderRadius: 5 },
  badgeEstrella: { position: 'absolute', top: -10, left: -10, zIndex: 10 },
  btnBorrarImg: { position: 'absolute', bottom: -15, right: -15 },
  btnAgregarImg: { width: 80, height: 100, borderStyle: 'dashed', borderWidth: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 5 },
  input: { marginBottom: 15, backgroundColor: '#fff' },
  labelForm: { fontWeight: 'bold', fontSize: 10, letterSpacing: 2 },
  btnMain: { paddingVertical: 8, borderRadius: 0, marginTop: 10 },
  cardItem: { backgroundColor: '#fff', marginBottom: 10, marginHorizontal: 5 },
  miniImgContainer: { position: 'relative' },
  miniImg: { width: 50, height: 65, marginLeft: 10 },
  badgeStock: { position: 'absolute', top: -5, right: -5, fontWeight: 'bold' },
  orderCard: { marginBottom: 15, backgroundColor: '#fff', borderLeftWidth: 4, borderRadius: 0 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  orderEmail: { fontSize: 14, fontWeight: 'bold' },
  orderFecha: { fontSize: 10, color: '#888', fontStyle: 'italic' },
  orderTotal: { fontSize: 18, fontWeight: 'bold', textAlign: 'right', marginTop: 10 },
  vacioText: { textAlign: 'center', marginTop: 50, opacity: 0.3, fontStyle: 'italic' }
});