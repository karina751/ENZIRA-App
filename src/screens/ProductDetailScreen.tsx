import React, { useState } from 'react';
import { View, StyleSheet, Image, ScrollView, Platform, Dimensions } from 'react-native';
import { Text, Button, IconButton, Divider } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useCart } from '../context/CartContext';

const { width } = Dimensions.get('window');
const esWeb = Platform.OS === 'web' && width > 768;

export const ProductDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { producto } = route.params;
  const { agregarProducto } = useCart(); // Accedemos al carrito

  const [cantidad, setCantidad] = useState(1);

  // --- FIX DEL ERROR: Pasamos los 2 argumentos por separado ---
  const manejarAgregar = () => {
    agregarProducto(producto, cantidad); 
    navigation.navigate('Cart');
  };

  return (
    <View style={styles.container}>
      {/* BOTÓN VOLVER */}
      <IconButton 
        icon="arrow-left" 
        style={styles.botonVolver} 
        iconColor="#002147" 
        containerColor="rgba(255,250,237,0.8)"
        onPress={() => navigation.goBack()} 
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.wrapperResponsivo}>
          
          {/* SECCIÓN IMAGEN */}
          <View style={styles.seccionImagen}>
            <Image 
              source={{ uri: producto.imagen }} 
              style={styles.imagenPrincipal} 
              resizeMode={esWeb ? "contain" : "cover"} 
            />
          </View>

          {/* SECCIÓN DETALLES */}
          <View style={styles.seccionInfo}>
            <Text style={styles.categoriaLabel}>{producto.categoria?.toUpperCase() || 'COLECCIÓN EXCLUSIVA'}</Text>
            <Text style={styles.titulo}>{producto.nombre.toUpperCase()}</Text>
            <Text style={styles.precio}>${producto.precio}</Text>
            
            {producto.cuotas && (
              <Text style={styles.cuotasText}>💳 {producto.cuotas}</Text>
            )}

            <Divider style={styles.divider} />

            <View style={styles.filaStock}>
              <Text style={styles.disponibilidad}>
                Disponibilidad: <Text style={{fontWeight: 'bold'}}>{producto.stock} unidades</Text>
              </Text>
            </View>

            <Text style={styles.labelCantidad}>CANTIDAD:</Text>
            <View style={styles.selectorCantidad}>
              <IconButton 
                icon="minus" 
                onPress={() => cantidad > 1 && setCantidad(cantidad - 1)} 
                disabled={cantidad <= 1}
              />
              <Text style={styles.cantidadNumero}>{cantidad}</Text>
              <IconButton 
                icon="plus" 
                onPress={() => cantidad < producto.stock && setCantidad(cantidad + 1)} 
                disabled={cantidad >= producto.stock}
              />
            </View>

            <Button 
              mode="contained" 
              onPress={manejarAgregar}
              style={styles.botonCompra}
              buttonColor="#002147"
              textColor="#FFFAED"
              labelStyle={styles.labelBoton}
            >
              AÑADIR AL CARRITO
            </Button>

            <View style={styles.cajaDescripcion}>
              <Text style={styles.tituloDesc}>DESCRIPCIÓN</Text>
              <Text style={styles.cuerpoDesc}>
                Producto exclusivo de la colección ENZIRA. Diseñado con materiales de alta calidad y terminaciones artesanales de Salta. Ideal para llevar tu mundo con vos en cada ocasión.
              </Text>
            </View>
          </View>

        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFAED' },
  scrollContent: { flexGrow: 1, paddingVertical: esWeb ? 40 : 0 },
  wrapperResponsivo: {
    flexDirection: esWeb ? 'row' : 'column',
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: esWeb ? '#fff' : 'transparent',
    elevation: esWeb ? 2 : 0,
  },
  botonVolver: { position: 'absolute', top: 40, left: 10, zIndex: 10 },
  seccionImagen: {
    flex: esWeb ? 1.2 : 0,
    width: esWeb ? 'auto' : '100%',
    height: esWeb ? 600 : 450,
    backgroundColor: '#fff',
  },
  imagenPrincipal: { width: '100%', height: '100%' },
  seccionInfo: {
    flex: 1,
    padding: esWeb ? 50 : 25,
    justifyContent: 'center',
  },
  categoriaLabel: { color: '#CFAF68', fontSize: 12, fontWeight: 'bold', letterSpacing: 2, marginBottom: 10 },
  titulo: { fontSize: esWeb ? 32 : 24, fontWeight: 'bold', color: '#002147', marginBottom: 10, letterSpacing: 1 },
  precio: { fontSize: 26, color: '#002147', marginBottom: 5 },
  cuotasText: { color: '#CFAF68', fontWeight: 'bold', fontSize: 14, marginBottom: 20 },
  divider: { marginVertical: 20, backgroundColor: '#002147', opacity: 0.1 },
  filaStock: { marginBottom: 20 },
  disponibilidad: { fontSize: 14, color: '#002147', opacity: 0.6 },
  labelCantidad: { fontSize: 12, fontWeight: 'bold', color: '#002147', marginBottom: 10 },
  selectorCantidad: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    width: 140, 
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 30
  },
  cantidadNumero: { fontSize: 18, fontWeight: 'bold', color: '#002147' },
  botonCompra: { borderRadius: 0, paddingVertical: 10 },
  labelBoton: { fontWeight: 'bold', letterSpacing: 2, fontSize: 16 },
  cajaDescripcion: { marginTop: 40 },
  tituloDesc: { fontSize: 14, fontWeight: 'bold', color: '#002147', marginBottom: 10, letterSpacing: 1 },
  cuerpoDesc: { fontSize: 14, color: '#002147', lineHeight: 22, opacity: 0.7 }
});