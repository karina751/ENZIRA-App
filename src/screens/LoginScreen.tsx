import React, { useState, useEffect, useCallback } from 'react'; // ✨ useCallback sumado
import { View, StyleSheet, ScrollView, Platform, Dimensions, TouchableOpacity, ActivityIndicator, Linking, BackHandler } from 'react-native'; // ✨ BackHandler sumado
import { Text, TextInput, Button, IconButton, Snackbar, Portal, Card, Divider, Chip, ProgressBar } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native'; // ✨ useFocusEffect sumado

// Firebase y Tema
import { auth, db } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useAppTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export const LoginScreen = () => {
  const navigation = useNavigation<any>();
  const { theme } = useAppTheme();
  
  // Estados de Auth
  const [user, setUser] = useState<any>(null);
  const [rol, setRol] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [esRegistro, setEsRegistro] = useState(false);

  // Estados para Pedidos
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [cargandoPedidos, setCargandoPedidos] = useState(true);

  // Estados para avisos
  const [snackVisible, setSnackVisible] = useState(false);
  const [msjSnack, setMsjSnack] = useState('');

  // --- ✨ LÓGICA DEL BOTÓN FÍSICO "ATRÁS" (ANDROID) ✨ ---
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (navigation.canGoBack()) {
          navigation.goBack();
          return true; // Bloquea la salida de la app y vuelve atrás
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      // Limpieza de la suscripción al salir de la pantalla
      return () => subscription.remove();
    }, [navigation])
  );

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docRef = doc(db, 'usuarios', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setRol(docSnap.data().rol);

        const q = query(
          collection(db, 'pedidos'),
          where('clienteUid', '==', currentUser.uid),
          orderBy('fecha', 'desc')
        );

        const unsubOrders = onSnapshot(q, (snap) => {
          let lista: any[] = [];
          snap.forEach(doc => lista.push({ id: doc.id, ...doc.data() }));
          setPedidos(lista);
          setCargandoPedidos(false);
        }, (error) => {
          console.log("Error en pedidos:", error);
          setCargandoPedidos(false);
        });

        return () => unsubOrders();
      } else {
        setRol(null);
        setPedidos([]);
        setCargandoPedidos(false);
      }
    });
    return () => unsubAuth();
  }, []);

  const dispararAviso = (texto: string) => {
    setMsjSnack(texto);
    setSnackVisible(true);
  };

  const manejarAutenticacion = async () => {
    if (!email || !password) {
      dispararAviso("Por favor, completá todos los campos ✨");
      return;
    }
    setCargando(true);
    try {
      if (esRegistro) {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await setDoc(doc(db, 'usuarios', userCredential.user.uid), {
          email: email.trim(),
          rol: 'cliente',
          fechaCreado: new Date()
        });
        dispararAviso("¡Bienvenida! Cuenta creada en ENZIRA.");
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }

      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });

    } catch (error: any) {
      dispararAviso("Error en la autenticación. Verificá tus datos.");
    } finally {
      setCargando(false);
    }
  };

  const consultarPedidoWasap = (item: any) => {
    const fecha = item.fecha?.toDate ? item.fecha.toDate().toLocaleDateString() : 'Reciente';
    const mensaje = `Hola ENZIRA! ✨ Te consulto por mi pedido hecho el ${fecha} por un total de $${item.total}.`;
    Linking.openURL(`https://wa.me/5493873001475?text=${encodeURIComponent(mensaje)}`);
  };

  // --- VISTA A: PERFIL DEL CLIENTE ---
  if (user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <IconButton icon="arrow-left" style={styles.botonCerrar} onPress={() => navigation.goBack()} iconColor={theme.primary} />
        
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.cardLogin}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <IconButton icon="account-circle-outline" size={60} iconColor={theme.primary} />
                <Text style={[styles.logo, { color: theme.primary, fontSize: 24, letterSpacing: 4 }]}>MI CUENTA</Text>
                <Text style={{ color: theme.secondary, fontWeight: 'bold', fontSize: 12 }}>{user.email}</Text>
            </View>

            <Divider style={{ marginBottom: 25, opacity: 0.2 }} />

            <Text style={[styles.bienvenida, { color: theme.primary, fontSize: 16, marginBottom: 15, textAlign: 'left' }]}>
                MIS PEDIDOS ✨
            </Text>

            {cargandoPedidos ? (
                <ActivityIndicator color={theme.primary} style={{ marginTop: 20 }} />
            ) : pedidos.length === 0 ? (
                <View style={styles.vacioCont}>
                    <Text style={{ color: theme.text, opacity: 0.5, fontStyle: 'italic' }}>Aún no has realizado pedidos.</Text>
                </View>
            ) : (
                pedidos.map((item) => (
                    <Card key={item.id} style={styles.orderCard} elevation={1}>
                        <Card.Content>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontWeight: 'bold', color: theme.primary, fontSize: 13 }}>
                                    {item.fecha?.toDate ? item.fecha.toDate().toLocaleDateString() : 'Reciente'}
                                </Text>
                                <Chip 
                                    textStyle={{ fontSize: 10, color: '#fff', fontWeight: 'bold' }} 
                                    style={{ backgroundColor: item.estado === 'Pendiente' ? theme.primary : '#25D366', height: 26 }}
                                >
                                    {item.estado.toUpperCase()}
                                </Chip>
                            </View>

                            <View style={{ marginVertical: 15 }}>
                                <Text style={{ fontSize: 10, opacity: 0.5, marginBottom: 5 }}>PROGRESO DEL ENVÍO</Text>
                                <ProgressBar 
                                    progress={item.estado === 'Pendiente' ? 0.4 : 1} 
                                    color={item.estado === 'Pendiente' ? theme.secondary : '#25D366'} 
                                    style={{ height: 6, borderRadius: 3 }}
                                />
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
                                    <Text style={{ fontSize: 9, color: theme.primary }}>Recibido</Text>
                                    <Text style={{ fontSize: 9, color: item.estado === 'Entregado' ? '#25D366' : theme.text }}>Entregado</Text>
                                </View>
                            </View>

                            <Divider style={{ marginVertical: 10, opacity: 0.1 }} />
                            
                            {item.items?.map((prod: any, idx: number) => (
                                <Text key={idx} style={{ fontSize: 12, color: theme.text, marginBottom: 2 }}>
                                    • {prod.nombre} (x{prod.quantity || prod.cantidad})
                                </Text>
                            ))}

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 }}>
                                <Button 
                                    icon="whatsapp" 
                                    mode="outlined" 
                                    compact 
                                    onPress={() => consultarPedidoWasap(item)}
                                    style={{ borderRadius: 0, borderColor: '#25D366' }}
                                    textColor="#25D366"
                                    labelStyle={{ fontSize: 10 }}
                                >
                                    CONSULTAR
                                </Button>
                                <Text style={{ fontWeight: 'bold', color: theme.primary, fontSize: 16 }}>
                                    Total: ${item.total}
                                </Text>
                            </View>
                            
                            {item.metodoPago && (
                                <Text style={{ fontSize: 9, opacity: 0.4, marginTop: 10 }}>PAGO: {item.metodoPago.toUpperCase()}</Text>
                            )}
                        </Card.Content>
                    </Card>
                ))
            )}

            <Button mode="contained" onPress={() => signOut(auth)} style={{ marginTop: 40, borderRadius: 0 }} buttonColor="#B00020" icon="logout">
              CERRAR SESIÓN
            </Button>
          </View>
        </ScrollView>
      </View>
    );
  }

  // --- VISTA B: FORMULARIO DE LOGIN / REGISTRO ---
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <IconButton icon="close" style={styles.botonCerrar} onPress={() => navigation.goBack()} iconColor={theme.primary} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.cardLogin}>
          <View style={styles.header}>
            <Text style={[styles.logo, { color: theme.primary }]}>ENZIRA</Text>
            <Text style={[styles.subtitulo, { color: theme.secondary }]}>ALTA COSTURA</Text>
            <View style={[styles.lineaDecorativa, { backgroundColor: theme.secondary }]} />
          </View>
          <Text style={[styles.bienvenida, { color: theme.primary }]}>{esRegistro ? 'CREAR CUENTA' : 'MI CUENTA'}</Text>
          <Text style={[styles.instruccion, { color: theme.secondary }]}>{esRegistro ? 'REGISTRATE EN LA CASA' : 'ACCESO PARA CLIENTES'}</Text>
          <View style={styles.form}>
            <TextInput label="Email" value={email} onChangeText={setEmail} mode="outlined" style={styles.input} autoCapitalize="none" />
            <TextInput label="Contraseña" value={password} onChangeText={setPassword} mode="outlined" secureTextEntry={!verPassword} style={styles.input} right={<TextInput.Icon icon={verPassword ? "eye-off" : "eye"} onPress={() => setVerPassword(!verPassword)} />} />
            <Button mode="contained" onPress={manejarAutenticacion} loading={cargando} disabled={cargando} style={styles.boton} buttonColor={theme.primary}>
              {esRegistro ? 'REGISTRARME' : 'INGRESAR'}
            </Button>
            <TouchableOpacity onPress={() => setEsRegistro(!esRegistro)} style={styles.switchCont}>
              <Text style={[styles.switchTexto, { color: theme.primary }]}>{esRegistro ? '¿Ya tenés cuenta? Iniciá sesión' : '¿No tenés cuenta? Registrate aquí'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <Portal>
        <Snackbar visible={snackVisible} onDismiss={() => setSnackVisible(false)} style={{ backgroundColor: theme.primary }}><Text style={{ color: theme.onPrimary }}>{msjSnack}</Text></Snackbar>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  botonCerrar: { position: 'absolute', top: 40, right: 20, zIndex: 10 },
  cardLogin: { width: '100%', maxWidth: 450, padding: 25 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 38, fontWeight: 'bold', letterSpacing: 8 },
  subtitulo: { fontSize: 10, letterSpacing: 4, fontWeight: 'bold', marginTop: 5 },
  lineaDecorativa: { width: 40, height: 1, marginTop: 15 },
  bienvenida: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', letterSpacing: 2 },
  instruccion: { fontSize: 10, textAlign: 'center', marginBottom: 30, marginTop: 10, letterSpacing: 1, textTransform: 'uppercase' },
  form: { width: '100%' },
  input: { marginBottom: 15, backgroundColor: '#fff' },
  boton: { borderRadius: 0, paddingVertical: 10, marginTop: 10 },
  switchCont: { marginTop: 25, alignItems: 'center' },
  switchTexto: { fontWeight: 'bold', fontSize: 12, textDecorationLine: 'underline', opacity: 0.7 },
  orderCard: { marginBottom: 12, backgroundColor: '#fff', borderRadius: 0, borderLeftWidth: 3, borderLeftColor: '#CFAF68' },
  vacioCont: { padding: 30, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 10 }
});