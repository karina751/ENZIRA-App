import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, Dimensions, Alert, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

// Firebase
import { auth, db } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');
const esWeb = Platform.OS === 'web' && width > 768;

export const LoginScreen = () => {
  const navigation = useNavigation<any>();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  
  // --- FIX 1: Estado para alternar entre Login y Registro ---
  const [esRegistro, setEsRegistro] = useState(false);

  const manejarAutenticacion = async () => {
    if (!email || !password) {
      const msj = "Por favor, completá todos los campos.";
      esWeb ? alert(msj) : Alert.alert("ENZIRA", msj);
      return;
    }
    
    setCargando(true);
    try {
      if (esRegistro) {
        // --- LÓGICA DE REGISTRO PARA NUEVOS CLIENTES ---
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Guardamos el perfil en Firestore con rol 'cliente' por defecto
        await setDoc(doc(db, 'usuarios', userCredential.user.uid), {
          email: email,
          rol: 'cliente',
          fechaCreado: new Date()
        });
        
        const msjOk = "Cuenta creada con éxito. ¡Bienvenida a ENZIRA!";
        esWeb ? alert(msjOk) : Alert.alert("ENZIRA", msjOk);
      } else {
        // --- LÓGICA DE LOGIN ---
        await signInWithEmailAndPassword(auth, email, password);
      }
      
      navigation.navigate('Home'); 
    } catch (error: any) {
      console.log(error.code);
      let mensaje = "Error en la autenticación.";
      
      if (error.code === 'auth/email-already-in-use') mensaje = "Este email ya está registrado.";
      if (error.code === 'auth/invalid-credential') mensaje = "Credenciales incorrectas.";
      if (error.code === 'auth/weak-password') mensaje = "La contraseña debe tener al menos 6 caracteres.";

      esWeb ? alert(mensaje) : Alert.alert("SISTEMA", mensaje);
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={styles.container}>
      <IconButton 
        icon="close" 
        style={styles.botonCerrar} 
        onPress={() => navigation.goBack()} 
        iconColor="#002147"
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.cardLogin}>
          
          <View style={styles.header}>
            <Text style={styles.logo}>ENZIRA</Text>
            <Text style={styles.subtitulo}>ALTA COSTURA</Text>
            <View style={styles.lineaDecorativa} />
          </View>

          {/* FIX 2: Títulos dinámicos según el modo */}
          <Text style={styles.bienvenida}>
            {esRegistro ? 'CREAR CUENTA' : 'MI CUENTA'}
          </Text>
          <Text style={styles.instruccion}>
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
              outlineColor="#002147"
              activeOutlineColor="#CFAF68"
              style={styles.input}
              textColor="#002147"
            />

            <TextInput
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={!verPassword}
              outlineColor="#002147"
              activeOutlineColor="#CFAF68"
              style={styles.input}
              textColor="#002147"
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
              buttonColor="#002147"
              labelStyle={styles.labelBoton}
            >
              {esRegistro ? 'REGISTRARME AHORA' : 'INGRESAR'}
            </Button>

            {/* FIX 3: Link para alternar modo */}
            <TouchableOpacity 
                onPress={() => setEsRegistro(!esRegistro)} 
                style={styles.switchCont}
            >
                <Text style={styles.switchTexto}>
                    {esRegistro 
                        ? '¿Ya tenés cuenta? Iniciá sesión' 
                        : '¿No tenés cuenta? Registrate aquí'}
                </Text>
            </TouchableOpacity>

            <View style={styles.footerInfo}>
              <Text style={styles.copyright}>© 2026 ENZIRA. Alta Costura Salta.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFAED' },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  botonCerrar: { position: 'absolute', top: 40, right: 20, zIndex: 10 },
  cardLogin: {
    width: '100%',
    maxWidth: 450,
    padding: esWeb ? 60 : 25,
    backgroundColor: esWeb ? '#fff' : 'transparent',
    borderWidth: esWeb ? 1 : 0,
    borderColor: '#eee'
  },
  header: { alignItems: 'center', marginBottom: 50 },
  logo: { fontSize: 42, fontWeight: 'bold', color: '#002147', letterSpacing: 10 },
  subtitulo: { fontSize: 10, color: '#CFAF68', letterSpacing: 4, fontWeight: 'bold', marginTop: 5 },
  lineaDecorativa: { width: 40, height: 1, backgroundColor: '#CFAF68', marginTop: 15 },
  bienvenida: { fontSize: 22, fontWeight: 'bold', color: '#002147', textAlign: 'center', letterSpacing: 3 },
  instruccion: { fontSize: 11, color: '#CFAF68', fontWeight: 'bold', textAlign: 'center', marginBottom: 40, marginTop: 10, textTransform: 'uppercase', letterSpacing: 1 },
  form: { width: '100%' },
  input: { marginBottom: 15, backgroundColor: '#fff' },
  boton: { borderRadius: 0, paddingVertical: 10, marginTop: 15 },
  labelBoton: { fontWeight: 'bold', letterSpacing: 2, fontSize: 14, color: '#FFFAED' },
  switchCont: { marginTop: 25, alignItems: 'center' },
  switchTexto: { color: '#002147', fontWeight: 'bold', fontSize: 12, textDecorationLine: 'underline', opacity: 0.7 },
  footerInfo: { marginTop: 40, alignItems: 'center' },
  copyright: { fontSize: 9, color: '#002147', opacity: 0.3, letterSpacing: 1 }
});