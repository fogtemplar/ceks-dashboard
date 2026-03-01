// OI snapshot store - Supabase (persistent) + in-memory fallback
// Stores timestamped OI values for each symbol
// Used to compute 1h / 6h / 24h OI changes

import { supabase } from './supabase';

// ── In-memory fallback (used when Supabase is not configured) ──

interface MemSnapshot {
  timestamp: number;
  data: Map<string, number>;
}

const MAX_AGE_MS = 25 * 3600_000;
const memSnapshots: MemSnapshot[] = [];
let saveCounter = 0;

// ── Save ──

export async function saveOISnapshot(
  coins: { symbol: string; totalOI: number }[]
): Promise<void> {
  const now = Date.now();
  const dataMap = new Map<string, number>();
  const jsonData: Record<string, number> = {};

  for (const c of coins) {
    dataMap.set(c.symbol, c.totalOI);
    jsonData[c.symbol] = Math.round(c.totalOI);
  }

  // Always save to memory
  memSnapshots.push({ timestamp: now, data: dataMap });
  const cutoff = now - MAX_AGE_MS;
  while (memSnapshots.length > 0 && memSnapshots[0].timestamp < cutoff) {
    memSnapshots.shift();
  }

  // Save to Supabase if configured
  if (supabase) {
    try {
      await supabase.from('oi_snapshots').insert({
        created_at: new Date(now).toISOString(),
        data: jsonData,
      });

      // Cleanup old rows every ~10 saves
      saveCounter++;
      if (saveCounter % 10 === 0) {
        const cutoffIso = new Date(now - MAX_AGE_MS).toISOString();
        await supabase
          .from('oi_snapshots')
          .delete()
          .lt('created_at', cutoffIso);
      }
    } catch (e) {
      console.error('Supabase snapshot save error:', e);
    }
  }
}

// ── Batch read: fetch one snapshot closest to N hours ago ──

interface SnapshotData {
  [symbol: string]: number;
}

async function getSnapshotAt(hoursAgo: number): Promise<SnapshotData | null> {
  const targetTs = Date.now() - hoursAgo * 3600_000;
  const tolerance = hoursAgo * 3600_000 * 0.3;

  // Try Supabase first
  if (supabase) {
    try {
      const targetIso = new Date(targetTs).toISOString();
      const minTs = new Date(targetTs - tolerance).toISOString();
      const maxTs = new Date(targetTs + tolerance).toISOString();

      // Get closest snapshot to target time (query in window, pick closest)
      const { data, error } = await supabase
        .from('oi_snapshots')
        .select('created_at, data')
        .gte('created_at', minTs)
        .lte('created_at', maxTs)
        .order('created_at', { ascending: true })
        .limit(5);

      if (!error && data && data.length > 0) {
        // Pick the one closest to target
        let best = data[0];
        let bestDiff = Math.abs(new Date(best.created_at).getTime() - targetTs);
        for (const row of data) {
          const diff = Math.abs(new Date(row.created_at).getTime() - targetTs);
          if (diff < bestDiff) {
            bestDiff = diff;
            best = row;
          }
        }
        return best.data as SnapshotData;
      }
    } catch (e) {
      console.error('Supabase snapshot read error:', e);
    }
  }

  // Fallback to in-memory
  if (memSnapshots.length < 2) return null;

  let closest: MemSnapshot | null = null;
  let closestDiff = Infinity;

  for (const snap of memSnapshots) {
    const diff = Math.abs(snap.timestamp - targetTs);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = snap;
    }
  }

  if (!closest || closestDiff > tolerance) return null;

  const result: SnapshotData = {};
  for (const [sym, oi] of closest.data) {
    result[sym] = oi;
  }
  return result;
}

// ── Batch compute changes for all coins at once ──

export interface OIChanges {
  oiChange1h: number | null;
  oiChange6h: number | null;
  oiChange24h: number | null;
}

export async function computeAllOIChanges(
  coins: { symbol: string; totalOI: number }[]
): Promise<Map<string, OIChanges>> {
  const result = new Map<string, OIChanges>();

  // Fetch 3 snapshots in parallel (1h, 6h, 24h ago)
  const [snap1h, snap6h, snap24h] = await Promise.all([
    getSnapshotAt(1),
    getSnapshotAt(6),
    getSnapshotAt(24),
  ]);

  for (const coin of coins) {
    const changes: OIChanges = {
      oiChange1h: null,
      oiChange6h: null,
      oiChange24h: null,
    };

    if (coin.totalOI > 0) {
      if (snap1h) {
        const old = snap1h[coin.symbol];
        if (old && old > 0) {
          changes.oiChange1h = ((coin.totalOI - old) / old) * 100;
        }
      }
      if (snap6h) {
        const old = snap6h[coin.symbol];
        if (old && old > 0) {
          changes.oiChange6h = ((coin.totalOI - old) / old) * 100;
        }
      }
      if (snap24h) {
        const old = snap24h[coin.symbol];
        if (old && old > 0) {
          changes.oiChange24h = ((coin.totalOI - old) / old) * 100;
        }
      }
    }

    result.set(coin.symbol, changes);
  }

  return result;
}

export function getSnapshotCount(): number {
  return memSnapshots.length;
}
