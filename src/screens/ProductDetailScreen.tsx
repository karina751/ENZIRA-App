import React, { useState } from 'react';
import { View, StyleSheet, Image, ScrollView, Platform, Dimensions, Linking } from 'react-native';
import { Text, Button, IconButton, Divider, Surface, Snackbar, Chip } from 'react-native-paper';
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

  const listaImagenes = producto.imagenes && producto.imagenes.length > 0 ? producto.imagenes : [producto.imagen];
  const tieneStock = producto.stock > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <IconButton icon="arrow-left" style={styles.botonVolver} onPress={() => navigation.goBack()} iconColor={theme.primary} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={esWeb ? styles.layoutWeb : styles.layoutMobile}>
          <Surface style={styles.contenedorImagen} elevation={1}>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {listaImagenes.map((img: string, i: number) => (<Image key={i} source={{ uri: img }} style={styles.imagen} />))}
            </ScrollView>
            {listaImagenes.length > 1 && <View style={styles.indicadorContenedor}><Text style={[styles.indicadorTexto, { backgroundColor: theme.primary + 'AA', color: '#fff' }]}>1 / {listaImagenes.length} desliza ➔</Text></View>}
          </Surface>

          <View style={styles.infoContainer}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.categoria, { color: theme.secondary }]}>{producto.categoria.toUpperCase()}</Text>
                {tieneStock ? (producto.stock <= 3 && <Chip icon="alert-decagram" textStyle={{ fontSize: 10, color: '#B00020' }}>ÚLTIMAS {producto.stock}</Chip>) : <Chip icon="close-circle">AGOTADO</Chip>}
            </View>
            <Text style={[styles.nombre, { color: theme.primary }]}>{producto.nombre.toUpperCase()}</Text>
            <View style={[styles.lineaDecorativa, { backgroundColor: theme.secondary }]} />
            
            <View style={styles.contenedorPrecio}>
                <Text style={[styles.precio, { color: theme.primary }]}>${producto.precio}</Text>
                {producto.enCuotas && (
                    <Surface style={[styles.placaCuotas, { backgroundColor: theme.primary + '08' }]} elevation={0}>
                        <IconButton icon="credit-card-outline" iconColor={theme.secondary} size={20} />
                        <View><Text style={styles.textoCuotas}>{producto.cuotasNumero} CUOTAS SIN INTERÉS DE</Text><Text style={[styles.montoCuota, { color: theme.primary }]}>${producto.cuotasValor}</Text></View>
                    </Surface>
                )}
            </View>

            <Text style={[styles.tituloSeccion, { color: theme.primary, marginTop: 20 }]}>SOBRE ESTA PIEZA</Text>
            <Text style={[styles.descripcion, { color: theme.text }]}>{producto.descripcion || "Un diseño pensado para acompañarte en cada momento."}</Text>

            {producto.medidas && (
                <>
                    <Text style={[styles.tituloSeccion, { color: theme.primary, marginTop: 15 }]}>ESPECIFICACIONES TÉCNICAS</Text>
                    <Surface style={styles.tablaMedidas} elevation={0}>
                        {producto.medidas.alto && <Text style={styles.medidaItem}>• **Alto:** {producto.medidas.alto} cm.</Text>}
                        {producto.medidas.ancho && <Text style={styles.medidaItem}>• **Ancho:** {producto.medidas.ancho} cm.</Text>}
                        {producto.medidas.profundidad && <Text style={styles.medidaItem}>• **Fuelle:** {producto.medidas.profundidad} cm.</Text>}
                        {producto.medidas.asa && <Text style={styles.medidaItem}>• **Caída de asa:** {producto.medidas.asa} cm.</Text>}
                        {producto.medidas.peso && <Text style={styles.medidaItem}>• **Peso aprox:** {producto.medidas.peso} gr.</Text>}
                    </Surface>
                </>
            )}

            <Divider style={styles.divider} />
            <Button mode="contained" onPress={tieneStock ? () => { addToCart(producto); setVisible(true); } : () => Linking.openURL(`https://wa.me/5493873001475?text=Consulta: ${producto.nombre}`)} buttonColor={tieneStock ? theme.primary : theme.secondary} textColor="#fff" icon={tieneStock ? "cart-plus" : "whatsapp"}>{tieneStock ? 'AÑADIR AL CARRITO' : 'CONSULTAR REINGRESO'}</Button>
          </View>
        </View>
      </ScrollView>
      <Snackbar visible={visible} onDismiss={() => setVisible(false)} duration={3000} action={{ label: 'VER', onPress: () => navigation.navigate('Cart') }}><Text style={{ color: '#fff' }}>¡Añadido! ✨</Text></Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  botonVolver: { position: 'absolute', top: 20, left: 10, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.8)' },
  scrollContent: { paddingBottom: 40 },
  layoutMobile: { flexDirection: 'column' },
  layoutWeb: { flexDirection: 'row', padding: 50, justifyContent: 'center' },
  contenedorImagen: { width: esWeb ? 500 : width, height: esWeb ? 500 : width * 1.3, overflow: 'hidden' },
  imagen: { width: esWeb ? 500 : width, height: '100%', resizeMode: 'cover' },
  indicadorContenedor: { position: 'absolute', bottom: 15, right: 15 },
  indicadorTexto: { padding: 5, borderRadius: 15, fontSize: 10, fontWeight: 'bold' },
  infoContainer: { flex: 1, padding: 30 },
  categoria: { fontSize: 12, letterSpacing: 2, fontWeight: 'bold' },
  nombre: { fontSize: 26, fontWeight: 'bold', marginTop: 5 },
  lineaDecorativa: { width: 40, height: 2, marginVertical: 15 },
  contenedorPrecio: { marginBottom: 15 },
  precio: { fontSize: 32, fontWeight: 'bold' },
  placaCuotas: { flexDirection: 'row', alignItems: 'center', padding: 10, marginTop: 10 },
  textoCuotas: { fontSize: 9, fontWeight: 'bold' },
  montoCuota: { fontSize: 18, fontWeight: 'bold' },
  tituloSeccion: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 5 },
  descripcion: { fontSize: 14, lineHeight: 22, opacity: 0.8, marginBottom: 15 },
  tablaMedidas: { backgroundColor: 'rgba(0,0,0,0.03)', padding: 15, marginTop: 5, marginBottom: 20 },
  medidaItem: { fontSize: 12, marginBottom: 4 },
  divider: { marginVertical: 20, opacity: 0.1 },
});