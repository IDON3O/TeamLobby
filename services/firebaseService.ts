/**
 * En lugar de subir a Firebase Storage (que requiere tarjeta de crédito/Plan Blaze),
 * convertimos la imagen a una cadena Base64.
 * 
 * Esto permite guardar la imagen directamente como texto en la Realtime Database
 * sin costo adicional y sin configuración extra.
 * 
 * @param file El archivo seleccionado por el usuario.
 * @returns Promesa con la cadena Base64 de la imagen.
 */
export const uploadGameImage = async (file: File): Promise<string> => {
  if (!file) throw new Error("No file provided");

  return new Promise((resolve, reject) => {
    // Validar tamaño para no saturar la base de datos (limite aprox 500kb para buen rendimiento)
    if (file.size > 1024 * 1024) { // 1MB
       // Opcional: Podríamos comprimir aquí, pero por ahora lanzamos advertencia
       console.warn("Imagen grande. Puede tardar en sincronizar.");
    }

    const reader = new FileReader();
    
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert image to Base64"));
      }
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsDataURL(file);
  });
};