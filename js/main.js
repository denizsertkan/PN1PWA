// Register the service worker for PWA functionality
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function (registrations) {
    for (let registration of registrations) {
      registration.unregister();
    }
  });
}

// Get references to DOM elements
const video = document.getElementById('video');
const loader = document.getElementById('loader');
const buttonsContainer = document.getElementById('buttons-container');
const tapToRecordText = document.getElementById('tapToRecordText');

const infoBtn = document.getElementById('infoBtn');
const tweakBtn = document.getElementById('tweakBtn');
const recordBtn = document.getElementById('recordBtn');
const savedBtn = document.getElementById('savedBtn');
const signinBtn = document.getElementById('signinBtn');

// Modal elements for Info
const infoModal = document.getElementById('infoModal');
const qrCodeImg = document.getElementById('qrCode');
const closeModalBtn = document.getElementById('closeModal');

// Global variable for the ONNX model session
let session;

// Flag to ensure the camera is only initialized once.
let cameraInitialized = false;

/**
 * Loads the YOLO11n ONNX model using ONNX Runtime Web.
 */
async function loadModel() {
  try {
    session = await ort.InferenceSession.create('../MLOps/datasets/yolo11n.onnx');
    console.log('ONNX model loaded successfully.');
  } catch (error) {
    console.error('Failed to load ONNX model:', error);
  }
}

/**
 * Preprocesses the current video frame to match the model's expected input.
 * This example resizes the frame to 640x640 and normalizes the RGB values.
 * Adjust as needed for your model's requirements.
 *
 * @param {HTMLCanvasElement} canvas - The offscreen canvas element.
 * @param {CanvasRenderingContext2D} ctx - The canvas 2D context.
 * @returns {ort.Tensor} - The preprocessed input tensor.
 */
function preprocessFrame(canvas, ctx) {
  // Draw the current video frame into the canvas and resize to 640x640.
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;

  // Create a Float32Array for the model input of shape [1, 3, width, height].
  // Here, we assume the model expects normalized RGB values in [0, 1].
  const float32Data = new Float32Array(3 * width * height);
  const numPixels = width * height;

  for (let i = 0; i < numPixels; i++) {
    // imageData.data is in RGBA format.
    const r = data[i * 4] / 255;
    const g = data[i * 4 + 1] / 255;
    const b = data[i * 4 + 2] / 255;
    // Populate the tensor in channel-first order: [R, G, B]
    float32Data[i] = r;
    float32Data[i + numPixels] = g;
    float32Data[i + 2 * numPixels] = b;
  }

  // Return an ONNX Runtime tensor with shape [1, 3, width, height]
  return new ort.Tensor('float32', float32Data, [1, 3, width, height]);
}

/**
 * Runs inference on the current video frame using the loaded ONNX model.
 */
async function runInference() {
  if (!session) return;

  // Create an offscreen canvas for frame processing.
  const canvas = document.createElement('canvas');
  // Set canvas dimensions to the model's expected input size (e.g., 640x640).
  canvas.width = 640;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');

  // Preprocess the frame.
  const inputTensor = preprocessFrame(canvas, ctx);

  // Prepare the input feed. The key 'input' should match the input name used during export.
  const feeds = { input: inputTensor };

  try {
    const results = await session.run(feeds);
    // Process results as needed (e.g., draw bounding boxes or output detection info).
    console.log('Inference results:', results);
  } catch (error) {
    console.error('Error during inference:', error);
  }
}

/**
 * Sets up the camera stream.
 */
async function setupCamera() {
  if (cameraInitialized) return; // Prevent multiple initializations
  if (!navigator.mediaDevices?.getUserMedia) {
    console.error('getUserMedia not supported on your browser!');
    return;
  }

  try {
    console.log('Attempting to access the rear camera...');
    const constraints = {
      video: { facingMode: { exact: 'environment' } },
      audio: false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log('Rear camera access granted.');
    cameraInitialized = true;
    handleCameraStream(stream);
  } catch (error) {
    console.error('Error accessing the rear camera:', error);
    console.log('Attempting to access the front camera...');
    try {
      const fallbackStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      console.log('Front camera access granted.');
      cameraInitialized = true;
      handleCameraStream(fallbackStream);
    } catch (fallbackError) {
      console.error('Error accessing the fallback camera:', fallbackError);
    }
  }
}

/**
 * Handles the camera stream once access is granted.
 * @param {MediaStream} stream - The camera stream.
 */
function handleCameraStream(stream) {
  video.srcObject = stream;
  video.onloadedmetadata = () => {
    video.classList.remove('hidden');
    loader.classList.add('hidden');

    // Show buttons after camera is accessed.
    buttonsContainer.classList.remove('opacity-0', 'pointer-events-none');
    buttonsContainer.classList.add('opacity-100', 'pointer-events-auto');

    // Show "Tap to Record" and hide it after 3 seconds.
    tapToRecordText.classList.remove('opacity-0');
    setTimeout(() => {
      tapToRecordText.classList.add('opacity-0');
    }, 3000);

    // Start running inference in a loop (e.g., every 100ms ≈ 10 FPS).
    setInterval(runInference, 100);
  };
}

// Event listeners for new buttons.
infoBtn.addEventListener('click', () => {
  console.log('Info button clicked');
  // Generate a QR code linking to the current URL.
  qrCodeImg.src =
    'https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=93C575&data=' +
    encodeURIComponent(window.location.href);
  // Show the info modal by removing the "hidden" class.
  infoModal.classList.remove('hidden');
});

// Event listener to close the modal.
closeModalBtn.addEventListener('click', () => {
  infoModal.classList.add('hidden');
});

// Event listeners for existing buttons.
tweakBtn.addEventListener('click', () => {
  console.log('Settings button clicked');
  // Add your settings logic here.
});

recordBtn.addEventListener('click', () => {
  console.log('Record button clicked');
  // Add your recording logic here.
});

savedBtn.addEventListener('click', () => {
  console.log('Saved Media button clicked');
  // Add your media-related logic here.
});

signinBtn.addEventListener('click', () => {
  console.log('Sign In button clicked');
  // Add your sign-in logic here.
});

// Initialize the ONNX model and the camera feed once the page loads.
window.addEventListener('DOMContentLoaded', async () => {
  await loadModel();
  setupCamera();
});
