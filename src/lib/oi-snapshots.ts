// In-memory OI snapshot store
// Stores timestamped OI values for each symbol, keeps 25h of data
// Used to compute 1h / 6h / 24h OI changes

interface Snapshot {
  timestamp: number;
  data: Map<string, number>; // symbol → totalOI (USD)
}

const MAX_AGE_MS = 25 * 3600_000; // 25 hours
const snapshots: Snapshot[] = [];

export function saveOISnapshot(coins: { symbol: string; totalOI: number }[]): void {
  const data = new Map<string, number>();
  for (const c of coins) {
    data.set(c.symbol, c.totalOI);
  }
  snapshots.push({ timestamp: Date.now(), data });

  // Prune old snapshots
  const cutoff = Date.now() - MAX_AGE_MS;
  while (snapshots.length > 0 && snapshots[0].timestamp < cutoff) {
    snapshots.shift();
  }
}

// Find closest snapshot to targetMs ago and compute % change
export function getOIChange(symbol: string, hoursAgo: number): number | null {
  if (snapshots.length < 2) return null;

  const targetTs = Date.now() - hoursAgo * 3600_000;
  // Allow 30% tolerance window
  const tolerance = hoursAgo * 3600_000 * 0.3;

  // Find closest snapshot to target timestamp
  let closest: Snapshot | null = null;
  let closestDiff = Infinity;

  for (const snap of snapshots) {
    const diff = Math.abs(snap.timestamp - targetTs);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = snap;
    }
  }

  if (!closest || closestDiff > tolerance) return null;

  const oldOI = closest.data.get(symbol);
  if (!oldOI || oldOI <= 0) return null;

  // Current = latest snapshot
  const current = snapshots[snapshots.length - 1];
  const currentOI = current.data.get(symbol);
  if (!currentOI || currentOI <= 0) return null;

  return ((currentOI - oldOI) / oldOI) * 100;
}

export function getSnapshotCount(): number {
  return snapshots.length;
}
