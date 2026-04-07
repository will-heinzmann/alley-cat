/**
 * Offline-First Score Sync
 * Saves games to localStorage immediately, syncs to cloud when online.
 */

const QUEUE_KEY = "alleycat_offline_queue";

export interface OfflineGame {
  id: string;
  user_id: string;
  alley_id: string;
  score: number;
  date: string;
  oil_condition: string;
  notes: string | null;
  image_url: string | null;
  created_at: string;
}

export const getOfflineQueue = (): OfflineGame[] => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const addToOfflineQueue = (game: OfflineGame) => {
  const queue = getOfflineQueue();
  queue.push(game);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const removeFromOfflineQueue = (id: string) => {
  const queue = getOfflineQueue().filter(g => g.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const clearOfflineQueue = () => {
  localStorage.removeItem(QUEUE_KEY);
};

export const syncOfflineGames = async (
  supabaseInsert: (game: Omit<OfflineGame, "id" | "created_at">) => Promise<{ error: any }>
): Promise<{ synced: number; failed: number }> => {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const game of queue) {
    const { error } = await supabaseInsert({
      user_id: game.user_id,
      alley_id: game.alley_id,
      score: game.score,
      date: game.date,
      oil_condition: game.oil_condition,
      notes: game.notes,
      image_url: game.image_url,
    });
    if (!error) {
      removeFromOfflineQueue(game.id);
      synced++;
    } else {
      failed++;
    }
  }

  return { synced, failed };
};

/** Check if the browser is online */
export const isOnline = (): boolean => navigator.onLine;

/** Register listeners for online/offline events */
export const onConnectivityChange = (callback: (online: boolean) => void) => {
  const onOnline = () => callback(true);
  const onOffline = () => callback(false);
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
};
