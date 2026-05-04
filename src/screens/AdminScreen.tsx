import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, StyleSheet, ScrollView, Image, ActivityIndicator, 
  TouchableOpacity, Platform, FlatList, Dimensions, BackHandler 
} from 'react-native';
import { 
  Text, TextInput, Button, IconButton, Divider, List, 
  Badge, Card, Surface, Portal, Dialog, Chip, Switch, 
  Menu, SegmentedButtons, Searchbar 
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

// Firebase y Tema
import { 
  collection, addDoc, doc, updateDoc, deleteDoc, 
  query, orderBy, onSnapshot, setDoc 
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAppTheme } from '../context/ThemeContext'; 

const { width } = Dimensions.get('window');

export const AdminScreen = () => {
  const navigation = useNavigation<any>();
  const { theme } = useAppTheme(); 

  // --- 🛠️ ESTADOS DE CONTROL ---
  const [vista, setVista] = useState('lista'); 
  const [menuVisible, setMenuVisible] = useState(false);
  const [productos, setProductos] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [estacionActual, setEstacionActual] = useState('');
  const [avisoVisible, setAvisoVisible] = useState(false);
  const [avisoConfig, setAvisoConfig] = useState({ titulo: '', mensaje: '', esError: false, accion: () => {} });

  // ✨ ESTADO PARA CATEGORÍAS DINÁMICAS ✨
  const [categoriasExistentes, setCategoriasExistentes] = useState<string[]>(['Carteras', 'Mochilas', 'Billeteras']);

  // Formulario Producto
  const [idEdicion, setIdEdicion] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [costo, setCosto] = useState(''); 
  const [stock, setStock] = useState(''); 
  const [descripcion, setDescripcion] = useState(''); // Historia del producto
  const [categoria, setCategoria] = useState('Carteras'); 
  const [categoriaPersonalizada, setCategoriaPersonalizada] = useState(''); 
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [fotoPrincipal, setFotoPrincipal] = useState(0); 
  const [enCuotas, setEnCuotas] = useState(false);
  const [cuotasNumero, setCuotasNumero] = useState('3'); 
  const [cuotasValor, setCuotasValor] = useState('');
  
  // ✨ ESTADOS FICHA TÉCNICA ✨
  const [alto, setAlto] = useState('');
  const [ancho, setAncho] = useState('');
  const [profundidad, setProfundidad] = useState('');
  const [asa, setAsa] = useState('');
  const [peso, setPeso] = useState('');

  // Ajustes y Pedidos
  const [aliasConfig, setAliasConfig] = useState('');
  const [titularConfig, setTitularConfig] = useState('');
  const [filtroPedidos, setFiltroPedidos] = useState('Pendiente');
  const [busquedaPedido, setBusquedaPedido] = useState('');
  const [modalPedido, setModalPedido] = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<any>(null);
  const [editPago, setEditPago] = useState('');
  const [editObs, setEditObs] = useState('');

  // --- ✨ LÓGICA DEL BOTÓN FÍSICO "ATRÁS" (ANDROID) ✨ ---
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Si no estamos en la lista principal, el botón atrás nos vuelve a la lista
        if (vista !== 'lista') {
          setVista('lista');
          return true; // Bloquea la salida de la pantalla
        }
        // Si estamos en la lista, el botón atrás vuelve al Home
        if (navigation.canGoBack()) {
          navigation.goBack();
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      // Limpiamos usando el método .remove() para evitar errores de TS
      return () => subscription.remove();
    }, [vista, navigation])
  );

  // --- 🔥 CARGA DE DATOS REAL TIME ---
  useEffect(() => {
    const unsubEstilo = onSnapshot(doc(db, 'configuracion', 'apariencia'), (docSnap) => {
      if (docSnap.exists()) setEstacionActual(docSnap.data().estacionActual);
    });

    const qProd = query(collection(db, 'productos'), orderBy('fechaCreacion', 'desc'));
    const unsubProd = onSnapshot(qProd, (snap) => {
        const listaTemp: any[] = [];
        const catsSet = new Set(['Carteras', 'Mochilas', 'Billeteras']); 
        
        snap.forEach((docSnap) => {
            const data = docSnap.data();
            listaTemp.push({ id: docSnap.id, ...data });
            if (data.categoria) catsSet.add(data.categoria);
        });
        
        setProductos(listaTemp);
        setCategoriasExistentes(Array.from(catsSet).sort());
    });

    const qOrders = query(collection(db, 'pedidos'), orderBy('fecha', 'desc'));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      const listaPedidos: any[] = [];
      snapshot.forEach(docSnap => listaPedidos.push({ id: docSnap.id, ...docSnap.data() }));
      setPedidos(listaPedidos);
    });

    const unsubPagos = onSnapshot(doc(db, 'configuracion', 'pagos'), (docSnap) => {
      if (docSnap.exists()) {
        setAliasConfig(docSnap.data().alias || '');
        setTitularConfig(docSnap.data().titular || '');
      }
    });

    return () => { unsubEstilo(); unsubProd(); unsubOrders(); unsubPagos(); };
  }, []);

  // --- 📊 ESTADÍSTICAS ---
  const obtenerEstadisticas = () => {
    const entregados = pedidos.filter(p => p.estado === 'Entregado');
    let totalVentas = 0;
    let totalCostos = 0;
    const conteoProd: Record<string, number> = {};
    const ventasPorDia: Record<string, number> = {};
    const hoy = new Date();

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(hoy.getDate() - i);
        ventasPorDia[d.toLocaleDateString('es-AR', { weekday: 'short' })] = 0;
    }

    entregados.forEach(p => {
      totalVentas += (parseFloat(p.total) || 0);
      if (p.fecha?.toDate) {
          const diaStr = p.fecha.toDate().toLocaleDateString('es-AR', { weekday: 'short' });
          if (ventasPorDia[diaStr] !== undefined) ventasPorDia[diaStr] += (parseFloat(p.total) || 0);
      }
      p.items?.forEach((item: any) => {
        conteoProd[item.nombre] = (conteoProd[item.nombre] || 0) + (item.quantity || 1);
        const costoUnit = item.costo ? parseFloat(item.costo) : (item.precio * 0.5);
        totalCostos += (costoUnit * (item.quantity || 1));
      });
    });

    const masVendido = Object.entries(conteoProd).sort((a, b) => b[1] - a[1])[0] || ["Ninguno", 0];
    const maxVenta = Math.max(...Object.values(ventasPorDia), 1);
    const graficoData = Object.keys(ventasPorDia).map(dia => ({
        label: dia.toUpperCase(),
        valor: ventasPorDia[dia],
        porcentaje: (ventasPorDia[dia] / maxVenta) * 100
    }));

    return { totalVentas, gananciaNeta: totalVentas - totalCostos, masVendidoNombre: String(masVendido[0]), masVendidoCant: Number(masVendido[1]), graficoData };
  };

  const stats = obtenerEstadisticas();

  // --- 🛠️ FUNCIONES ---
  const cambiarVista = (nuevaVista: string) => { setVista(nuevaVista); setMenuVisible(false); };
  
  const mostrarAviso = (titulo: string, mensaje: string, accion?: () => void, error = false) => {
    setAvisoConfig({ titulo, mensaje, esError: error, accion: accion ? accion : () => setAvisoVisible(false) });
    setAvisoVisible(true);
  };

  const seleccionarImagen = async () => {
    if (imagenes.length >= 3) { mostrarAviso("ENZIRA", "Máximo 3 fotos."); return; }
    let res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [3, 4], quality: 0.7 });
    if (!res.canceled) setImagenes([...imagenes, res.assets[0].uri]);
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
        costo: parseFloat(costo) || 0,
        stock: parseInt(stock) || 0, 
        descripcion: descripcion.trim(), 
        categoria: categoriaFinal,
        imagenes: urlsFinales,
        enCuotas,
        cuotasNumero: parseInt(cuotasNumero) || 3,
        cuotasValor: parseFloat(cuotasValor) || 0,
        medidas: { alto, ancho, profundidad, asa, peso }
      };

      if (idEdicion) await updateDoc(doc(db, 'productos', idEdicion), payload);
      else await addDoc(collection(db, 'productos'), { ...payload, fechaCreacion: new Date().toISOString() });
      
      mostrarAviso("✨ ÉXITO", "Tienda actualizada.", () => limpiarYSalir());
    } catch (e) {
      setCargando(false);
      mostrarAviso("❌ ERROR", "Falló la subida.");
    }
  };

  const limpiarYSalir = () => {
    setIdEdicion(null); setNombre(''); setPrecio(''); setCosto(''); setStock(''); setDescripcion('');
    setCategoria('Carteras'); setCategoriaPersonalizada(''); setImagenes([]);
    setAlto(''); setAncho(''); setProfundidad(''); setAsa(''); setPeso('');
    setEnCuotas(false); setCuotasNumero('3'); setCuotasValor('');
    setVista('lista'); setAvisoVisible(false); setCargando(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Surface style={[styles.header, { backgroundColor: theme.background }]} elevation={1}>
        <IconButton 
            icon="arrow-left" 
            iconColor={theme.primary} 
            onPress={() => vista !== 'lista' ? setVista('lista') : navigation.goBack()} 
        />
        <View style={styles.headerCentral}>
            <Text style={[styles.tituloHeader, { color: theme.primary }]}>GESTIÓN DIRECTIVA</Text>
            <Text style={styles.subtituloHeader}>{vista.toUpperCase()}</Text>
        </View>
        <Menu 
          visible={menuVisible} 
          onDismiss={() => setMenuVisible(false)} 
          anchor={<IconButton icon="menu" iconColor={theme.primary} onPress={() => setMenuVisible(true)} />}
        >
          <Menu.Item leadingIcon="package-variant" onPress={() => cambiarVista('lista')} title="Ver Stock" />
          <Menu.Item leadingIcon="plus-circle-outline" onPress={() => cambiarVista('formulario')} title="Nuevo / Editar" />
          <Divider />
          <Menu.Item leadingIcon="bell-outline" onPress={() => cambiarVista('pedidos')} title="Pedidos" />
          <Menu.Item leadingIcon="chart-bar" onPress={() => cambiarVista('inventario')} title="Inventario" />
          <Menu.Item leadingIcon="palette-outline" onPress={() => cambiarVista('config')} title="Ajustes" />
        </Menu>
      </Surface>

      {/* 1. VISTA LISTA STOCK */}
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
                  <View style={{flexDirection: 'row'}}>
                    <IconButton icon="pencil-outline" iconColor={theme.primary} onPress={() => {
                        setIdEdicion(item.id); setNombre(item.nombre); setPrecio(item.precio.toString());
                        setCosto(item.costo?.toString() || ''); setStock(item.stock?.toString() || '0'); setDescripcion(item.descripcion || '');
                        setImagenes(item.imagenes || [item.imagen]); setFotoPrincipal(0);
                        setAlto(item.medidas?.alto || ''); setAncho(item.medidas?.ancho || '');
                        setProfundidad(item.medidas?.profundidad || ''); setAsa(item.medidas?.asa || ''); setPeso(item.medidas?.peso || '');
                        setEnCuotas(item.enCuotas || false); setCuotasNumero(item.cuotasNumero?.toString() || '3'); setCuotasValor(item.cuotasValor?.toString() || '');
                        setCategoria(item.categoria); setVista('formulario');
                    }} />
                    <IconButton icon="trash-can-outline" iconColor="red" onPress={() => {
                      mostrarAviso("ELIMINAR", "¿Borrar producto?", async () => { await deleteDoc(doc(db, 'productos', item.id)); setAvisoVisible(false); });
                    }} />
                  </View>
                )}
              />
            </Surface>
        )} />
      )}

      {/* 2. FORMULARIO PRODUCTO ✨ */}
      {vista === 'formulario' && (
        <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.labelForm}>FOTOS (TOCÁ PORTADA ⭐)</Text>
          <View style={styles.multiImageContainer}>
            {imagenes.map((uri, index) => (
              <TouchableOpacity key={index} onPress={() => setFotoPrincipal(index)} style={[styles.wrapperImagen, fotoPrincipal === index && { borderColor: theme.secondary, borderWidth: 2 }]}>
                <Image source={{ uri }} style={styles.previewChica} />
                {fotoPrincipal === index && <Badge size={20} style={styles.badgeEstrella}>⭐</Badge>}
                <IconButton icon="close-circle" size={18} iconColor="red" style={styles.btnBorrarImg} onPress={() => { const nl = [...imagenes]; nl.splice(index,1); setImagenes(nl); }} />
              </TouchableOpacity>
            ))}
            {imagenes.length < 3 && <TouchableOpacity onPress={seleccionarImagen} style={styles.btnAgregarImg}><IconButton icon="camera-plus" iconColor={theme.primary} /></TouchableOpacity>}
          </View>
          
          <TextInput label="Nombre del Artículo" value={nombre} onChangeText={setNombre} mode="outlined" style={styles.input} />
          
          <Text style={styles.labelForm}>CATEGORÍA</Text>
          <View style={styles.contenedorCategorias}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categoriasExistentes.map((cat) => (
                    <Chip key={cat} selected={categoria === cat} onPress={() => { setCategoria(cat); setCategoriaPersonalizada(''); }} style={styles.chipCat} selectedColor="#fff" textStyle={{ fontSize: 11 }}>{cat.toUpperCase()}</Chip>
                ))}
                <Chip selected={categoria === 'OTRA'} onPress={() => setCategoria('OTRA')} style={[styles.chipCat, { backgroundColor: categoria === 'OTRA' ? theme.primary : '#f0f0f0' }]} selectedColor="#fff" icon="plus">OTRA</Chip>
            </ScrollView>
          </View>
          {categoria === 'OTRA' && <TextInput label="Nueva categoría" value={categoriaPersonalizada} onChangeText={setCategoriaPersonalizada} mode="outlined" style={styles.input} />}

          <Surface style={styles.costoCont} elevation={1}>
              <Text style={{fontSize: 10, fontWeight: 'bold', color: '#B00020', marginBottom: 10}}>FINANZAS PRIVADAS</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <TextInput label="Costo" value={costo} onChangeText={setCosto} keyboardType="numeric" mode="outlined" style={{ width: '48%' }} left={<TextInput.Affix text="$" />} />
                  <TextInput label="Venta" value={precio} onChangeText={setPrecio} keyboardType="numeric" mode="outlined" style={{ width: '48%' }} left={<TextInput.Affix text="$" />} />
              </View>
          </Surface>

          <TextInput label="Stock Actual" value={stock} onChangeText={setStock} keyboardType="numeric" mode="outlined" style={styles.input} />

          <Surface style={styles.cuotasRow} elevation={0}>
              <View style={{ flex: 1 }}><Text style={{ fontWeight: 'bold', fontSize: 13, color: theme.primary }}>CUOTAS</Text></View>
              <Switch value={enCuotas} onValueChange={setEnCuotas} color={theme.secondary} />
          </Surface>
          {enCuotas && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
               <TextInput label="Cant." value={cuotasNumero} onChangeText={setCuotasNumero} keyboardType="numeric" mode="outlined" style={{ width: '30%' }} />
               <TextInput label="Valor" value={cuotasValor} onChangeText={setCuotasValor} keyboardType="numeric" mode="outlined" style={{ width: '65%' }} left={<TextInput.Affix text="$" />} />
            </View>
          )}

          <TextInput label="Historia / Diseño" value={descripcion} onChangeText={setDescripcion} mode="outlined" multiline numberOfLines={3} style={styles.input} />

          <Text style={styles.labelForm}>FICHA TÉCNICA (NÚMEROS)</Text>
          <Surface style={styles.fichaCont} elevation={0}>
              <View style={styles.filaFicha}>
                  <TextInput label="Alto" value={alto} onChangeText={setAlto} keyboardType="numeric" mode="outlined" style={styles.inputFicha} />
                  <TextInput label="Ancho" value={ancho} onChangeText={setAncho} keyboardType="numeric" mode="outlined" style={styles.inputFicha} />
                  <TextInput label="Fuelle" value={profundidad} onChangeText={setProfundidad} keyboardType="numeric" mode="outlined" style={styles.inputFicha} />
              </View>
              <View style={styles.filaFicha}>
                  <TextInput label="Asa" value={asa} onChangeText={setAsa} keyboardType="numeric" mode="outlined" style={{ flex: 1, marginRight: 10 }} />
                  <TextInput label="Peso" value={peso} onChangeText={setPeso} keyboardType="numeric" mode="outlined" style={{ flex: 1 }} />
              </View>
          </Surface>

          <Button mode="contained" onPress={ejecutarGuardado} loading={cargando} style={styles.btnMain} buttonColor={theme.primary} textColor="#fff">
            {idEdicion ? "ACTUALIZAR" : "PUBLI CAR"}
          </Button>
          <Button mode="text" onPress={limpiarYSalir}>CANCELAR</Button>
        </ScrollView>
      )}

      {/* 3. VISTA PEDIDOS */}
      {vista === 'pedidos' && (
        <View style={{ flex: 1 }}>
            <View style={{ padding: 15, paddingBottom: 5 }}>
                <SegmentedButtons value={filtroPedidos} onValueChange={setFiltroPedidos} buttons={[{ value: 'Pendiente', label: 'PENDIENTES' }, { value: 'Entregado', label: 'ENTREGADOS' }]} theme={{ colors: { secondaryContainer: theme.primary, onSecondaryContainer: '#fff' } }} style={{ marginBottom: 15 }} />
                <Searchbar placeholder="Buscar cliente..." onChangeText={setBusquedaPedido} value={busquedaPedido} iconColor={theme.primary} />
            </View>
            <FlatList data={pedidos.filter(p => p.estado === filtroPedidos && p.clienteEmail?.includes(busquedaPedido))} keyExtractor={(item) => item.id} contentContainerStyle={{ padding: 15 }} renderItem={({ item }) => (
                <Card style={[styles.orderCard, { borderLeftColor: item.estado === 'Pendiente' ? theme.primary : '#25D366' }]}>
                    <Card.Content>
                        <View style={styles.orderHeader}>
                            <View style={{ flex: 1 }}><Text style={styles.orderEmail}>{item.clienteEmail}</Text><Text style={{fontSize: 10, opacity: 0.5}}>{item.fecha?.toDate ? item.fecha.toDate().toLocaleDateString() : ''} | Pago: {item.metodoPago}</Text></View>
                            <View style={{ flexDirection: 'row' }}>
                                <IconButton icon="pencil-outline" iconColor={theme.primary} size={20} onPress={() => { setPedidoSeleccionado(item); setEditPago(item.metodoPago || ''); setEditObs(item.observacion || ''); setModalPedido(true); }} />
                                <IconButton icon="trash-can-outline" iconColor="red" size={20} onPress={() => { mostrarAviso("ELIMINAR", "¿Borrar pedido?", async () => { await deleteDoc(doc(db, 'pedidos', item.id)); setAvisoVisible(false); }); }} />
                            </View>
                        </View>
                        <Divider style={{ marginVertical: 10, opacity: 0.2 }} />
                        {item.items?.map((prod: any, idx: number) => (<Text key={idx} style={{ fontSize: 13 }}>• {prod.nombre} (x{prod.quantity || 1})</Text>))}
                        {item.observacion && (<View style={styles.obsBox}><Text style={{ fontSize: 11, fontStyle: 'italic' }}>📌 {item.observacion}</Text></View>)}
                        <Text style={styles.orderTotal}>TOTAL: ${item.total}</Text>
                    </Card.Content>
                    <Card.Actions>
                        <Button mode="contained" buttonColor={item.estado === 'Pendiente' ? theme.primary : '#aaa'} onPress={() => updateDoc(doc(db, 'pedidos', item.id), { estado: item.estado === 'Pendiente' ? 'Entregado' : 'Pendiente' })}>
                            {item.estado === 'Pendiente' ? 'ENTREGAR' : 'REABRIR'}
                        </Button>
                    </Card.Actions>
                </Card>
            )} />
        </View>
      )}

      {/* 4. INVENTARIO (ERP) */}
      {vista === 'inventario' && (
        <ScrollView contentContainerStyle={styles.formContainer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
              <Card style={[styles.metricCardMini, { flex: 1, marginRight: 5 }]}>
                  <Card.Content><Text style={styles.labelMini}>INGRESOS</Text><Text style={styles.valueMini}>${stats.totalVentas.toLocaleString()}</Text></Card.Content>
              </Card>
              <Card style={[styles.metricCardMini, { flex: 1, marginLeft: 5, backgroundColor: '#e6f4ea' }]}>
                  <Card.Content><Text style={styles.labelMini}>GANANCIA</Text><Text style={styles.valueMini}>${stats.gananciaNeta.toLocaleString()}</Text></Card.Content>
              </Card>
          </View>
          <Card style={styles.metricCard}>
            <Card.Title title="VENTAS SEMANALES" left={(props) => <IconButton {...props} icon="chart-bar" />} />
            <Card.Content>
                <View style={styles.chartContainer}>
                    {stats.graficoData.map((bar, i) => (
                        <View key={i} style={styles.barCol}>
                            <View style={[styles.barFill, { height: `${Math.max(bar.porcentaje, 2)}%`, backgroundColor: theme.secondary }]} />
                            <Text style={styles.barLabel}>{bar.label}</Text>
                        </View>
                    ))}
                </View>
            </Card.Content>
          </Card>
        </ScrollView>
      )}

      <Portal>
        <Dialog visible={avisoVisible} onDismiss={() => setAvisoVisible(false)} style={{ backgroundColor: '#fff' }}>
          <Dialog.Title>{avisoConfig.titulo}</Dialog.Title>
          <Dialog.Content><Text>{avisoConfig.mensaje}</Text></Dialog.Content>
          <Dialog.Actions><Button onPress={() => setAvisoVisible(false)}>VOLVER</Button><Button mode="contained" onPress={avisoConfig.accion}>ACEPTAR</Button></Dialog.Actions>
        </Dialog>
        <Dialog visible={modalPedido} onDismiss={() => setModalPedido(false)} style={{ backgroundColor: '#fff' }}>
          <Dialog.Title>EDITAR PEDIDO</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Pago" value={editPago} onChangeText={setEditPago} mode="outlined" style={{ marginBottom: 15 }} />
            <TextInput label="Observación" value={editObs} onChangeText={setEditObs} mode="outlined" multiline numberOfLines={3} />
          </Dialog.Content>
          <Dialog.Actions><Button onPress={() => setModalPedido(false)}>CANCELAR</Button><Button mode="contained" onPress={async () => { await updateDoc(doc(db, 'pedidos', pedidoSeleccionado.id), { metodoPago: editPago, observacion: editObs }); setModalPedido(false); }}>GUARDAR</Button></Dialog.Actions>
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
  subtituloHeader: { fontSize: 9, opacity: 0.5, letterSpacing: 2, fontWeight: 'bold' },
  formContainer: { padding: 25 },
  multiImageContainer: { flexDirection: 'row', marginBottom: 20 },
  wrapperImagen: { position: 'relative', marginRight: 15, padding: 2 },
  previewChica: { width: 80, height: 100, borderRadius: 5 },
  badgeEstrella: { position: 'absolute', top: -10, left: -10, zIndex: 10, backgroundColor: '#CFAF68' },
  btnBorrarImg: { position: 'absolute', bottom: -15, right: -15 },
  btnAgregarImg: { width: 80, height: 100, borderStyle: 'dashed', borderWidth: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 5 },
  input: { marginBottom: 15, backgroundColor: '#fff' },
  labelForm: { fontWeight: 'bold', fontSize: 10, letterSpacing: 2, marginBottom: 5 },
  btnMain: { paddingVertical: 8, borderRadius: 0, marginTop: 10 },
  cardItem: { backgroundColor: '#fff', marginBottom: 10 },
  miniImgContainer: { position: 'relative' },
  miniImg: { width: 50, height: 65, marginLeft: 10 },
  badgeStock: { position: 'absolute', top: -5, right: -5 },
  contenedorCategorias: { marginBottom: 15 },
  chipCat: { marginRight: 8, backgroundColor: '#CFAF68' },
  orderCard: { marginBottom: 15, borderLeftWidth: 5, backgroundColor: '#fff', borderRadius: 0 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  orderEmail: { fontSize: 13, fontWeight: 'bold' },
  orderTotal: { fontSize: 16, fontWeight: 'bold', marginTop: 10, textAlign: 'right' },
  obsBox: { backgroundColor: '#fff3cd', padding: 8, marginTop: 10 },
  costoCont: { backgroundColor: 'rgba(176,0,32,0.05)', padding: 15, borderRadius: 5, marginBottom: 15 },
  cuotasRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', padding: 15, marginBottom: 15 },
  fichaCont: { backgroundColor: 'rgba(0,0,0,0.02)', padding: 10, marginBottom: 20 },
  filaFicha: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  inputFicha: { flex: 1, marginHorizontal: 2, backgroundColor: '#fff' },
  metricCard: { marginBottom: 15, backgroundColor: '#fff' },
  metricCardMini: { backgroundColor: '#fff' },
  labelMini: { fontSize: 9, fontWeight: 'bold', opacity: 0.6 },
  valueMini: { fontSize: 18, fontWeight: 'bold' },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120, marginTop: 20 },
  barCol: { alignItems: 'center', flex: 1 },
  barFill: { width: 20, borderRadius: 3 },
  barLabel: { fontSize: 8, marginTop: 5 }
});