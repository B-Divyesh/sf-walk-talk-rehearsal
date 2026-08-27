export const DAY_MS = 86_400_000;

export function isDue(time: number | undefined, now = Date.now()): boolean {
  return time === undefined || time <= now;
}

export function nextReplayAt(days: number, now = Date.now()): number {
  if (![1, 3, 7].includes(days)) throw new RangeError('Replay interval must be 1, 3, or 7 days.');
  return now + days * DAY_MS;
}

export function promptLines(value: string): string[] {
  return value.split('\n').map((line) => line.trim()).filter(Boolean);
}
