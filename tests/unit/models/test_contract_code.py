"""Tests for contract code encode/decode."""

from datetime import date

import pytest

from src.utils.contract_code import encode, decode, to_yfinance


class TestContractCodeEncodeDecode:
    """Round-trip encode/decode tests."""

    def test_encode_basic_call(self):
        assert encode("AAPL", date(2026, 12, 18), "C", 185.0) == "AAPL261218C185"

    def test_encode_put(self):
        assert encode("TSLA", date(2026, 9, 19), "P", 220.0) == "TSLA260919P220"

    def test_encode_decimal_strike_rounded(self):
        assert encode("SPY", date(2026, 6, 20), "C", 545.5) == "SPY260620C546"

    def test_decode_basic_call(self):
        result = decode("AAPL261218C185")
        assert result.symbol == "AAPL"
        assert result.expiration == date(2026, 12, 18)
        assert result.option_type == "C"
        assert result.strike == 185.0

    def test_decode_put(self):
        result = decode("TSLA260919P220")
        assert result.symbol == "TSLA"
        assert result.expiration == date(2026, 9, 19)
        assert result.option_type == "P"
        assert result.strike == 220.0

    def test_roundtrip(self):
        original = ("MSFT", date(2026, 11, 20), "C", 420.0)
        code = encode(*original)
        decoded = decode(code)
        assert decoded.symbol == original[0]
        assert decoded.expiration == original[1]
        assert decoded.option_type == original[2]
        assert decoded.strike == original[3]

    def test_decode_invalid_format_raises(self):
        with pytest.raises(ValueError):
            decode("INVALID")

    def test_decode_invalid_date_raises(self):
        with pytest.raises(ValueError):
            decode("AAPL261332C185")

    def test_decode_invalid_option_type_raises(self):
        with pytest.raises(ValueError):
            decode("AAPL261218X185")


class TestContractCodeToYFinance:
    """yfinance format conversion tests."""

    def test_to_yfinance_basic(self):
        assert to_yfinance("AAPL261218C185") == ("AAPL261218C00185000", "2026-12-18")

    def test_to_yfinance_decimal_strike(self):
        assert to_yfinance("SPY260620C545.5") == ("SPY260620C00545500", "2026-06-20")

    def test_to_yfinance_put(self):
        assert to_yfinance("TSLA260919P220") == ("TSLA260919P00220000", "2026-09-19")

    def test_to_yfinance_invalid_raises(self):
        with pytest.raises(ValueError):
            to_yfinance("INVALID")
