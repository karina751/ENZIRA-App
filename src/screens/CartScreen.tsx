import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity, Platform, Alert, Dimensions, Linking } from 'react-native';
import { Text, Button, IconButton, Divider, Surface, Portal, Dialog } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useCart } from '../context/CartContext';

// Firebase
import { auth, db } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';

export const CartScreen = () => {
  const navigation = useNavigation<any>();
  const { cart, removeFromCart, updateQuantity, totalAmount, clearCart } = useCart();
  const [avisoVisible, setAvisoVisible] = useState(false);

  const manejarFinalizarCompra = async () => {
    if (cart.length === 0) return;
    const usuarioActual = auth.currentUser;
    if (!usuarioActual) {
      Alert.alert("ENZIRA", "Iniciá sesión para comprar.");
      navigation.navigate('Login');
      return;
    }

    let mensaje = `✨ *NUEVO PEDIDO - ENZIRA* ✨\n\n`;
    mensaje += `*Cliente:* ${usuarioActual.email}\n`;
    
    cart.forEach((item: any) => { // <--- El :any arregla los errores de cuotas
      mensaje += `🛍️ *${item.nombre.toUpperCase()}*\n`;
      mensaje += `   Cantidad: ${item.quantity} x $${item.precio}\n`;
      if (item.enCuotas) {
          mensaje += `   🔥 *PROMO:* ${item.cuotasNumero} cuotas de $${item.cuotasValor}\n`;
      }
      mensaje += `   Subtotal: $${(item.precio * item.quantity).toFixed(2)}\n\n`;
    });

    mensaje += `💰 *TOTAL: $${totalAmount.toFixed(2)}*`;

    try {
      await addDoc(collection(db, 'pedidos'), {
        clienteEmail: usuarioActual.email,
        clienteUid: usuarioActual.uid,
        items: cart,
        total: totalAmount,
        estado: 'Pendiente',
        fecha: new Date()
      });

      const url = `https://wa.me/5493873001475?text=${encodeURIComponent(mensaje)}`;
      Linking.openURL(url);
      setAvisoVisible(true);
    } catch (e) {
      Alert.alert("ERROR", "No se pudo registrar el pedido.");
    }
  };

  // ✨ ESTA ES LA FUNCIÓN QUE TE FALTABA (Error 'finalFlujo')
  const finalFlujo = () => {
      setAvisoVisible(false);
      clearCart();
      navigation.navigate('Home');
  };

  const renderItem = ({ item }: { item: any }) => (
    <Surface style={styles.itemTarjeta} elevation={0}>
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
      <View style={styles.derechaItem}>
        <Text style={styles.subtotalItem}>${(item.precio * item.quantity).toFixed(2)}</Text>
        <IconButton icon="trash-can-outline" iconColor="#B22222" size={20} onPress={() => removeFromCart(item.id)} />
      </View>
    </Surface>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={cart}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />
      {cart.length > 0 && (
        <Surface style={styles.footerResumen} elevation={4}>
          <View style={styles.filaResumen}>
            <Text style={styles.totalEtiqueta}>TOTAL</Text>
            <Text style={styles.totalMonto}>${totalAmount.toFixed(2)}</Text>
          </View>
          <Button mode="contained" onPress={manejarFinalizarCompra} style={styles.botonFinalizar} buttonColor="#002147" icon="whatsapp">
            SOLICITAR PEDIDO
          </Button>
        </Surface>
      )}

      <Portal>
        <Dialog visible={avisoVisible} onDismiss={finalFlujo} style={{ borderRadius: 0, backgroundColor: '#fff' }}>
          <Dialog.Title style={{ color: '#002147', letterSpacing: 2 }}>¡PEDIDO ENVIADO! ✨</Dialog.Title>
          <Dialog.Content>
            <Text>Mariel ya recibió tu consulta. Podrás ver el estado desde tu perfil.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button mode="contained" buttonColor="#002147" onPress={finalFlujo} textColor="#fff">EXCELENTE</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFAED' },
  listContent: { padding: 20, paddingBottom: 150 },
  itemTarjeta: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, marginBottom: 10, alignItems: 'center' },
  imagenItem: { width: 60, height: 80, resizeMode: 'cover' },
  infoItem: { flex: 1, marginLeft: 15 },
  nombreItem: { fontSize: 13, fontWeight: 'bold', color: '#002147' },
  precioUnitario: { fontSize: 12, color: '#CFAF68', fontWeight: 'bold' },
  controlesCantidad: { flexDirection: 'row', alignItems: 'center', marginLeft: -10 },
  cantidadTexto: { fontSize: 14, fontWeight: 'bold' },
  derechaItem: { alignItems: 'flex-end' },
  subtotalItem: { fontSize: 14, fontWeight: 'bold' },
  footerResumen: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#fff', padding: 25 },
  filaResumen: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  totalEtiqueta: { fontSize: 12, fontWeight: 'bold', opacity: 0.5 },
  totalMonto: { fontSize: 24, fontWeight: 'bold', color: '#002147' },
  botonFinalizar: { borderRadius: 0, paddingVertical: 8 }
});