const DB_NAME = "Campus404OfflineDB";
const DB_VERSION = 1;

export function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("pendingOperations")) {
        const store = db.createObjectStore("pendingOperations", { keyPath: "operationId" });
        store.createIndex("eventId", "eventId", { unique: false });
      }
      if (!db.objectStoreNames.contains("eventSnapshots")) {
        db.createObjectStore("eventSnapshots", { keyPath: "eventId" });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function queueOfflineOperation(operation) {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pendingOperations", "readwrite");
    const store = tx.objectStore("pendingOperations");
    const op = {
      ...operation,
      operationId: operation.operationId || `op_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
    };
    const req = store.put(op);
    req.onsuccess = () => resolve(op);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function getPendingOperations(eventId) {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pendingOperations", "readonly");
    const store = tx.objectStore("pendingOperations");
    const req = store.getAll();
    req.onsuccess = () => {
      const ops = req.result || [];
      resolve(eventId ? ops.filter((o) => o.eventId === eventId) : ops);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function removePendingOperation(operationId) {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pendingOperations", "readwrite");
    const store = tx.objectStore("pendingOperations");
    const req = store.delete(operationId);
    req.onsuccess = () => resolve(true);
    req.onerror = (e) => reject(e.target.error);
  });
}
