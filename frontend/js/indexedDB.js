let db;

function openDatabase() {
  return new Promise((resolve, reject) => {
    // Increase the version to trigger an upgrade if needed
    const request = indexedDB.open('PN1_Videos', 2);

    request.onupgradeneeded = (e) => {
      db = e.target.result;
      let store;
      if (!db.objectStoreNames.contains('videos')) {
        store = db.createObjectStore('videos', {
          keyPath: 'id',
          autoIncrement: true,
        });
      } else {
        store = e.target.transaction.objectStore('videos');
      }
      // Create an index on the "url" field (if still needed elsewhere)
      if (!store.indexNames.contains('url')) {
        store.createIndex('url', 'url', { unique: false });
      }
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });
}

function saveVideoToDB(blob, url) {
  if (!db) return console.error('DB not initialized');
  const tx = db.transaction('videos', 'readwrite');
  const store = tx.objectStore('videos');
  const videoRecord = { blob, url, created: Date.now() };
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
    if (callback && typeof callback === 'function') {
      callback(records);
    }
  };

  request.onerror = () => {
    console.error('Error loading videos from IndexedDB', request.error);
  };
}

// Delete video record by its unique id.
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
