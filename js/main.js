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
const recordBeginBtn = document.getElementById('recordBeginBtn');
const savedBtn = document.getElementById('savedBtn');
const signinBtn = document.getElementById('signinBtn');

// Modal elements
const infoModal = document.getElementById('infoModal');
const tweakModal = document.getElementById('tweakModal');
const savedModal = document.getElementById('savedModal');
const signinModal = document.getElementById('signinModal');

const qrCodeImg = document.getElementById('qrCode');
const closeModalBtn = document.getElementById('closeModal');
const closeTweakModalBtn = document.getElementById('closeTweakModal');
const closeSavedModalBtn = document.getElementById('closeSavedModal');
const closeSigninModalBtn = document.getElementById('closeSigninModal');
const savedVideosContainer = document.getElementById('savedVideosContainer');
const dropzoneFile = document.getElementById('videoUpload');

// Flag to ensure the camera is only initialized once.
let cameraInitialized = false;
let mediaRecorder;
let recordedChunks = [];
let savedVideos = [];
let isRecording = false;

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
        video: { facingMode: 'user' }, // Explicitly request the front camera
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
  // Set up the live video preview as before.
  video.srcObject = stream;
  video.onloadedmetadata = () => {
    video.classList.remove('hidden');
    loader.classList.add('hidden');
    buttonsContainer.classList.remove('opacity-0', 'pointer-events-none');
    buttonsContainer.classList.add('opacity-100', 'pointer-events-auto');
    tapToRecordText.classList.remove('opacity-0');
    setTimeout(() => {
      tapToRecordText.classList.add('opacity-0');
    }, 3000);

    // Create a hidden canvas to composite the video with watermarks.
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    // Optionally, for debugging, you could append the canvas to the DOM.
    // document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // Create Image objects for your two SVG watermarks.
    const watermarkImg1 = new Image();
    watermarkImg1.src = 'icons/watermark.dog.svg';
    const watermarkImg2 = new Image();
    watermarkImg2.src = 'icons/watermark.PN1.svg';

    // Wait until both watermark images have loaded.
    Promise.all([
      new Promise((resolve) => (watermarkImg1.onload = resolve)),
      new Promise((resolve) => (watermarkImg2.onload = resolve)),
    ]).then(() => {
      function drawCanvasFrame() {
        // Prevent drawing when video isn't loaded
        if (!video.videoWidth || !video.videoHeight) return;
        // Clear previous frame
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // 40% opacity.
        ctx.globalAlpha = 0.2;
        // Draw the current video frame.
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Draw the 1st watermark (matches top-2 left-2, w-16 in your HTML).
        ctx.drawImage(watermarkImg1, 8, 8, 64, 64);
        // Draw the 2nd watermark (matches top-2 left-[4.5rem], roughly 72px offset).
        ctx.drawImage(watermarkImg2, 80, 13, 108, 54);
        // Reset after drawing
        ctx.globalAlpha = 1.0;

        requestAnimationFrame(drawCanvasFrame);
      }
      drawCanvasFrame();
    });

    // Instead of recording the raw stream, capture the canvas stream.
    const canvasStream = canvas.captureStream(75); // 30 fps
    mediaRecorder = new MediaRecorder(canvasStream, { mimeType: 'video/mp4' });
    mediaRecorder.ondataavailable = function (event) {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
        console.log('Recording chunk:', event.data);
      }
    };
    mediaRecorder.onstop = function () {
      const blob = new Blob(recordedChunks, { type: 'video/mp4' });

      // Save to IndexedDB for persistence.
      saveVideoToDB(blob);

      // Also create a URL for immediate use.
      const url = URL.createObjectURL(blob);
      savedVideos.push(url);
      displaySavedVideos();

      console.log('Recorded Blob size:', blob.size);
      console.log('Recorded Blob URL:', url);

      recordedChunks = [];
    };
    mediaRecorder.onerror = function (event) {
      console.error('MediaRecorder error:', event.error);
    };
    mediaRecorder.onstart = function () {
      console.log('Recording started.');
    };
  };
}

