import axios from 'axios';

export const subirImagenCloudinary = async (imagenBase64: string) => {
  // Traemos las llaves de nuestro archivo oculto .env
  const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Faltan las credenciales de Cloudinary en el .env");
  }

  // Preparamos el paquete para enviar
  const data = new FormData();
  // Truco: Enviamos la imagen en formato Base64 para que funcione perfecto tanto en Web como en Móvil
  data.append('file', `data:image/jpeg;base64,${imagenBase64}`);
  data.append('upload_preset', uploadPreset);

  try {
    // El cartero (axios) hace el envío a la URL de la API de Cloudinary
    const respuesta = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      data
    );
    
    // Cloudinary nos devuelve un montón de datos, pero solo nos importa el link seguro de la foto
    return respuesta.data.secure_url;
  } catch (error) {
    console.error("Error al subir a Cloudinary:", error);
    throw error;
  }
};