export const toPaise = (rupees: number): number => Math.round(rupees * 100);
export const toRupees = (paise: number): number => paise / 100;
export const addMoney = (...amounts: number[]): number => amounts.reduce((a, b) => a + b, 0);
export const subMoney = (a: number, b: number): number => a - b;
export const mulMoney = (paise: number, qty: number): number => Math.round(paise * qty);
export const pctOf = (paise: number, pct: number): number => Math.round((paise * pct) / 100);
export const applyPct = (paise: number, pct: number): number => Math.round(paise + (paise * pct) / 100);
export const formatINR = (paise: number): string => {
    const rupees = toRupees(paise);
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(rupees);
};
