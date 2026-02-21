import { loadTensorflowModel } from 'react-native-fast-tflite';

let model: any = null;

export async function loadFaceModel() {
  if (model) return model;

  model = await loadTensorflowModel(
    require('../assets/models/mobilefacenet.tflite'),
  );

  console.log('✅ MobileFaceNet model loaded');
  return model;
}
