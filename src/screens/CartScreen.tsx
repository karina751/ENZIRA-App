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
  
  // Estado para el aviso de éxito
  const [avisoVisible, setAvisoVisible] = useState(false);

  // --- ✨ LÓGICA DE CÁLCULO DE CUOTAS TOTALES ✨ ---
  const calcularCuotaTotal = () => {
    let acumulado = 0;
    let cuotasSugeridas = 3; // Valor base
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
      Alert.alert("ENZIRA", "Por favor, iniciá sesión para completar el pedido.");
      navigation.navigate('Login');
      return;
    }

    // Armar mensaje WhatsApp
    let mensaje = `✨ *NUEVO PEDIDO - ENZIRA* ✨\n\n`;
    mensaje += `*Cliente:* ${usuarioActual.email}\n`;
    mensaje += `----------------------------------\n`;
    
    cart.forEach((item: any) => {
      mensaje += `🛍️ *${item.nombre.toUpperCase()}*\n`;
      mensaje += `   Cant: ${item.quantity} x $${item.precio}\n`;
      if (item.enCuotas) {
        mensaje += `   💳 Cuotas: ${item.cuotasNumero} x $${item.cuotasValor}\n`;
      }
      mensaje += `   Subtotal: $${(item.precio * item.quantity).toFixed(2)}\n\n`;
    });

    mensaje += `----------------------------------\n`;
    mensaje += `💰 *TOTAL: $${totalAmount.toFixed(2)}*\n`;
    if (acumulado > 0) {
      mensaje += `💳 *PLAN:* ${cuotasSugeridas} cuotas de $${acumulado.toFixed(2)}\n`;
    }
    mensaje += `\n_Enviado desde la App Oficial_`;

    try {
      await addDoc(collection(db, 'pedidos'), {
        clienteEmail: usuarioActual.email,
        clienteUid: usuarioActual.uid,
        items: cart,
        total: totalAmount,
        totalCuotaMensual: acumulado,
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

  // ✨ FUNCIÓN QUE FALTABA (Corrige error de imagen 5)
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
        {item.enCuotas && (
            <Text style={styles.cuotaTexto}>{item.cuotasNumero} cuotas de ${item.cuotasValor}</Text>
        )}
        <View style={styles.controlesCantidad}>
          <IconButton icon="minus-circle-outline" size={18} iconColor="#002147" onPress={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1} />
          <Text style={styles.cantidadTexto}>{item.quantity}</Text>
          <IconButton icon="plus-circle-outline" size={18} iconColor="#002147" onPress={() => updateQuantity(item.id, item.quantity + 1)} />
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
        ListHeaderComponent={cart.length > 0 ? <Text style={styles.headerResumen}>RESUMEN DE PEDIDO</Text> : null}
        ListEmptyComponent={
            <View style={styles.vacio}>
                <Text style={{opacity: 0.4}}>EL CARRITO ESTÁ VACÍO</Text>
                <Button onPress={() => navigation.navigate('Home')}>VER PRODUCTOS</Button>
            </View>
        }
      />

      {cart.length > 0 && (
        <Surface style={styles.footerResumen} elevation={5}>
          <View style={styles.filaFooter}>
            <View style={{ flex: 1 }}>
              <Text style={styles.totalEtiqueta}>TOTAL A PAGAR</Text>
              <View style={styles.contenedorMontos}>
                  <Text style={styles.totalMonto}>${totalAmount.toFixed(0)}</Text>
                  {acumulado > 0 && (
                      <Text style={styles.totalCuotasLabel}>
                          o {cuotasSugeridas} cuotas de <Text style={{fontWeight: 'bold'}}>${acumulado.toFixed(0)}</Text>
                      </Text>
                  )}
              </View>
            </View>
            
            <Button 
                mode="contained" 
                onPress={manejarFinalizarCompra} 
                style={styles.btnSolicitar} 
                buttonColor="#002147" 
                icon="whatsapp"
                labelStyle={{ fontWeight: 'bold' }}
            >
              SOLICITAR
            </Button>
          </View>
        </Surface>
      )}

      <Portal>
        <Dialog visible={avisoVisible} onDismiss={finalFlujo} style={{ borderRadius: 0, backgroundColor: '#fff' }}>
          <Dialog.Title style={{ color: '#002147', letterSpacing: 2 }}>¡PEDIDO ENVIADO! ✨</Dialog.Title>
          <Dialog.Content>
            <Text>Mariel recibió tu mensaje. Podrás seguir el estado desde tu perfil.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button mode="contained" buttonColor="#002147" onPress={finalFlujo} textColor="#fff">ACEPTAR</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFAED' },
  listContent: { padding: 20, paddingBottom: 150 },
  headerResumen: { textAlign: 'center', fontSize: 10, letterSpacing: 2, opacity: 0.5, marginBottom: 20, fontWeight: 'bold' },
  itemTarjeta: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, marginBottom: 10, alignItems: 'center' },
  imagenItem: { width: 60, height: 80, resizeMode: 'cover' },
  infoItem: { flex: 1, marginLeft: 15 },
  nombreItem: { fontSize: 13, fontWeight: 'bold', color: '#002147' },
  precioUnitario: { fontSize: 12, color: '#CFAF68', fontWeight: 'bold' },
  cuotaTexto: { fontSize: 10, color: '#25D366', fontWeight: 'bold' },
  controlesCantidad: { flexDirection: 'row', alignItems: 'center', marginLeft: -10, marginTop: 5 },
  cantidadTexto: { fontSize: 14, fontWeight: 'bold' },
  derechaItem: { alignItems: 'flex-end' },
  subtotalItem: { fontSize: 14, fontWeight: 'bold' },
  footerResumen: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 25 },
  filaFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalEtiqueta: { fontSize: 10, fontWeight: 'bold', opacity: 0.4, letterSpacing: 1 },
  contenedorMontos: { marginTop: 2 },
  totalMonto: { fontSize: 24, fontWeight: 'bold', color: '#002147' },
  totalCuotasLabel: { fontSize: 11, color: '#25D366' },
  btnSolicitar: { borderRadius: 0, paddingHorizontal: 5 },
  vacio: { flex: 1, alignItems: 'center', marginTop: 100 }
});