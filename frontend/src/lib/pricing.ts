// Black-Scholes-Merton Option Pricing Engine
import { Greeks, Option, OptionType, TradeLeg, PayoffPoint } from '@/types/options';

// Standard normal cumulative distribution function
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

// Standard normal probability density function
function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// Calculate d1 and d2 for Black-Scholes
function calculateD1D2(
  spotPrice: number,
  strike: number,
  timeToExpiry: number,
  riskFreeRate: number,
  volatility: number,
  dividendYield: number
): { d1: number; d2: number } {
  const sqrtT = Math.sqrt(timeToExpiry);
  const d1 = (Math.log(spotPrice / strike) + (riskFreeRate - dividendYield + 0.5 * volatility * volatility) * timeToExpiry) / (volatility * sqrtT);
  const d2 = d1 - volatility * sqrtT;
  return { d1, d2 };
}

// Calculate option price using Black-Scholes-Merton
export function calculateOptionPrice(
  spotPrice: number,
  strike: number,
  timeToExpiry: number, // In years
  riskFreeRate: number,
  volatility: number,
  dividendYield: number,
  optionType: OptionType
): number {
  if (timeToExpiry <= 0) {
    // At expiry, return intrinsic value
    if (optionType === 'call') {
      return Math.max(0, spotPrice - strike);
    } else {
      return Math.max(0, strike - spotPrice);
    }
  }

  const { d1, d2 } = calculateD1D2(spotPrice, strike, timeToExpiry, riskFreeRate, volatility, dividendYield);
  const discountFactor = Math.exp(-riskFreeRate * timeToExpiry);
  const dividendDiscountFactor = Math.exp(-dividendYield * timeToExpiry);

  if (optionType === 'call') {
    return spotPrice * dividendDiscountFactor * normalCDF(d1) - strike * discountFactor * normalCDF(d2);
  } else {
    return strike * discountFactor * normalCDF(-d2) - spotPrice * dividendDiscountFactor * normalCDF(-d1);
  }
}

// Calculate Greeks
export function calculateGreeks(
  spotPrice: number,
  strike: number,
  timeToExpiry: number,
  riskFreeRate: number,
  volatility: number,
  dividendYield: number,
  optionType: OptionType
): Greeks {
  if (timeToExpiry <= 0) {
    // At expiry
    const inTheMoney = optionType === 'call' 
      ? spotPrice > strike 
      : spotPrice < strike;
    return {
      delta: inTheMoney ? (optionType === 'call' ? 1 : -1) : 0,
      gamma: 0,
      theta: 0,
      vega: 0,
    };
  }

  const { d1, d2 } = calculateD1D2(spotPrice, strike, timeToExpiry, riskFreeRate, volatility, dividendYield);
  const sqrtT = Math.sqrt(timeToExpiry);
  const dividendDiscountFactor = Math.exp(-dividendYield * timeToExpiry);
  const discountFactor = Math.exp(-riskFreeRate * timeToExpiry);

  // Delta
  let delta: number;
  if (optionType === 'call') {
    delta = dividendDiscountFactor * normalCDF(d1);
  } else {
    delta = -dividendDiscountFactor * normalCDF(-d1);
  }

  // Gamma (same for call and put)
  const gamma = (dividendDiscountFactor * normalPDF(d1)) / (spotPrice * volatility * sqrtT);

  // Theta (per day)
  const term1 = -(spotPrice * volatility * dividendDiscountFactor * normalPDF(d1)) / (2 * sqrtT);
  let theta: number;
  if (optionType === 'call') {
    theta = term1 - riskFreeRate * strike * discountFactor * normalCDF(d2) + dividendYield * spotPrice * dividendDiscountFactor * normalCDF(d1);
  } else {
    theta = term1 + riskFreeRate * strike * discountFactor * normalCDF(-d2) - dividendYield * spotPrice * dividendDiscountFactor * normalCDF(-d1);
  }
  // Convert to daily theta
  theta = theta / 365;

  // Vega (per 1% change in volatility)
  const vega = (spotPrice * dividendDiscountFactor * normalPDF(d1) * sqrtT) / 100;

  return { delta, gamma, theta, vega };
}

// Calculate time to expiry in years
export function getTimeToExpiry(expiryDate: Date): number {
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return Math.max(0, diffDays / 365);
}

// Calculate days to expiry
export function getDaysToExpiry(expiryDate: Date): number {
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

// Calculate leg value and Greeks
export function calculateLegValue(
  leg: TradeLeg,
  spotPrice: number,
  dividendYield: number,
  riskFreeRate: number = 0.02
): { value: number; greeks: Greeks } {
  const timeToExpiry = getTimeToExpiry(leg.option.expiry);
  const optionPrice = calculateOptionPrice(
    spotPrice,
    leg.option.strike,
    timeToExpiry,
    riskFreeRate,
    leg.option.iv,
    dividendYield,
    leg.option.type
  );

  const greeks = calculateGreeks(
    spotPrice,
    leg.option.strike,
    timeToExpiry,
    riskFreeRate,
    leg.option.iv,
    dividendYield,
    leg.option.type
  );

  const multiplier = leg.side === 'buy' ? 1 : -1;
  const contractMultiplier = 100; // Standard option contract = 100 shares

  return {
    value: optionPrice * leg.quantity * contractMultiplier * multiplier,
    greeks: {
      delta: greeks.delta * leg.quantity * contractMultiplier * multiplier,
      gamma: greeks.gamma * leg.quantity * contractMultiplier * multiplier,
      theta: greeks.theta * leg.quantity * contractMultiplier * multiplier,
      vega: greeks.vega * leg.quantity * contractMultiplier * multiplier,
    },
  };
}

// Calculate payoff curve for a trade at expiry
export function calculatePayoffCurve(
  legs: TradeLeg[],
  currentPrice: number,
  priceRangePercent: number = 0.3, // 30% range above and below
  steps: number = 100
): PayoffPoint[] {
  const minPrice = currentPrice * (1 - priceRangePercent);
  const maxPrice = currentPrice * (1 + priceRangePercent);
  const priceStep = (maxPrice - minPrice) / steps;

  const points: PayoffPoint[] = [];
  const contractMultiplier = 100;

  // Calculate initial cost/credit
  let initialCost = 0;
  for (const leg of legs) {
    const multiplier = leg.side === 'buy' ? 1 : -1;
    initialCost += leg.premium * leg.quantity * contractMultiplier * multiplier;
  }

  for (let i = 0; i <= steps; i++) {
    const price = minPrice + i * priceStep;
    let profit = -initialCost;

    for (const leg of legs) {
      const multiplier = leg.side === 'buy' ? 1 : -1;
      let intrinsicValue: number;

      if (leg.option.type === 'call') {
        intrinsicValue = Math.max(0, price - leg.option.strike);
      } else {
        intrinsicValue = Math.max(0, leg.option.strike - price);
      }

      profit += intrinsicValue * leg.quantity * contractMultiplier * multiplier;
    }

    points.push({ underlyingPrice: price, profit });
  }

  return points;
}

// Aggregate Greeks for multiple legs
export function aggregateGreeks(greeksList: Greeks[]): Greeks {
  return greeksList.reduce(
    (acc, g) => ({
      delta: acc.delta + g.delta,
      gamma: acc.gamma + g.gamma,
      theta: acc.theta + g.theta,
      vega: acc.vega + g.vega,
    }),
    { delta: 0, gamma: 0, theta: 0, vega: 0 }
  );
}
