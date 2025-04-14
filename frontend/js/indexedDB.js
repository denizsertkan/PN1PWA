let db;

function openDatabase() {
  return new Promise((resolve, reject) => {
    // Increase version to 4 (or higher) to trigger upgrade
    const request = indexedDB.open('PN1_Videos', 4);

    request.onupgradeneeded = (e) => {
      db = e.target.result;

      // Wipe existing store
      if (db.objectStoreNames.contains('videos')) {
        db.deleteObjectStore('videos');
      }

      // Create fresh store
      const store = db.createObjectStore('videos', {
        keyPath: 'id',
      });
      store.createIndex('url', 'url', { unique: false });
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });
}

function saveVideoToDB(blob, url, customId, timestamp) {
  if (!db) return console.error('DB not initialized');
  const tx = db.transaction('videos', 'readwrite');
  const store = tx.objectStore('videos');

  // customId is the same string you get from server
  const videoRecord = {
    id: customId,
    blob,
    url,
    created: timestamp || Date.now(),
  };

  const request = store.add(videoRecord);
  request.onsuccess = () => console.log('Video saved with ID:', customId);
  request.onerror = () => console.error('Error saving video', request.error);
}

function loadVideosFromDB(callback) {
  if (!db) return console.error('DB not initialized');
  const tx = db.transaction('videos', 'readonly');
  const store = tx.objectStore('videos');
  const request = store.getAll();

  request.onsuccess = () => {
    const records = request.result;
    if (callback && typeof callback === 'function') {
      callback(records);
    }
  };

  request.onerror = () => {
    console.error('Error loading videos from IndexedDB', request.error);
  };
}

function deleteVideoFromDB(id) {
  if (!db) return console.error('DB not initialized');
  const tx = db.transaction('videos', 'readwrite');
  const store = tx.objectStore('videos');
  const request = store.delete(id);

  request.onsuccess = () => console.log('Video deleted from IndexedDB:', id);
  request.onerror = () =>
    console.error('Error deleting video from IndexedDB:', id);
}

// Expose functions globally so main.js can use them
window.openDatabase = openDatabase;
window.saveVideoToDB = saveVideoToDB;
window.loadVideosFromDB = loadVideosFromDB;
window.deleteVideoFromDB = deleteVideoFromDB;
