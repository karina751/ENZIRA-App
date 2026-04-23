import React, { useState } from 'react';
import { View, StyleSheet, Image, ScrollView, Platform, Dimensions } from 'react-native';
import { Text, Button, IconButton, Divider, Surface, Snackbar } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useCart } from '../context/CartContext';
import { useAppTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const esWeb = Platform.OS === 'web' && width > 768;

export const ProductDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { producto } = route.params;
  const { theme } = useAppTheme();
  const { addToCart } = useCart();

  const [visible, setVisible] = useState(false);

  // Lógica para el carrete: si no hay array de imágenes, usamos la imagen única antigua
  const listaImagenes = producto.imagenes && producto.imagenes.length > 0 
    ? producto.imagenes 
    : [producto.imagen];

  const manejarAgregarAlCarrito = () => {
    addToCart(producto);
    setVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* BOTÓN VOLVER */}
      <IconButton 
        icon="arrow-left" 
        style={[styles.botonVolver, { backgroundColor: theme.background + 'CC' }]} 
        onPress={() => navigation.goBack()} 
        iconColor={theme.primary}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={esWeb ? styles.layoutWeb : styles.layoutMobile}>
          
          {/* CARRETE DE IMÁGENES (Paging Enabled para efecto Carousel) */}
          <Surface style={styles.contenedorImagen} elevation={1}>
            <ScrollView 
              horizontal 
              pagingEnabled 
              showsHorizontalScrollIndicator={false}
            >
              {listaImagenes.map((img: string, index: number) => (
                <Image 
                  key={index} 
                  source={{ uri: img }} 
                  style={styles.imagen} 
                />
              ))}
            </ScrollView>
            
            {/* Indicador visual simple si hay más de una foto */}
            {listaImagenes.length > 1 && (
              <View style={styles.indicadorContenedor}>
                 <Text style={[styles.indicadorTexto, { backgroundColor: theme.primary + 'AA', color: theme.onPrimary }]}>
                    1 / {listaImagenes.length} desliza ➔
                 </Text>
              </View>
            )}
          </Surface>

          {/* INFORMACIÓN Y COMPRA */}
          <View style={styles.infoContainer}>
            <Text style={[styles.categoria, { color: theme.secondary }]}>
                {producto.categoria.toUpperCase()}
            </Text>
            <Text style={[styles.nombre, { color: theme.primary }]}>
                {producto.nombre.toUpperCase()}
            </Text>
            <View style={[styles.lineaDecorativa, { backgroundColor: theme.secondary }]} />
            
            <Text style={[styles.precio, { color: theme.primary }]}>${producto.precio}</Text>
            
            {/* SECCIÓN DE DETALLES TÉCNICOS */}
            <Text style={[styles.tituloSeccion, { color: theme.primary }]}>DESCRIPCIÓN Y MEDIDAS</Text>
            <Text style={[styles.descripcion, { color: theme.text }]}>
              {producto.descripcion || "Diseño exclusivo de la colección ENZIRA Alta Costura. Calidad garantizada en cada detalle."}
            </Text>

            <Divider style={styles.divider} />

            <Button
              mode="contained"
              onPress={manejarAgregarAlCarrito}
              style={styles.botonAgregar}
              buttonColor={theme.primary}
              textColor={theme.onPrimary}
              labelStyle={styles.labelBoton}
              icon="cart-plus"
            >
              AÑADIR AL CARRITO
            </Button>

            <View style={styles.detallesEnvio}>
              <Text style={[styles.envioTexto, { color: theme.text }]}>✨ Envío exclusivo a todo el país</Text>
              <Text style={[styles.envioTexto, { color: theme.text }]}>✨ Calidad Garantizada ENZIRA</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <Snackbar
        visible={visible}
        onDismiss={() => setVisible(false)}
        duration={3000}
        style={{ backgroundColor: theme.primary }}
        action={{
          label: 'VER CARRITO',
          textColor: theme.onPrimary,
          onPress: () => navigation.navigate('Cart'),
        }}
      >
        <Text style={{ color: theme.onPrimary }}>
            ¡{producto.nombre} ya está en tu carrito! ✨
        </Text>
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  botonVolver: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 10,
    zIndex: 10,
  },
  scrollContent: { paddingBottom: 40 },
  layoutMobile: { flexDirection: 'column' },
  layoutWeb: {
    flexDirection: 'row',
    padding: 50,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  contenedorImagen: {
    width: esWeb ? 500 : width,
    height: esWeb ? 500 : width * 1.3,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  imagen: { 
    width: esWeb ? 500 : width, 
    height: '100%', 
    resizeMode: 'cover' 
  },
  indicadorContenedor: {
    position: 'absolute',
    bottom: 15,
    right: 15,
  },
  indicadorTexto: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    fontSize: 10,
    fontWeight: 'bold',
    overflow: 'hidden'
  },
  infoContainer: {
    flex: 1,
    padding: 30,
    maxWidth: esWeb ? 500 : '100%',
  },
  categoria: { fontSize: 12, letterSpacing: 2, fontWeight: 'bold', marginBottom: 10 },
  nombre: { fontSize: 28, fontWeight: 'bold', letterSpacing: 3 },
  lineaDecorativa: { width: 40, height: 2, marginVertical: 15 },
  precio: { fontSize: 24, fontWeight: 'bold', marginBottom: 25 },
  tituloSeccion: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 8 },
  descripcion: { fontSize: 14, lineHeight: 22, opacity: 0.8, marginBottom: 30 },
  divider: { marginBottom: 30, opacity: 0.1 },
  botonAgregar: { borderRadius: 0, paddingVertical: 8 },
  labelBoton: { fontWeight: 'bold', letterSpacing: 2, fontSize: 16 },
  detallesEnvio: { marginTop: 30 },
  envioTexto: { fontSize: 12, opacity: 0.5, marginBottom: 5, fontStyle: 'italic' },
});