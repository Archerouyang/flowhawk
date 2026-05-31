"""FlowHawk Dashboard — Main entry point."""

import streamlit as st

st.set_page_config(
    page_title="FlowHawk",
    page_icon="🦅",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
    <style>
    .main-header {
        font-size: 2.5rem;
        font-weight: 700;
        color: #00d4aa;
        margin-bottom: 0.5rem;
    }
    .sub-header {
        font-size: 1.1rem;
        color: #888;
        margin-bottom: 2rem;
    }
    .metric-card {
        background: #1a1d24;
        border-radius: 12px;
        padding: 1.5rem;
        border: 1px solid #2a2d34;
    }
    .metric-value {
        font-size: 2rem;
        font-weight: 700;
        color: #00d4aa;
    }
    .metric-label {
        font-size: 0.9rem;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

st.markdown('<div class="main-header">🦅 FlowHawk</div>', unsafe_allow_html=True)
st.markdown(
    '<div class="sub-header">Options Anomaly Screener — Find the smart money before it moves</div>',
    unsafe_allow_html=True,
)

# KPI Cards
col1, col2, col3, col4 = st.columns(4)

with col1:
    st.markdown(
        """
        <div class="metric-card">
            <div class="metric-label">Anomalies Today</div>
            <div class="metric-value">--</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

with col2:
    st.markdown(
        """
        <div class="metric-card">
            <div class="metric-label">Avg V/OI Ratio</div>
            <div class="metric-value">--</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

with col3:
    st.markdown(
        """
        <div class="metric-card">
            <div class="metric-label">Top Sector</div>
            <div class="metric-value">--</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

with col4:
    st.markdown(
        """
        <div class="metric-card">
            <div class="metric-label">Signals Generated</div>
            <div class="metric-value">--</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

st.divider()

# Market Overview
st.subheader("📈 Market Overview")

st.info(
    "👈 Use the sidebar to navigate between pages:\n\n"
    "• **Screener** — Scan options anomalies and filter by criteria\n"
    "• **Signals** — View detailed trade signals with Greeks\n"
    "• **Backtest** — Validate strategy performance historically\n"
    "• **Strategies** — Compare and select trading strategies\n"
    "• **Features** — Mine and analyze predictive features\n"
    "• **Factors** — Research factor IC and correlations\n"
    "• **Live Trading** — Track positions and P&L in real-time"
)

# Footer
st.divider()
st.caption(
    "FlowHawk v0.2.0 | Data: Theta Data + FMP | "
    "[GitHub](https://github.com/Archerouyang/flowhawk)"
)
