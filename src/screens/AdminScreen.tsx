import React, { useState, useEffect } from 'react';
import { 
  View, StyleSheet, ScrollView, Image, TouchableOpacity, 
  Platform, FlatList, Dimensions, Alert 
} from 'react-native';
import { 
  Text, TextInput, Button, IconButton, Divider, List, 
  Badge, Card, Surface, Portal, Dialog, Chip, Switch, 
  Menu, SegmentedButtons 
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';

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

  // Formulario Producto
  const [idEdicion, setIdEdicion] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState(''); 
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('Carteras'); 
  const [categoriaPersonalizada, setCategoriaPersonalizada] = useState(''); 
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [fotoPrincipal, setFotoPrincipal] = useState(0); 
  const [enCuotas, setEnCuotas] = useState(false);
  const [cuotasNumero, setCuotasNumero] = useState('3'); 
  const [cuotasValor, setCuotasValor] = useState('');
  
  // Ficha Técnica
  const [alto, setAlto] = useState('');
  const [ancho, setAncho] = useState('');
  const [profundidad, setProfundidad] = useState('');
  const [asa, setAsa] = useState('');
  const [peso, setPeso] = useState('');

  // Configuración de Pagos
  const [aliasConfig, setAliasConfig] = useState('');
  const [titularConfig, setTitularConfig] = useState('');

  // ✨ ESTADOS PARA GESTIÓN DE PEDIDOS ✨
  const [filtroPedidos, setFiltroPedidos] = useState('Pendiente');
  const [modalPedido, setModalPedido] = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<any>(null);
  const [editPago, setEditPago] = useState('');
  const [editObs, setEditObs] = useState('');

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

    const unsubPagos = onSnapshot(doc(db, 'configuracion', 'pagos'), (docSnap) => {
      if (docSnap.exists()) {
        setAliasConfig(docSnap.data().alias || '');
        setTitularConfig(docSnap.data().titular || '');
      }
    });

    return () => { unsubEstilo(); unsubProd(); unsubOrders(); unsubPagos(); };
  }, []);

  // --- 📊 LÓGICA DE BALANCE ---
  const obtenerEstadisticas = () => {
    const entregados = pedidos.filter(p => p.estado === 'Entregado');
    const totalVentas = entregados.reduce((acc, p) => acc + (parseFloat(p.total) || 0), 0);
    const conteoProd: Record<string, number> = {};
    entregados.forEach(p => {
      p.items?.forEach((item: any) => {
        const n = item.nombre || 'Desconocido';
        conteoProd[n] = (conteoProd[n] || 0) + (item.quantity || 1);
      });
    });
    const masVendido = Object.entries(conteoProd).sort((a, b) => b[1] - a[1])[0] || ["Ninguno", 0];
    return { totalVentas, masVendidoNombre: String(masVendido[0]), masVendidoCant: Number(masVendido[1]) };
  };

  const stats = obtenerEstadisticas();

  // --- 🛠️ FUNCIONES GENERALES ---
  const cambiarVista = (nuevaVista: string) => { setVista(nuevaVista); setMenuVisible(false); };
  
  const mostrarAviso = (titulo: string, mensaje: string, accion?: () => void, error = false) => {
    setAvisoConfig({ titulo, mensaje, esError: error, accion: accion ? accion : () => setAvisoVisible(false) });
    setAvisoVisible(true);
  };

  // --- 📦 FUNCIONES DE PEDIDOS ---
  const borrarPedido = (id: string) => {
    mostrarAviso("ELIMINAR PEDIDO", "¿Borrar este registro del historial?", async () => {
      await deleteDoc(doc(db, 'pedidos', id));
      setAvisoVisible(false);
    });
  };

  const abrirEditorPedido = (pedido: any) => {
      setPedidoSeleccionado(pedido);
      setEditPago(pedido.metodoPago || '');
      setEditObs(pedido.observacion || '');
      setModalPedido(true);
  };

  const guardarEdicionPedido = async () => {
      if (!pedidoSeleccionado) return;
      setCargando(true);
      try {
          await updateDoc(doc(db, 'pedidos', pedidoSeleccionado.id), {
              metodoPago: editPago,
              observacion: editObs
          });
          setModalPedido(false);
          setPedidoSeleccionado(null);
          mostrarAviso("ÉXITO", "Detalles del pedido actualizados.");
      } catch (error) {
          mostrarAviso("ERROR", "No se pudo actualizar el pedido.", undefined, true);
      } finally {
          setCargando(false);
      }
  };

  // --- 👜 FUNCIONES DE PRODUCTOS ---
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
        descripcion: descripcion.trim(),
        categoria: categoriaFinal,
        imagenes: urlsFinales,
        enCuotas,
        cuotasNumero: parseInt(cuotasNumero) || 3,
        cuotasValor: parseFloat(cuotasValor) || 0,
        medidas: { alto, ancho, profundidad, asa, peso }
      };

      if (idEdicion) {
        await updateDoc(doc(db, 'productos', idEdicion), payload);
      } else {
        await addDoc(collection(db, 'productos'), { ...payload, fechaCreacion: new Date().toISOString() });
      }
      mostrarAviso("✨ ÉXITO", "Tienda actualizada.", () => limpiarYSalir());
    } catch (e) {
      setCargando(false);
      mostrarAviso("❌ ERROR", "Falló la subida.");
    }
  };

  const limpiarYSalir = () => {
    setIdEdicion(null); setNombre(''); setPrecio(''); setStock(''); setDescripcion('');
    setCategoria('Carteras'); setCategoriaPersonalizada(''); setImagenes([]);
    setAlto(''); setAncho(''); setProfundidad(''); setAsa(''); setPeso('');
    setEnCuotas(false); setCuotasNumero('3'); setCuotasValor('');
    setVista('lista'); setAvisoVisible(false); setCargando(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Surface style={[styles.header, { backgroundColor: theme.background }]} elevation={1}>
        <IconButton icon="arrow-left" iconColor={theme.primary} onPress={() => navigation.goBack()} />
        <View style={styles.headerCentral}>
            <Text style={[styles.tituloHeader, { color: theme.primary }]}>GESTIÓN DIRECTIVA</Text>
            <Text style={styles.subtituloHeader}>{vista.toUpperCase()}</Text>
        </View>
        <Menu 
          visible={menuVisible} 
          onDismiss={() => setMenuVisible(false)} 
          anchor={<IconButton icon="menu" iconColor={theme.primary} onPress={() => setMenuVisible(true)} />}
          contentStyle={{ backgroundColor: '#fff' }}
        >
          <Menu.Item leadingIcon="package-variant" onPress={() => cambiarVista('lista')} title="Stock" />
          <Menu.Item leadingIcon="plus-circle-outline" onPress={() => cambiarVista('formulario')} title="Nuevo" />
          <Menu.Item leadingIcon="bell-outline" onPress={() => cambiarVista('pedidos')} title="Pedidos" />
          <Menu.Item leadingIcon="chart-bar" onPress={() => cambiarVista('balance')} title="Balance" />
          <Divider />
          <Menu.Item leadingIcon="palette-outline" onPress={() => cambiarVista('config')} title="Ajustes" />
        </Menu>
      </Surface>

      {/* 1. LISTA STOCK */}
      {vista === 'lista' && (
        <FlatList data={productos} keyExtractor={(item) => item.id} contentContainerStyle={{ padding: 15 }} renderItem={({ item }) => (
            <Surface style={styles.cardItem} elevation={1}>
              <List.Item
                title={item.nombre.toUpperCase()}
                description={`${item.categoria} | $${item.precio}${item.enCuotas ? ' | 💳 CUOTAS' : ''}`}
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
                        setStock(item.stock?.toString() || '0'); setDescripcion(item.descripcion || '');
                        setImagenes(item.imagenes || [item.imagen]); setFotoPrincipal(0);
                        setAlto(item.medidas?.alto || ''); setAncho(item.medidas?.ancho || '');
                        setProfundidad(item.medidas?.profundidad || ''); setAsa(item.medidas?.asa || ''); setPeso(item.medidas?.peso || '');
                        setEnCuotas(item.enCuotas || false); setCuotasNumero(item.cuotasNumero?.toString() || '3'); setCuotasValor(item.cuotasValor?.toString() || '');
                        setVista('formulario');
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

      {/* 2. FORMULARIO PRODUCTO */}
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
            {imagenes.length < 3 && <TouchableOpacity onPress={async () => {
              let res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, aspect: [3, 4], quality: 0.7 });
              if (!res.canceled) setImagenes([...imagenes, res.assets[0].uri]);
            }} style={styles.btnAgregarImg}><IconButton icon="camera-plus" iconColor={theme.primary} /></TouchableOpacity>}
          </View>
          
          <TextInput label="Nombre del Artículo" value={nombre} onChangeText={setNombre} mode="outlined" style={styles.input} />
          
          <Text style={styles.labelForm}>CATEGORÍA</Text>
          <SegmentedButtons
            value={categoria}
            onValueChange={(val: string) => { setCategoria(val); if (val !== 'OTRA') setCategoriaPersonalizada(''); }}
            buttons={[{ value: 'Carteras', label: 'Cart' }, { value: 'Mochilas', label: 'Moc' }, { value: 'Billeteras', label: 'Bill' }, { value: 'OTRA', label: 'OTRA' }]}
            style={{ marginBottom: 15 }}
          />
          {categoria === 'OTRA' && <TextInput label="Nueva categoría" value={categoriaPersonalizada} onChangeText={setCategoriaPersonalizada} mode="outlined" style={styles.input} />}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TextInput label="Precio Total" value={precio} onChangeText={setPrecio} keyboardType="numeric" mode="outlined" style={[styles.input, { width: '48%' }]} />
            <TextInput label="Stock" value={stock} onChangeText={setStock} keyboardType="numeric" mode="outlined" style={[styles.input, { width: '48%' }]} />
          </View>

          <Surface style={styles.cuotasRow} elevation={0}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 13, color: theme.primary }}>HABILITAR PAGO EN CUOTAS</Text>
                <Text style={{ fontSize: 10, opacity: 0.5 }}>Mostrar plan de financiación al cliente</Text>
              </View>
              <Switch value={enCuotas} onValueChange={setEnCuotas} color={theme.secondary} />
          </Surface>

          {enCuotas && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
               <TextInput label="N° Cuotas" value={cuotasNumero} onChangeText={setCuotasNumero} keyboardType="numeric" mode="outlined" style={{ width: '30%' }} />
               <TextInput label="Monto c/u" value={cuotasValor} onChangeText={setCuotasValor} keyboardType="numeric" mode="outlined" style={{ width: '65%' }} left={<TextInput.Affix text="$" />} />
            </View>
          )}

          <Text style={styles.labelForm}>HISTORIA / DESCRIPCIÓN</Text>
          <TextInput placeholder="Relatá los detalles de este diseño..." value={descripcion} onChangeText={setDescripcion} mode="outlined" multiline numberOfLines={3} style={styles.input} />

          <Text style={styles.labelForm}>FICHA TÉCNICA (SÓLO NÚMEROS)</Text>
          <Surface style={styles.fichaCont} elevation={0}>
              <View style={styles.filaFicha}>
                  <TextInput label="Alto" value={alto} onChangeText={setAlto} keyboardType="numeric" mode="outlined" style={styles.inputFicha} />
                  <TextInput label="Ancho" value={ancho} onChangeText={setAncho} keyboardType="numeric" mode="outlined" style={styles.inputFicha} />
                  <TextInput label="Fuelle" value={profundidad} onChangeText={setProfundidad} keyboardType="numeric" mode="outlined" style={styles.inputFicha} />
              </View>
              <View style={styles.filaFicha}>
                  <TextInput label="Asa" value={asa} onChangeText={setAsa} keyboardType="numeric" mode="outlined" style={{ flex: 1, marginRight: 10, backgroundColor: '#fff' }} />
                  <TextInput label="Peso (gr)" value={peso} onChangeText={setPeso} keyboardType="numeric" mode="outlined" style={{ flex: 1, backgroundColor: '#fff' }} />
              </View>
          </Surface>

          <Button mode="contained" onPress={ejecutarGuardado} loading={cargando} style={styles.btnMain} buttonColor={theme.primary} textColor="#fff">
            {idEdicion ? "ACTUALIZAR ARTÍCULO" : "PUBLICAR EN TIENDA"}
          </Button>
          <Button mode="text" onPress={limpiarYSalir}>CANCELAR</Button>
        </ScrollView>
      )}

      {/* 3. VISTA PEDIDOS (OPTIMIZADA) ✨ */}
      {vista === 'pedidos' && (
        <View style={{ flex: 1 }}>
            <View style={{ padding: 15, paddingBottom: 5 }}>
                <SegmentedButtons
                    value={filtroPedidos}
                    onValueChange={setFiltroPedidos}
                    buttons={[
                        { value: 'Pendiente', label: 'PENDIENTES', icon: 'clock-outline' },
                        { value: 'Entregado', label: 'ENTREGADOS', icon: 'check-all' }
                    ]}
                    theme={{ colors: { secondaryContainer: theme.primary, onSecondaryContainer: '#fff' } }}
                />
            </View>

            <FlatList 
                data={pedidos.filter(p => p.estado === filtroPedidos)} 
                keyExtractor={(item) => item.id} 
                contentContainerStyle={{ padding: 15 }} 
                ListEmptyComponent={<Text style={{textAlign: 'center', opacity: 0.5, marginTop: 50}}>No hay pedidos en esta sección.</Text>}
                renderItem={({ item }) => (
                <Card style={[styles.orderCard, { borderLeftColor: item.estado === 'Pendiente' ? theme.primary : '#25D366' }]}>
                    <Card.Content>
                        <View style={styles.orderHeader}>
                            <View>
                                <Text style={styles.orderEmail}>{item.clienteEmail}</Text>
                                <Text style={{fontSize: 10, opacity: 0.5, marginTop: 2}}>
                                    {item.fecha?.toDate ? item.fecha.toDate().toLocaleDateString() : ''} | Pago: {item.metodoPago || 'No asignado'}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row' }}>
                                <IconButton icon="pencil-outline" iconColor={theme.primary} size={20} onPress={() => abrirEditorPedido(item)} />
                                <IconButton icon="trash-can-outline" iconColor="red" size={20} onPress={() => borrarPedido(item.id)} />
                            </View>
                        </View>
                        
                        <Divider style={{ marginVertical: 10, opacity: 0.2 }} />

                        {item.items?.map((prod: any, idx: number) => (<Text key={idx} style={{ fontSize: 13 }}>• {prod.nombre} (x{prod.quantity || 1})</Text>))}
                        
                        {item.observacion && (
                            <Surface style={styles.obsBox} elevation={0}>
                                <Text style={{ fontSize: 11, fontStyle: 'italic', color: '#856404' }}>📌 Obs: {item.observacion}</Text>
                            </Surface>
                        )}

                        <Text style={styles.orderTotal}>TOTAL: ${item.total}</Text>
                    </Card.Content>
                    <Card.Actions>
                        {item.estado === 'Pendiente' ? (
                            <Button mode="contained" buttonColor={theme.primary} onPress={() => updateDoc(doc(db, 'pedidos', item.id), { estado: 'Entregado' })}>MARCAR ENTREGADO</Button>
                        ) : (
                            <Button mode="text" textColor={theme.primary} onPress={() => updateDoc(doc(db, 'pedidos', item.id), { estado: 'Pendiente' })}>VOLVER A PENDIENTE</Button>
                        )}
                    </Card.Actions>
                </Card>
            )} />
        </View>
      )}

      {/* 4. BALANCE */}
      {vista === 'balance' && (
        <ScrollView contentContainerStyle={styles.formContainer}>
          <Card style={styles.metricCard}>
            <Card.Title title="VENTAS ACUMULADAS" subtitle="Pedidos entregados" left={(props) => <IconButton {...props} icon="currency-usd" />} />
            <Card.Content><Text style={styles.metricValue}>${stats.totalVentas.toLocaleString()}</Text></Card.Content>
          </Card>
          <Card style={styles.metricCard}>
            <Card.Title title="PRODUCTO ESTRELLA" subtitle="Más pedido" left={(props) => <IconButton {...props} icon="star" />} />
            <Card.Content>
              <Text style={styles.metricValue}>{stats.masVendidoNombre}</Text>
              <Text style={{opacity:0.5}}>{stats.masVendidoCant} unidades</Text>
            </Card.Content>
          </Card>
        </ScrollView>
      )}

      {/* 5. CONFIGURACIÓN */}
      {vista === 'config' && (
        <ScrollView contentContainerStyle={styles.formContainer}>
            <Card style={styles.configCard}>
                <Card.Title title="DATOS DE PAGO" subtitle="Alias para transferencia" />
                <Card.Content>
                    <TextInput label="Alias" value={aliasConfig} onChangeText={setAliasConfig} mode="outlined" style={{marginBottom:10}} />
                    <TextInput label="Titular de la cuenta" value={titularConfig} onChangeText={setTitularConfig} mode="outlined" />
                    <Button mode="contained" style={{marginTop:15}} onPress={async () => {
                        await setDoc(doc(db, 'configuracion', 'pagos'), { alias: aliasConfig, titular: titularConfig }, { merge: true });
                        mostrarAviso("ÉXITO", "Datos de pago actualizados.");
                    }}>GUARDAR DATOS</Button>
                </Card.Content>
            </Card>
            <Card style={styles.configCard}>
                <Card.Title title="ESTÉTICA TEMPORAL" />
                <Card.Content>
                    <SegmentedButtons
                        value={estacionActual}
                        onValueChange={(v: string) => updateDoc(doc(db, 'configuracion', 'apariencia'), { estacionActual: v })}
                        buttons={[{ value: 'otoño', label: '🍂' }, { value: 'invierno', label: '❄️' }, { value: 'primavera', label: '🌸' }, { value: 'verano', label: '☀️' }]}
                    />
                </Card.Content>
            </Card>
        </ScrollView>
      )}

      {/* ✨ PORTALES DE AVISOS Y EDICIÓN ✨ */}
      <Portal>
        {/* Modal de Aviso General */}
        <Dialog visible={avisoVisible} onDismiss={() => setAvisoVisible(false)} style={{ borderRadius: 0, backgroundColor: '#fff' }}>
          <Dialog.Title>{avisoConfig.titulo}</Dialog.Title>
          <Dialog.Content><Text>{avisoConfig.mensaje}</Text></Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAvisoVisible(false)}>VOLVER</Button>
            <Button mode="contained" onPress={avisoConfig.accion}>ACEPTAR</Button>
          </Dialog.Actions>
        </Dialog>

        {/* ✨ Modal Editor de Pedido ✨ */}
        <Dialog visible={modalPedido} onDismiss={() => setModalPedido(false)} style={{ borderRadius: 0, backgroundColor: '#fff' }}>
          <Dialog.Title style={{ color: theme.primary }}>EDITAR PEDIDO</Dialog.Title>
          <Dialog.Content>
            <TextInput 
                label="Método de Pago" 
                value={editPago} 
                onChangeText={setEditPago} 
                mode="outlined" 
                style={{ marginBottom: 15, backgroundColor: '#fff' }} 
                placeholder="Ej: Transferencia, Efectivo..."
            />
            <TextInput 
                label="Observación Interna" 
                value={editObs} 
                onChangeText={setEditObs} 
                mode="outlined" 
                multiline 
                numberOfLines={3}
                style={{ backgroundColor: '#fff' }} 
                placeholder="Ej: Retira el viernes a las 18hs."
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setModalPedido(false)} textColor={theme.primary}>CANCELAR</Button>
            <Button mode="contained" onPress={guardarEdicionPedido} loading={cargando} buttonColor={theme.primary}>GUARDAR</Button>
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
  subtituloHeader: { fontSize: 9, opacity: 0.5, letterSpacing: 2, fontWeight: 'bold' },
  formContainer: { padding: 25 },
  multiImageContainer: { flexDirection: 'row', marginBottom: 20 },
  wrapperImagen: { position: 'relative', marginRight: 15, padding: 2, borderRadius: 5 },
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
  
  // Estilos de Pedidos Optimizados
  orderCard: { marginBottom: 15, borderLeftWidth: 5, backgroundColor: '#fff', borderRadius: 0 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderEmail: { fontSize: 13, fontWeight: 'bold' },
  orderTotal: { fontSize: 16, fontWeight: 'bold', marginTop: 10, textAlign: 'right' },
  obsBox: { backgroundColor: '#fff3cd', padding: 8, marginTop: 10, borderLeftWidth: 3, borderLeftColor: '#ffeeba' },

  metricCard: { marginBottom: 15, backgroundColor: '#fff' },
  metricValue: { fontSize: 24, fontWeight: 'bold', color: '#002147' },
  configCard: { marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#CFAF68', backgroundColor: '#fff', borderRadius: 0 },
  cuotasRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', padding: 15, marginBottom: 15, borderRadius: 5 },
  fichaCont: { backgroundColor: 'rgba(0,0,0,0.02)', padding: 10, marginBottom: 20 },
  filaFicha: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  inputFicha: { flex: 1, marginHorizontal: 2, backgroundColor: '#fff' },
});