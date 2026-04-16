import React, { createContext, useContext, useState, useEffect } from 'react';

// 1. DEFINICIÓN DEL TIPO DE PRODUCTO EN EL CARRITO
export interface CartItem {
  id: string;
  nombre: string;
  precio: number;
  imagen: string;
  categoria: string;
  quantity: number;
}

// 2. DEFINICIÓN DE LA INTERFACE DEL CONTEXTO (Esto quita los errores rojos)
interface CartContextData {
  cart: CartItem[];
  addToCart: (product: any) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalAmount: number;
  totalItems: number;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  // Función para agregar al carrito
  const addToCart = (product: any) => {
    setCart((currentCart) => {
      const isProductInCart = currentCart.find((item) => item.id === product.id);

      if (isProductInCart) {
        return currentCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...currentCart, { ...product, quantity: 1 }];
    });
  };

  // Función para quitar un producto
  const removeFromCart = (productId: string) => {
    setCart((currentCart) => currentCart.filter((item) => item.id !== productId));
  };

  // Función para actualizar la cantidad (+ o -)
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) return;
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  // Función para vaciar el carrito
  const clearCart = () => {
    setCart([]);
  };

  // Cálculos automáticos
  const totalAmount = cart.reduce((acc, item) => acc + item.precio * item.quantity, 0);
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalAmount,
        totalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// Hook personalizado para usar el carrito
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe ser usado dentro de un CartProvider');
  }
  return context;
};