// Display saved videos in the savedModal
function displaySavedVideos() {
  savedVideosContainer.innerHTML = '';
  if (savedVideos.length === 0) {
    savedVideosContainer.innerHTML = `
      <br>
      <div class="flex items-center justify-center w-full">
        <label for="dropzone-file" class="flex flex-col items-center justify-center w-full h-[calc(100% - 20vh)] border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
          <div class="flex flex-col items-center justify-center pt-5 pb-6 w-full h-full">
            <svg class="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
            </svg>
            <p>Click to upload</p>
          </div>
          <input id="dropzone-file" type="file" class="hidden" />
        </label>
      </div>
      <br>
      <p>No saved videos yet.</p>
    `;
    return;
  }

  savedVideos.forEach((url, index) => {
    const listItem = document.createElement('div');
    listItem.classList.add(
      'flex',
      'items-center',
      'justify-between',
      'mb-4',
      'p-2',
      'border',
      'rounded',
    );

    const thumbnail = document.createElement('video');
    thumbnail.src = url;
    thumbnail.classList.add('w-16', 'h-16', 'object-cover', 'rounded');
    thumbnail.muted = true;

    const title = document.createElement('span');
    title.classList.add('flex-1', 'ml-4', 'text-sm');
    title.textContent = `Video ${index + 1}`;

    const playButton = document.createElement('button');
    playButton.classList.add('ml-2', 'text-green-500', 'hover:text-green-700');
    playButton.innerHTML =
      '<img src="icons/playVideoBtn.svg" alt="Play" class="w-8 h-8 mr-4">';
    playButton.addEventListener('click', () => {
      const videoPlayer = document.createElement('video');
      videoPlayer.src = url;
      videoPlayer.controls = true;
      videoPlayer.classList.add(
        'fixed',
        'top-1/2',
        'left-1/2',
        'transform',
        '-translate-x-1/2',
        '-translate-y-1/2',
        'w-full',
        'max-w-xl',
        'z-50',
      );
      document.body.appendChild(videoPlayer);
      videoPlayer.play();
      videoPlayer.addEventListener('ended', () => {
        document.body.removeChild(videoPlayer);
      });
    });

    const deleteButton = document.createElement('button');
    deleteButton.classList.add('ml-2', 'text-red-500', 'hover:text-red-700');
    deleteButton.innerHTML =
      '<img src="icons/removeItemBtn.svg" alt="Delete" class="w-8 h-8 mr-4">';
    deleteButton.addEventListener('click', () => {
      savedVideos.splice(index, 1);
      displaySavedVideos();
    });

    listItem.appendChild(thumbnail);
    listItem.appendChild(title);
    listItem.appendChild(playButton);
    listItem.appendChild(deleteButton);

    savedVideosContainer.appendChild(listItem);
  });
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
  tweakModal.classList.remove('hidden');
});

closeTweakModalBtn.addEventListener('click', () => {
  tweakModal.classList.add('hidden');
});

recordBeginBtn.addEventListener('click', () => {
  if (isRecording) {
    mediaRecorder.stop();
    isRecording = false;
    recordBeginBtn.innerHTML =
      '<img src="icons/recordBeginBtn.svg" alt="Record" class="w-1/2 h-1/2 relative">';
    recordBeginBtn.style.backgroundColor = '#93C575';
    recordBeginBtn.style.animation = 'none';
  } else {
    recordedChunks = [];
    mediaRecorder.start();
    isRecording = true;
    recordBeginBtn.innerHTML =
      '<img src="icons/recordStopBtn.svg" alt="Stop" class="w-1/2 h-1/2 relative">';
    recordBeginBtn.style.backgroundColor = '#CC5500';
    recordBeginBtn.style.animation = 'pulse 1s infinite';
  }
});

savedBtn.addEventListener('click', () => {
  savedModal.classList.remove('hidden');
  displaySavedVideos();
});

closeSavedModalBtn.addEventListener('click', () => {
  savedModal.classList.add('hidden');
});

signinBtn.addEventListener('click', () => {
  signinModal.classList.remove('hidden');
});

closeSigninModalBtn.addEventListener('click', () => {
  signinModal.classList.add('hidden');
});

// Initialize the camera feed once the page loads.
window.addEventListener('DOMContentLoaded', () => {
  setupCamera();
});

// ---

// Handle file drop for video upload
dropzoneFile.addEventListener('change', handleFileUpload);

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (file && file.type.match('video.*')) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const videoBlob = new Blob([e.target.result], { type: file.type });
      const videoUrl = URL.createObjectURL(videoBlob);
      savedVideos.push(videoUrl);
      displaySavedVideos();
    };
    reader.readAsArrayBuffer(file);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  setupCamera();

  // Request persistent storage to help keep your data between sessions.
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().then((granted) => {
      console.log('Persistent storage granted:', granted);
    });
  }

  openDatabase()
    .then(() => {
      // Load videos from IndexedDB and add them to your savedVideos array.
      loadVideosFromDB((records) => {
        records.forEach((record) => {
          const url = URL.createObjectURL(record.blob);
          savedVideos.push(url);
        });
        displaySavedVideos();
      });
    })
    .catch((err) => console.error('IndexedDB error:', err));
});
