/**
 * Servicio optimizado para subir imágenes a Realtime Database.
 * Incluye COMPRESIÓN automática para evitar saturar la base de datos gratuita.
 */
export const uploadGameImage = async (file: File): Promise<string> => {
  if (!file) throw new Error("No file provided");

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        // Configuración de compresión
        const maxWidth = 800; // Ancho máximo
        const maxHeight = 600; // Alto máximo
        let width = img.width;
        let height = img.height;

        // Calcular nuevas dimensiones manteniendo aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        // Crear canvas para redimensionar
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
             reject(new Error("Could not get canvas context"));
             return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Exportar a JPEG con calidad 0.7 (70%)
        // Esto reduce una imagen de 2MB a unos 50-80KB en Base64
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };
      
      img.onerror = (err) => reject(err);
    };

    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};