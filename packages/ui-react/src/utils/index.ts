export function shortenAddress(
  address: string | null | undefined,
  head: number = 4,
  tail: number = 4,
): string {
  if (!address || typeof address !== 'string') return '';
  if (address.length <= head + tail + 3) return address;
  return `${address.slice(0, head)}...${address.slice(-tail)}`;
}

export function toCssSize(value?: number | string): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

export function isGradient(value: string): boolean {
  return value.includes('gradient(');
}

export function getMenuBgColor(bg: string): string {
  return isGradient(bg) ? '#0098EA' : bg;
}

export function classNames(
  ...classes: (string | undefined | null | false)[]
): string {
  return classes.filter(Boolean).join(' ');
}

export async function getUserIp(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Failed to fetch user IP:', error);
    return '';
  }
}
