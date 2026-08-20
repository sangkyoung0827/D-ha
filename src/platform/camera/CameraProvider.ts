export interface CameraProvider {
  readImage(file: File): Promise<string>;
  loadImage(source: string): Promise<HTMLImageElement>;
}

export class WebCameraProvider implements CameraProvider {
  readImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("사진 파일을 읽지 못했어요."));
      reader.readAsDataURL(file);
    });
  }

  loadImage(source: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("사진 형식을 확인해주세요."));
      image.src = source;
    });
  }
}

export const cameraProvider: CameraProvider = new WebCameraProvider();
