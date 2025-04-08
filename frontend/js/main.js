// Register the service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/js/service-worker.js')
      .then((registration) => {
        console.log(
          'ServiceWorker registration successful with scope:',
          registration.scope,
        );
      })
      .catch((error) => {
        console.log('ServiceWorker registration failed:', error);
      });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const loader = document.getElementById('loader');
  const buttonsContainer = document.getElementById('buttons-container');
  const tapToRecordText = document.getElementById('tapToRecordText');

  const infoBtn = document.getElementById('infoBtn');
  const tweakBtn = document.getElementById('tweakBtn');
  const recordBeginBtn = document.getElementById('recordBeginBtn');
  const savedBtn = document.getElementById('savedBtn');
  const signinBtn = document.getElementById('signinBtn');
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

  const modeToggle = document.getElementById('modeToggle');
  const funModeSettings = document.getElementById('funModeSettings');
  const sciModeSettings = document.getElementById('sciModeSettings');

  let cameraInitialized = false;
  let mediaRecorder;
  let recordedChunks = [];
  let savedVideos = [];
  let isRecording = false;

  let smoothedBox = { x: 0, y: 0, w: 0, h: 0, valid: false };

  function lerp(start, end, t) {
    return start + t * (end - start);
  }

  const dogWatermarkImg = new Image();
  const pn1WatermarkImg = new Image();
  dogWatermarkImg.src = 'icons/watermark.dog.svg';
  pn1WatermarkImg.src = 'icons/watermark.PN1.svg';

  async function setupCamera() {
    if (cameraInitialized) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      console.error('getUserMedia not supported on your browser!');
      return;
    }

    try {
      const constraints = {
        video: { facingMode: { ideal: 'environment' } },
        audio: true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      handleCameraStream(stream);
    } catch (error) {
      console.error('Error accessing the camera:', error);
    }
  }

  async function handleCameraStream(stream) {
    video.srcObject = stream;

    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordedChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      sendVideoToServer(blob);
    };

    video.onloadedmetadata = () => {
      video.classList.remove('hidden');
      loader.classList.add('hidden');
      buttonsContainer.classList.remove('opacity-0', 'pointer-events-none');
      buttonsContainer.classList.add('opacity-100', 'pointer-events-auto');
      tapToRecordText.classList.remove('opacity-0');
      setTimeout(() => {
        tapToRecordText.classList.add('opacity-0');
      }, 3000);

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      requestAnimationFrame(drawCanvasFrame);
    };
  }

  const tfjsWorker = new Worker('tfjsWorker.js');
  tfjsWorker.onmessage = (e) => {
    if (e.data.type === 'modelReady') {
      console.log('Detection model loaded in worker.');
    } else if (e.data.type === 'detectionResults') {
      const predictions = e.data.predictions;
      const detectionWidth = e.data.detectionWidth || 224;
      const detectionHeight = e.data.detectionHeight || 224;
      const scaleX = video.videoWidth / detectionWidth;
      const scaleY = video.videoHeight / detectionHeight;
      const dog = predictions.find((pred) => pred.class === 'dog');
      if (dog) {
        const [newX, newY, newW, newH] = dog.bbox;
        const fullNewX = newX * scaleX;
        const fullNewY = newY * scaleY;
        const fullNewW = newW * scaleX;
        const fullNewH = newH * scaleY;
        const alpha = 0.4;

        if (!smoothedBox.valid) {
          smoothedBox = {
            x: fullNewX,
            y: fullNewY,
            w: fullNewW,
            h: fullNewH,
            valid: true,
          };
        } else {
          smoothedBox.x = lerp(smoothedBox.x, fullNewX, alpha);
          smoothedBox.y = lerp(smoothedBox.y, fullNewY, alpha);
          smoothedBox.w = lerp(smoothedBox.w, fullNewW, alpha);
          smoothedBox.h = lerp(smoothedBox.h, fullNewH, alpha);
        }
      } else {
        smoothedBox.valid = false;
      }
    }
  };

  async function updateDetections() {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      if (canvas.transferControlToOffscreen) {
        const offscreen = canvas.transferControlToOffscreen();
        tfjsWorker.postMessage({ type: 'detect', canvas: offscreen }, [
          offscreen,
        ]);
      } else {
        const bitmap = await createImageBitmap(video);
        tfjsWorker.postMessage({
          type: 'detect',
          bitmap,
          detectionWidth: 224,
          detectionHeight: 224,
        });
      }
    }
  }

  setInterval(updateDetections, 100);

  function drawCanvasFrame() {
    if (!video.videoWidth || !video.videoHeight) {
      requestAnimationFrame(drawCanvasFrame);
      return;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scale = Math.min(
      canvas.width / video.videoWidth,
      canvas.height / video.videoHeight,
    );
    const newWidth = video.videoWidth * scale;
    const newHeight = video.videoHeight * scale;
    const xOffset = (canvas.width - newWidth) / 2;
    const yOffset = (canvas.height - newHeight) / 2;

    const borderRadius = 5;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2.5;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.moveTo(xOffset + borderRadius, yOffset);
    ctx.arcTo(
      xOffset + newWidth,
      yOffset,
      xOffset + newWidth,
      yOffset + borderRadius,
      borderRadius,
    );
    ctx.arcTo(
      xOffset + newWidth,
      yOffset + newHeight,
      xOffset + newWidth - borderRadius,
      yOffset + newHeight,
      borderRadius,
    );
    ctx.arcTo(
      xOffset,
      yOffset + newHeight,
      xOffset,
      yOffset + newHeight - borderRadius,
      borderRadius,
    );
    ctx.arcTo(xOffset, yOffset, xOffset + borderRadius, yOffset, borderRadius);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.clip();
    ctx.drawImage(video, xOffset, yOffset, newWidth, newHeight);
    ctx.restore();

    if (smoothedBox.valid) {
      const cornerLength = 20;
      ctx.beginPath();
      drawCorners(
        ctx,
        smoothedBox.x,
        smoothedBox.y,
        smoothedBox.w,
        smoothedBox.h,
        cornerLength,
      );
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    ctx.globalAlpha = 0.5;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 5;
    ctx.drawImage(dogWatermarkImg, 8, 8, 64, 64);
    ctx.drawImage(pn1WatermarkImg, 80, 13, 108, 54);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;

    requestAnimationFrame(drawCanvasFrame);
  }

  function drawCorners(ctx, x, y, w, h, len) {
    ctx.moveTo(x, y + len);
    ctx.lineTo(x, y);
    ctx.lineTo(x + len, y);

    ctx.moveTo(x + w - len, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + len);

    ctx.moveTo(x, y + h - len);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + len, y + h);

    ctx.moveTo(x + w - len, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y + h - len);
  }

  function handleTouchStart(event) {
    if (!isRecording) {
      recordedChunks = [];
      mediaRecorder.start();
      isRecording = true;
      recordBeginBtn.innerHTML =
        '<img src="icons/recordStopBtn.svg" alt="Stop" class="w-1/2 h-1/2 relative">';
      recordBeginBtn.style.backgroundColor = '#CC5500';
      recordBeginBtn.style.animation = 'pulse 1s infinite';
    }
  }

  function handleTouchEnd(event) {
    if (isRecording) {
      mediaRecorder.stop();
      isRecording = false;
      recordBeginBtn.innerHTML =
        '<img src="icons/recordBeginBtn.svg" alt="Record" class="w-1/2 h-1/2 relative">';
      recordBeginBtn.style.backgroundColor = '#93C575';
      recordBeginBtn.style.animation = 'none';
    }
  }

  if (recordBeginBtn) {
    recordBeginBtn.addEventListener('touchstart', handleTouchStart);
    recordBeginBtn.addEventListener('touchend', handleTouchEnd);
  }

  function sendVideoToServer(videoBlob) {
    const formData = new FormData();
    formData.append('video', videoBlob, 'recording.webm');

    fetch('/analyze', {
      method: 'POST',
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.result) {
          updateChart(data.result);
        } else {
          console.error('Server error:', data.error);
        }
      })
      .catch((err) => console.error('Upload failed:', err));
  }

  // Minimal fallback in case chart.js isn't loaded yet
  window.updateChart = function (data) {
    console.log('Chart update received:', data);
    // Optionally forward to real chart logic if available
    if (typeof window.myChart !== 'undefined') {
      // Update chart option logic here
    }
  };

  setupCamera();
});
