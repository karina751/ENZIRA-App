import React, { useState, useCallback, useRef } from 'react'; // Agregamos useRef
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

  // --- ✨ NUEVAS REFERENCIAS Y ESTADOS ✨ ---
  const scrollRef = useRef<ScrollView>(null);
  const [visible, setVisible] = useState(false);
  const [verImagenFull, setVerImagenFull] = useState(false);
  const [indiceImagen, setIndiceImagen] = useState(0);

  const listaImagenes = producto.imagenes && producto.imagenes.length > 0 
    ? producto.imagenes 
    : [producto.imagen];

  // Función para mover el scroll con las flechitas
  const navegarImagen = (direccion: 'sig' | 'ant') => {
    let nuevoIndice = direccion === 'sig' ? indiceImagen + 1 : indiceImagen - 1;
    
    if (nuevoIndice >= 0 && nuevoIndice < listaImagenes.length) {
      const x = nuevoIndice * (esWeb ? 500 : width);
      scrollRef.current?.scrollTo({ x, animated: true });
      setIndiceImagen(nuevoIndice);
    }
  };

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

              {/* FLECHAS PARA WEB O MULTIFOTO */}
              {listaImagenes.length > 1 && (
                <>
                  {indiceImagen > 0 && (
                    <IconButton 
                      icon="chevron-left" 
                      style={styles.flechaIzquierda} 
                      onPress={() => navegarImagen('ant')} 
                      containerColor="rgba(255,250,237,0.7)"
                    />
                  )}
                  {indiceImagen < listaImagenes.length - 1 && (
                    <IconButton 
                      icon="chevron-right" 
                      style={styles.flechaDerecha} 
                      onPress={() => navegarImagen('sig')} 
                      containerColor="rgba(255,250,237,0.7)"
                    />
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

          {/* INFORMACIÓN DEL PRODUCTO */}
          <View style={styles.infoContainer}>
            <Text style={[styles.categoria, { color: theme.secondary }]}>{producto.categoria?.toUpperCase()}</Text>
            <Text style={[styles.nombre, { color: theme.primary }]}>{producto.nombre?.toUpperCase()}</Text>
            <View style={[styles.lineaDecorativa, { backgroundColor: theme.secondary }]} />
            <Text style={[styles.precio, { color: theme.primary }]}>${producto.precio}</Text>

            <Text style={[styles.tituloSeccion, { color: theme.primary, marginTop: 20 }]}>HISTORIA Y DISEÑO</Text>
            <Text style={[styles.descripcion, { color: theme.text }]}>{producto.descripcion}</Text>
            
            <Button
              mode="contained"
              onPress={() => { addToCart(producto); setVisible(true); }}
              style={styles.botonAccion}
              buttonColor={tieneStock ? theme.primary : theme.secondary}
              icon="cart-plus"
            >
              {tieneStock ? 'AÑADIR AL CARRITO' : 'CONSULTAR'}
            </Button>
          </View>
        </View>
      </ScrollView>

      <Snackbar visible={visible} onDismiss={() => setVisible(false)} style={{ backgroundColor: theme.primary }}>
        ¡{producto.nombre} ya está en tu carrito! ✨
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
  layoutWeb: { flexDirection: 'row', padding: 50, justifyContent: 'center' },
  
  contenedorSlider: { position: 'relative' },
  contenedorImagen: { width: esWeb ? 500 : width, height: esWeb ? 500 : width * 1.3, backgroundColor: '#fff', overflow: 'hidden' },
  imagen: { width: '100%', height: '100%', resizeMode: 'cover' },
  
  // ESTILOS DE LAS FLECHAS
  flechaIzquierda: { position: 'absolute', left: 5, top: '45%', zIndex: 5 },
  flechaDerecha: { position: 'absolute', right: 5, top: '45%', zIndex: 5 },

  indicadorContenedor: { position: 'absolute', bottom: 15, right: 15 },
  indicadorTexto: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, fontSize: 10, fontWeight: 'bold' },
  
  infoContainer: { flex: 1, padding: 30, maxWidth: esWeb ? 500 : '100%' },
  categoria: { fontSize: 12, letterSpacing: 2, fontWeight: 'bold' },
  nombre: { fontSize: 28, fontWeight: 'bold', marginTop: 5 },
  lineaDecorativa: { width: 40, height: 2, marginVertical: 15 },
  precio: { fontSize: 32, fontWeight: 'bold' },
  tituloSeccion: { fontSize: 10, fontWeight: 'bold', marginBottom: 8 },
  descripcion: { fontSize: 14, lineHeight: 22, marginBottom: 20 },
  botonAccion: { borderRadius: 0, paddingVertical: 8 },
});