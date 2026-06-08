/**
 * Contract code encoding/decoding.
 *
 * Format: SYMBOL + YYMMDD + C/P + STRIKE
 * Example: AAPL261218C185
 */

export interface DecodedContract {
  symbol: string;
  expiration: string; // YYYY-MM-DD
  optionType: "C" | "P";
  strike: number;
}

const CONTRACT_RE = /^([A-Z]+)(\d{6})([CP])([\d.]+)$/;

/**
 * Encode contract components into a contract code string.
 */
export function encodeContractCode(
  symbol: string,
  expiration: string, // YYYY-MM-DD
  optionType: "C" | "P",
  strike: number,
): string {
  const expCode = expiration.replace(/-/g, "").slice(2);
  return `${symbol}${expCode}${optionType}${Math.round(strike)}`;
}

/**
 * Decode a contract code string into its components.
 *
 * @throws Error if format is invalid.
 */
export function decodeContractCode(contractCode: string): DecodedContract {
  const m = CONTRACT_RE.exec(contractCode);
  if (!m) {
    throw new Error(`Invalid contract code format: ${contractCode}`);
  }

  const [, symbol, dateStr, optionType, strikeStr] = m;
  const yy = dateStr.slice(0, 2);
  const mm = dateStr.slice(2, 4);
  const dd = dateStr.slice(4, 6);

  const expiration = `20${yy}-${mm}-${dd}`;
  const strike = parseFloat(strikeStr);

  return { symbol, expiration, optionType: optionType as "C" | "P", strike };
}

/**
 * Parse contract code without throwing.
 * Returns null if format is invalid.
 */
export function tryDecodeContractCode(
  contractCode: string,
): DecodedContract | null {
  try {
    return decodeContractCode(contractCode);
  } catch {
    return null;
  }
}
