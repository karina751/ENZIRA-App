import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, Dimensions, Alert, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

// Firebase
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

const { width } = Dimensions.get('window');
const esWeb = Platform.OS === 'web' && width > 768;

export const LoginScreen = () => {
  const navigation = useNavigation<any>();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [cargando, setCargando] = useState(false);

  const manejarLogin = async () => {
    if (!email || !password) {
      const msj = "Por favor, ingresá tus credenciales de acceso.";
      esWeb ? alert(msj) : Alert.alert("ENZIRA", msj);
      return;
    }
    setCargando(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigation.navigate('Home'); 
    } catch (error: any) {
      let mensaje = "Error al intentar ingresar.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        mensaje = "Credenciales de administrador incorrectas.";
      }
      
      if (esWeb) alert(mensaje);
      else Alert.alert("SISTEMA", mensaje);
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* BOTÓN VOLVER */}
      <IconButton 
        icon="close" 
        style={styles.botonCerrar} 
        onPress={() => navigation.goBack()} 
        iconColor="#002147"
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.cardLogin}>
          
          {/* LOGO / CABECERA */}
          <View style={styles.header}>
            <Text style={styles.logo}>ENZIRA</Text>
            <Text style={styles.subtitulo}>ALTA COSTURA</Text>
            <View style={styles.lineaDecorativa} />
          </View>

          {/* SALUDO PERSONALIZADO */}
          <Text style={styles.bienvenida}>BIENVENIDA MARIEL</Text>
          <Text style={styles.instruccion}>ACCESO EXCLUSIVO AL PANEL DE GESTIÓN DIRECTIVA</Text>

          {/* FORMULARIO */}
          <View style={styles.form}>
            <TextInput
              label="Usuario / Email"
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
              onPress={manejarLogin}
              loading={cargando}
              disabled={cargando}
              style={styles.boton}
              buttonColor="#002147"
              labelStyle={styles.labelBoton}
            >
              INGRESAR AL SISTEMA
            </Button>

            <View style={styles.footerInfo}>
              <Text style={styles.copyright}>© 2026 ENZIRA SISTEMAS. Acceso Protegido.</Text>
            </View>
          </View>

        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFAED' 
  },
  scroll: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20 
  },
  botonCerrar: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10
  },
  cardLogin: {
    width: '100%',
    maxWidth: 450,
    padding: esWeb ? 60 : 25,
    backgroundColor: esWeb ? '#fff' : 'transparent',
    borderRadius: esWeb ? 0 : 0, 
    borderWidth: esWeb ? 1 : 0,
    borderColor: '#eee'
  },
  header: {
    alignItems: 'center',
    marginBottom: 50
  },
  logo: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#002147',
    letterSpacing: 10
  },
  subtitulo: {
    fontSize: 10,
    color: '#CFAF68',
    letterSpacing: 4,
    fontWeight: 'bold',
    marginTop: 5
  },
  lineaDecorativa: {
    width: 40,
    height: 1,
    backgroundColor: '#CFAF68',
    marginTop: 15
  },
  bienvenida: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#002147',
    textAlign: 'center',
    letterSpacing: 3
  },
  instruccion: {
    fontSize: 11,
    color: '#CFAF68',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  form: {
    width: '100%'
  },
  input: {
    marginBottom: 15,
    backgroundColor: '#fff'
  },
  boton: {
    borderRadius: 0,
    paddingVertical: 10,
    marginTop: 15
  },
  labelBoton: {
    fontWeight: 'bold',
    letterSpacing: 2,
    fontSize: 14,
    color: '#FFFAED'
  },
  footerInfo: {
    marginTop: 40,
    alignItems: 'center'
  },
  copyright: {
    fontSize: 9,
    color: '#002147',
    opacity: 0.3,
    letterSpacing: 1
  }
});