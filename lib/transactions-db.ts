import type { Transaction } from "@/types/transaction";

const DB_NAME = "curz-pos-transactions";
const DB_VERSION = 1;
const STORE_NAME = "transactions";
const LAST_SYNC_KEY = "transactions_last_sync";

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

export async function saveTransactions(
  transactions: Transaction[],
): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], "readwrite");
      const store = tx.objectStore(STORE_NAME);

      store.clear();
      transactions.forEach((transaction) => {
        store.put(transaction);
      });

      tx.oncomplete = () => {
        localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.warn("Could not save transactions to IndexedDB:", error);
    return Promise.resolve();
  }
}

export async function getTransactions(): Promise<Transaction[]> {
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
    console.warn("Could not read transactions from IndexedDB:", error);
    return [];
  }
}

export function shouldRefreshTransactions(intervalMs: number = 3600000) {
  try {
    const timestamp = localStorage.getItem(LAST_SYNC_KEY);
    const lastSync = timestamp ? parseInt(timestamp, 10) : 0;
    return Date.now() - lastSync > intervalMs;
  } catch {
    return true;
  }
}
