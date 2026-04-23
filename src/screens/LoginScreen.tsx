import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, Dimensions, TouchableOpacity, FlatList } from 'react-native';
import { Text, TextInput, Button, IconButton, Snackbar, Portal, Card, Divider, List, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

// Firebase y Tema
import { auth, db } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useAppTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const esWeb = Platform.OS === 'web' && width > 768;

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

  // Estado para Pedidos del Cliente
  const [pedidos, setPedidos] = useState<any[]>([]);

  // Estados para avisos
  const [snackVisible, setSnackVisible] = useState(false);
  const [msjSnack, setMsjSnack] = useState('');

  // 1. ESCUCHAR ESTADO DE USUARIO Y SUS PEDIDOS
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Obtener Rol
        const docRef = doc(db, 'usuarios', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setRol(docSnap.data().rol);

        // Obtener sus Pedidos (Solo si es cliente)
        const q = query(
          collection(db, 'pedidos'),
          where('clienteUid', '==', currentUser.uid),
          orderBy('fecha', 'desc')
        );
        const unsubOrders = onSnapshot(q, (snap) => {
          let lista: any[] = [];
          snap.forEach(doc => lista.push({ id: doc.id, ...doc.data() }));
          setPedidos(lista);
        });
        return () => unsubOrders();
      } else {
        setRol(null);
        setPedidos([]);
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
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'usuarios', userCredential.user.uid), {
          email: email,
          rol: 'cliente',
          fechaCreado: new Date()
        });
        dispararAviso("¡Bienvenida! Cuenta creada con éxito.");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      let mensaje = "Error en la autenticación.";
      if (error.code === 'auth/email-already-in-use') mensaje = "Este email ya está registrado.";
      if (error.code === 'auth/invalid-credential') mensaje = "Credenciales incorrectas.";
      if (error.code === 'auth/weak-password') mensaje = "Mínimo 6 caracteres.";
      dispararAviso(mensaje);
    } finally {
      setCargando(false);
    }
  };

  const cerrarSesion = () => {
    signOut(auth);
    navigation.navigate('Home');
  };

  // --- VISTA A: SI EL USUARIO ESTÁ LOGUEADO (PERFIL Y PEDIDOS) ---
  if (user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <IconButton icon="arrow-left" style={styles.botonCerrar} onPress={() => navigation.goBack()} iconColor={theme.primary} />
        
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.cardLogin}>
            <Text style={[styles.logo, { color: theme.primary, textAlign: 'center' }]}>MI PERFIL</Text>
            <Text style={[styles.subtitulo, { color: theme.secondary, textAlign: 'center', marginBottom: 20 }]}>
              {user.email}
            </Text>

            <Divider style={{ marginBottom: 20 }} />

            <Text style={[styles.bienvenida, { color: theme.primary, fontSize: 16, marginBottom: 15 }]}>
                HISTORIAL DE PEDIDOS
            </Text>

            {pedidos.length === 0 ? (
                <Text style={{ color: theme.text, opacity: 0.5, textAlign: 'center', fontStyle: 'italic' }}>
                    Aún no has realizado pedidos.
                </Text>
            ) : (
                pedidos.map((item) => (
                    <Card key={item.id} style={styles.orderCard} elevation={1}>
                        <Card.Content>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontWeight: 'bold', color: theme.primary }}>
                                    {item.fecha?.toDate ? item.fecha.toDate().toLocaleDateString() : 'Reciente'}
                                </Text>
                                <Chip 
                                    textStyle={{ fontSize: 10, color: '#fff' }} 
                                    style={{ backgroundColor: item.estado === 'Pendiente' ? theme.primary : '#25D366' }}
                                >
                                    {item.estado}
                                </Chip>
                            </View>
                            <Text style={{ fontSize: 12, marginTop: 5, color: theme.text }}>
                                {item.items?.length} productos • Total: ${item.total}
                            </Text>
                        </Card.Content>
                    </Card>
                ))
            )}

            <Button 
                mode="outlined" 
                onPress={cerrarSesion} 
                style={{ marginTop: 40, borderColor: theme.primary }} 
                textColor={theme.primary}
            >
              CERRAR SESIÓN
            </Button>
          </View>
        </ScrollView>
      </View>
    );
  }

  // --- VISTA B: FORMULARIO DE LOGIN (EL QUE YA TENÍAS) ---
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <IconButton icon="close" style={styles.botonCerrar} onPress={() => navigation.goBack()} iconColor={theme.primary} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.cardLogin, { backgroundColor: esWeb ? theme.background : 'transparent' }]}>
          
          <View style={styles.header}>
            <Text style={[styles.logo, { color: theme.primary }]}>ENZIRA</Text>
            <Text style={[styles.subtitulo, { color: theme.secondary }]}>ALTA COSTURA</Text>
            <View style={[styles.lineaDecorativa, { backgroundColor: theme.secondary }]} />
          </View>

          <Text style={[styles.bienvenida, { color: theme.primary }]}>
            {esRegistro ? 'CREAR CUENTA' : 'MI CUENTA'}
          </Text>
          <Text style={[styles.instruccion, { color: theme.secondary }]}>
            {esRegistro ? 'REGISTRATE PARA TUS COMPRAS' : 'ACCESO PARA CLIENTES'}
          </Text>

          <View style={styles.form}>
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              outlineColor={theme.primary}
              activeOutlineColor={theme.secondary}
              style={styles.input}
              textColor={theme.text}
            />

            <TextInput
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={!verPassword}
              outlineColor={theme.primary}
              activeOutlineColor={theme.secondary}
              style={styles.input}
              textColor={theme.text}
              right={<TextInput.Icon icon={verPassword ? "eye-off" : "eye"} onPress={() => setVerPassword(!verPassword)} />}
            />

            <Button
              mode="contained"
              onPress={manejarAutenticacion}
              loading={cargando}
              disabled={cargando}
              style={styles.boton}
              buttonColor={theme.primary}
              labelStyle={[styles.labelBoton, { color: theme.onPrimary }]}
            >
              {esRegistro ? 'REGISTRARME AHORA' : 'INGRESAR'}
            </Button>

            <TouchableOpacity onPress={() => setEsRegistro(!esRegistro)} style={styles.switchCont}>
              <Text style={[styles.switchTexto, { color: theme.primary }]}>
                {esRegistro ? '¿Ya tenés cuenta? Iniciá sesión' : '¿No tenés cuenta? Registrate aquí'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Portal>
        <Snackbar visible={snackVisible} onDismiss={() => setSnackVisible(false)} duration={3000} style={{ backgroundColor: theme.primary }}>
          <Text style={{ color: theme.onPrimary }}>{msjSnack}</Text>
        </Snackbar>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  botonCerrar: { position: 'absolute', top: 40, right: 20, zIndex: 10 },
  cardLogin: { width: '100%', maxWidth: 450, padding: 25 },
  header: { alignItems: 'center', marginBottom: 50 },
  logo: { fontSize: 38, fontWeight: 'bold', letterSpacing: 8 },
  subtitulo: { fontSize: 10, letterSpacing: 4, fontWeight: 'bold', marginTop: 5 },
  lineaDecorativa: { width: 40, height: 1, marginTop: 15 },
  bienvenida: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', letterSpacing: 2 },
  instruccion: { fontSize: 10, textAlign: 'center', marginBottom: 30, marginTop: 10, letterSpacing: 1 },
  form: { width: '100%' },
  input: { marginBottom: 15, backgroundColor: '#fff' },
  boton: { borderRadius: 0, paddingVertical: 10 },
  labelBoton: { fontWeight: 'bold', letterSpacing: 2, fontSize: 14 },
  switchCont: { marginTop: 25, alignItems: 'center' },
  switchTexto: { fontWeight: 'bold', fontSize: 12, textDecorationLine: 'underline', opacity: 0.7 },
  orderCard: { marginBottom: 10, backgroundColor: '#fff', borderRadius: 0, borderLeftWidth: 3, borderLeftColor: '#CFAF68' }
});