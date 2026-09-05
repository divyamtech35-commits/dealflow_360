import { planSplit, SplitLine, StockInfo, WarehouseInfo } from '../src/services/splitEngine';

describe('Split Engine Fulfillment', () => {
    const whEast: WarehouseInfo = { warehouseId: 'wh_east', name: 'East', shippingCostWeight: 1.5, baseCost: 100 };
    const whWest: WarehouseInfo = { warehouseId: 'wh_west', name: 'West', shippingCostWeight: 1.0, baseCost: 100 }; // Cheaper

    it('single-warehouse full fulfillment wins over a cheaper 2-way split', () => {
        const orderLines: SplitLine[] = [
            { productId: 'p1', productName: 'Phone', quantity: 10, isStockTracked: true },
            { productId: 'p2', productName: 'Case', quantity: 5, isStockTracked: true }
        ];

        // East (expensive) has ALL stock. West (cheaper) only has partial stock.
        const stock: StockInfo[] = [
            { warehouseId: 'wh_east', productId: 'p1', availableQty: 20 },
            { warehouseId: 'wh_east', productId: 'p2', availableQty: 20 },
            { warehouseId: 'wh_west', productId: 'p1', availableQty: 5 }, // cheap but insufficient
            { warehouseId: 'wh_west', productId: 'p2', availableQty: 5 }
        ];

        const result = planSplit(orderLines, stock, [whEast, whWest]);

        expect(result.allocations.length).toBe(1);
        expect(result.allocations[0].warehouseId).toBe('wh_east');
        expect(result.backorders.length).toBe(0);
        expect(result.fullyFulfilled).toBe(true);
    });

    it('2-way split with a backorder remainder', () => {
        const orderLines: SplitLine[] = [
            { productId: 'p1', productName: 'Phone', quantity: 20, isStockTracked: true }
        ];

        const stock: StockInfo[] = [
            { warehouseId: 'wh_east', productId: 'p1', availableQty: 8 },
            { warehouseId: 'wh_west', productId: 'p1', availableQty: 6 }
        ];

        // Total available = 14. Demand = 20. Remainder = 6.
        const result = planSplit(orderLines, stock, [whEast, whWest]);

        expect(result.allocations.length).toBe(2);

        const totalAllocated = result.allocations.reduce((sum, a) => sum + a.lines[0].quantity, 0);
        expect(totalAllocated).toBe(14);

        expect(result.backorders.length).toBe(1);
        expect(result.backorders[0].lines[0].quantity).toBe(6);
        expect(result.fullyFulfilled).toBe(false);
    });

    it('service lines produce no backorder', () => {
        const orderLines: SplitLine[] = [
            { productId: 'p_srv', productName: 'Setup Service', quantity: 1, isStockTracked: false }
        ];

        const result = planSplit(orderLines, [], [whEast, whWest]);

        expect(result.allocations.length).toBe(0);
        expect(result.backorders.length).toBe(0);
        expect(result.fullyFulfilled).toBe(true); // Service implies fulfilled routing wise
    });

    it('zero stock everywhere -> everything backordered', () => {
        const orderLines: SplitLine[] = [
            { productId: 'p1', productName: 'Phone', quantity: 10, isStockTracked: true }
        ];

        const stock: StockInfo[] = []; // Empty stock

        const result = planSplit(orderLines, stock, [whEast, whWest]);

        expect(result.allocations.length).toBe(0);
        expect(result.backorders.length).toBe(1);
        expect(result.backorders[0].lines[0].quantity).toBe(10);
        expect(result.fullyFulfilled).toBe(false);
    });
});
