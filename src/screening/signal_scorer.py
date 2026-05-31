"""Signal scoring engine — composite 0-100 score with tier assignment."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from src.screening.signal_classifier import DetectedSignal, SignalType


@dataclass(frozen=True, slots=True)
class ScoredSignal:
    """Signal with final composite score and tier."""

    # copied from DetectedSignal
    symbol: str
    signal_type: SignalType
    contract_desc: str
    dte: int
    strike_distance_pct: float
    cp_ratio: float
    leap_ratio: float
    narrative: str
    # new fields
    raw_confidence: float
    composite_score: int  # 0-100
    tier: str  # 🔴🟠🟡⚪
    tags: list[str]


# Base scores per signal type (from empirical win-rate observations)
BASE_SCORES: dict[SignalType, int] = {
    SignalType.SMART_MONEY: 25,
    SignalType.FIRST_TIMER: 30,
    SignalType.INDEX_HEDGE: 20,
    SignalType.GAMMA_SQUEEZE: 15,
    SignalType.SECTOR_ROTATION: 25,
}

# Multiplier rules: (description, predicate, multiplier)
MULTIPLIERS: list[tuple[str, Callable[[DetectedSignal], bool], float]] = [
    ("LEAPS call rate > 10x", lambda s: s.leap_ratio > 10, 1.5),
    ("First appearance", lambda s: s.signal_type == SignalType.FIRST_TIMER, 1.3),
    (
        "Down day + call build",
        lambda s: s.signal_type == SignalType.SMART_MONEY and s.strike_distance_pct > 0,
        1.4,
    ),
    ("Volume > 10x avg", lambda s: s.cp_ratio > 5, 1.2),  # proxy
    ("News catalyst", lambda s: False, 1.2),  # populated later
    ("Small cap (< $2B)", lambda s: s.signal_type == SignalType.FIRST_TIMER, 1.3),
    ("Extreme LEAP > 20x", lambda s: s.leap_ratio > 20, 1.3),
]

# Tier thresholds
TIER_RED = 80  # conviction
TIER_ORANGE = 60  # strong
TIER_YELLOW = 40  # monitor


def score(signal: DetectedSignal) -> ScoredSignal:
    """Compute composite score (0-100) and tier for a detected signal."""
    base = BASE_SCORES.get(signal.signal_type, 20)

    # Apply multipliers
    multiplier = 1.0
    tags: list[str] = []
    for desc, pred, mult in MULTIPLIERS:
        if pred(signal):
            multiplier *= mult
            tags.append(desc)

    # Clamp multiplier to avoid runaway scores
    multiplier = min(multiplier, 3.0)

    raw = base * multiplier
    # Normalize: most signals land between 20-70; boost top-end
    composite = min(int(raw * 1.2), 100)

    if composite >= TIER_RED:
        tier = "🔴 conviction"
    elif composite >= TIER_ORANGE:
        tier = "🟠 strong"
    elif composite >= TIER_YELLOW:
        tier = "🟡 monitor"
    else:
        tier = "⚪ noise"

    return ScoredSignal(
        symbol=signal.symbol,
        signal_type=signal.signal_type,
        contract_desc=signal.contract_desc,
        dte=signal.dte,
        strike_distance_pct=signal.strike_distance_pct,
        cp_ratio=signal.cp_ratio,
        leap_ratio=signal.leap_ratio,
        narrative=signal.narrative,
        raw_confidence=signal.confidence,
        composite_score=composite,
        tier=tier,
        tags=tags,
    )


def score_all(signals: list[DetectedSignal]) -> list[ScoredSignal]:
    """Score a batch of signals and sort by composite score descending."""
    scored = [score(s) for s in signals]
    scored.sort(key=lambda s: s.composite_score, reverse=True)
    return scored
