export function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function normalizeDate(value?: string): Date {
  return value ? new Date(value) : new Date();
}

export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}
