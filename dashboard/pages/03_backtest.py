"""Backtest page — strategy historical validation."""

from datetime import date, timedelta

import streamlit as st
import plotly.graph_objects as go
import numpy as np

st.set_page_config(page_title="Backtest | FlowHawk", layout="wide")

st.markdown("## 📊 Strategy Backtest")

# Configuration
with st.sidebar:
    st.header("Backtest Config")

    strategy = st.selectbox(
        "Strategy",
        [
            "V/OI Breakout",
            "IV Rank Reversal",
            "Delta-Weighted Momentum",
            "Multi-Factor",
        ],
    )
    start_date = st.date_input("Start Date", date.today() - timedelta(days=365))
    end_date = st.date_input("End Date", date.today())
    initial_capital = st.number_input("Initial Capital ($)", value=100_000, step=10_000)
    max_positions = st.slider("Max Concurrent Positions", 1, 10, 3)
    run_backtest = st.button("▶️ Run Backtest", type="primary", use_container_width=True)

if run_backtest:
    with st.spinner("Running historical simulation..."):
        # Mock backtest results
        days = (end_date - start_date).days
        dates = [
            start_date + timedelta(days=i)
            for i in range(days)
            if (start_date + timedelta(days=i)).weekday() < 5
        ]

        # Generate equity curve with some realistic drawdowns
        np.random.seed(42)
        returns = np.random.normal(0.0005, 0.02, len(dates))
        equity = [initial_capital]
        for r in returns:
            equity.append(equity[-1] * (1 + r))

        # Drawdown calculation
        peak = initial_capital
        drawdowns = []
        for e in equity:
            peak = max(peak, e)
            drawdowns.append((e - peak) / peak * 100)

    # Metrics
    total_return = (equity[-1] - initial_capital) / initial_capital * 100
    max_dd = min(drawdowns)
    sharpe = (
        (np.mean(returns) / np.std(returns)) * np.sqrt(252)
        if np.std(returns) > 0
        else 0
    )
    win_rate = np.sum(np.array(returns) > 0) / len(returns) * 100

    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("Total Return", f"{total_return:.1f}%")
    c2.metric("Max Drawdown", f"{max_dd:.1f}%")
    c3.metric("Sharpe Ratio", f"{sharpe:.2f}")
    c4.metric("Win Rate", f"{win_rate:.1f}%")
    c5.metric("Trades", len(dates))

    # Equity curve
    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=dates,
            y=equity[1:],
            mode="lines",
            name="Equity",
            line=dict(color="#00d4aa", width=2),
            fill="tozeroy",
            fillcolor="rgba(0, 212, 170, 0.1)",
        )
    )
    # Add benchmark line
    fig.add_trace(
        go.Scatter(
            x=dates,
            y=[initial_capital] * len(dates),
            mode="lines",
            name="Initial Capital",
            line=dict(color="#666", width=1, dash="dash"),
        )
    )
    fig.update_layout(
        title="Equity Curve",
        plot_bgcolor="#0e1117",
        paper_bgcolor="#0e1117",
        font_color="#e8e8e8",
        xaxis=dict(gridcolor="#2a2d34"),
        yaxis=dict(gridcolor="#2a2d34"),
        legend=dict(orientation="h", yanchor="bottom", y=1.02),
        height=400,
    )
    st.plotly_chart(fig, use_container_width=True)

    # Drawdown chart
    fig_dd = go.Figure()
    fig_dd.add_trace(
        go.Scatter(
            x=dates,
            y=drawdowns[1:],
            mode="lines",
            name="Drawdown %",
            line=dict(color="#ff6b6b", width=2),
            fill="tozeroy",
            fillcolor="rgba(255, 107, 107, 0.2)",
        )
    )
    fig_dd.update_layout(
        title="Drawdown",
        plot_bgcolor="#0e1117",
        paper_bgcolor="#0e1117",
        font_color="#e8e8e8",
        xaxis=dict(gridcolor="#2a2d34"),
        yaxis=dict(gridcolor="#2a2d34", tickformat=".1%"),
        height=250,
        showlegend=False,
    )
    st.plotly_chart(fig_dd, use_container_width=True)

    # Monthly returns heatmap
    st.subheader("Monthly Returns")
    # Placeholder for now
    st.info("Monthly return heatmap coming soon — requires trade-level P&L data.")

else:
    st.info("👈 Configure backtest parameters and click **Run Backtest**.")
