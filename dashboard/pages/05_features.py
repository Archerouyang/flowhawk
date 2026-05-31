"""Features page — mine and analyze predictive features."""

import streamlit as st
import plotly.express as px

st.set_page_config(page_title="Features | FlowHawk", layout="wide")

st.markdown("## ⛏️ Feature Mining")

# Feature categories
feature_groups = {
    "Options Surface": [
        "voi_ratio",
        "premium",
        "spread_ratio",
        "iv_skew",
        "term_structure_slope",
        "put_call_ratio",
    ],
    "Greeks": [
        "delta",
        "gamma",
        "theta",
        "vega",
        "charm",
        "vanna",
    ],
    "Technical": [
        "rsi_14",
        "ma_20_cross",
        "ma_50_cross",
        "atr_14",
        "bollinger_position",
        "macd_histogram",
    ],
    "Sentiment": [
        "news_sentiment_score",
        "social_mention_velocity",
        "insider_buy_ratio",
        "institutional_flow",
    ],
    "Macro": [
        "vix_level",
        "yield_curve_slope",
        "dxy_trend",
    ],
}

st.subheader("Feature Catalog")
for group, features in feature_groups.items():
    with st.expander(group):
        cols = st.columns(3)
        for i, feat in enumerate(features):
            with cols[i % 3]:
                st.markdown(
                    f"""
                    <div style="background:#1a1d24;padding:0.6rem 0.8rem;
                                border-radius:6px;margin-bottom:0.4rem;
                                border-left:3px solid #00d4aa;">
                        <code style="color:#e8e8e8;">{feat}</code>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )

st.divider()
st.subheader("📈 Feature Importance (Mock)")

# Mock feature importance data
features = [
    "voi_ratio",
    "iv_rank",
    "delta",
    "theta_price_ratio",
    "rsi_14",
    "spread_ratio",
    "news_sentiment",
    "atr_14",
]
importance = [0.28, 0.22, 0.18, 0.12, 0.08, 0.06, 0.04, 0.02]

fig = px.bar(
    x=importance,
    y=features,
    orientation="h",
    title="Feature Importance (SHAP-like)",
    labels={"x": "Importance", "y": "Feature"},
    color=importance,
    color_continuous_scale=["#1a1d24", "#00d4aa"],
)
fig.update_layout(
    plot_bgcolor="#0e1117",
    paper_bgcolor="#0e1117",
    font_color="#e8e8e8",
    yaxis=dict(gridcolor="#2a2d34"),
    xaxis=dict(gridcolor="#2a2d34"),
    coloraxis_showscale=False,
    height=350,
)
st.plotly_chart(fig, use_container_width=True)

st.info(
    "Feature importance requires labeled training data and a fitted model. Connect to backtest results to generate real rankings."
)
