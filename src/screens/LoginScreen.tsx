import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, Dimensions, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, IconButton, Snackbar, Portal } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

// Firebase y Tema
import { auth, db } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useAppTheme } from '../context/ThemeContext'; // <--- IMPORTANTE

const { width } = Dimensions.get('window');
const esWeb = Platform.OS === 'web' && width > 768;

export const LoginScreen = () => {
  const navigation = useNavigation<any>();
  const { theme } = useAppTheme(); // <--- COLORES DINÁMICOS
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [esRegistro, setEsRegistro] = useState(false);

  // Estados para el aviso elegante
  const [snackVisible, setSnackVisible] = useState(false);
  const [msjSnack, setMsjSnack] = useState('');

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
        dispararAviso("¡Bienvenida a ENZIRA! Cuenta creada con éxito.");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      
      // Esperamos un poquito si es registro para que vea el mensaje
      setTimeout(() => {
        navigation.navigate('Home'); 
      }, esRegistro ? 1500 : 0);

    } catch (error: any) {
      let mensaje = "Error en la autenticación.";
      if (error.code === 'auth/email-already-in-use') mensaje = "Este email ya está registrado.";
      if (error.code === 'auth/invalid-credential') mensaje = "Credenciales incorrectas.";
      if (error.code === 'auth/weak-password') mensaje = "La contraseña debe tener al menos 6 caracteres.";
      
      dispararAviso(mensaje);
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <IconButton 
        icon="close" 
        style={styles.botonCerrar} 
        onPress={() => navigation.goBack()} 
        iconColor={theme.primary}
      />

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
            {esRegistro 
              ? 'REGISTRATE PARA FINALIZAR TUS COMPRAS' 
              : 'ACCESO PARA CLIENTES Y GESTIÓN'}
          </Text>

          <View style={styles.form}>
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
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
              right={
                <TextInput.Icon 
                  icon={verPassword ? "eye-off" : "eye"} 
                  onPress={() => setVerPassword(!verPassword)} 
                />
              }
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

            <TouchableOpacity 
                onPress={() => setEsRegistro(!esRegistro)} 
                style={styles.switchCont}
            >
                <Text style={[styles.switchTexto, { color: theme.primary }]}>
                    {esRegistro 
                        ? '¿Ya tenés cuenta? Iniciá sesión' 
                        : '¿No tenés cuenta? Registrate aquí'}
                </Text>
            </TouchableOpacity>

            <View style={styles.footerInfo}>
              <Text style={[styles.copyright, { color: theme.primary }]}>© 2026 ENZIRA. Alta Costura Salta.</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* --- EL AVISO ELEGANTE --- */}
      <Portal>
        <Snackbar
            visible={snackVisible}
            onDismiss={() => setSnackVisible(false)}
            duration={3000}
            style={{ backgroundColor: theme.primary }}
            action={{
                label: 'OK',
                textColor: theme.onPrimary,
                onPress: () => setSnackVisible(false),
            }}
        >
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
  cardLogin: {
    width: '100%',
    maxWidth: 450,
    padding: esWeb ? 60 : 25,
    borderWidth: esWeb ? 1 : 0,
    borderColor: '#eee'
  },
  header: { alignItems: 'center', marginBottom: 50 },
  logo: { fontSize: 42, fontWeight: 'bold', letterSpacing: 10 },
  subtitulo: { fontSize: 10, letterSpacing: 4, fontWeight: 'bold', marginTop: 5 },
  lineaDecorativa: { width: 40, height: 1, marginTop: 15 },
  bienvenida: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', letterSpacing: 3 },
  instruccion: { fontSize: 11, fontWeight: 'bold', textAlign: 'center', marginBottom: 40, marginTop: 10, textTransform: 'uppercase', letterSpacing: 1 },
  form: { width: '100%' },
  input: { marginBottom: 15, backgroundColor: '#fff' },
  boton: { borderRadius: 0, paddingVertical: 10, marginTop: 15 },
  labelBoton: { fontWeight: 'bold', letterSpacing: 2, fontSize: 14 },
  switchCont: { marginTop: 25, alignItems: 'center' },
  switchTexto: { fontWeight: 'bold', fontSize: 12, textDecorationLine: 'underline', opacity: 0.7 },
  footerInfo: { marginTop: 40, alignItems: 'center' },
  copyright: { fontSize: 9, opacity: 0.3, letterSpacing: 1 }
});