#!/usr/bin/env python3
"""Daily snapshot script — save today's rankings to SQLite."""

from datetime import date

from api.routes.ranking import _convert_entries, _entry_to_dict
from src.data_sources.mock import generate_options_snapshot, generate_symbol_meta
from src.ranking import generate_contract_rankings
from src.storage.db import save_ranking_snapshot


SYMBOLS = [
    "AAPL",
    "MSFT",
    "GOOGL",
    "META",
    "NVDA",
    "TSLA",
    "AMD",
    "AVGO",
    "AMZN",
    "SPCE",
    "ONDS",
    "PLTR",
    "SOFI",
    "MSTR",
    "RIOT",
    "SPY",
    "QQQ",
    "SMH",
    "XLF",
    "XLE",
]


def main() -> None:
    snapshot_date = date.today().isoformat()
    print(f"Generating daily snapshot for {snapshot_date}...")

    snapshot = generate_options_snapshot(SYMBOLS, date.today(), num_contracts_per_symbol=30)
    meta_map = generate_symbol_meta(SYMBOLS)
    rankings = generate_contract_rankings(snapshot, meta_map)

    saved = []
    for cat, entries in rankings.items():
        pydantic_entries = _convert_entries(entries)
        dict_entries = [_entry_to_dict(e) for e in pydantic_entries]
        save_ranking_snapshot(snapshot_date, cat, dict_entries)
        saved.append(cat)
        print(f"  ✓ {cat}: {len(dict_entries)} entries")

    print(f"Snapshot saved for {snapshot_date}: {', '.join(saved)}")


if __name__ == "__main__":
    main()
