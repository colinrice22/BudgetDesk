export type Cents = number;

export function addCents(a: Cents, b: Cents): Cents {
  return a + b;
}

export function formatCents(cents: Cents): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  const dollars = Math.floor(absolute / 100);
  const remainder = absolute % 100;
  return `${sign}${dollars}.${String(remainder).padStart(2, "0")}`;
}
