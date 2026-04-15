import React from 'react';
import { View, StyleSheet, FlatList, Image, Linking, Platform, Alert } from 'react-native';
import { Text, Button, IconButton, Divider } from 'react-native-paper';
import { useCart } from '../context/CartContext';
import { useNavigation } from '@react-navigation/native';

// --- Firebase Tools ---
import { db, auth } from '../services/firebase';
import { 
  doc, 
  updateDoc, 
  increment, 
  collection, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';

export const CartScreen = () => {
  const navigation = useNavigation<any>(); 
  const { items, eliminarProducto, totalPrecio, limpiarCarrito } = useCart();

  // 1. FUNCIÓN PARA DESCONTAR EL STOCK
  const descontarStockBaseDeDatos = async () => {
    try {
      const promesas = items.map(async (item) => {
        const productoRef = doc(db, 'productos', item.id);
        await updateDoc(productoRef, {
          stock: increment(-item.cantidad)
        });
      });
      await Promise.all(promesas);
      return true;
    } catch (error) {
      console.error("Error al descontar stock:", error);
      return false;
    }
  };

  // 2. FUNCIÓN PARA GUARDAR EL PEDIDO EN EL HISTORIAL
  const registrarPedidoEnBaseDeDatos = async () => {
    try {
      await addDoc(collection(db, 'pedidos'), {
        clienteEmail: auth.currentUser ? auth.currentUser.email : "Invitado",
        clienteUid: auth.currentUser ? auth.currentUser.uid : "anonimo",
        items: items, // Guardamos la lista completa de productos comprados
        total: totalPrecio,
        fecha: serverTimestamp(),
        estado: 'Pendiente' // Estado inicial para control de admin
      });
      return true;
    } catch (error) {
      console.error("Error al registrar pedido:", error);
      return false;
    }
  };

  const finalizarPedido = async () => {
    // Paso A: Descontar Stock
    const exitoStock = await descontarStockBaseDeDatos();
    if (!exitoStock) {
      Alert.alert("Error", "No se pudo actualizar el inventario. Inténtalo de nuevo.");
      return;
    }

    // Paso B: Registrar Pedido en Firestore (Opción A)
    const exitoPedido = await registrarPedidoEnBaseDeDatos();
    if (!exitoPedido) {
      Alert.alert("Error", "No se pudo registrar el pedido en el historial.");
      // Opcional: Podrías revertir el stock aquí si quisieras ser muy estricta
    }

    // Paso C: Armar el mensaje de WhatsApp
    let mensaje = `¡Hola ENZIRA! ✨\n`;
    mensaje += `Quisiera realizar el siguiente pedido:\n`;
    mensaje += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    items.forEach(item => {
      mensaje += `👜 *${item.nombre.toUpperCase()}*\n`;
      mensaje += `   Cantidad: ${item.cantidad}\n`;
      mensaje += `   Subtotal: $${item.precio * item.cantidad}\n\n`;
    });

    mensaje += `━━━━━━━━━━━━━━━━━━━━\n`;
    mensaje += `💰 *TOTAL A PAGAR: $${totalPrecio}*\n\n`;
    mensaje += `¿Cómo coordinamos el pago y la entrega? ¡Gracias!`;

    const numeroWhatsApp = "5493875222620"; 
    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;

    // Paso D: Abrir WhatsApp y resetear app
    Linking.openURL(url)
      .then(() => {
        limpiarCarrito();
        navigation.navigate('Home');
      })
      .catch(() => {
        Alert.alert("Error", "Asegúrate de tener WhatsApp instalado.");
      });
  };

  if (items.length === 0) {
    return (
      <View style={styles.vacioContainer}>
        <IconButton icon="shopping-outline" size={80} iconColor="#002147" style={{ opacity: 0.2 }} />
        <Text style={styles.vacioTexto}>Tu carrito está vacío</Text>
        <Button mode="contained" onPress={() => navigation.navigate('Home')} buttonColor="#002147">
          VER LA COLECCIÓN
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => (
          <View style={styles.itemTarjeta}>
            <Image source={{ uri: item.imagen }} style={styles.miniImagen} />
            <div style={styles.itemInfo}>
              <Text style={styles.itemNombre}>{item.nombre.toUpperCase()}</Text>
              <Text style={styles.itemDetalle}>${item.precio} c/u</Text>
              <Text style={styles.itemSubtotal}>Cant: {item.cantidad} | Total: ${item.precio * item.cantidad}</Text>
            </div>
            <IconButton 
              icon="trash-can-outline" 
              iconColor="#B00020" 
              onPress={() => eliminarProducto(item.id)} 
            />
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.filaTotal}>
          <Text style={styles.totalLabel}>TOTAL DEL PEDIDO</Text>
          <Text style={styles.totalPrecio}>${totalPrecio}</Text>
        </View>

        <Button 
          mode="contained" 
          onPress={finalizarPedido} 
          style={styles.botonWhatsApp} 
          buttonColor="#25D366" 
          icon="whatsapp"
        >
          FINALIZAR POR WHATSAPP
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFAED' },
  vacioContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  vacioTexto: { color: '#002147', opacity: 0.5, fontSize: 16, marginBottom: 20 },
  itemTarjeta: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginBottom: 15, padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  miniImagen: { width: 60, height: 80, resizeMode: 'cover' },
  itemInfo: { flex: 1, marginLeft: 15 },
  itemNombre: { fontSize: 13, fontWeight: 'bold', color: '#002147' },
  itemDetalle: { fontSize: 12, color: '#CFAF68', fontWeight: 'bold' },
  itemSubtotal: { fontSize: 12, color: '#002147', opacity: 0.6 },
  footer: { padding: 25, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee' },
  filaTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  totalLabel: { fontSize: 12, color: '#002147', opacity: 0.6, fontWeight: 'bold' },
  totalPrecio: { fontSize: 26, fontWeight: 'bold', color: '#002147' },
  botonWhatsApp: { paddingVertical: 10, borderRadius: 0 }
});