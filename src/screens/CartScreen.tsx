import React from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity, Platform, Alert, Dimensions, Linking } from 'react-native';
import { Text, Button, IconButton, Divider, Surface } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useCart } from '../context/CartContext';

// Importamos Firebase
import { auth, db } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

export const CartScreen = () => {
  const navigation = useNavigation<any>();
  const { cart, removeFromCart, updateQuantity, totalAmount, clearCart } = useCart();

  const manejarFinalizarCompra = async () => {
    if (cart.length === 0) return;

    const usuarioActual = auth.currentUser;
    if (!usuarioActual) {
      Alert.alert("ENZIRA", "Por favor, iniciá sesión para completar tu pedido.");
      navigation.navigate('Login');
      return;
    }

    // 1. Armar el mensaje para WhatsApp
    let mensaje = `✨ *NUEVO PEDIDO - ENZIRA ALTA COSTURA* ✨\n\n`;
    mensaje += `*Cliente:* ${usuarioActual.email}\n`;
    mensaje += `----------------------------------\n`;
    
    cart.forEach((item) => {
      mensaje += `🛍️ *${item.nombre.toUpperCase()}*\n`;
      mensaje += `   Cantidad: ${item.quantity} x $${item.precio}\n`;
      mensaje += `   Subtotal: $${(item.precio * item.quantity).toFixed(2)}\n\n`;
    });

    mensaje += `----------------------------------\n`;
    mensaje += `💰 *TOTAL: $${totalAmount.toFixed(2)}*\n\n`;
    mensaje += `_Enviado desde la App Oficial_`;

    try {
      // 2. Guardar en Firebase (Registro para Mariel y para el Historial del Cliente)
      await addDoc(collection(db, 'pedidos'), {
        clienteEmail: usuarioActual.email,
        clienteUid: usuarioActual.uid, // <--- Importante para que el cliente vea sus pedidos
        items: cart,
        total: totalAmount,
        estado: 'Pendiente',
        fecha: new Date()
      });

      // 3. Abrir WhatsApp
      const url = `https://wa.me/5493873001475?text=${encodeURIComponent(mensaje)}`;
      
      Linking.openURL(url).then(() => {
          // 4. LIMPIEZA POST-VENTA (Esto ocurre cuando vuelve a la app)
          clearCart(); 
          
          // 5. AVISO DE ÉXITO Y NAVEGACIÓN
          Alert.alert(
            "¡PEDIDO REGISTRADO! ✨",
            "Tu pedido fue enviado a Mariel. Podrás ver el seguimiento en tu perfil.",
            [{ text: "VOLVER AL INICIO", onPress: () => navigation.navigate('Home') }]
          );
      }).catch(() => {
        Alert.alert("Error", "No pudimos abrir WhatsApp automáticamente.");
      });

    } catch (e) {
      Alert.alert("ERROR", "Hubo un problema al registrar el pedido en el sistema.");
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <Surface style={styles.itemTarjeta} elevation={0}>
      {/* Soporte para el nuevo formato de array de imágenes */}
      <Image 
        source={{ uri: item.imagenes ? item.imagenes[0] : item.imagen }} 
        style={styles.imagenItem} 
      />
      
      <View style={styles.infoItem}>
        <Text style={styles.nombreItem}>{item.nombre.toUpperCase()}</Text>
        <Text style={styles.precioUnitario}>${item.precio}</Text>
        
        <View style={styles.controlesCantidad}>
          <IconButton 
            icon="minus-circle-outline" 
            size={20} 
            iconColor="#002147" 
            onPress={() => updateQuantity(item.id, item.quantity - 1)}
            disabled={item.quantity <= 1}
          />
          <Text style={styles.cantidadTexto}>{item.quantity}</Text>
          <IconButton 
            icon="plus-circle-outline" 
            size={20} 
            iconColor="#002147" 
            onPress={() => updateQuantity(item.id, item.quantity + 1)}
          />
        </View>
      </View>

      <View style={styles.derechaItem}>
        <Text style={styles.subtotalItem}>${(item.precio * item.quantity).toFixed(2)}</Text>
        <IconButton 
          icon="trash-can-outline" 
          iconColor="#B22222" 
          size={20} 
          onPress={() => removeFromCart(item.id)} 
        />
      </View>
    </Surface>
  );

  const ComponenteVacio = () => (
    <View style={styles.contenedorVacio}>
      <IconButton icon="cart-off" size={80} iconColor="#002147" style={{ opacity: 0.1 }} />
      <Text style={styles.textoVacio}>TU CARRITO ESTÁ VACÍO</Text>
      <Button 
        mode="outlined" 
        onPress={() => navigation.navigate('Home')} 
        style={styles.botonVolver}
        textColor="#002147"
      >
        EXPLORAR COLECCIÓN
      </Button>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={cart}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={ComponenteVacio}
        contentContainerStyle={[styles.listContent, cart.length === 0 && { flex: 1 }]}
        ListHeaderComponent={cart.length > 0 ? <Text style={styles.tituloHeader}>RESUMEN DE COMPRA</Text> : null}
      />

      {cart.length > 0 && (
        <Surface style={styles.footerResumen} elevation={4}>
          <View style={styles.filaResumen}>
            <Text style={styles.totalEtiqueta}>TOTAL A PAGAR</Text>
            <Text style={styles.totalMonto}>${totalAmount.toFixed(2)}</Text>
          </View>
          
          <Button
            mode="contained"
            onPress={manejarFinalizarCompra}
            style={styles.botonFinalizar}
            buttonColor="#002147"
            labelStyle={styles.labelFinalizar}
            icon="whatsapp"
          >
            SOLICITAR PEDIDO
          </Button>
          
          <TouchableOpacity onPress={clearCart}>
            <Text style={styles.textoVaciar}>VACIAR TODO EL CARRITO</Text>
          </TouchableOpacity>
        </Surface>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFAED' },
  listContent: { padding: 20, paddingBottom: 150 },
  tituloHeader: { fontSize: 12, fontWeight: 'bold', color: '#002147', letterSpacing: 3, marginBottom: 25, textAlign: 'center', opacity: 0.5 },
  itemTarjeta: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, marginBottom: 15, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f1f1f1' },
  imagenItem: { width: 70, height: 90, resizeMode: 'cover' },
  infoItem: { flex: 1, marginLeft: 15 },
  nombreItem: { fontSize: 13, fontWeight: 'bold', color: '#002147', letterSpacing: 1 },
  precioUnitario: { fontSize: 12, color: '#CFAF68', fontWeight: 'bold', marginTop: 3 },
  controlesCantidad: { flexDirection: 'row', alignItems: 'center', marginTop: 5, marginLeft: -10 },
  cantidadTexto: { fontSize: 14, fontWeight: 'bold', color: '#002147', width: 25, textAlign: 'center' },
  derechaItem: { alignItems: 'flex-end' },
  subtotalItem: { fontSize: 14, fontWeight: 'bold', color: '#002147' },
  footerResumen: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#fff', padding: 25 },
  filaResumen: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  totalEtiqueta: { fontSize: 11, fontWeight: 'bold', color: '#002147', letterSpacing: 2, opacity: 0.4 },
  totalMonto: { fontSize: 24, fontWeight: 'bold', color: '#002147' },
  botonFinalizar: { borderRadius: 0, paddingVertical: 8 },
  labelFinalizar: { fontWeight: 'bold', letterSpacing: 2, fontSize: 14 },
  textoVaciar: { textAlign: 'center', marginTop: 15, fontSize: 10, color: '#B22222', letterSpacing: 2, fontWeight: 'bold', opacity: 0.6 },
  contenedorVacio: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  textoVacio: { fontSize: 16, color: '#002147', opacity: 0.3, letterSpacing: 2, fontWeight: 'bold' },
  botonVolver: { marginTop: 20, borderRadius: 0, borderColor: '#002147' }
});