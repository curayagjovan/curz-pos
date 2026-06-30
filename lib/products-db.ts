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
  stock: number | string;
};

export type ProductsCache = {
  items: Product[];
  hasMore: boolean;
  totalCount: number;
  timestamp: number;
};

let dbInstance: IDBDatabase | null = null;

async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

export async function saveProducts(products: Product[]): Promise<void> {
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
}

export async function getProducts(): Promise<Product[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getProductCount(): Promise<number> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function getLastSyncTime(): number {
  const timestamp = localStorage.getItem(LAST_SYNC_KEY);
  return timestamp ? parseInt(timestamp, 10) : 0;
}

export function shouldRefresh(intervalMs: number = 3600000): boolean {
  // Default: refresh if last sync was more than 1 hour ago
  const lastSync = getLastSyncTime();
  return Date.now() - lastSync > intervalMs;
}

export async function clearProducts(): Promise<void> {
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
}
