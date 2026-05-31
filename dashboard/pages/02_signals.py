"""Signals page — detailed trade recommendations."""

from datetime import date

import streamlit as st
import plotly.graph_objects as go

from src.data_sources.mock import generate_options_snapshot
from src.screening.options_anomaly import OptionsAnomalyScreener
from src.screening.leaps_selector import LEAPSSelector

st.set_page_config(page_title="Signals | FlowHawk", layout="wide")

st.markdown("## 🎯 Trade Signals")

# --- Sidebar: run pipeline ---
with st.sidebar:
    st.header("Pipeline Controls")

    symbols_input = st.text_input(
        "Symbols (comma-separated)", "AAPL,TSLA,NVDA,MSFT,AMZN,GOOGL,META"
    )
    run_pipeline = st.button(
        "🔬 Run Full Pipeline", type="primary", use_container_width=True
    )

# --- Run pipeline ---
if run_pipeline:
    with st.spinner(
        "Running anomaly detection → technical filter → LEAPS selection..."
    ):
        symbols = [s.strip().upper() for s in symbols_input.split(",") if s.strip()]
        snapshot = generate_options_snapshot(
            symbols, date.today(), num_contracts_per_symbol=30
        )

        # Stage 1: Options anomaly
        anomaly_df = OptionsAnomalyScreener().screen(snapshot)

        # Stage 2: Technical filter (mock — no real price data yet)
        tech_passed = anomaly_df  # placeholder until integrated

        # Stage 3: LEAPS selector
        leaps_df = LEAPSSelector().select(tech_passed)

    if leaps_df.is_empty():
        st.warning(
            "No LEAPS signals generated. Try expanding the symbol universe or relaxing filters."
        )
    else:
        st.success(f"Generated {leaps_df.height} trade signals")

        # Top signal cards
        top_n = min(5, leaps_df.height)
        for i in range(top_n):
            row = leaps_df[i]

            with st.container():
                col1, col2, col3, col4 = st.columns([2, 1, 1, 1])

                with col1:
                    st.markdown(
                        f"""
                        <div style="background:#1a1d24;padding:1rem;border-radius:8px;
                                    border-left:4px solid #00d4aa;">
                            <div style="font-size:1.4rem;font-weight:700;">
                                {row["symbol"]} {row["option_type"]} ${row["strike"]:.1f}
                            </div>
                            <div style="color:#888;font-size:0.9rem;">
                                Exp: {row["expiration"]} | DTE: {row["dte"]:.0f}
                            </div>
                        </div>
                        """,
                        unsafe_allow_html=True,
                    )

                with col2:
                    st.metric("LEAPS Score", f"{row['leaps_score']:.2f}")
                with col3:
                    st.metric("Theta/Price", f"{row['theta_price_ratio']:.2%}")
                with col4:
                    spread_pct = (row["ask"] - row["bid"]) / row["last_price"] * 100
                    st.metric("Spread", f"{spread_pct:.1f}%")

                # Greeks radar chart
                greeks = ["delta", "gamma", "theta", "vega"]
                values = [abs(row[g]) for g in greeks]
                # Normalize for visualization
                max_val = max(values) if max(values) > 0 else 1
                values_norm = [v / max_val for v in values]

                fig = go.Figure()
                fig.add_trace(
                    go.Scatterpolar(
                        r=values_norm + [values_norm[0]],
                        theta=greeks + [greeks[0]],
                        fill="toself",
                        fillcolor="rgba(0, 212, 170, 0.2)",
                        line=dict(color="#00d4aa"),
                        name="Greeks",
                    )
                )
                fig.update_layout(
                    polar=dict(
                        radialaxis=dict(visible=False, range=[0, 1.1]),
                        bgcolor="#1a1d24",
                    ),
                    paper_bgcolor="#0e1117",
                    font_color="#e8e8e8",
                    margin=dict(l=40, r=40, t=20, b=20),
                    height=250,
                    showlegend=False,
                )

                col_l, col_r = st.columns([1, 3])
                with col_l:
                    st.plotly_chart(
                        fig, use_container_width=True, key=f"greeks_radar_{i}"
                    )

                with col_r:
                    # Signal rationale
                    st.markdown("**Signal Rationale**")
                    rationale_parts = []
                    if row["voi_ratio"] > 3:
                        rationale_parts.append(
                            f"✅ Volume/OI spike ({row['voi_ratio']:.1f}x)"
                        )
                    if row["theta_price_ratio"] < 0.003:
                        rationale_parts.append(
                            f"✅ Low time decay ({row['theta_price_ratio']:.2%})"
                        )
                    if abs(row["delta"]) >= 0.65:
                        rationale_parts.append(f"✅ Strong delta ({row['delta']:.2f})")
                    spread_pct = (row["ask"] - row["bid"]) / row["last_price"] * 100
                    if spread_pct < 5:
                        rationale_parts.append(f"✅ Tight spread ({spread_pct:.1f}%)")

                    for part in rationale_parts:
                        st.markdown(f"- {part}")

                    # Risk metrics
                    st.markdown("**Risk Profile**")
                    risk_cols = st.columns(3)
                    risk_cols[0].metric("Max Loss", f"${row['last_price']:.2f}")
                    risk_cols[1].metric(
                        "Breakeven",
                        f"${row['strike'] + row['last_price']:.2f}"
                        if row["option_type"] == "C"
                        else f"${row['strike'] - row['last_price']:.2f}",
                    )
                    risk_cols[2].metric("Delta", f"{row['delta']:.3f}")

                st.divider()

        # Full results table
        st.subheader("📋 All Signals")
        display_cols = [
            "symbol",
            "option_type",
            "strike",
            "expiration",
            "last_price",
            "delta",
            "implied_volatility",
            "voi_ratio",
            "leaps_score",
        ]
        df_display = leaps_df.select(display_cols).to_pandas()
        df_display["expiration"] = df_display["expiration"].dt.strftime("%Y-%m-%d")
        df_display["delta"] = df_display["delta"].round(3)
        df_display["implied_volatility"] = (
            df_display["implied_volatility"] * 100
        ).round(1).astype(str) + "%"
        df_display["voi_ratio"] = df_display["voi_ratio"].round(1)
        df_display["leaps_score"] = df_display["leaps_score"].round(3)

        st.dataframe(df_display, use_container_width=True, hide_index=True)

        csv = df_display.to_csv(index=False)
        st.download_button(
            "📥 Download Signals",
            csv,
            f"flowhawk_signals_{date.today()}.csv",
            "text/csv",
        )
else:
    st.info("👈 Click **Run Full Pipeline** to generate trade signals.")
