"""Strategies page — compare and manage trading strategies."""
import streamlit as st

st.set_page_config(page_title="Strategies | FlowHawk", layout="wide")

st.markdown("## 🧠 Strategies")

strategies = [
    {
        "name": "V/OI Breakout",
        "description": "Buy LEAPS calls when volume/open-interest ratio exceeds 3x with tight bid-ask spread.",
        "signals": ["volume", "open_interest", "spread"],
        "timeframe": "EOD",
        "status": "Active",
    },
    {
        "name": "IV Rank Reversal",
        "description": "Enter when implied volatility rank drops below 20th percentile for high-conviction setups.",
        "signals": ["iv_rank", "iv_percentile", "historical_vol"],
        "timeframe": "EOD",
        "status": "In Development",
    },
    {
        "name": "Delta-Weighted Momentum",
        "description": "Weight position size by delta and underlying momentum (RSI + MA cross).",
        "signals": ["delta", "rsi", "ma_cross", "atr"],
        "timeframe": "EOD",
        "status": "Planned",
    },
    {
        "name": "Multi-Factor Ensemble",
        "description": "Combine V/OI, IV, technical, and sentiment factors into a composite score.",
        "signals": ["voi_ratio", "iv_rank", "rsi", "news_sentiment", "earnings"],
        "timeframe": "EOD",
        "status": "Planned",
    },
]

for s in strategies:
    with st.expander(f"**{s['name']}** — {s['status']}", expanded=False):
        col1, col2 = st.columns([3, 1])
        with col1:
            st.markdown(f"**Description:** {s['description']}")
            st.markdown(f"**Timeframe:** {s['timeframe']}")
            st.markdown(f"**Key Signals:** {', '.join(s['signals'])}")
        with col2:
            status_color = {
                "Active": "#00d4aa",
                "In Development": "#f0a500",
                "Planned": "#888",
            }.get(s["status"], "#888")
            st.markdown(
                f"""
                <div style="background:{status_color}22;border:1px solid {status_color};
                            padding:0.5rem 1rem;border-radius:6px;text-align:center;">
                    <span style="color:{status_color};font-weight:600;">{s['status']}</span>
                </div>
                """,
                unsafe_allow_html=True,
            )
            if s["status"] == "Active":
                st.button("Run Backtest", key=f"bt_{s['name']}")
            elif s["status"] == "In Development":
                st.button("Continue Dev", key=f"dev_{s['name']}")

st.divider()
st.subheader("➕ Create New Strategy")
st.text_input("Strategy Name")
st.text_area("Description")
st.multiselect(
    "Select Signal Factors",
    ["V/OI Ratio", "IV Rank", "Delta", "Theta/Price", "RSI", "ATR", "News Sentiment", "Earnings"],
)
st.button("Save Strategy", type="primary")
