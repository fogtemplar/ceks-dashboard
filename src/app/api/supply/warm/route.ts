import { NextResponse } from 'next/server';
import { fetchCoinSupplyFull, hasFullSupplyCache } from '@/lib/coingecko';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Background endpoint: fetches full CoinGecko data (3000 coins)
// Called by client after initial page load
export async function POST() {
  try {
    if (hasFullSupplyCache()) {
      return NextResponse.json({ status: 'already_cached' });
    }

    const data = await fetchCoinSupplyFull();
    return NextResponse.json({
      status: 'warmed',
      coins: data.size,
    });
  } catch (error) {
    console.error('Supply warm error:', error);
    return NextResponse.json(
      { error: 'Failed to warm supply cache' },
      { status: 500 }
    );
  }
}
