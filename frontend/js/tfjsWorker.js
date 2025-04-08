// tfjsWorker.js

// Load TensorFlow.js and the WASM backend
importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs');
importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm');

// Optionally configure the WASM binary path
tf.env().set(
  'WASM_PATH',
  'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm/dist/',
);

// Set the backend to WASM
tf.setBackend('wasm').then(() => {
  console.log('WASM backend is set.');

  // Load your ML model (e.g., coco-ssd)
  cocoSsd.load().then((loadedModel) => {
    self.model = loadedModel;
    postMessage({ type: 'modelReady' });
  });
});

// Listen for messages from the main thread for detection requests
self.onmessage = async (e) => {
  if (e.data.type === 'detect') {
    let predictions = [];
    try {
      if (e.data.canvas) {
        // If an OffscreenCanvas was transferred
        predictions = await self.model.detect(e.data.canvas);
        postMessage({
          type: 'detectionResults',
          predictions,
          detectionWidth: 224,
          detectionHeight: 224,
        });
      } else if (e.data.bitmap) {
        // Otherwise, use the ImageBitmap
        // Create an offscreen canvas for the bitmap
        const offscreen = new OffscreenCanvas(
          e.data.detectionWidth,
          e.data.detectionHeight,
        );
        const ctx = offscreen.getContext('2d');
        ctx.drawImage(
          e.data.bitmap,
          0,
          0,
          e.data.detectionWidth,
          e.data.detectionHeight,
        );
        predictions = await self.model.detect(offscreen);
        postMessage({
          type: 'detectionResults',
          predictions,
          detectionWidth: e.data.detectionWidth,
          detectionHeight: e.data.detectionHeight,
        });
      }
    } catch (error) {
      console.error('Detection error in worker:', error);
    }
  }
};
