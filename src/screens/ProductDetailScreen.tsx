import React, { useState, useCallback, useRef } from 'react';
import { 
  View, StyleSheet, Image, ScrollView, Platform, Dimensions, 
  Linking, BackHandler, Modal, TouchableOpacity 
} from 'react-native';
import { Text, Button, IconButton, Divider, Surface, Snackbar, Chip } from 'react-native-paper';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCart } from '../context/CartContext';
import { useAppTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');
const esWeb = Platform.OS === 'web' && width > 768;

export const ProductDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { producto } = route.params;
  const { theme } = useAppTheme();
  const { addToCart } = useCart();

  const scrollRef = useRef<ScrollView>(null);
  const [visible, setVisible] = useState(false);
  const [verImagenFull, setVerImagenFull] = useState(false);
  const [indiceImagen, setIndiceImagen] = useState(0);

  const listaImagenes = producto.imagenes && producto.imagenes.length > 0 
    ? producto.imagenes 
    : [producto.imagen];

  // --- ✨ LÓGICA DE NAVEGACIÓN DE IMÁGENES ✨ ---
  const navegarImagen = (direccion: 'sig' | 'ant') => {
    let nuevoIndice = direccion === 'sig' ? indiceImagen + 1 : indiceImagen - 1;
    if (nuevoIndice >= 0 && nuevoIndice < listaImagenes.length) {
      const x = nuevoIndice * (esWeb ? 500 : width);
      scrollRef.current?.scrollTo({ x, animated: true });
      setIndiceImagen(nuevoIndice);
    }
  };

  // --- ✨ BOTÓN FÍSICO ATRÁS (ANDROID) ✨ ---
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (verImagenFull) {
          setVerImagenFull(false);
          return true;
        }
        if (navigation.canGoBack()) {
          navigation.goBack();
          return true;
        }
        return false;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [navigation, verImagenFull])
  );

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
      
      {/* MODAL DE ZOOM */}
      <Modal visible={verImagenFull} transparent={true} animationType="fade">
        <View style={styles.modalContainer}>
          <IconButton 
            icon="close" 
            iconColor="white" 
            size={30} 
            style={styles.botonCerrarModal} 
            onPress={() => setVerImagenFull(false)} 
          />
          <ScrollView maximumZoomScale={3} minimumZoomScale={1} centerContent={true}>
            <Image source={{ uri: listaImagenes[indiceImagen] }} style={styles.imagenFull} resizeMode="contain" />
          </ScrollView>
        </View>
      </Modal>

      <IconButton 
        icon="arrow-left" 
        style={[styles.botonVolver, { backgroundColor: theme.background + 'CC' }]} 
        onPress={() => navigation.goBack()} 
        iconColor={theme.primary}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={esWeb ? styles.layoutWeb : styles.layoutMobile}>
          
          {/* SECCIÓN IMÁGENES CON FLECHAS */}
          <View style={styles.contenedorSlider}>
            <Surface style={styles.contenedorImagen} elevation={1}>
              <ScrollView 
                ref={scrollRef}
                horizontal 
                pagingEnabled 
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={(e) => {
                  const x = e.nativeEvent.contentOffset.x;
                  const w = e.nativeEvent.layoutMeasurement.width;
                  if (w > 0) {
                    const nuevoIndice = Math.round(x / w);
                    if (nuevoIndice !== indiceImagen) setIndiceImagen(nuevoIndice);
                  }
                }}
              >
                {listaImagenes.map((img: string, index: number) => (
                  <TouchableOpacity 
                    key={index} 
                    activeOpacity={1} 
                    onPress={() => setVerImagenFull(true)}
                    style={{ width: esWeb ? 500 : width, height: '100%' }}
                  >
                    <Image source={{ uri: img }} style={styles.imagen} />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {listaImagenes.length > 1 && (
                <>
                  {indiceImagen > 0 && (
                    <IconButton icon="chevron-left" style={styles.flechaIzquierda} onPress={() => navegarImagen('ant')} containerColor="rgba(255,250,237,0.8)" />
                  )}
                  {indiceImagen < listaImagenes.length - 1 && (
                    <IconButton icon="chevron-right" style={styles.flechaDerecha} onPress={() => navegarImagen('sig')} containerColor="rgba(255,250,237,0.8)" />
                  )}
                </>
              )}
              
              <View style={styles.indicadorContenedor}>
                 <Text style={[styles.indicadorTexto, { backgroundColor: theme.primary + 'AA', color: theme.onPrimary }]}>
                    {indiceImagen + 1} / {listaImagenes.length} 🔍
                 </Text>
              </View>
            </Surface>
          </View>

          {/* SECCIÓN INFORMACIÓN RECUPERADA */}
          <View style={styles.infoContainer}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.categoria, { color: theme.secondary }]}>{producto.categoria?.toUpperCase()}</Text>
                
                {/* REINSTALACIÓN DE CHIPS DE STOCK */}
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

            <Text style={[styles.nombre, { color: theme.primary }]}>{producto.nombre?.toUpperCase()}</Text>
            <View style={[styles.lineaDecorativa, { backgroundColor: theme.secondary }]} />
            
            <View style={styles.contenedorPrecio}>
                <Text style={[styles.precio, { color: theme.primary }]}>${producto.precio}</Text>
                
                {/* REINSTALACIÓN DE PLACA DE CUOTAS */}
                {producto.enCuotas && (
                    <Surface style={[styles.placaCuotas, { backgroundColor: theme.primary + '08', borderColor: theme.secondary }]} elevation={0}>
                        <IconButton icon="credit-card-outline" iconColor={theme.secondary} size={20} style={{ margin: 0 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.textoCuotas, { color: theme.text }]}>{producto.cuotasNumero} CUOTAS SIN INTERÉS DE</Text>
                            <Text style={[styles.montoCuota, { color: theme.primary }]}>${producto.cuotasValor}</Text>
                        </View>
                    </Surface>
                )}
            </View>

            <Text style={[styles.tituloSeccion, { color: theme.primary, marginTop: 20 }]}>HISTORIA Y DISEÑO</Text>
            <Text style={[styles.descripcion, { color: theme.text }]}>{producto.descripcion || "Diseño exclusivo ENZIRA."}</Text>
            
            {/* REINSTALACIÓN DE FICHA TÉCNICA */}
            {producto.medidas && (producto.medidas.alto || producto.medidas.ancho) && (
                <View style={styles.fichaBox}>
                    <Text style={[styles.tituloSeccion, { color: theme.primary }]}>FICHA TÉCNICA</Text>
                    {producto.medidas.alto && <Text style={styles.fichaText}>• Alto: {producto.medidas.alto} cm</Text>}
                    {producto.medidas.ancho && <Text style={styles.fichaText}>• Ancho: {producto.medidas.ancho} cm</Text>}
                    {producto.medidas.peso && <Text style={styles.fichaText}>• Peso: {producto.medidas.peso} gr</Text>}
                </View>
            )}

            <Divider style={styles.divider} />

            {/* BOTÓN DINÁMICO RECUPERADO */}
            <Button
              mode="contained"
              onPress={tieneStock ? manejarAgregarAlCarrito : consultarDisponibilidad}
              style={styles.botonAccion}
              buttonColor={tieneStock ? theme.primary : theme.secondary}
              textColor={theme.onPrimary}
              icon={tieneStock ? "cart-plus" : "whatsapp"}
            >
              {tieneStock ? 'AÑADIR AL CARRITO' : 'CONSULTAR REINGRESO'}
            </Button>
          </View>
        </View>
      </ScrollView>

      {/* SNACKBAR CON ACCIÓN RECUPERADA */}
      <Snackbar
        visible={visible}
        onDismiss={() => setVisible(false)}
        duration={3000}
        style={{ backgroundColor: theme.primary }}
        action={{ 
          label: 'VER CARRITO', 
          textColor: theme.onPrimary, 
          onPress: () => navigation.navigate('Cart') 
        }}
      >
        <Text style={{ color: theme.onPrimary }}>¡{producto.nombre} agregado! ✨</Text>
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  modalContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  botonCerrarModal: { position: 'absolute', top: 40, right: 15, zIndex: 20 },
  imagenFull: { width: width, height: height * 0.8 },
  botonVolver: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 20, left: 10, zIndex: 10 },
  scrollContent: { paddingBottom: 40 },
  layoutMobile: { flexDirection: 'column' },
  layoutWeb: { flexDirection: 'row', padding: 50, justifyContent: 'center', alignItems: 'flex-start' },
  contenedorSlider: { position: 'relative' },
  contenedorImagen: { width: esWeb ? 500 : width, height: esWeb ? 500 : width * 1.3, backgroundColor: '#fff', overflow: 'hidden' },
  imagen: { width: '100%', height: '100%', resizeMode: 'cover' },
  flechaIzquierda: { position: 'absolute', left: 5, top: '45%', zIndex: 5 },
  flechaDerecha: { position: 'absolute', right: 5, top: '45%', zIndex: 5 },
  indicadorContenedor: { position: 'absolute', bottom: 15, right: 15 },
  indicadorTexto: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, fontSize: 10, fontWeight: 'bold' },
  infoContainer: { flex: 1, padding: 30, maxWidth: esWeb ? 500 : '100%' },
  categoria: { fontSize: 12, letterSpacing: 2, fontWeight: 'bold' },
  nombre: { fontSize: 28, fontWeight: 'bold', marginTop: 5 },
  lineaDecorativa: { width: 40, height: 2, marginVertical: 15 },
  contenedorPrecio: { marginBottom: 20 },
  precio: { fontSize: 32, fontWeight: 'bold' },
  placaCuotas: { flexDirection: 'row', alignItems: 'center', padding: 12, borderLeftWidth: 3, borderRadius: 4, marginTop: 10 },
  textoCuotas: { fontSize: 10, fontWeight: 'bold' },
  montoCuota: { fontSize: 20, fontWeight: 'bold' },
  tituloSeccion: { fontSize: 10, fontWeight: 'bold', marginBottom: 8 },
  descripcion: { fontSize: 14, lineHeight: 22, marginBottom: 15 },
  fichaBox: { backgroundColor: 'rgba(0,0,0,0.02)', padding: 15, borderRadius: 5, marginTop: 20 },
  fichaText: { fontSize: 12, opacity: 0.6, marginBottom: 4 },
  divider: { marginVertical: 30, opacity: 0.1 },
  botonAccion: { borderRadius: 0, paddingVertical: 8 },
});