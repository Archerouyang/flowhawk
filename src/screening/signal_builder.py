"""SignalBuilder — assembles classified signals into API response shape.

Extracted from api/routes/signals.py so domain logic can be tested
independently of the HTTP transport layer.
"""

from __future__ import annotations

from datetime import date

import polars as pl

from src.screening.signal_classifier import DetectedSignal, SignalClassifier, SymbolMeta


class SignalBuilder:
    """Build signal result dicts from classifier output and market data."""

    def __init__(self, classifier: SignalClassifier) -> None:
        """Args:
            classifier: The SignalClassifier used to detect patterns and
                compute per-symbol stats.
        """
        self._classifier = classifier

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #

    def build(
        self,
        *,
        anomaly_df: pl.DataFrame,
        meta_map: dict[str, SymbolMeta],
        lb_data: dict[str, dict],
    ) -> list[dict]:
        """Assemble signal result dicts matching the legacy route output.

        Internally runs classification and stat aggregation via the injected
        classifier so the caller (route) only needs to supply raw inputs.

        Args:
            anomaly_df: screened anomalies DataFrame.
            meta_map: symbol -> SymbolMeta.
            lb_data: symbol -> Longbridge real-time data dict.

        Returns:
            List of signal result dicts.
        """
        detected_signals = self._classifier.classify(anomaly_df, meta_map)
        sym_stats = self._classifier.aggregate_symbol_stats(anomaly_df)

        # Build lookup: symbol -> highest-volume anomaly row
        anomaly_by_sym: dict[str, dict] = {}
        for row in anomaly_df.to_dicts():
            sym = row["symbol"]
            if sym not in anomaly_by_sym or row["volume"] > anomaly_by_sym[sym]["volume"]:
                anomaly_by_sym[sym] = row

        signals: list[dict] = []
        for detected in detected_signals:
            sym = detected.symbol
            anom = anomaly_by_sym.get(sym)
            meta = meta_map.get(sym)
            stats = sym_stats.get(sym, {})
            lb_sym = lb_data.get(sym, {})

            if anom is None:
                continue

            dte_val = (
                (date.fromisoformat(anom["expiration"]) - date.today()).days
                if isinstance(anom["expiration"], str)
                else 180
            )

            composite_score = min(int(detected.confidence * 100), 99)

            signals.append(
                {
                    "symbol": sym,
                    "option_type": anom["option_type"],
                    "strike": anom["strike"],
                    "expiration": (
                        anom["expiration"]
                        if isinstance(anom["expiration"], str)
                        else anom["expiration"].isoformat()
                    ),
                    "last_price": anom["last_price"],
                    "delta": anom["delta"],
                    "gamma": anom.get("gamma", 0.0),
                    "theta": anom.get("theta", 0.0),
                    "vega": anom.get("vega", 0.0),
                    "implied_volatility": anom["implied_volatility"],
                    "voi_ratio": anom["voi_ratio"],
                    "leaps_score": round(detected.confidence, 3),
                    "theta_price_ratio": abs(anom.get("theta", 0.0))
                    / (anom["last_price"] or 1e-9),
                    "dte": dte_val,
                    "signal_type": detected.signal_type.value,
                    "composite_score": composite_score,
                    "tier": self._compute_tier(composite_score),
                    "narrative": detected.narrative,
                    "tags": self._build_tags(detected, stats),
                    "asset_type": "ETF" if (meta and meta.is_etf) else "STOCK",
                    "cap_type": (
                        self._cap_type_from_market_cap(meta.market_cap)
                        if meta
                        else "GROWTH"
                    ),
                    "sector": meta.sector if meta else "Unknown",
                    "call_volume": lb_sym.get("call_volume", 0),
                    "put_volume": lb_sym.get("put_volume", 0),
                    "stock_change_pct": lb_sym.get("stock_change_pct", 0.0),
                    "stock_price": lb_sym.get("stock_price", 0.0),
                }
            )

        return signals

    # ------------------------------------------------------------------ #
    # Domain helpers (extracted from route)
    # ------------------------------------------------------------------ #

    @staticmethod
    def _compute_tier(score: int) -> str:
        if score >= 85:
            return "🔴 conviction"
        if score >= 70:
            return "🟠 strong"
        if score >= 55:
            return "🟡 monitor"
        return "⚪ noise"

    @staticmethod
    def _build_tags(detected: DetectedSignal, stats: dict) -> list[str]:
        tags: list[str] = []
        leap = stats.get("leap_ratio", 0)
        price_change = stats.get("price_change_day", 0)

        signal_type = (
            detected.signal_type.value
            if hasattr(detected.signal_type, "value")
            else str(detected.signal_type)
        )

        if signal_type == "smart_money":
            if leap > 10:
                tags.append("LEAPS call rate > 10x")
            elif leap > 5:
                tags.append("LEAPS call rate > 5x")
            if price_change < 0:
                tags.append("Down day + call build")
        elif signal_type == "first_timer":
            tags.append("First appearance")
            if leap > 20:
                tags.append("LEAPS call rate > 20x")
            tags.append("Small cap")
        elif signal_type == "index_hedge":
            tags.append("Put wall detected")
            tags.append("Index up + puts堆积")
        elif signal_type == "gamma_squeeze":
            if price_change > 0.15:
                tags.append("+15% day move")
            if leap > 5:
                tags.append("LEAP > 5x")
        elif signal_type == "sector_rotation":
            tags.append(f"Sector: {detected.symbol}")

        return tags

    @staticmethod
    def _cap_type_from_market_cap(cap_b: float) -> str:
        if cap_b >= 50:
            return "LARGE"
        return "GROWTH"
