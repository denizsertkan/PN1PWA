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

// Flag to ensure the camera is only initialized once.
let cameraInitialized = false;

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
  };
}

// Event listeners for buttons.
infoBtn.addEventListener('click', () => {
  qrCodeImg.src =
    'https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=93C575&data=' +
    encodeURIComponent(window.location.href);
  infoModal.classList.remove('hidden');
});

closeModalBtn.addEventListener('click', () => {
  infoModal.classList.add('hidden');
});

tweakBtn.addEventListener('click', () => {
  console.log('Settings button clicked');
});

recordBtn.addEventListener('click', () => {
  console.log('Record button clicked');
});

savedBtn.addEventListener('click', () => {
  console.log('Saved Media button clicked');
});

signinBtn.addEventListener('click', () => {
  console.log('Sign In button clicked');
});

// Initialize the camera feed once the page loads.
window.addEventListener('DOMContentLoaded', () => {
  setupCamera();
});
