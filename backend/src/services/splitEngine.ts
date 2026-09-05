export interface SplitLine {
    productId: string;
    productName: string;
    quantity: number;
    isStockTracked: boolean;
}

export interface StockInfo {
    warehouseId: string;
    productId: string;
    availableQty: number; // calculated as quantity - reservedQuantity externally
}

export interface WarehouseInfo {
    warehouseId: string;
    name: string;
    shippingCostWeight: number;
    baseCost: number;
}

export interface SplitAllocation {
    warehouseId: string | null;
    warehouseName: string;
    lines: { productId: string; productName: string; quantity: number }[];
    shipmentCost: number;
    isBackorder: boolean;
}

export interface SplitPlanResult {
    allocations: SplitAllocation[];
    backorders: SplitAllocation[];
    shipmentCount: number;
    totalShippingCost: number;
    fullyFulfilled: boolean;
}

export const planSplit = (
    orderLines: SplitLine[],
    stockInfo: StockInfo[],
    warehouses: WarehouseInfo[]
): SplitPlanResult => {

    // 1. SKIP any product with isStockTracked === false.
    let remainingDemand = orderLines
        .filter(l => l.isStockTracked)
        .map(l => ({ ...l, pending: l.quantity }));

    const allocations: SplitAllocation[] = [];

    if (remainingDemand.length === 0) {
        return { allocations, backorders: [], shipmentCount: 0, totalShippingCost: 0, fullyFulfilled: true };
    }

    // Prepare stock lookup: warehouseId -> productId -> availableQty
    const stockMap = new Map<string, Map<string, number>>();
    for (const s of stockInfo) {
        if (!stockMap.has(s.warehouseId)) stockMap.set(s.warehouseId, new Map());
        stockMap.get(s.warehouseId)!.set(s.productId, s.availableQty);
    }

    const whMap = new Map(warehouses.map(w => [w.warehouseId, w]));

    // 2. ONE WAREHOUSE COMPLETELY FULFILLS?
    // Find checking if any warehouse covers all pending
    let bestSingleWh: WarehouseInfo | null = null;
    for (const w of warehouses) {
        let canFulfillAll = true;
        for (const item of remainingDemand) {
            const avail = stockMap.get(w.warehouseId)?.get(item.productId) || 0;
            if (avail < item.pending) {
                canFulfillAll = false;
                break;
            }
        }
        if (canFulfillAll) {
            // If multiple can fulfill, pick the cheapest shipping
            if (!bestSingleWh || w.shippingCostWeight < bestSingleWh.shippingCostWeight) {
                bestSingleWh = w;
            }
        }
    }

    if (bestSingleWh) {
        allocations.push({
            warehouseId: bestSingleWh.warehouseId,
            warehouseName: bestSingleWh.name,
            lines: remainingDemand.map(r => ({
                productId: r.productId,
                productName: r.productName,
                quantity: r.pending
            })),
            shipmentCost: bestSingleWh.baseCost * bestSingleWh.shippingCostWeight,
            isBackorder: false
        });
        return {
            allocations,
            backorders: [],
            shipmentCount: 1,
            totalShippingCost: allocations[0].shipmentCost,
            fullyFulfilled: true
        };
    }

    // 3. GREEDY SPLIT
    while (remainingDemand.length > 0) {
        // Score each warehouse based on how many FULL lines it can kill, then cost
        let bestWhScore = { wh: null as WarehouseInfo | null, linesCovered: 0, unitsAllocated: 0 };

        for (const w of warehouses) {
            let linesCovered = 0;
            let unitsAllocated = 0;
            for (const item of remainingDemand) {
                const avail = stockMap.get(w.warehouseId)?.get(item.productId) || 0;
                if (avail >= item.pending) {
                    linesCovered++;
                    unitsAllocated += item.pending;
                } else if (avail > 0) {
                    unitsAllocated += avail;
                }
            }
            if (unitsAllocated > 0) {
                if (
                    !bestWhScore.wh ||
                    linesCovered > bestWhScore.linesCovered ||
                    (linesCovered === bestWhScore.linesCovered && unitsAllocated > bestWhScore.unitsAllocated) ||
                    (linesCovered === bestWhScore.linesCovered && unitsAllocated === bestWhScore.unitsAllocated && w.shippingCostWeight < bestWhScore.wh.shippingCostWeight)
                ) {
                    bestWhScore = { wh: w, linesCovered, unitsAllocated };
                }
            }
        }

        const pickedWh = bestWhScore.wh;
        if (!pickedWh) {
            // Cannot allocate any more items anywhere
            break;
        }

        const allocLines: { productId: string; productName: string; quantity: number }[] = [];
        const nextDemand = [];

        for (const item of remainingDemand) {
            const avail = stockMap.get(pickedWh.warehouseId)?.get(item.productId) || 0;
            if (avail > 0) {
                const take = Math.min(avail, item.pending);
                allocLines.push({ productId: item.productId, productName: item.productName, quantity: take });
                item.pending -= take;

                // mutate stock map so we don't double allocate
                stockMap.get(pickedWh.warehouseId)!.set(item.productId, avail - take);
            }
            if (item.pending > 0) {
                nextDemand.push(item);
            }
        }

        if (allocLines.length > 0) {
            allocations.push({
                warehouseId: pickedWh.warehouseId,
                warehouseName: pickedWh.name,
                lines: allocLines,
                shipmentCost: pickedWh.baseCost * pickedWh.shippingCostWeight,
                isBackorder: false
            });
        }

        remainingDemand = nextDemand;
    }

    // 4. BACKORDERS
    const backorders: SplitAllocation[] = [];
    if (remainingDemand.length > 0) {
        backorders.push({
            warehouseId: null,
            warehouseName: 'Backorder',
            lines: remainingDemand.map(r => ({ productId: r.productId, productName: r.productName, quantity: r.pending })),
            shipmentCost: 0,
            isBackorder: true
        });
    }

    return {
        allocations,
        backorders,
        shipmentCount: allocations.length,
        totalShippingCost: allocations.reduce((sum, a) => sum + a.shipmentCost, 0),
        fullyFulfilled: backorders.length === 0
    };
};

export const consolidateBackorders = (allocations: SplitAllocation[], stockInfo: StockInfo[], warehouses: WarehouseInfo[]) => {
    // A simplified consolidation hook
    // It would run the backordered lines through planSplit again against newly released stock
    const bo = allocations.filter(a => a.isBackorder).flatMap(a => a.lines.map(l => ({ ...l, isStockTracked: true })));
    if (bo.length === 0) return allocations;

    const consolidatedPlan = planSplit(
        bo,
        stockInfo,
        warehouses
    );

    return {
        resolvedAllocations: consolidatedPlan.allocations,
        remainingBackorders: consolidatedPlan.backorders
    };
};
