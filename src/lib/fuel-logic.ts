export interface TransactionResult {
  nominal: number;
  liter: number;
  cost: number;
  profit: number;
  isSpecialRule: boolean;
}

export const BASE_PRICE_PER_LITER = 12000;
export const COST_PRICE_PER_LITER = 10000;

export const calculateTransaction = (amount: number): TransactionResult => {
  let liter = 0;
  let isSpecialRule = false;

  // Special Rules
  if (amount === 10000) {
    liter = 0.7;
    isSpecialRule = true;
  } else if (amount === 6000) {
    liter = 0.5;
    isSpecialRule = true;
  } else if (amount === 15000) {
    liter = 1.2;
    isSpecialRule = true;
  } else {
    // Standard Calculation
    liter = Number((amount / BASE_PRICE_PER_LITER).toFixed(2));
  }

  // Calculate Cost and Profit
  // Cost based on volume * cost price
  const cost = Number((liter * COST_PRICE_PER_LITER).toFixed(0));
  const profit = amount - cost;

  return {
    nominal: amount,
    liter,
    cost,
    profit,
    isSpecialRule,
  };
};
