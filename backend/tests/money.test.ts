import { toPaise, toRupees, addMoney, subMoney, mulMoney, pctOf, applyPct, formatINR } from '../src/utils/money';

describe('money.ts', () => {
    test('toPaise', () => expect(toPaise(10.5)).toBe(1050));
    test('toRupees', () => expect(toRupees(1050)).toBe(10.5));
    test('addMoney', () => expect(addMoney(100, 200, 50)).toBe(350));
    test('subMoney', () => expect(subMoney(300, 100)).toBe(200));
    test('mulMoney', () => expect(mulMoney(100, 3)).toBe(300));
    test('pctOf', () => expect(pctOf(200, 15)).toBe(30));
    test('applyPct', () => expect(applyPct(200, 15)).toBe(230));
    test('formatINR', () => {
        // Handling invisible chars mapping sometimes present in node's Intl
        const formatted = formatINR(12345600).replace(/\u00A0/g, ' ');
        expect(formatted).toBe('₹1,23,456.00');
    });
});
