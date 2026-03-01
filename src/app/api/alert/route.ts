import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage, isTelegramConfigured } from '@/lib/telegram';
import { supabase } from '@/lib/supabase';
import { formatUsd, formatPrice } from '@/lib/format';
import type { AggregatedCoinOI, DashboardResponse } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const OI_THRESHOLD_PCT = 10; // ±10% triggers immediate alert

// Check if an alert was already sent for this coin in the last hour
async function wasAlertSent(symbol: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { data } = await supabase
      .from('alert_sent')
      .select('id')
      .eq('symbol', symbol)
      .gte('sent_at', oneHourAgo)
      .limit(1);
    return (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

// Record that we sent an alert
async function recordAlert(symbol: string, alertType: string, changePct: number): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('alert_sent').insert({
      symbol,
      alert_type: alertType,
      change_pct: changePct,
      sent_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Failed to record alert:', e);
  }
}

function formatChange(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatPriceWithChange(coin: AggregatedCoinOI): string {
  const p = formatPrice(coin.price);
  if (coin.priceChange24h !== null) {
    return `${p} (${formatChange(coin.priceChange24h)})`;
  }
  return p;
}

function getKSTTimeStr(): string {
  const now = new Date();
  return now.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul',
  });
}

function buildHourlyMessage(
  surging: AggregatedCoinOI[],
  dropping: AggregatedCoinOI[],
  topOiMc: AggregatedCoinOI[],
): string {
  const timeStr = getKSTTimeStr();

  let msg = `🔔 <b>1H OI Movers</b> (${timeStr} KST)\n`;

  if (surging.length > 0) {
    msg += '\n📈 <b>급등 Top 5</b>\n';
    for (let i = 0; i < surging.length; i++) {
      const c = surging[i];
      msg += `${i + 1}. <b>${c.symbol}</b>  ${formatChange(c.oiChange1h!)}  ${formatPriceWithChange(c)}\n`;
    }
  }

  if (dropping.length > 0) {
    msg += '\n📉 <b>급락 Top 5</b>\n';
    for (let i = 0; i < dropping.length; i++) {
      const c = dropping[i];
      msg += `${i + 1}. <b>${c.symbol}</b>  ${formatChange(c.oiChange1h!)}  ${formatPriceWithChange(c)}\n`;
    }
  }

  if (topOiMc.length > 0) {
    msg += '\n🔥 <b>OI/MC Top 5</b>\n';
    for (let i = 0; i < topOiMc.length; i++) {
      const c = topOiMc[i];
      msg += `${i + 1}. <b>${c.symbol}</b>  ${(c.oiMcRatio * 100).toFixed(2)}%  ${formatPriceWithChange(c)}\n`;
    }
  }

  return msg;
}

function buildThresholdMessage(coin: AggregatedCoinOI): string {
  const change = coin.oiChange1h!;
  const emoji = change > 0 ? '🚨📈' : '🚨📉';
  const label = change > 0 ? '급등' : '급락';
  const timeStr = getKSTTimeStr();
  return `${emoji} <b>OI ${label} 감지!</b> (${timeStr} KST)\n<b>${coin.symbol}</b>  ${formatChange(change)}  (OI: ${formatUsd(coin.totalOI)})`;
}

export async function GET(request: NextRequest) {
  // Verify secret (Vercel Cron header OR query param for external cron)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    const querySecret = request.nextUrl.searchParams.get('secret');
    if (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!isTelegramConfigured()) {
    return NextResponse.json({ error: 'Telegram not configured' }, { status: 500 });
  }

  try {
    // Fetch current OI data from our own API
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    const res = await fetch(`${baseUrl}/api/oi`, {
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch OI data' }, { status: 502 });
    }

    const { data }: DashboardResponse = await res.json();

    // Filter coins with 1h change data and market cap
    const withChange = data.filter(
      (c) => c.oiChange1h !== null && c.marketCap > 0
    );

    if (withChange.length === 0) {
      return NextResponse.json({ status: 'no_data', message: 'No 1h change data available yet' });
    }

    const sorted = [...withChange].sort(
      (a, b) => (b.oiChange1h ?? 0) - (a.oiChange1h ?? 0)
    );

    let messagesSent = 0;

    // --- 1. Hourly Top 5 Report ---
    const surging = sorted.slice(0, 5);
    const dropping = sorted.slice(-5).reverse();
    const topOiMc = [...withChange].sort((a, b) => b.oiMcRatio - a.oiMcRatio).slice(0, 5);
    const hourlyMsg = buildHourlyMessage(surging, dropping, topOiMc);
    const sent = await sendTelegramMessage(hourlyMsg);
    if (sent) messagesSent++;

    // --- 2. Threshold Alerts (±10%) ---
    const thresholdCoins = withChange.filter(
      (c) => Math.abs(c.oiChange1h ?? 0) >= OI_THRESHOLD_PCT
    );

    for (const coin of thresholdCoins) {
      const alreadySent = await wasAlertSent(coin.symbol);
      if (alreadySent) continue;

      const alertMsg = buildThresholdMessage(coin);
      const ok = await sendTelegramMessage(alertMsg);
      if (ok) {
        const type = (coin.oiChange1h ?? 0) > 0 ? 'surge' : 'drop';
        await recordAlert(coin.symbol, type, coin.oiChange1h ?? 0);
        messagesSent++;
      }
    }

    // Cleanup old alert records (>24h)
    if (supabase) {
      try {
        const cutoff = new Date(Date.now() - 24 * 3600_000).toISOString();
        await supabase.from('alert_sent').delete().lt('sent_at', cutoff);
      } catch { /* ignore cleanup errors */ }
    }

    return NextResponse.json({
      status: 'ok',
      messagesSent,
      coinsWithChange: withChange.length,
      thresholdAlerts: thresholdCoins.length,
    });
  } catch (error) {
    console.error('Alert error:', error);
    return NextResponse.json({ error: 'Alert processing failed' }, { status: 500 });
  }
}
