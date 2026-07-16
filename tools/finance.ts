import { Tool } from "./index";

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
}

export interface PortfolioPosition {
  symbol: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
}

export interface RiskMetrics {
  portfolioValue: number;
  dailyVaR: number;
  sharpeRatio: number;
  beta: number;
  maxDrawdown: number;
}

function generateMockPrice(symbol: string): number {
  const seed = symbol.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return Math.round((50 + (seed % 450) + Math.random() * 10) * 100) / 100;
}

export const marketDataTool: Tool = {
  name: "finance-market-data",
  description: "Fetch real-time or simulated market data for one or more ticker symbols.",
  async execute(params) {
    const symbols = (params.symbols as string[] | undefined) ?? ["AAPL", "GOOG", "MSFT"];
    const data: MarketData[] = symbols.map((symbol) => {
      const price = generateMockPrice(symbol);
      const change = Math.round((Math.random() - 0.5) * 10 * 100) / 100;
      return {
        symbol,
        price,
        change,
        changePercent: Math.round((change / price) * 10000) / 100,
        volume: Math.floor(Math.random() * 10_000_000) + 100_000,
        timestamp: Date.now(),
      };
    });
    return data;
  },
};

export const portfolioAnalysisTool: Tool = {
  name: "finance-portfolio-analysis",
  description: "Analyse a portfolio of positions and return market values and P&L.",
  async execute(params) {
    const positions = (params.positions as Array<{ symbol: string; quantity: number; avgCost: number }> | undefined) ?? [
      { symbol: "AAPL", quantity: 100, avgCost: 145.0 },
      { symbol: "GOOG", quantity: 50, avgCost: 2700.0 },
    ];

    const analysed: PortfolioPosition[] = positions.map((p) => {
      const currentPrice = generateMockPrice(p.symbol);
      const marketValue = currentPrice * p.quantity;
      const costBasis = p.avgCost * p.quantity;
      const unrealizedPnl = marketValue - costBasis;
      return {
        symbol: p.symbol,
        quantity: p.quantity,
        avgCost: p.avgCost,
        currentPrice,
        marketValue,
        unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
        unrealizedPnlPercent: Math.round((unrealizedPnl / costBasis) * 10000) / 100,
      };
    });

    return analysed;
  },
};

export const riskAnalysisTool: Tool = {
  name: "finance-risk-analysis",
  description: "Compute risk metrics (VaR, Sharpe ratio, beta, max drawdown) for a portfolio.",
  async execute(params) {
    const portfolioValue = (params.portfolioValue as number | undefined) ?? 100_000;
    const confidence = (params.confidence as number | undefined) ?? 0.95;

    const dailyVaR = Math.round(portfolioValue * (1 - confidence) * (0.01 + Math.random() * 0.02) * 100) / 100;
    const sharpeRatio = Math.round((0.5 + Math.random() * 2) * 100) / 100;
    const beta = Math.round((0.7 + Math.random() * 0.6) * 100) / 100;
    const maxDrawdown = Math.round(-(5 + Math.random() * 20) * 100) / 100;

    const result: RiskMetrics = {
      portfolioValue,
      dailyVaR,
      sharpeRatio,
      beta,
      maxDrawdown,
    };
    return result;
  },
};

export const marketForecastTool: Tool = {
  name: "finance.marketForecast",
  description: "Forecast market direction and confidence over a configurable horizon.",
  async execute(params) {
    const symbol = String(params.symbol ?? "HOARE");
    const horizonDays = (params.horizonDays as number | undefined) ?? 30;
    return { symbol, horizonDays, direction: "neutral-positive", confidence: 0.68, drivers: ["volume", "sentiment", "macro"] };
  },
};

export const financeAnomalyDetectionTool: Tool = {
  name: "finance.anomalyDetection",
  description: "Detect anomalies in financial time series, invoices, and usage patterns.",
  async execute(params) {
    const seriesName = String(params.seriesName ?? "usage-spend");
    return { seriesName, anomalies: [{ index: 0, severity: "medium", reason: "above rolling baseline" }], threshold: 2.5 };
  },
};

export const financeRiskModelTool: Tool = {
  name: "finance.riskModel",
  description: "Run a domain risk model for portfolio, usage, or operational exposures.",
  async execute(params) {
    return riskAnalysisTool.execute(params);
  },
};

export const financeTools: Tool[] = [marketDataTool, portfolioAnalysisTool, riskAnalysisTool, financeRiskModelTool, marketForecastTool, financeAnomalyDetectionTool];
