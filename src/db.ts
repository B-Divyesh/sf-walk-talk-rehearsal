import type { Deck, Settings, Take } from './types';
import { DEFAULT_SETTINGS } from './types';

const DB_NAME = 'walk-talk-rehearsal';
const DB_VERSION = 1;

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Local database request failed.'));
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('decks')) db.createObjectStore('decks', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('takes')) {
        const store = db.createObjectStore('takes', { keyPath: 'id' });
        store.createIndex('nextReplayAt', 'nextReplayAt');
      }
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Could not open local storage.'));
  });
}

async function withStore<T>(name: 'decks' | 'takes' | 'meta', mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    const tx = db.transaction(name, mode);
    const result = await request(run(tx.objectStore(name)));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Local database transaction failed.'));
      tx.onabort = () => reject(tx.error ?? new Error('Local database transaction was cancelled.'));
    });
    return result;
  } finally {
    db.close();
  }
}

export const db = {
  decks: () => withStore<Deck[]>('decks', 'readonly', (s) => s.getAll()),
  saveDeck: (deck: Deck) => withStore<IDBValidKey>('decks', 'readwrite', (s) => s.put(deck)),
  deleteDeck: (id: string) => withStore<undefined>('decks', 'readwrite', (s) => s.delete(id)),
  takes: () => withStore<Take[]>('takes', 'readonly', (s) => s.getAll()),
  saveTake: (take: Take) => withStore<IDBValidKey>('takes', 'readwrite', (s) => s.put(take)),
  deleteTake: (id: string) => withStore<undefined>('takes', 'readwrite', (s) => s.delete(id)),
  settings: async (): Promise<Settings> => ({ ...DEFAULT_SETTINGS, ...await withStore<Settings | undefined>('meta', 'readonly', (s) => s.get('settings')) }),
  saveSettings: (settings: Settings) => withStore<IDBValidKey>('meta', 'readwrite', (s) => s.put(settings, 'settings')),
  clearAll: async () => {
    const database = await openDb();
    const tx = database.transaction(['decks', 'takes', 'meta'], 'readwrite');
    tx.objectStore('decks').clear();
    tx.objectStore('takes').clear();
    tx.objectStore('meta').clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Could not clear local data.'));
    });
    database.close();
  },
};

export function makeStarterDeck(): Deck {
  const now = Date.now();
  const lines = [
    'Ask whether this train stops at the central station.',
    'Explain that you booked a table for two under your name.',
    'Ask a colleague to clarify the last point they made.',
    'Describe what you did yesterday in three sentences.',
  ];
  return {
    id: crypto.randomUUID(), name: 'Everyday moments', context: 'Useful questions for the next trip', language: 'Your target language', createdAt: now, updatedAt: now,
    prompts: lines.map((text) => ({ id: crypto.randomUUID(), text, createdAt: now, repetitions: 0 })),
  };
}
