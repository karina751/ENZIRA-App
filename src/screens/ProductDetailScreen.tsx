import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Image, ScrollView, Platform, Dimensions, Linking, BackHandler } from 'react-native';
import { Text, Button, IconButton, Divider, Surface, Snackbar, Chip } from 'react-native-paper';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
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

  // --- ✨ LÓGICA DEL BOTÓN FÍSICO "ATRÁS" (ANDROID) ✨ ---
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (navigation.canGoBack()) {
          navigation.goBack();
          return true; // Detiene la acción por defecto y vuelve atrás en la app
        }
        return false;
      };

      // Suscribimos el evento
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      // Limpiamos usando el método moderno .remove()
      return () => subscription.remove();
    }, [navigation])
  );

  // Lógica para el carrete de imágenes (Soporta una o varias fotos)
  const listaImagenes = producto.imagenes && producto.imagenes.length > 0 
    ? producto.imagenes 
    : [producto.imagen];

  const manejarAgregarAlCarrito = () => {
    addToCart(producto);
    setVisible(true);
  };

  const consultarDisponibilidad = () => {
    const mensaje = `¡Hola ENZIRA! ✨ Vi la cartera *${producto.nombre.toUpperCase()}* en la App pero figura agotada. ¿Tenés fecha de reingreso o algún modelo similar disponible? 😍`;
    const url = `https://wa.me/5493873001475?text=${encodeURIComponent(mensaje)}`;
    Linking.openURL(url);
  };

  const tieneStock = producto.stock > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Botón Volver Flotante */}
      <IconButton 
        icon="arrow-left" 
        style={[styles.botonVolver, { backgroundColor: theme.background + 'CC' }]} 
        onPress={() => navigation.goBack()} 
        iconColor={theme.primary}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={esWeb ? styles.layoutWeb : styles.layoutMobile}>
          
          {/* SECCIÓN IMÁGENES */}
          <Surface style={styles.contenedorImagen} elevation={1}>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {listaImagenes.map((img: string, index: number) => (
                <Image key={index} source={{ uri: img }} style={styles.imagen} />
              ))}
            </ScrollView>
            {listaImagenes.length > 1 && (
              <View style={styles.indicadorContenedor}>
                 <Text style={[styles.indicadorTexto, { backgroundColor: theme.primary + 'AA', color: theme.onPrimary }]}>
                    1 / {listaImagenes.length} desliza ➔
                 </Text>
              </View>
            )}
          </Surface>

          {/* SECCIÓN INFORMACIÓN */}
          <View style={styles.infoContainer}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.categoria, { color: theme.secondary }]}>
                    {producto.categoria?.toUpperCase()}
                </Text>
                
                {/* Chip de Stock dinámico */}
                {tieneStock ? (
                    producto.stock <= 3 && (
                        <Chip icon="alert-decagram" textStyle={{ fontSize: 10, fontWeight: 'bold', color: '#B00020' }} style={{ backgroundColor: '#FFF0F0' }}>
                            ¡ÚLTIMAS {producto.stock}!
                        </Chip>
                    )
                ) : (
                    <Chip icon="close-circle" textStyle={{ fontSize: 10, fontWeight: 'bold', color: '#666' }} style={{ backgroundColor: '#F5F5F5' }}>
                        AGOTADO
                    </Chip>
                )}
            </View>

            <Text style={[styles.nombre, { color: theme.primary }]}>
                {producto.nombre?.toUpperCase()}
            </Text>
            <View style={[styles.lineaDecorativa, { backgroundColor: theme.secondary }]} />
            
            <View style={styles.contenedorPrecio}>
                <Text style={[styles.precio, { color: theme.primary }]}>${producto.precio}</Text>
                
                {/* Información de Cuotas (Si están habilitadas) */}
                {producto.enCuotas && (
                    <Surface style={[styles.placaCuotas, { backgroundColor: theme.primary + '08', borderColor: theme.secondary }]} elevation={0}>
                        <IconButton icon="credit-card-outline" iconColor={theme.secondary} size={20} style={{ margin: 0 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.textoCuotas, { color: theme.text }]}>
                                {producto.cuotasNumero} CUOTAS SIN INTERÉS DE
                            </Text>
                            <Text style={[styles.montoCuota, { color: theme.primary }]}>
                                ${producto.cuotasValor}
                            </Text>
                        </View>
                    </Surface>
                )}
            </View>

            <Text style={[styles.tituloSeccion, { color: theme.primary, marginTop: 20 }]}>HISTORIA Y DISEÑO</Text>
            <Text style={[styles.descripcion, { color: theme.text }]}>
              {producto.descripcion || "Diseño exclusivo de la colección ENZIRA Alta Costura."}
            </Text>
            
            {/* FICHA TÉCNICA AUTOMATIZADA */}
            {producto.medidas && (producto.medidas.alto || producto.medidas.peso || producto.medidas.ancho) && (
                <View style={{ marginTop: 10 }}>
                    <Text style={[styles.tituloSeccion, { color: theme.primary }]}>FICHA TÉCNICA</Text>
                    <View style={styles.fichaBox}>
                        {producto.medidas.alto ? <Text style={styles.fichaText}>• Alto: {producto.medidas.alto} cm</Text> : null}
                        {producto.medidas.ancho ? <Text style={styles.fichaText}>• Ancho: {producto.medidas.ancho} cm</Text> : null}
                        {producto.medidas.profundidad ? <Text style={styles.fichaText}>• Fuelle: {producto.medidas.profundidad} cm</Text> : null}
                        {producto.medidas.asa ? <Text style={styles.fichaText}>• Caída de Asa: {producto.medidas.asa} cm</Text> : null}
                        {producto.medidas.peso ? <Text style={styles.fichaText}>• Peso: {producto.medidas.peso} gr</Text> : null}
                    </View>
                </View>
            )}

            <Divider style={styles.divider} />

            {/* BOTÓN DE ACCIÓN DINÁMICO */}
            <Button
              mode="contained"
              onPress={tieneStock ? manejarAgregarAlCarrito : consultarDisponibilidad}
              style={[styles.botonAccion, !tieneStock && { backgroundColor: theme.secondary }]}
              buttonColor={tieneStock ? theme.primary : theme.secondary}
              textColor={theme.onPrimary}
              labelStyle={styles.labelBoton}
              icon={tieneStock ? "cart-plus" : "whatsapp"}
            >
              {tieneStock ? 'AÑADIR AL CARRITO' : 'CONSULTAR REINGRESO'}
            </Button>

            <View style={styles.detallesEnvio}>
              <Text style={[styles.envioTexto, { color: theme.text }]}>✨ Envío exclusivo a todo el país</Text>
              <Text style={[styles.envioTexto, { color: theme.text }]}>✨ Calidad Garantizada ENZIRA</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* AVISO DE PRODUCTO AGREGADO */}
      <Snackbar
        visible={visible}
        onDismiss={() => setVisible(false)}
        duration={3000}
        style={{ backgroundColor: theme.primary }}
        action={{ label: 'VER CARRITO', textColor: theme.onPrimary, onPress: () => navigation.navigate('Cart') }}
      >
        <Text style={{ color: theme.onPrimary }}>¡{producto.nombre} ya está en tu carrito! ✨</Text>
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  botonVolver: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 20, left: 10, zIndex: 10 },
  scrollContent: { paddingBottom: 40 },
  layoutMobile: { flexDirection: 'column' },
  layoutWeb: { flexDirection: 'row', padding: 50, justifyContent: 'center', alignItems: 'flex-start' },
  contenedorImagen: { width: esWeb ? 500 : width, height: esWeb ? 500 : width * 1.3, backgroundColor: '#fff', overflow: 'hidden' },
  imagen: { width: esWeb ? 500 : width, height: '100%', resizeMode: 'cover' },
  indicadorContenedor: { position: 'absolute', bottom: 15, right: 15 },
  indicadorTexto: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, fontSize: 10, fontWeight: 'bold', overflow: 'hidden' },
  infoContainer: { flex: 1, padding: 30, maxWidth: esWeb ? 500 : '100%' },
  categoria: { fontSize: 12, letterSpacing: 2, fontWeight: 'bold' },
  nombre: { fontSize: 28, fontWeight: 'bold', letterSpacing: 3, marginTop: 5 },
  lineaDecorativa: { width: 40, height: 2, marginVertical: 15 },
  contenedorPrecio: { marginBottom: 20 },
  precio: { fontSize: 32, fontWeight: 'bold', marginBottom: 5 },
  placaCuotas: { flexDirection: 'row', alignItems: 'center', padding: 12, borderLeftWidth: 3, borderRadius: 4, marginTop: 10 },
  textoCuotas: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  montoCuota: { fontSize: 20, fontWeight: 'bold' },
  tituloSeccion: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 8 },
  descripcion: { fontSize: 14, lineHeight: 22, opacity: 0.8, marginBottom: 15 },
  fichaBox: { backgroundColor: 'rgba(0,0,0,0.02)', padding: 15, borderRadius: 5, marginBottom: 20, marginTop: 5 },
  fichaText: { fontSize: 12, opacity: 0.6, marginBottom: 4 },
  divider: { marginBottom: 30, opacity: 0.1 },
  botonAccion: { borderRadius: 0, paddingVertical: 8 },
  labelBoton: { fontWeight: 'bold', letterSpacing: 2, fontSize: 15 },
  detallesEnvio: { marginTop: 30 },
  envioTexto: { fontSize: 12, opacity: 0.5, marginBottom: 5, fontStyle: 'italic' },
});