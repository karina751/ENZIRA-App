import React, { createContext, useState, useContext } from 'react';

// Definimos qué tiene un producto dentro del carrito
interface CartItem {
  id: string;
  nombre: string;
  precio: number;
  imagen: string;
  cantidad: number;
  stock: number;
}

interface CartContextData {
  items: CartItem[];
  agregarProducto: (producto: any, cantidad: number) => void;
  eliminarProducto: (id: string) => void;
  limpiarCarrito: () => void;
  totalPrecio: number;
  totalItems: number;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const agregarProducto = (producto: any, cantidad: number) => {
    setItems(prevItems => {
      // ¿El producto ya está en el carrito?
      const existe = prevItems.find(item => item.id === producto.id);

      if (existe) {
        // Si existe, solo sumamos la cantidad (sin pasarnos del stock)
        return prevItems.map(item =>
          item.id === producto.id
            ? { ...item, cantidad: Math.min(item.cantidad + cantidad, item.stock) }
            : item
        );
      }
      // Si es nuevo, lo agregamos
      return [...prevItems, { ...producto, cantidad }];
    });
  };

  const eliminarProducto = (id: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const limpiarCarrito = () => setItems([]);

  const totalPrecio = items.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  const totalItems = items.reduce((acc, item) => acc + item.cantidad, 0);

  return (
    <CartContext.Provider value={{ items, agregarProducto, eliminarProducto, limpiarCarrito, totalPrecio, totalItems }}>
      {children}
    </CartContext.Provider>
  );
};

// Hook personalizado para usar el carrito fácil
export const useCart = () => useContext(CartContext);