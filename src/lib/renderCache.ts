"use client";

// Rendered try-on images are cached in IndexedDB (they are too big for localStorage).
// The same selfie + recipe never calls the YouCam API twice.

const DB = "glowfit";
const STORE = "renders";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getRender(key: string): Promise<string | null> {
  try {
    const db = await open();
    return await new Promise((resolve) => {
      const req = db.transaction(STORE).objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as string) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function putRender(key: string, image: string) {
  try {
    const db = await open();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(image, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Cache is best-effort; the image still shows for this session.
  }
}

export async function deleteRenders(keys: string[]) {
  try {
    const db = await open();
    const tx = db.transaction(STORE, "readwrite");
    keys.forEach((k) => tx.objectStore(STORE).delete(k));
  } catch {
    // ignore
  }
}

/** Short, stable hash (FNV-1a) for cache keys. */
export function hash(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
