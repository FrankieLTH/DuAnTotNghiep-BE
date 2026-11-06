/**
 * src/utils/imageValidation.ts
 * Kiểm tra file trước khi upload: jpg/png/webp, <= 5MB, độ phân giải tối thiểu, phát hiện mờ
 */

export interface ImageValidationResult {
  isValid: boolean;
  errorMessage?: string;
  isBlurry?: boolean;
}

export async function validateDocumentImage(file: File): Promise<ImageValidationResult> {
  // 1. Kiểm tra định dạng
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      errorMessage: 'Định dạng tệp không hợp lệ. Vui lòng chọn ảnh JPG, PNG hoặc WEBP.',
    };
  }

  // 2. Kiểm tra dung lượng (<= 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return {
      isValid: false,
      errorMessage: 'Dung lượng ảnh vượt quá 5MB. Vui lòng chọn ảnh nhẹ hơn.',
    };
  }

  // 3. Kiểm tra độ phân giải qua Image element
  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);

      // Độ phân giải tối thiểu 800x600 để đảm bảo OCR đọc rõ số CCCD
      if (img.width < 800 || img.height < 600) {
        return resolve({
          isValid: false,
          errorMessage: 'Độ phân giải ảnh quá thấp (tối thiểu 800x600). Vui lòng chụp rõ nét hơn.',
        });
      }

      // 4. Phát hiện mờ sơ bộ qua Canvas & Laplacian Variance
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve({ isValid: true });

        canvas.width = 200;
        canvas.height = Math.round((200 * img.height) / img.width);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const gray: number[] = [];
        for (let i = 0; i < imgData.data.length; i += 4) {
          gray.push(
            0.299 * imgData.data[i] +
              0.587 * imgData.data[i + 1] +
              0.114 * imgData.data[i + 2]
          );
        }

        // Tính phương sai Laplacian trên pixel grayscale
        let sum = 0;
        const laplacian: number[] = [];
        const w = canvas.width;
        const h = canvas.height;

        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const val =
              gray[(y - 1) * w + x] +
              gray[(y + 1) * w + x] +
              gray[y * w + (x - 1)] +
              gray[y * w + (x + 1)] -
              4 * gray[y * w + x];
            laplacian.push(val);
            sum += val;
          }
        }

        const mean = sum / laplacian.length;
        let variance = 0;
        for (let i = 0; i < laplacian.length; i++) {
          variance += Math.pow(laplacian[i] - mean, 2);
        }
        variance = variance / laplacian.length;

        // Nếu phương sai < 35 -> Ảnh có nguy cơ bị mờ / rung tay
        if (variance < 35) {
          return resolve({
            isValid: true,
            isBlurry: true,
            errorMessage: 'Cảnh báo: Ảnh có dấu hiệu bị mờ hoặc rung tay. Khuyên bạn nên chụp lại rõ nét hơn.',
          });
        }
      } catch (e) {
        // Fallback pass nếu trình duyệt chặn canvas
      }

      resolve({ isValid: true });
    };

    img.onerror = () => {
      resolve({
        isValid: false,
        errorMessage: 'Không thể đọc tệp hình ảnh. Vui lòng chọn tệp khác.',
      });
    };
  });
}
