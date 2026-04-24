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
  Chip,
  Switch // <--- NUEVO: Para la opción de cuotas
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
  const [estacionActual, setEstacionActual] = useState('');
  
  // Alertas
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
  const [enCuotas, setEnCuotas] = useState(false); // <--- NUEVO ESTADO PARA CUOTAS

  // --- 🛠️ FUNCIONES DE AVISO Y GESTIÓN ---
  const mostrarAviso = (titulo: string, mensaje: string, accion?: () => void, error = false) => {
    setAvisoConfig({ 
      titulo, 
      mensaje, 
      esError: error,
      accion: accion ? accion : () => setAvisoVisible(false) 
    });
    setAvisoVisible(true);
  };

  const marcarEntregado = async (id: string) => {
    await updateDoc(doc(db, 'pedidos', id), { estado: 'Entregado' });
  };

  const borrarPedido = (id: string) => {
    mostrarAviso("BORRAR REGISTRO", "¿Eliminar pedido definitivamente?", async () => {
        await deleteDoc(doc(db, 'pedidos', id));
        setAvisoVisible(false);
    });
  };

  const confirmarBorrado = (id: string) => {
    mostrarAviso("¿ELIMINAR PRODUCTO?", "Esta acción no se puede deshacer.", async () => {
        await deleteDoc(doc(db, 'productos', id));
        setAvisoVisible(false);
    });
  };

  // --- 🔥 CARGA DE DATOS REAL TIME ---
  useEffect(() => {
    const unsubEstilo = onSnapshot(doc(db, 'configuracion', 'apariencia'), (docSnap) => {
      if (docSnap.exists()) setEstacionActual(docSnap.data().estacionActual);
    });

    const qProd = query(collection(db, 'productos'), orderBy('fechaCreacion', 'desc'));
    const unsubProd = onSnapshot(qProd, (snap) => {
        const listaTemp: any[] = [];
        snap.forEach((doc) => listaTemp.push({ id: doc.id, ...doc.data() }));
        setProductos(listaTemp);
    });

    const qOrders = query(collection(db, 'pedidos'), orderBy('fecha', 'desc'));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      const listaPedidos: any[] = [];
      snapshot.forEach(doc => listaPedidos.push({ id: doc.id, ...doc.data() }));
      setPedidos(listaPedidos);
    });

    return () => { unsubEstilo(); unsubProd(); unsubOrders(); };
  }, []);

  // --- 📸 GESTIÓN DE IMÁGENES ---
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

  // --- 💾 LÓGICA DE GUARDADO ---
  const ejecutarGuardado = async () => {
    const categoriaFinal = (categoria === 'OTRA') ? categoriaPersonalizada.trim() : categoria;

    if (!nombre || !precio || imagenes.length === 0 || !categoriaFinal) {
      mostrarAviso("⚠️ ATENCIÓN", "Faltan datos obligatorios.", undefined, true);
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
        nombre: nombre.trim(), 
        precio: parseFloat(precio) || 0, 
        stock: parseInt(stock) || 0, 
        descripcion: descripcion.trim(),
        categoria: categoriaFinal,
        imagenes: urlsFinales,
        enCuotas: enCuotas // <--- GUARDAMOS SI TIENE CUOTAS
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
    setFotoPrincipal(0); setEnCuotas(false); setVista('lista'); setAvisoVisible(false);
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

      {/* 1. VISTA LISTA (STOCK) */}
      {vista === 'lista' && (
        <FlatList
          data={productos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 15 }}
          renderItem={({ item }) => (
            <Surface style={styles.cardItem} elevation={1}>
              <List.Item
                title={item.nombre.toUpperCase()}
                description={`${item.categoria} | $${item.precio}${item.enCuotas ? ' | 🔥 CUOTAS' : ''}`}
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
                  <IconButton icon="pencil-outline" iconColor={theme.primary} onPress={() => {
                    setIdEdicion(item.id); setNombre(item.nombre); setPrecio(item.precio.toString());
                    setStock(item.stock?.toString() || '0'); setDescripcion(item.descripcion || '');
                    setImagenes(item.imagenes || [item.imagen]); setFotoPrincipal(0);
                    setEnCuotas(item.enCuotas || false); // <--- CARGAMOS EL ESTADO AL EDITAR
                    if(['Carteras', 'Mochilas', 'Billeteras'].includes(item.categoria)) {
                        setCategoria(item.categoria); setCategoriaPersonalizada('');
                    } else {
                        setCategoria('OTRA'); setCategoriaPersonalizada(item.categoria);
                    }
                    setVista('formulario');
                  }} />
                )}
              />
            </Surface>
          )}
        />
      )}

      {/* 2. VISTA PEDIDOS (Sin cambios relevantes) */}
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
                  <Chip style={{ backgroundColor: item.estado === 'Pendiente' ? theme.primary : '#25D366' }}>
                    <Text style={{ fontSize: 10, color: theme.background, fontWeight: 'bold' }}>{item.estado.toUpperCase()}</Text>
                  </Chip>
                </View>
                {item.items?.map((prod: any, idx: number) => (
                  <Text key={idx} style={{ fontSize: 13, color: theme.text }}>• {prod.nombre} (x{prod.cantidad})</Text>
                ))}
                <Text style={[styles.orderTotal, { color: theme.primary }]}>TOTAL: ${item.total}</Text>
              </Card.Content>
              <Card.Actions>
                <Button textColor="#B00020" onPress={() => borrarPedido(item.id)}>BORRAR</Button>
                {item.estado === 'Pendiente' && (
                  <Button mode="contained" buttonColor={theme.primary} onPress={() => marcarEntregado(item.id)}>ENTREGADO</Button>
                )}
              </Card.Actions>
            </Card>
          )}
        />
      )}

      {/* 3. VISTA FORMULARIO (OPCIÓN CUOTAS ✨) */}
      {vista === 'formulario' && (
        <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
          <Text style={[styles.labelForm, { color: theme.primary }]}>FOTOS (TOCÁ PORTADA ⭐)</Text>
          <View style={styles.multiImageContainer}>
            {imagenes.map((uri, index) => (
              <TouchableOpacity key={index} onPress={() => setFotoPrincipal(index)} style={[styles.wrapperImagen, fotoPrincipal === index && { borderColor: theme.secondary, borderWidth: 2, borderRadius: 5 }]}>
                <Image source={{ uri }} style={styles.previewChica} />
                {fotoPrincipal === index && <Badge size={20} style={[styles.badgeEstrella, { backgroundColor: theme.secondary }]}>⭐</Badge>}
                <IconButton icon="close-circle" size={18} iconColor="red" style={styles.btnBorrarImg} onPress={() => eliminarImagenDeLista(index)} />
              </TouchableOpacity>
            ))}
            {imagenes.length < 3 && <TouchableOpacity onPress={seleccionarImagen} style={[styles.btnAgregarImg, { borderColor: theme.primary }]}><IconButton icon="camera-plus" iconColor={theme.primary} /></TouchableOpacity>}
          </View>
          
          <TextInput label="Nombre" value={nombre} onChangeText={setNombre} mode="outlined" style={styles.input} outlineColor={theme.primary} />
          
          <Text style={[styles.labelForm, { color: theme.primary, marginTop: 10 }]}>CATEGORÍA</Text>
          <SegmentedButtons
            value={categoria}
            onValueChange={(val) => { setCategoria(val); if (val !== 'OTRA') setCategoriaPersonalizada(''); }}
            buttons={[{ value: 'Carteras', label: 'Cart' }, { value: 'Mochilas', label: 'Moc' }, { value: 'Billeteras', label: 'Bill' }, { value: 'OTRA', label: 'NUEVA', icon: 'plus' }]}
            style={{ marginBottom: 15 }}
          />

          {categoria === 'OTRA' && (
              <TextInput label="Nueva categoría" value={categoriaPersonalizada} onChangeText={setCategoriaPersonalizada} mode="outlined" style={styles.input} outlineColor={theme.secondary} />
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TextInput label="Precio" value={precio} onChangeText={setPrecio} keyboardType="numeric" mode="outlined" style={[styles.input, { width: '48%' }]} />
            <TextInput label="Stock" value={stock} onChangeText={setStock} keyboardType="numeric" mode="outlined" style={[styles.input, { width: '48%' }]} />
          </View>

          {/* ✨ NUEVO: SECTOR DE OPCIONES DE PAGO ✨ */}
          <Surface style={styles.cuotasRow} elevation={0}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: 'bold', color: theme.primary, fontSize: 13 }}>HABILITAR CUOTAS</Text>
                <Text style={{ fontSize: 10, color: theme.text, opacity: 0.6 }}>Muestra cartel de cuotas sin interés en la tienda.</Text>
              </View>
              <Switch 
                value={enCuotas} 
                onValueChange={setEnCuotas} 
                color={theme.secondary} 
              />
          </Surface>

          <TextInput label="Detalles Técnicos" value={descripcion} onChangeText={setDescripcion} mode="outlined" multiline numberOfLines={5} style={[styles.input, { height: 120 }]} outlineColor={theme.primary} />
          
          <Button mode="contained" onPress={ejecutarGuardado} loading={cargando} style={styles.btnMain} buttonColor={theme.primary} textColor={theme.onPrimary}>
            {idEdicion ? "ACTUALIZAR" : "PUBLICAR EN TIENDA"}
          </Button>
          <Button mode="text" textColor={theme.primary} onPress={limpiarYSalir}>CANCELAR</Button>
        </ScrollView>
      )}

      {/* 4. VISTA CONFIG */}
      {vista === 'config' && (
        <ScrollView contentContainerStyle={styles.formContainer}>
          <Card style={[styles.orderCard, { borderLeftColor: theme.secondary, backgroundColor: '#fff' }]}>
            <Card.Title title="ESTÉTICA TEMPORAL" titleStyle={{ color: theme.primary, fontWeight: 'bold' }} />
            <Card.Content>
              <SegmentedButtons
                value={estacionActual}
                onValueChange={async (v) => { await updateDoc(doc(db, 'configuracion', 'apariencia'), { estacionActual: v }); }}
                buttons={[{ value: 'otoño', label: '🍂' }, { value: 'invierno', label: '❄️' }, { value: 'primavera', label: '🌸' }, { value: 'verano', label: '☀️' }]}
              />
            </Card.Content>
          </Card>
        </ScrollView>
      )}

      <Portal>
        <Dialog visible={avisoVisible} onDismiss={() => setAvisoVisible(false)} style={{ borderRadius: 0, backgroundColor: theme.background }}>
          <Dialog.Title style={{ color: theme.primary, letterSpacing: 2 }}>{avisoConfig.titulo}</Dialog.Title>
          <Dialog.Content><Text style={{ color: theme.text }}>{avisoConfig.mensaje}</Text></Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAvisoVisible(false)} textColor={theme.secondary}>VOLVER</Button>
            <Button mode="contained" buttonColor={theme.primary} onPress={avisoConfig.accion} textColor={theme.onPrimary}>ACEPTAR</Button>
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
  multiImageContainer: { flexDirection: 'row', marginBottom: 20 },
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
  orderCard: { marginBottom: 15, borderLeftWidth: 4, borderRadius: 0 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  orderEmail: { fontSize: 14, fontWeight: 'bold' },
  orderTotal: { fontSize: 18, fontWeight: 'bold', textAlign: 'right', marginTop: 10 },
  cuotasRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', padding: 15, marginBottom: 15, borderRadius: 5 }
});