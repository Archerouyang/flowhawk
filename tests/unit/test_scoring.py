"""Unit tests for anomaly scoring."""

from src.scoring import AnomalyScorer, compute_anomaly_scores


class TestAnomalyScorer:
    """Test anomaly score computation."""

    def test_empty_factors_returns_zero(self):
        scorer = AnomalyScorer()
        assert scorer.score({}) == 0.0

    def test_score_is_between_0_and_100(self):
        scorer = AnomalyScorer()
        factors = {
            "voi_ratio": 5.0,
            "volume_cp_ratio": 3.0,
            "leap_volume_cp_ratio": 4.0,
            "theta_price_ratio": 0.002,
            "iv_rank": 0.3,
            "delta_quality": 0.8,
            "pe_ttm": 25.0,
            "roe": 15.0,
            "vix_level": 20.0,
            "smb": 0.2,
            "news_sentiment_score": 0.3,
        }
        score = scorer.score(factors)
        assert 0.0 <= score <= 100.0

    def test_higher_cp_ratio_increases_score(self):
        scorer = AnomalyScorer()
        base = {"volume_cp_ratio": 1.0, "leap_volume_cp_ratio": 1.0}
        high = {"volume_cp_ratio": 5.0, "leap_volume_cp_ratio": 5.0}

        base_score = scorer.score(base)
        high_score = scorer.score(high)
        assert high_score > base_score

    def test_compute_anomaly_scores_returns_all_symbols(self):
        factor_map = {
            "AAPL": {"volume_cp_ratio": 3.0, "voi_ratio": 5.0},
            "TSLA": {"volume_cp_ratio": 2.0, "voi_ratio": 3.0},
        }
        scores = compute_anomaly_scores(factor_map)
        assert set(scores.keys()) == {"AAPL", "TSLA"}
        assert scores["AAPL"] > scores["TSLA"]
