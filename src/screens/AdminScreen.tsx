import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, FlatList, Dimensions } from 'react-native';
import { Text, TextInput, Button, IconButton, Divider, List, Badge, Card, Surface, Portal, Dialog, Chip, Switch, Menu, SegmentedButtons } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';

// Firebase y Tema
import { collection, addDoc, doc, updateDoc, deleteDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAppTheme } from '../context/ThemeContext'; 

const { width } = Dimensions.get('window');

export const AdminScreen = () => {
  const navigation = useNavigation<any>();
  const { theme } = useAppTheme(); 

  // Estados de Control
  const [vista, setVista] = useState('lista'); 
  const [menuVisible, setMenuVisible] = useState(false);
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
  const [descripcion, setDescripcion] = useState(''); // ✨ HISTORIA DEL PRODUCTO
  const [categoria, setCategoria] = useState('Carteras'); 
  const [categoriaPersonalizada, setCategoriaPersonalizada] = useState(''); 
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [fotoPrincipal, setFotoPrincipal] = useState(0); 
  const [enCuotas, setEnCuotas] = useState(false);
  const [cuotasNumero, setCuotasNumero] = useState('3'); 
  const [cuotasValor, setCuotasValor] = useState('');

  // ✨ ESTADOS FICHA TÉCNICA (Llenado Rápido)
  const [alto, setAlto] = useState('');
  const [ancho, setAncho] = useState('');
  const [profundidad, setProfundidad] = useState('');
  const [asa, setAsa] = useState('');
  const [peso, setPeso] = useState('');

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

  const cambiarVista = (nuevaVista: string) => { setVista(nuevaVista); setMenuVisible(false); };
  const mostrarAviso = (titulo: string, mensaje: string, accion?: () => void, error = false) => {
    setAvisoConfig({ titulo, mensaje, esError: error, accion: accion ? accion : () => setAvisoVisible(false) });
    setAvisoVisible(true);
  };

  const seleccionarImagen = async () => {
    if (imagenes.length >= 3) { mostrarAviso("ENZIRA", "Máximo 3 fotos."); return; }
    let resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [3, 4], quality: 0.7 });
    if (!resultado.canceled) setImagenes([...imagenes, resultado.assets[0].uri]);
  };

  const eliminarImagenDeLista = (index: number) => {
    const nuevaLista = [...imagenes];
    nuevaLista.splice(index, 1);
    setImagenes(nuevaLista);
    if (fotoPrincipal === index) setFotoPrincipal(0);
  };

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
          const cloudRes = await fetch('https://api.cloudinary.com/v1_1/dlwoie6yt/image/upload', { method: 'POST', body: data });
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
        descripcion: descripcion.trim(), // HISTORIA
        categoria: categoriaFinal,
        imagenes: urlsFinales,
        enCuotas: enCuotas,
        cuotasNumero: parseInt(cuotasNumero) || 3,
        cuotasValor: parseFloat(cuotasValor) || 0,
        medidas: { alto, ancho, profundidad, asa, peso } // ✨ FICHA TÉCNICA
      };

      if (idEdicion) {
        await updateDoc(doc(db, 'productos', idEdicion), payload);
        mostrarAviso("✨ ÉXITO", "Tienda actualizada.", () => limpiarYSalir());
      } else {
        await addDoc(collection(db, 'productos'), { ...payload, fechaCreacion: new Date().toISOString() });
        mostrarAviso("✨ ÉXITO", "Producto publicado.", () => limpiarYSalir());
      }
    } catch (e) {
      setCargando(false);
      mostrarAviso("❌ ERROR", "Falló la subida.", undefined, true);
    }
  };

  const limpiarYSalir = () => {
    setIdEdicion(null); setNombre(''); setPrecio(''); setStock(''); setDescripcion('');
    setCategoria('Carteras'); setCategoriaPersonalizada(''); setImagenes([]);
    setFotoPrincipal(0); setEnCuotas(false); setCuotasNumero('3'); setCuotasValor('');
    setAlto(''); setAncho(''); setProfundidad(''); setAsa(''); setPeso('');
    setVista('lista'); setAvisoVisible(false); setCargando(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Surface style={[styles.header, { backgroundColor: theme.background }]} elevation={1}>
        <IconButton icon="arrow-left" iconColor={theme.primary} onPress={() => navigation.goBack()} />
        <View style={styles.headerCentral}>
            <Text style={[styles.tituloHeader, { color: theme.primary }]}>GESTIÓN DIRECTIVA</Text>
            <Text style={styles.subtituloHeader}>{vista === 'lista' ? 'STOCK' : vista.toUpperCase()}</Text>
        </View>
        
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={<IconButton icon="menu" iconColor={theme.primary} onPress={() => setMenuVisible(true)} />}
          contentStyle={{ backgroundColor: '#fff' }}
        >
          <Menu.Item leadingIcon="package-variant" onPress={() => cambiarVista('lista')} title="Ver Stock" />
          <Menu.Item leadingIcon="plus-circle-outline" onPress={() => cambiarVista('formulario')} title="Nuevo / Editar" />
          <Divider />
          <Menu.Item leadingIcon="bell-outline" onPress={() => cambiarVista('pedidos')} title="Pedidos" />
          <Menu.Item leadingIcon="palette-outline" onPress={() => cambiarVista('config')} title="Estilo Estación" />
        </Menu>
      </Surface>

      {vista === 'lista' && (
        <FlatList data={productos} keyExtractor={(item) => item.id} contentContainerStyle={{ padding: 15 }} renderItem={({ item }) => (
            <Surface style={styles.cardItem} elevation={1}>
              <List.Item
                title={item.nombre.toUpperCase()}
                description={`${item.categoria} | $${item.precio}`}
                left={() => (
                  <View style={styles.miniImgContainer}>
                    <Image source={{ uri: item.imagenes ? item.imagenes[0] : item.imagen }} style={styles.miniImg} />
                    {(item.stock <= 3) && <Badge style={[styles.badgeStock, { backgroundColor: item.stock === 0 ? '#B00020' : theme.secondary, color: theme.primary }]}>{item.stock}</Badge>}
                  </View>
                )}
                right={() => (
                  <View style={{ flexDirection: 'row' }}>
                    <IconButton icon="pencil-outline" iconColor={theme.primary} onPress={() => {
                        setIdEdicion(item.id); setNombre(item.nombre); setPrecio(item.precio.toString());
                        setStock(item.stock?.toString() || '0'); setDescripcion(item.descripcion || '');
                        setImagenes(item.imagenes || [item.imagen]); setFotoPrincipal(0);
                        setEnCuotas(item.enCuotas || false); setCuotasNumero(item.cuotasNumero?.toString() || '3'); setCuotasValor(item.cuotasValor?.toString() || '');
                        setAlto(item.medidas?.alto || ''); setAncho(item.medidas?.ancho || '');
                        setProfundidad(item.medidas?.profundidad || ''); setAsa(item.medidas?.asa || ''); setPeso(item.medidas?.peso || '');
                        if(['Carteras', 'Mochilas', 'Billeteras'].includes(item.categoria)) { setCategoria(item.categoria); setCategoriaPersonalizada(''); }
                        else { setCategoria('OTRA'); setCategoriaPersonalizada(item.categoria); }
                        setVista('formulario');
                    }} />
                    <IconButton icon="trash-can-outline" iconColor="#B00020" onPress={() => {
                        mostrarAviso("BORRAR", "¿Eliminar este producto?", async () => {
                            await deleteDoc(doc(db, 'productos', item.id));
                            setAvisoVisible(false);
                        });
                    }} />
                  </View>
                )}
              />
            </Surface>
        )} />
      )}

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
          
          <TextInput label="Nombre del Producto" value={nombre} onChangeText={setNombre} mode="outlined" style={styles.input} />
          
          <Text style={[styles.labelForm, { color: theme.primary, marginTop: 10 }]}>CATEGORÍA</Text>
          <SegmentedButtons
            value={categoria}
            onValueChange={(val: string) => { setCategoria(val); if (val !== 'OTRA') setCategoriaPersonalizada(''); }}
            buttons={[{ value: 'Carteras', label: 'Cart' }, { value: 'Mochilas', label: 'Moc' }, { value: 'Billeteras', label: 'Bill' }, { value: 'OTRA', label: 'OTRA' }]}
            style={{ marginBottom: 15 }}
          />
          {categoria === 'OTRA' && <TextInput label="Nueva categoría" value={categoriaPersonalizada} onChangeText={setCategoriaPersonalizada} mode="outlined" style={styles.input} />}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TextInput label="Precio" value={precio} onChangeText={setPrecio} keyboardType="numeric" mode="outlined" style={[styles.input, { width: '48%' }]} />
            <TextInput label="Stock" value={stock} onChangeText={setStock} keyboardType="numeric" mode="outlined" style={[styles.input, { width: '48%' }]} />
          </View>

          {/* ✨ HISTORIA ✨ */}
          <Text style={[styles.labelForm, { color: theme.primary, marginTop: 10 }]}>HISTORIA / DESCRIPCIÓN COMERCIAL</Text>
          <TextInput placeholder="Ej: Hermoso diseño artesanal..." value={descripcion} onChangeText={setDescripcion} mode="outlined" multiline numberOfLines={3} style={styles.input} />

          {/* ✨ FICHA TÉCNICA ✨ */}
          <Text style={[styles.labelForm, { color: theme.primary, marginTop: 10 }]}>FICHA TÉCNICA (Medidas en cm / gr)</Text>
          <Surface style={styles.fichaCont} elevation={0}>
              <View style={styles.filaFicha}>
                  <TextInput label="Alto" value={alto} onChangeText={setAlto} keyboardType="numeric" mode="outlined" style={styles.inputFicha} />
                  <TextInput label="Ancho" value={ancho} onChangeText={setAncho} keyboardType="numeric" mode="outlined" style={styles.inputFicha} />
                  <TextInput label="Fuelle" value={profundidad} onChangeText={setProfundidad} keyboardType="numeric" mode="outlined" style={styles.inputFicha} />
              </View>
              <View style={styles.filaFicha}>
                  <TextInput label="Asa" value={asa} onChangeText={setAsa} keyboardType="numeric" mode="outlined" style={{ flex: 1, marginRight: 10, backgroundColor: '#fff' }} />
                  <TextInput label="Peso" value={peso} onChangeText={setPeso} keyboardType="numeric" mode="outlined" style={{ flex: 1, backgroundColor: '#fff' }} />
              </View>
          </Surface>
          
          <Surface style={styles.cuotasRow} elevation={0}>
              <View style={{ flex: 1 }}><Text style={{ fontWeight: 'bold', fontSize: 13 }}>HABILITAR CUOTAS</Text></View>
              <Switch value={enCuotas} onValueChange={setEnCuotas} color={theme.secondary} />
          </Surface>
          {enCuotas && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
               <TextInput label="Cuotas" value={cuotasNumero} onChangeText={setCuotasNumero} keyboardType="numeric" mode="outlined" style={{ width: '30%' }} />
               <TextInput label="Valor cuota" value={cuotasValor} onChangeText={setCuotasValor} keyboardType="numeric" mode="outlined" style={{ width: '65%' }} left={<TextInput.Affix text="$" />} />
            </View>
          )}

          <Button mode="contained" onPress={ejecutarGuardado} loading={cargando} style={styles.btnMain} buttonColor={theme.primary} textColor={theme.onPrimary}>{idEdicion ? "ACTUALIZAR" : "PUBLICAR"}</Button>
          <Button mode="text" textColor={theme.primary} onPress={limpiarYSalir}>CANCELAR</Button>
        </ScrollView>
      )}

      {/* Otras vistas (Pedidos y Config) */}
      {vista === 'config' && (
        <ScrollView contentContainerStyle={styles.formContainer}>
            <Card style={{ borderLeftWidth: 4, borderLeftColor: theme.secondary, backgroundColor: '#fff' }}>
                <Card.Title title="ESTÉTICA TEMPORAL" />
                <Card.Content>
                    <SegmentedButtons
                        value={estacionActual}
                        onValueChange={async (v: string) => { await updateDoc(doc(db, 'configuracion', 'apariencia'), { estacionActual: v }); }}
                        buttons={[{ value: 'otoño', label: '🍂' }, { value: 'invierno', label: '❄️' }, { value: 'primavera', label: '🌸' }, { value: 'verano', label: '☀️' }]}
                    />
                </Card.Content>
            </Card>
        </ScrollView>
      )}

      <Portal>
        <Dialog visible={avisoVisible} onDismiss={() => setAvisoVisible(false)} style={{ borderRadius: 0, backgroundColor: '#fff' }}>
          <Dialog.Title style={{ color: theme.primary }}>{avisoConfig.titulo}</Dialog.Title>
          <Dialog.Content><Text>{avisoConfig.mensaje}</Text></Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAvisoVisible(false)}>CERRAR</Button>
            <Button mode="contained" onPress={avisoConfig.accion} buttonColor={theme.primary}>ACEPTAR</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 40, paddingBottom: 15, paddingHorizontal: 10 },
  headerCentral: { alignItems: 'center' },
  tituloHeader: { fontSize: 14, fontWeight: 'bold', letterSpacing: 3 },
  subtituloHeader: { fontSize: 9, opacity: 0.5, letterSpacing: 2, fontWeight: 'bold', textTransform: 'uppercase' },
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
  cuotasRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', padding: 15, marginBottom: 15, borderRadius: 5 },
  fichaCont: { backgroundColor: 'rgba(0,0,0,0.02)', padding: 10, borderRadius: 5, marginBottom: 15 },
  filaFicha: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  inputFicha: { flex: 1, marginHorizontal: 2, backgroundColor: '#fff' },
});