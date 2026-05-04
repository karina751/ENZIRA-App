import React, { useState, useEffect, useCallback } from 'react'; // ✨ Sumamos useCallback
import { View, StyleSheet, FlatList, Image, Linking, Alert, Dimensions, BackHandler } from 'react-native'; // ✨ Sumamos BackHandler
import { Text, Button, IconButton, Surface, Portal, Dialog, SegmentedButtons, Divider } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native'; // ✨ Sumamos useFocusEffect
import { useCart } from '../context/CartContext';

// Firebase
import { auth, db } from '../services/firebase';
import { collection, addDoc, doc, onSnapshot } from 'firebase/firestore';
import { useAppTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export const CartScreen = () => {
  const navigation = useNavigation<any>();
  const { theme } = useAppTheme();
  const { cart, removeFromCart, updateQuantity, totalAmount, clearCart } = useCart();
  
  // --- ✨ ESTADOS ✨ ---
  const [avisoVisible, setAvisoVisible] = useState(false);
  const [metodoPago, setMetodoPago] = useState('transferencia');
  const [datosPagos, setDatosPagos] = useState({ alias: 'Cargando...', titular: '' });

  // --- ✨ LÓGICA DEL BOTÓN FÍSICO "ATRÁS" (ANDROID) ✨ ---
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (navigation.canGoBack()) {
          navigation.goBack();
          return true; // Detiene la acción por defecto (salir de la app)
        }
        return false;
      };

      // Suscribimos el evento
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      // Limpiamos usando el método .remove() moderno
      return () => subscription.remove();
    }, [navigation])
  );

  // Escuchar Datos de Pago de Firebase
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'configuracion', 'pagos'), (docSnap) => {
      if (docSnap.exists()) {
        setDatosPagos({
          alias: docSnap.data().alias,
          titular: docSnap.data().titular
        });
      }
    });
    return () => unsub();
  }, []);

  // Lógica de Cuotas
  const calcularCuotaTotal = () => {
    let acumulado = 0;
    let cuotasSugeridas = 3;
    cart.forEach((item: any) => {
      if (item.enCuotas && item.cuotasValor) {
        acumulado += (item.cuotasValor * item.quantity);
        cuotasSugeridas = item.cuotasNumero || 3;
      }
    });
    return { acumulado, cuotasSugeridas };
  };

  const { acumulado, cuotasSugeridas } = calcularCuotaTotal();

  const manejarFinalizarCompra = async () => {
    if (cart.length === 0) return;
    
    const usuarioActual = auth.currentUser;
    if (!usuarioActual) {
      Alert.alert("ENZIRA", "Por favor, iniciá sesión para completar tu pedido.");
      navigation.navigate('Login');
      return;
    }

    // Armar mensaje WhatsApp
    let mensaje = `✨ *NUEVO PEDIDO - ENZIRA* ✨\n\n`;
    mensaje += `👤 *Cliente:* ${usuarioActual.email}\n`;
    mensaje += `💳 *Pago:* ${metodoPago.toUpperCase()}\n`;
    mensaje += `----------------------------------\n`;
    
    cart.forEach((item: any) => {
      mensaje += `🛍️ *${item.nombre.toUpperCase()}*\n`;
      mensaje += `   Cant: ${item.quantity} x $${item.precio.toFixed(0)}\n`;
      mensaje += `   Subtotal: $${(item.precio * item.quantity).toFixed(0)}\n\n`;
    });

    mensaje += `----------------------------------\n`;
    mensaje += `💰 *TOTAL: $${totalAmount.toFixed(0)}*\n`;
    if (metodoPago === 'transferencia') {
        mensaje += `🏦 *Alias:* ${datosPagos.alias}\n`;
    }
    mensaje += `\n_Pedido enviado desde la App_`;

    try {
      await addDoc(collection(db, 'pedidos'), {
        clienteEmail: usuarioActual.email,
        clienteUid: usuarioActual.uid,
        items: cart,
        total: totalAmount,
        metodoPago: metodoPago,
        estado: 'Pendiente',
        fecha: new Date()
      });

      const url = `https://wa.me/5493873001475?text=${encodeURIComponent(mensaje)}`;
      await Linking.openURL(url);
      setAvisoVisible(true);

    } catch (e) {
      Alert.alert("ERROR", "No se pudo registrar el pedido.");
    }
  };

  const cerrarYVolver = () => {
      setAvisoVisible(false);
      clearCart();
      navigation.navigate('Home');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
          <IconButton icon="arrow-left" iconColor={theme.primary} onPress={() => navigation.goBack()} />
          <Text style={[styles.tituloHeader, { color: theme.primary }]}>MI CARRITO</Text>
      </View>

      <FlatList
        data={cart}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }: { item: any }) => (
          <Surface style={styles.itemTarjeta} elevation={1}>
            <Image source={{ uri: item.imagenes ? item.imagenes[0] : item.imagen }} style={styles.imagenItem} />
            <View style={styles.infoItem}>
              <Text style={styles.nombreItem}>{item.nombre.toUpperCase()}</Text>
              <Text style={styles.precioUnitario}>${item.precio.toFixed(0)}</Text>
              <View style={styles.controlesCantidad}>
                <IconButton icon="minus-circle-outline" size={18} onPress={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1} />
                <Text style={styles.cantidadTexto}>{item.quantity}</Text>
                <IconButton icon="plus-circle-outline" size={18} onPress={() => updateQuantity(item.id, item.quantity + 1)} />
              </View>
            </View>
            <IconButton icon="trash-can-outline" iconColor="#B00020" size={20} onPress={() => removeFromCart(item.id)} />
          </Surface>
        )}
        ListEmptyComponent={
            <View style={styles.vacioCont}>
                <IconButton icon="cart-outline" size={80} iconColor={theme.primary} style={{ opacity: 0.2 }} />
                <Text style={styles.vacioTexto}>TU CARRITO ESTÁ VACÍO</Text>
                <Button 
                    mode="contained" 
                    buttonColor={theme.primary} 
                    onPress={() => navigation.navigate('Home')}
                    style={styles.btnVolver}
                >
                    VOLVER A LA TIENDA
                </Button>
            </View>
        }
      />

      {cart.length > 0 && (
        <Surface style={styles.footer} elevation={5}>
          <View style={styles.seccionPago}>
            <Text style={styles.tituloPago}>¿CÓMO DESEÁS ABONAR?</Text>
            <SegmentedButtons
                value={metodoPago}
                onValueChange={(v: string) => setMetodoPago(v)}
                buttons={[
                    { value: 'transferencia', label: 'Transf.' },
                    { value: 'tarjeta', label: 'Tarjeta' },
                    { value: 'efectivo', label: 'Efectivo' }
                ]}
                style={{ marginBottom: 10 }}
                theme={{ colors: { secondaryContainer: theme.primary, onSecondaryContainer: '#fff' } }}
            />
            {metodoPago === 'transferencia' && (
              <View style={styles.infoPagoBox}>
                <Text style={{fontSize: 11, fontWeight: 'bold'}}>Alias: {datosPagos.alias}</Text>
                <Text style={{fontSize: 11}}>Titular: {datosPagos.titular}</Text>
              </View>
            )}
          </View>

          <View style={styles.filaFooter}>
            <View>
              <Text style={styles.labelTotal}>TOTAL FINAL</Text>
              <Text style={styles.montoTotal}>${totalAmount.toFixed(0)}</Text>
              {acumulado > 0 && <Text style={styles.labelCuotas}>{cuotasSugeridas} cuotas de ${acumulado.toFixed(0)}</Text>}
            </View>
            <Button 
                mode="contained" 
                onPress={manejarFinalizarCompra} 
                buttonColor={theme.primary} 
                icon="whatsapp" 
                style={{borderRadius: 0}}
            >
                SOLICITAR
            </Button>
          </View>
        </Surface>
      )}

      <Portal>
        <Dialog visible={avisoVisible} onDismiss={cerrarYVolver} style={{ borderRadius: 0, backgroundColor: '#fff' }}>
          <Dialog.Title style={{ color: theme.primary, letterSpacing: 2 }}>¡PEDIDO ENVIADO! ✨</Dialog.Title>
          <Dialog.Content>
            <Text style={{ lineHeight: 22 }}>
                Tu solicitud ha sido enviada con éxito. **ENZIRA** se pondrá en contacto contigo por WhatsApp para finalizar el proceso.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button mode="contained" buttonColor={theme.primary} onPress={cerrarYVolver} textColor="#fff">
                ENTENDIDO
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 40, paddingBottom: 10, paddingHorizontal: 10 },
  tituloHeader: { fontSize: 14, fontWeight: 'bold', letterSpacing: 2, marginLeft: 10 },
  listContent: { padding: 15, paddingBottom: 280 },
  itemTarjeta: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, marginBottom: 10, alignItems: 'center', borderRadius: 4 },
  imagenItem: { width: 60, height: 80, resizeMode: 'cover' },
  infoItem: { flex: 1, marginLeft: 15 },
  nombreItem: { fontSize: 13, fontWeight: 'bold', color: '#002147' },
  precioUnitario: { fontSize: 12, color: '#CFAF68', fontWeight: 'bold' },
  controlesCantidad: { flexDirection: 'row', alignItems: 'center', marginLeft: -10, marginTop: 5 },
  cantidadTexto: { fontSize: 14, fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#fff', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  filaFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15 },
  labelTotal: { fontSize: 10, fontWeight: 'bold', opacity: 0.5 },
  montoTotal: { fontSize: 24, fontWeight: 'bold', color: '#002147' },
  labelCuotas: { fontSize: 11, color: '#25D366', fontWeight: 'bold' },
  seccionPago: { marginBottom: 15 },
  tituloPago: { fontSize: 10, fontWeight: 'bold', opacity: 0.5, marginBottom: 10, letterSpacing: 1 },
  infoPagoBox: { padding: 10, backgroundColor: 'rgba(0,0,0,0.03)', borderLeftWidth: 3, borderLeftColor: '#CFAF68' },
  vacioCont: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  vacioTexto: { fontSize: 12, fontWeight: 'bold', opacity: 0.4, letterSpacing: 2, marginBottom: 20 },
  btnVolver: { borderRadius: 0, paddingHorizontal: 20 }
});