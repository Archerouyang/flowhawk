"""Contract code encoding/decoding.

Format: SYMBOL + YYMMDD + C/P + STRIKE
Example: AAPL261218C185
"""

from dataclasses import dataclass
from datetime import date
import re


@dataclass(frozen=True, slots=True)
class DecodedContract:
    """Decoded contract code components."""

    symbol: str
    expiration: date
    option_type: str  # "C" or "P"
    strike: float


# Regex for our contract code format: SYMBOL YYMMDD C/P STRIKE
_CONTRACT_RE = re.compile(r"^([A-Z]+)(\d{6})([CP])([\d.]+)$")


def encode(symbol: str, expiration: date, option_type: str, strike: float) -> str:
    """Encode contract components into a contract code string.

    Args:
        symbol: Underlying symbol (e.g. "AAPL").
        expiration: Expiration date.
        option_type: "C" or "P".
        strike: Strike price (will be rounded to int).

    Returns:
        Contract code string (e.g. "AAPL261218C185").
    """
    exp_code = expiration.strftime("%y%m%d")
    return f"{symbol}{exp_code}{option_type}{int(round(strike))}"


def decode(contract_code: str) -> DecodedContract:
    """Decode a contract code string into its components.

    Args:
        contract_code: Contract code string (e.g. "AAPL261218C185").

    Returns:
        DecodedContract with symbol, expiration, option_type, strike.

    Raises:
        ValueError: If contract_code format is invalid.
    """
    m = _CONTRACT_RE.match(contract_code)
    if not m:
        raise ValueError(f"Invalid contract code format: {contract_code}")

    symbol, date_str, option_type, strike_str = m.groups()

    yy = int(date_str[:2])
    mm = int(date_str[2:4])
    dd = int(date_str[4:6])

    # Validate date
    try:
        expiration = date(2000 + yy, mm, dd)
    except ValueError as exc:
        raise ValueError(f"Invalid expiration date in contract code: {contract_code}") from exc

    strike = float(strike_str)

    return DecodedContract(
        symbol=symbol,
        expiration=expiration,
        option_type=option_type,
        strike=strike,
    )


def to_yfinance(contract_code: str) -> tuple[str, str]:
    """Convert our contract code to yfinance option symbol format.

    Our format: SYMBOL + YYMMDD + C/P + STRIKE  (e.g. MSFT260821C500)
    yfinance format: SYMBOL + YYMMDD + C/P + STRIKE*1000 padded to 8 digits
                     (e.g. MSFT260821C00500000)

    Args:
        contract_code: Our contract code string.

    Returns:
        Tuple of (yfinance_symbol, expiry_iso) where expiry_iso is "YYYY-MM-DD".

    Raises:
        ValueError: If contract_code format is invalid.
    """
    m = _CONTRACT_RE.match(contract_code)
    if not m:
        raise ValueError(f"Invalid contract code format: {contract_code}")

    symbol, date_str, opt_type, strike = m.groups()
    strike_int = int(float(strike) * 1000)
    yf_symbol = f"{symbol}{date_str}{opt_type}{strike_int:08d}"
    expiry = f"20{date_str[:2]}-{date_str[2:4]}-{date_str[4:6]}"
    return yf_symbol, expiry
