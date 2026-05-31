"""Options Screener page."""
from datetime import date

import streamlit as st
import plotly.express as px
from src.data_sources.mock import generate_options_snapshot
from src.screening.options_anomaly import OptionsAnomalyScreener

st.set_page_config(page_title="Screener | FlowHawk", layout="wide")

st.markdown("## 🔍 Options Screener")

# Sidebar filters
with st.sidebar:
    st.header("Filters")

    min_voi = st.slider("Min V/OI Ratio", 1.0, 10.0, 3.0, 0.5)
    min_premium = st.number_input(
        "Min Premium ($)", value=100_000, step=10_000, format="%d"
    )
    min_dte = st.slider("Min DTE", 30, 365, 180, 10)
    max_dte = st.slider("Max DTE", min_dte, 730, 730, 10)
    delta_min = st.slider("Min Delta", 0.0, 1.0, 0.50, 0.05)
    delta_max = st.slider("Max Delta", delta_min, 1.0, 0.85, 0.05)

    symbol_filter = st.text_input(
        "Filter by Symbol (comma-separated)", "AAPL,TSLA,NVDA,MSFT,AMZN"
    )

    run_scan = st.button("🚀 Run Scan", type="primary", use_container_width=True)

# Generate mock data on scan
if run_scan:
    with st.spinner("Scanning options market..."):
        symbols = [s.strip().upper() for s in symbol_filter.split(",") if s.strip()]
        snapshot = generate_options_snapshot(symbols, date.today())

        # Override filter values in config temporarily
        screener = OptionsAnomalyScreener()
        screener.min_voi_ratio = min_voi
        screener.min_premium = min_premium
        screener.min_dte = min_dte
        screener.max_dte = max_dte
        screener.min_delta = delta_min
        screener.max_delta = delta_max

        results = screener.screen(snapshot)

    if results.is_empty():
        st.warning("No anomalies found with current filters. Try relaxing criteria.")
    else:
        st.success(f"Found {results.height} anomaly candidates")

        # Summary metrics
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Candidates", results.height)
        c2.metric("Avg V/OI", f"{results['voi_ratio'].mean():.1f}x")
        c3.metric("Max Premium", f"${results['premium'].max():,.0f}")
        c4.metric("Avg IV", f"{results['implied_volatility'].mean():.1%}")

        # IV Distribution chart
        fig = px.histogram(
            results.to_pandas(),
            x="implied_volatility",
            nbins=20,
            title="IV Distribution of Anomalies",
            labels={"implied_volatility": "Implied Volatility"},
            color_discrete_sequence=["#00d4aa"],
        )
        fig.update_layout(
            plot_bgcolor="#0e1117",
            paper_bgcolor="#0e1117",
            font_color="#e8e8e8",
        )
        st.plotly_chart(fig, use_container_width=True)

        # Results table
        display_cols = [
            "symbol",
            "option_type",
            "strike",
            "expiration",
            "last_price",
            "volume",
            "open_interest",
            "voi_ratio",
            "delta",
            "implied_volatility",
            "anomaly_score",
        ]

        df_display = results.select(display_cols).to_pandas()
        df_display["expiration"] = df_display["expiration"].dt.strftime("%Y-%m-%d")
        df_display["voi_ratio"] = df_display["voi_ratio"].round(1)
        df_display["delta"] = df_display["delta"].round(3)
        df_display["implied_volatility"] = (df_display["implied_volatility"] * 100).round(1).astype(str) + "%"
        df_display["anomaly_score"] = df_display["anomaly_score"].round(3)

        st.subheader("📋 Anomaly Results")
        st.dataframe(
            df_display,
            use_container_width=True,
            hide_index=True,
            column_config={
                "symbol": st.column_config.TextColumn("Symbol", width="small"),
                "option_type": st.column_config.TextColumn("Type", width="small"),
                "strike": st.column_config.NumberColumn("Strike", format="$%.2f"),
                "last_price": st.column_config.NumberColumn("Price", format="$%.2f"),
                "voi_ratio": st.column_config.NumberColumn("V/OI", format="%.1fx"),
                "delta": st.column_config.NumberColumn("Delta"),
                "anomaly_score": st.column_config.NumberColumn("Score"),
            },
        )

        # Download
        csv = df_display.to_csv(index=False)
        st.download_button(
            "📥 Download Results",
            csv,
            f"flowhawk_screener_{date.today()}.csv",
            "text/csv",
        )
else:
    st.info("👈 Configure filters and click **Run Scan** to find options anomalies.")
