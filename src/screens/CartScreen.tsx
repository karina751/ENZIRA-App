import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Image, Linking, Alert } from 'react-native';
import { Text, Button, IconButton, Surface, Portal, Dialog, SegmentedButtons } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useCart } from '../context/CartContext';
import { auth, db } from '../services/firebase';
import { collection, addDoc, doc, onSnapshot } from 'firebase/firestore';

export const CartScreen = () => {
  const navigation = useNavigation<any>();
  const { cart, removeFromCart, updateQuantity, totalAmount, clearCart } = useCart();
  const [avisoVisible, setAvisoVisible] = useState(false);
  const [metodoPago, setMetodoPago] = useState('transferencia');
  const [datosPagos, setDatosPagos] = useState({ alias: 'Cargando...', titular: '' });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'configuracion', 'pagos'), (docSnap) => {
      if (docSnap.exists()) setDatosPagos({ alias: docSnap.data().alias, titular: docSnap.data().titular });
    });
    return () => unsub();
  }, []);

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
    if (!usuarioActual) { Alert.alert("ENZIRA", "Iniciá sesión."); navigation.navigate('Login'); return; }

    let mensaje = `✨ *NUEVO PEDIDO - ENZIRA* ✨\n\n`;
    mensaje += `*Cliente:* ${usuarioActual.email}\n`;
    mensaje += `*Pago:* ${metodoPago.toUpperCase()}\n`;
    mensaje += `----------------------------------\n`;
    cart.forEach((item: any) => { mensaje += `🛍️ *${item.nombre.toUpperCase()}* x${item.quantity}\n`; });
    mensaje += `\n💰 *TOTAL: $${totalAmount.toFixed(0)}*`;

    try {
      await addDoc(collection(db, 'pedidos'), {
        clienteEmail: usuarioActual.email, clienteUid: usuarioActual.uid, items: cart, total: totalAmount, metodoPago, estado: 'Pendiente', fecha: new Date()
      });
      Linking.openURL(`https://wa.me/5493873001475?text=${encodeURIComponent(mensaje)}`);
      setAvisoVisible(true);
    } catch (e) { Alert.alert("ERROR", "No se pudo registrar."); }
  };

  const finalFlujo = () => { setAvisoVisible(false); clearCart(); navigation.navigate('Home'); };

  return (
    <View style={styles.container}>
      <FlatList
        data={cart}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 250 }}
        renderItem={({ item }: { item: any }) => (
          <Surface style={styles.itemTarjeta} elevation={1}>
            <Image source={{ uri: item.imagenes ? item.imagenes[0] : item.imagen }} style={styles.imagenItem} />
            <View style={styles.infoItem}>
              <Text style={styles.nombreItem}>{item.nombre.toUpperCase()}</Text>
              <Text style={styles.precioUnitario}>${item.precio}</Text>
              <View style={styles.controlesCantidad}>
                <IconButton icon="minus-circle-outline" size={18} onPress={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1} />
                <Text style={styles.cantidadTexto}>{item.quantity}</Text>
                <IconButton icon="plus-circle-outline" size={18} onPress={() => updateQuantity(item.id, item.quantity + 1)} />
              </View>
            </View>
            <IconButton icon="trash-can-outline" iconColor="red" size={20} onPress={() => removeFromCart(item.id)} />
          </Surface>
        )}
      />

      {cart.length > 0 && (
        <Surface style={styles.footer} elevation={5}>
          <View style={styles.seccionPago}>
            <Text style={styles.tituloPago}>¿CÓMO DESEÁS ABONAR?</Text>
            <SegmentedButtons
                value={metodoPago}
                onValueChange={(v: string) => setMetodoPago(v)}
                buttons={[{ value: 'transferencia', label: 'Transf.' }, { value: 'tarjeta', label: 'Tarjeta' }, { value: 'efectivo', label: 'Efectivo' }]}
                style={{ marginBottom: 10 }}
                theme={{ colors: { secondaryContainer: '#002147', onSecondaryContainer: '#fff' } }}
            />
            {metodoPago === 'transferencia' && (
              <View style={styles.infoPagoBox}>
                <Text style={{fontSize: 11}}>Alias: **{datosPagos.alias}**</Text>
                <Text style={{fontSize: 11}}>Titular: {datosPagos.titular}</Text>
              </View>
            )}
          </View>

          <View style={styles.filaFooter}>
            <View>
              <Text style={styles.labelTotal}>TOTAL</Text>
              <Text style={styles.montoTotal}>${totalAmount.toFixed(0)}</Text>
              {acumulado > 0 && <Text style={styles.labelCuotas}>{cuotasSugeridas} cuotas de ${acumulado.toFixed(0)}</Text>}
            </View>
            <Button mode="contained" onPress={manejarFinalizarCompra} buttonColor="#002147" icon="whatsapp" style={{borderRadius:0}}>SOLICITAR</Button>
          </View>
        </Surface>
      )}

      <Portal>
        <Dialog visible={avisoVisible} onDismiss={finalFlujo} style={{ borderRadius: 0, backgroundColor: '#fff' }}>
          <Dialog.Title>¡PEDIDO ENVIADO! ✨</Dialog.Title>
          <Dialog.Content><Text>Mariel recibió tu pedido. Coordiná el pago y envío por WhatsApp.</Text></Dialog.Content>
          <Dialog.Actions><Button mode="contained" buttonColor="#002147" onPress={finalFlujo} textColor="#fff">ACEPTAR</Button></Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFAED' },
  itemTarjeta: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, marginBottom: 10, alignItems: 'center' },
  imagenItem: { width: 60, height: 80, resizeMode: 'cover' },
  infoItem: { flex: 1, marginLeft: 15 },
  nombreItem: { fontSize: 13, fontWeight: 'bold', color: '#002147' },
  precioUnitario: { fontSize: 12, color: '#CFAF68', fontWeight: 'bold' },
  controlesCantidad: { flexDirection: 'row', alignItems: 'center', marginLeft: -10, marginTop: 5 },
  cantidadTexto: { fontSize: 14, fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#fff', padding: 20 },
  filaFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15 },
  labelTotal: { fontSize: 10, fontWeight: 'bold', opacity: 0.5 },
  montoTotal: { fontSize: 24, fontWeight: 'bold', color: '#002147' },
  labelCuotas: { fontSize: 11, color: '#25D366', fontWeight: 'bold' },
  seccionPago: { marginBottom: 15 },
  tituloPago: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 10, opacity: 0.5 },
  infoPagoBox: { padding: 10, backgroundColor: 'rgba(0,0,0,0.03)', borderLeftWidth: 3, borderLeftColor: '#CFAF68' }
});