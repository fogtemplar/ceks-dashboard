// OI snapshot store - Supabase (persistent) + in-memory fallback
// Stores timestamped OI + price values for each symbol
// Used to compute 1h / 6h / 24h OI and price changes

import { supabase } from './supabase';
import { SNAPSHOT_MAX_AGE_MS } from './constants';

// ── In-memory fallback (used when Supabase is not configured) ──

interface MemSnapshot {
  timestamp: number;
  data: Map<string, number>;      // symbol -> OI
  prices: Map<string, number>;    // symbol -> price
}

const MAX_AGE_MS = SNAPSHOT_MAX_AGE_MS;
const memSnapshots: MemSnapshot[] = [];
let saveCounter = 0;

// ── Save ──

export async function saveOISnapshot(
  coins: { symbol: string; totalOI: number; price: number }[]
): Promise<void> {
  const now = Date.now();
  const dataMap = new Map<string, number>();
  const priceMap = new Map<string, number>();
  const jsonData: Record<string, number> = {};
  const jsonPrices: Record<string, number> = {};

  for (const c of coins) {
    dataMap.set(c.symbol, c.totalOI);
    jsonData[c.symbol] = Math.round(c.totalOI);
    if (c.price > 0) {
      priceMap.set(c.symbol, c.price);
      jsonPrices[c.symbol] = c.price;
    }
  }

  // Always save to memory
  memSnapshots.push({ timestamp: now, data: dataMap, prices: priceMap });
  const cutoff = now - MAX_AGE_MS;
  while (memSnapshots.length > 0 && memSnapshots[0].timestamp < cutoff) {
    memSnapshots.shift();
  }

  // Save to Supabase if configured
  if (supabase) {
    try {
      const row: Record<string, unknown> = {
        created_at: new Date(now).toISOString(),
        data: jsonData,
      };
      // Only include prices if column exists (avoid error on old schema)
      if (Object.keys(jsonPrices).length > 0) {
        row.prices = jsonPrices;
      }
      const { error } = await supabase.from('oi_snapshots').insert(row);
      // If prices column doesn't exist yet, retry without it
      if (error && error.message?.includes('prices')) {
        await supabase.from('oi_snapshots').insert({
          created_at: new Date(now).toISOString(),
          data: jsonData,
        });
      }

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

interface SnapshotResult {
  oi: SnapshotData;
  prices: SnapshotData;
}

async function getSnapshotAt(hoursAgo: number): Promise<SnapshotResult | null> {
  const targetTs = Date.now() - hoursAgo * 3600_000;
  const tolerance = hoursAgo * 3600_000 * 0.5;

  // Try Supabase first
  if (supabase) {
    try {
      const minTs = new Date(targetTs - tolerance).toISOString();
      const maxTs = new Date(targetTs + tolerance).toISOString();

      const { data, error } = await supabase
        .from('oi_snapshots')
        .select('*')
        .gte('created_at', minTs)
        .lte('created_at', maxTs)
        .order('created_at', { ascending: true })
        .limit(5);

      if (!error && data && data.length > 0) {
        let best = data[0];
        let bestDiff = Math.abs(new Date(best.created_at).getTime() - targetTs);
        for (const row of data) {
          const diff = Math.abs(new Date(row.created_at).getTime() - targetTs);
          if (diff < bestDiff) {
            bestDiff = diff;
            best = row;
          }
        }
        return {
          oi: (best.data as SnapshotData) ?? {},
          prices: (best.prices as SnapshotData) ?? {},
        };
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

  const oi: SnapshotData = {};
  for (const [sym, val] of closest.data) {
    oi[sym] = val;
  }
  const prices: SnapshotData = {};
  for (const [sym, val] of closest.prices) {
    prices[sym] = val;
  }
  return { oi, prices };
}

// ── Batch compute changes for all coins at once ──

export interface OIChanges {
  oiChange1h: number | null;
  oiChange6h: number | null;
  oiChange24h: number | null;
}

export interface PriceChanges {
  priceChange1h: number | null;
  priceChange6h: number | null;
  priceChange24h: number | null;
}

export interface SnapshotChanges {
  oi: OIChanges;
  price: PriceChanges;
}

function pctChange(current: number, old: number | undefined): number | null {
  if (!old || old <= 0 || current <= 0) return null;
  return ((current - old) / old) * 100;
}

export async function computeAllChanges(
  coins: { symbol: string; totalOI: number; price: number }[]
): Promise<Map<string, SnapshotChanges>> {
  const result = new Map<string, SnapshotChanges>();

  const [snap1h, snap6h, snap24h] = await Promise.all([
    getSnapshotAt(1),
    getSnapshotAt(6),
    getSnapshotAt(24),
  ]);

  for (const coin of coins) {
    const changes: SnapshotChanges = {
      oi: { oiChange1h: null, oiChange6h: null, oiChange24h: null },
      price: { priceChange1h: null, priceChange6h: null, priceChange24h: null },
    };

    if (coin.totalOI > 0) {
      if (snap1h) {
        changes.oi.oiChange1h = pctChange(coin.totalOI, snap1h.oi[coin.symbol]);
        changes.price.priceChange1h = pctChange(coin.price, snap1h.prices[coin.symbol]);
      }
      if (snap6h) {
        changes.oi.oiChange6h = pctChange(coin.totalOI, snap6h.oi[coin.symbol]);
        changes.price.priceChange6h = pctChange(coin.price, snap6h.prices[coin.symbol]);
      }
      if (snap24h) {
        changes.oi.oiChange24h = pctChange(coin.totalOI, snap24h.oi[coin.symbol]);
        changes.price.priceChange24h = pctChange(coin.price, snap24h.prices[coin.symbol]);
      }
    }

    result.set(coin.symbol, changes);
  }

  return result;
}

// Keep backward-compatible alias
export async function computeAllOIChanges(
  coins: { symbol: string; totalOI: number; price: number }[]
): Promise<Map<string, OIChanges>> {
  const all = await computeAllChanges(coins);
  const result = new Map<string, OIChanges>();
  for (const [sym, changes] of all) {
    result.set(sym, changes.oi);
  }
  return result;
}

export function getSnapshotCount(): number {
  return memSnapshots.length;
}
