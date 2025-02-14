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

async function setupCamera() {
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

    // Show buttons after camera is accessed
    buttonsContainer.classList.remove('opacity-0', 'pointer-events-none');
    buttonsContainer.classList.add('opacity-100', 'pointer-events-auto');

    // Show "Tap to Record" and hide it after 3 seconds
    tapToRecordText.classList.remove('opacity-0');
    setTimeout(() => {
      tapToRecordText.classList.add('opacity-0');
    }, 3000);
  };
}

// Event listeners for new buttons
infoBtn.addEventListener('click', () => {
  console.log('Info button clicked');
  // Generate a QR code linking to the current URL
  qrCodeImg.src =
    'https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=93C575&data=' +
    encodeURIComponent(window.location.href);
  // Show the info modal by removing the "hidden" class
  infoModal.classList.remove('hidden');
});

// Event listener to close the modal
closeModalBtn.addEventListener('click', () => {
  infoModal.classList.add('hidden');
});

// Event listeners for existing buttons
tweakBtn.addEventListener('click', () => {
  console.log('Settings button clicked');
  // Add your settings logic here
});

recordBtn.addEventListener('click', () => {
  console.log('Record button clicked');
  // Add your recording logic here
});

savedBtn.addEventListener('click', () => {
  console.log('Saved Media button clicked');
  // Add your media-related logic here
});

signinBtn.addEventListener('click', () => {
  console.log('Sign In button clicked');
  // Add your sign-in logic here
});

// Initialize the camera feed
setupCamera();
