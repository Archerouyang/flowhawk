"""Factors page — IC analysis and correlation research."""
import streamlit as st
import plotly.graph_objects as go
import numpy as np

st.set_page_config(page_title="Factors | FlowHawk", layout="wide")

st.markdown("## 🔬 Factor Research")

st.subheader("Information Coefficient (IC) Analysis")

# Mock IC data
factors = ["V/OI", "IV_Rank", "Delta", "Theta/Price", "RSI", "ATR", "Spread"]
ic_values = [0.08, 0.06, 0.04, 0.03, 0.02, 0.01, -0.02]
ic_std = [0.15, 0.12, 0.10, 0.08, 0.09, 0.07, 0.11]

fig = go.Figure()
fig.add_trace(
    go.Bar(
        x=factors,
        y=ic_values,
        error_y=dict(type="data", array=ic_std, visible=True, color="#ff6b6b"),
        marker_color=["#00d4aa" if v > 0 else "#ff6b6b" for v in ic_values],
        name="IC (1D Forward Return)",
    )
)
fig.add_hline(y=0, line_dash="dash", line_color="#666")
fig.update_layout(
    title="Factor IC vs 1-Day Forward Return",
    plot_bgcolor="#0e1117",
    paper_bgcolor="#0e1117",
    font_color="#e8e8e8",
    xaxis=dict(gridcolor="#2a2d34"),
    yaxis=dict(gridcolor="#2a2d34", title="IC"),
    height=350,
    showlegend=False,
)
st.plotly_chart(fig, use_container_width=True)

st.markdown("**Interpretation:** Positive IC means the factor predicts future returns. Error bars show IC standard deviation (stability).")

st.divider()
st.subheader("🔥 Factor Correlation Matrix")

# Mock correlation matrix
corr_matrix = np.array([
    [1.00, 0.15, -0.05, 0.22, 0.08, 0.03, -0.12],
    [0.15, 1.00, 0.35, 0.18, -0.10, 0.25, 0.05],
    [-0.05, 0.35, 1.00, 0.40, 0.12, 0.08, 0.15],
    [0.22, 0.18, 0.40, 1.00, 0.05, 0.10, 0.20],
    [0.08, -0.10, 0.12, 0.05, 1.00, 0.45, 0.03],
    [0.03, 0.25, 0.08, 0.10, 0.45, 1.00, -0.08],
    [-0.12, 0.05, 0.15, 0.20, 0.03, -0.08, 1.00],
])

fig_heat = go.Figure(
    data=go.Heatmap(
        z=corr_matrix,
        x=factors,
        y=factors,
        colorscale=[[0, "#ff6b6b"], [0.5, "#1a1d24"], [1, "#00d4aa"]],
        zmid=0,
        text=np.round(corr_matrix, 2),
        texttemplate="%{text}",
        textfont=dict(size=10),
    )
)
fig_heat.update_layout(
    title="Factor Cross-Correlation",
    plot_bgcolor="#0e1117",
    paper_bgcolor="#0e1117",
    font_color="#e8e8e8",
    height=400,
)
st.plotly_chart(fig_heat, use_container_width=True)

st.info("Factor analysis requires historical factor values and forward returns. Integrate with backtest engine to compute real IC and correlation matrices.")
