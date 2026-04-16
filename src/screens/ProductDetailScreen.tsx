import React from 'react';
import { View, StyleSheet, Image, ScrollView, Platform, Dimensions, Alert } from 'react-native';
import { Text, Button, IconButton, Divider, Surface } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useCart } from '../context/CartContext';

const { width } = Dimensions.get('window');
const esWeb = Platform.OS === 'web' && width > 768;

export const ProductDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { producto } = route.params;
  
  // FIX: Usamos addToCart que es el nombre que definimos en el CartContext
  const { addToCart } = useCart();

  const manejarAgregarAlCarrito = () => {
    addToCart(producto);
    
    if (Platform.OS === 'web') {
      // Un aviso sutil en web
      alert(`${producto.nombre} agregado al carrito`);
    } else {
      Alert.alert(
        "ENZIRA",
        "Producto agregado con éxito",
        [
          { text: "Seguir comprando", style: "cancel" },
          { text: "Ver Carrito", onPress: () => navigation.navigate('Cart') }
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* BOTÓN VOLVER */}
      <IconButton 
        icon="arrow-left" 
        style={styles.botonVolver} 
        onPress={() => navigation.goBack()} 
        iconColor="#002147"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={esWeb ? styles.layoutWeb : styles.layoutMobile}>
          
          {/* IMAGEN DEL PRODUCTO */}
          <Surface style={styles.contenedorImagen} elevation={1}>
            <Image source={{ uri: producto.imagen }} style={styles.imagen} />
          </Surface>

          {/* INFORMACIÓN Y COMPRA */}
          <View style={styles.infoContainer}>
            <Text style={styles.categoria}>{producto.categoria.toUpperCase()}</Text>
            <Text style={styles.nombre}>{producto.nombre.toUpperCase()}</Text>
            <View style={styles.lineaDecorativa} />
            
            <Text style={styles.precio}>${producto.precio}</Text>
            
            <Text style={styles.descripcion}>
              {producto.descripcion || "Diseño exclusivo de la colección ENZIRA Alta Costura. Confeccionado con los mejores materiales para garantizar durabilidad y elegancia en cada detalle."}
            </Text>

            <Divider style={styles.divider} />

            <Button
              mode="contained"
              onPress={manejarAgregarAlCarrito}
              style={styles.botonAgregar}
              buttonColor="#002147"
              labelStyle={styles.labelBoton}
              icon="cart-plus"
            >
              AÑADIR AL CARRITO
            </Button>

            <View style={styles.detallesEnvio}>
              <Text style={styles.envioTexto}>✨ Envío exclusivo a todo el país</Text>
              <Text style={styles.envioTexto}>✨ Calidad Garantizada ENZIRA</Text>
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
    backgroundColor: '#FFFAED',
  },
  botonVolver: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 10,
    zIndex: 10,
    backgroundColor: 'rgba(255,250,237, 0.8)',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  layoutMobile: {
    flexDirection: 'column',
  },
  layoutWeb: {
    flexDirection: 'row',
    padding: 50,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  contenedorImagen: {
    width: esWeb ? 500 : width,
    height: esWeb ? 500 : width * 1.2,
    backgroundColor: '#fff',
  },
  imagen: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  infoContainer: {
    flex: 1,
    padding: 30,
    maxWidth: esWeb ? 500 : '100%',
  },
  categoria: {
    fontSize: 12,
    color: '#CFAF68',
    letterSpacing: 2,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  nombre: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#002147',
    letterSpacing: 3,
  },
  lineaDecorativa: {
    width: 40,
    height: 2,
    backgroundColor: '#CFAF68',
    marginVertical: 15,
  },
  precio: {
    fontSize: 24,
    color: '#002147',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  descripcion: {
    fontSize: 14,
    color: '#002147',
    lineHeight: 22,
    opacity: 0.7,
    marginBottom: 30,
  },
  divider: {
    marginBottom: 30,
    opacity: 0.1,
  },
  botonAgregar: {
    borderRadius: 0,
    paddingVertical: 8,
  },
  labelBoton: {
    fontWeight: 'bold',
    letterSpacing: 2,
    fontSize: 16,
  },
  detallesEnvio: {
    marginTop: 30,
  },
  envioTexto: {
    fontSize: 12,
    color: '#002147',
    opacity: 0.5,
    marginBottom: 5,
    fontStyle: 'italic',
  },
});