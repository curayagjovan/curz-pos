// IndexedDB wrapper for products caching
const DB_NAME = "curz-pos";
const DB_VERSION = 1;
const STORE_NAME = "products";
const LAST_SYNC_KEY = "products_last_sync";

export type Product = {
  id: string;
  sku: string;
  name: string;
  price: number | string;
  bundleQty?: number | string;
  bundlePrice?: number | string;
};

export type ProductsCache = {
  items: Product[];
  hasMore: boolean;
  totalCount: number;
  timestamp: number;
};

let dbInstance: IDBDatabase | null = null;
let dbAvailable = true;

async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  if (!dbAvailable) throw new Error("IndexedDB not available");

  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        dbAvailable = false;
        reject(request.error);
      };
      request.onsuccess = () => {
        dbInstance = request.result;
        resolve(dbInstance);
      };

      request.onupgradeneeded = (event) => {
        try {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: "id" });
          }
        } catch (error) {
          dbAvailable = false;
          throw error;
        }
      };
    } catch (error) {
      dbAvailable = false;
      reject(error);
    }
  });
}

export async function saveProducts(products: Product[]): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], "readwrite");
      const store = tx.objectStore(STORE_NAME);

      // Clear existing products
      store.clear();

      // Save each product
      products.forEach((product) => {
        store.put(product);
      });

      tx.oncomplete = () => {
        // Save last sync time to localStorage
        localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    // Silently fail - IndexedDB might not be available (e.g., Safari private mode)
    console.warn("Could not save to IndexedDB:", error);
    return Promise.resolve();
  }
}

export async function getProducts(): Promise<Product[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    // Return empty array if IndexedDB not available
    console.warn("Could not read from IndexedDB:", error);
    return [];
  }
}

export function getLastSyncTime(): number {
  try {
    const timestamp = localStorage.getItem(LAST_SYNC_KEY);
    return timestamp ? parseInt(timestamp, 10) : 0;
  } catch {
    return 0;
  }
}

export function shouldRefresh(intervalMs: number = 3600000): boolean {
  // Default: refresh if last sync was more than 1 hour ago
  const lastSync = getLastSyncTime();
  return Date.now() - lastSync > intervalMs;
}

export async function clearProducts(): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        localStorage.removeItem(LAST_SYNC_KEY);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    // Silently fail
    console.warn("Could not clear IndexedDB:", error);
    return Promise.resolve();
  }
}
