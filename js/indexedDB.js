let db;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PN1_Videos', 1);
    request.onupgradeneeded = (e) => {
      db = e.target.result;
      if (!db.objectStoreNames.contains('videos')) {
        db.createObjectStore('videos', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });
}

function saveVideoToDB(blob) {
  if (!db) return console.error('DB not initialized');
  const tx = db.transaction('videos', 'readwrite');
  const store = tx.objectStore('videos');
  const videoRecord = { blob: blob, created: Date.now() };
  const request = store.add(videoRecord);
  request.onsuccess = () => console.log('Video saved to IndexedDB');
  request.onerror = () => console.error('Error saving video', request.error);
}

function loadVideosFromDB(callback) {
  if (!db) return console.error('DB not initialized');
  const tx = db.transaction('videos', 'readonly');
  const store = tx.objectStore('videos');
  const request = store.getAll();

  request.onsuccess = () => {
    const records = request.result;
    // Callback with an array of videos records (each containing a blob)
    if (callback && typeof callback === 'function') {
      callback(records);
    }
  };

  request.onerror = () => {
    console.error('Error loading videos from IndexedDB', request.error);
  };
}

// Expose functions globally so main.js can use them
window.openDatabase = openDatabase;
window.saveVideoToDB = saveVideoToDB;
window.loadVideosFromDB = loadVideosFromDB;
