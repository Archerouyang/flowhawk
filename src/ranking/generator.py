"""Daily anomaly ranking generator.

Produces top-30 rankings per category (big_cap / small_cap / etf).
"""

from dataclasses import dataclass

from src.data_sources.mock import SymbolMeta


@dataclass(frozen=True, slots=True)
class RankingEntry:
    """Single entry in the anomaly ranking."""

    rank: int
    symbol: str
    category: str
    anomaly_score: float
    top_factors: list[dict]
    contract: dict
    greeks: dict
    narrative: str


class RankingGenerator:
    """Generate daily anomaly rankings by category."""

    TOP_N = 30

    def __init__(
        self,
        scores: dict[str, float],
        meta_map: dict[str, SymbolMeta],
        factor_map: dict[str, dict[str, float]],
    ):
        """Initialize with computed scores and metadata.

        Args:
            scores: {symbol: anomaly_score}
            meta_map: {symbol: SymbolMeta}
            factor_map: {symbol: {factor_name: value}}
        """
        self.scores = scores
        self.meta = meta_map
        self.factors = factor_map

    def generate(self) -> dict[str, list[RankingEntry]]:
        """Generate rankings for all categories.

        Returns:
            {category: [RankingEntry, ...]}
        """
        # Group symbols by category
        by_category: dict[str, list[tuple[str, float]]] = {
            "big_cap": [],
            "small_cap": [],
            "etf": [],
        }

        for sym, score in self.scores.items():
            meta = self.meta.get(sym)
            if meta is None:
                continue
            cat = meta.category
            if cat in by_category:
                by_category[cat].append((sym, score))

        # Sort and select top N per category
        rankings: dict[str, list[RankingEntry]] = {}
        for cat, items in by_category.items():
            sorted_items = sorted(items, key=lambda x: x[1], reverse=True)
            top = sorted_items[: self.TOP_N]

            entries = []
            for rank, (sym, score) in enumerate(top, 1):
                entry = self._build_entry(rank, sym, cat, score)
                entries.append(entry)

            rankings[cat] = entries

        return rankings

    def _build_entry(
        self, rank: int, symbol: str, category: str, score: float
    ) -> RankingEntry:
        """Build a single ranking entry."""
        factors = self.factors.get(symbol, {})

        # Top 3 factors driving the score
        top_factors = self._top_factors(factors)

        # Contract info (placeholder)
        contract = {
            "strike": 0.0,
            "expiration": "",
            "option_type": "C",
            "last_price": 0.0,
        }

        # Greeks (placeholder)
        greeks = {
            "delta": factors.get("delta", 0.0),
            "theta": 0.0,
            "gamma": factors.get("gamma", 0.0),
            "vega": factors.get("vega", 0.0),
        }

        # Narrative
        narrative = self._build_narrative(symbol, category, factors)

        return RankingEntry(
            rank=rank,
            symbol=symbol,
            category=category,
            anomaly_score=round(score, 1),
            top_factors=top_factors,
            contract=contract,
            greeks=greeks,
            narrative=narrative,
        )

    def _top_factors(self, factors: dict[str, float]) -> list[dict]:
        """Extract top 3 factors by absolute normalized contribution."""
        from src.scoring.anomaly import AnomalyScorer

        scorer = AnomalyScorer()
        contributions = []

        for name, value in factors.items():
            if name not in scorer.weights:
                continue
            weight = scorer.weights[name]
            normalized = scorer._normalize(name, value)
            contribution = normalized * weight
            contributions.append(
                {
                    "factor": name,
                    "value": round(value, 3),
                    "contribution": round(contribution, 3),
                }
            )

        contributions.sort(
            key=lambda x: abs(float(x["contribution"])),  # type: ignore[arg-type]
            reverse=True,
        )
        return contributions[:3]

    @staticmethod
    def _build_narrative(symbol: str, category: str, factors: dict[str, float]) -> str:
        """Generate one-liner narrative."""
        cp = factors.get("volume_cp_ratio", 0.0)
        leap_cp = factors.get("leap_volume_cp_ratio", 0.0)
        voi = factors.get("voi_ratio", 0.0)
        theta_r = factors.get("theta_price_ratio", 0.0)

        if category == "big_cap":
            return f"LEAPS call C/P {leap_cp:.1f}x, θ/price {theta_r:.2%} — institutional accumulation"
        elif category == "small_cap":
            return (
                f"{voi:.1f}x V/OI spike, C/P {cp:.1f}x — narrative-driven retail flow"
            )
        else:  # etf
            return f"C/P {cp:.2f}, volume concentration — hedge/rotation flow"


def generate_daily_rankings(
    scores: dict[str, float],
    meta_map: dict[str, SymbolMeta],
    factor_map: dict[str, dict[str, float]],
) -> dict[str, list[RankingEntry]]:
    """Convenience function."""
    generator = RankingGenerator(scores, meta_map, factor_map)
    return generator.generate()
