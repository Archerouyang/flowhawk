"""Live Trading page — position tracking and P&L."""
from datetime import date

import numpy as np
import streamlit as st
import plotly.graph_objects as go

st.set_page_config(page_title="Live Trading | FlowHawk", layout="wide")

st.markdown("## 💼 Live Trading")

# Mock positions
positions = [
    {
        "symbol": "AAPL",
        "type": "C",
        "strike": 185.0,
        "exp": "2026-12-18",
        "entry": 12.50,
        "current": 14.20,
        "qty": 10,
        "days_held": 15,
    },
    {
        "symbol": "TSLA",
        "type": "C",
        "strike": 220.0,
        "exp": "2026-09-19",
        "entry": 18.30,
        "current": 15.80,
        "qty": 5,
        "days_held": 8,
    },
    {
        "symbol": "NVDA",
        "type": "C",
        "strike": 130.0,
        "exp": "2027-01-15",
        "entry": 22.00,
        "current": 26.50,
        "qty": 8,
        "days_held": 22,
    },
]

# P&L summary
total_pnl = sum((p["current"] - p["entry"]) * p["qty"] * 100 for p in positions)
total_invested = sum(p["entry"] * p["qty"] * 100 for p in positions)
pnl_pct = total_pnl / total_invested * 100 if total_invested > 0 else 0

st.subheader("Portfolio Summary")
c1, c2, c3, c4 = st.columns(4)
c1.metric("Open Positions", len(positions))
c2.metric("Total Invested", f"${total_invested:,.0f}")
c3.metric("Unrealized P&L", f"${total_pnl:,.0f}", f"{pnl_pct:.1f}%")
c4.metric("Winning / Losing", f"{sum(1 for p in positions if p['current'] > p['entry'])} / {sum(1 for p in positions if p['current'] <= p['entry'])}")

st.divider()
st.subheader("📋 Positions")

for p in positions:
    pnl = (p["current"] - p["entry"]) * p["qty"] * 100
    pnl_pct = (p["current"] - p["entry"]) / p["entry"] * 100
    color = "#00d4aa" if pnl >= 0 else "#ff6b6b"
    icon = "📈" if pnl >= 0 else "📉"

    with st.container():
        col1, col2, col3, col4, col5 = st.columns([2, 1, 1, 1, 1])
        with col1:
            st.markdown(
                f"""
                <div style="background:#1a1d24;padding:0.8rem;border-radius:8px;">
                    <div style="font-size:1.2rem;font-weight:700;">
                        {p['symbol']} {p['type']} ${p['strike']:.1f}
                    </div>
                    <div style="color:#888;font-size:0.85rem;">
                        Exp: {p['exp']} | Held: {p['days_held']}d
                    </div>
                </div>
                """,
                unsafe_allow_html=True,
            )
        with col2:
            st.metric("Qty", p["qty"])
        with col3:
            st.metric("Entry", f"${p['entry']:.2f}")
        with col4:
            st.metric("Current", f"${p['current']:.2f}")
        with col5:
            st.markdown(
                f"""
                <div style="background:{color}22;border:1px solid {color};
                            padding:0.6rem;border-radius:6px;text-align:center;">
                    <div style="color:{color};font-size:1.1rem;font-weight:700;">
                        {icon} ${pnl:,.0f}
                    </div>
                    <div style="color:{color};font-size:0.8rem;">
                        {pnl_pct:+.1f}%
                    </div>
                </div>
                """,
                unsafe_allow_html=True,
            )

st.divider()
st.subheader("📈 P&L Over Time")

# Mock P&L curve
days = list(range(30))
pnl_curve = [0]
for i in range(1, 30):
    pnl_curve.append(pnl_curve[-1] + np.random.normal(200, 800))

fig = go.Figure()
fig.add_trace(
    go.Scatter(
        x=days,
        y=pnl_curve,
        mode="lines",
        name="P&L",
        line=dict(color="#00d4aa", width=2),
        fill="tozeroy",
        fillcolor="rgba(0, 212, 170, 0.1)",
    )
)
fig.add_hline(y=0, line_dash="dash", line_color="#666")
fig.update_layout(
    title="Cumulative P&L (Mock)",
    plot_bgcolor="#0e1117",
    paper_bgcolor="#0e1117",
    font_color="#e8e8e8",
    xaxis=dict(gridcolor="#2a2d34", title="Days"),
    yaxis=dict(gridcolor="#2a2d34", title="P&L ($)"),
    height=300,
    showlegend=False,
)
st.plotly_chart(fig, use_container_width=True)

st.info("Live trading data requires broker API integration (e.g., Alpaca, Interactive Brokers). Mock data shown for demonstration.")
