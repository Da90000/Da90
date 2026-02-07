/**
 * Unit Conversion Utilities
 * Handles conversions between compatible units (weight, volume, count)
 */

// Unit families with conversion factors to base unit
export const UNIT_FAMILIES = {
    weight: {
        base: 'kg',
        units: {
            kg: 1,
            g: 0.001,
        }
    },
    volume: {
        base: 'liter',
        units: {
            liter: 1,
            litre: 1,
            l: 1,
            ml: 0.001,
            milliliter: 0.001,
            millilitre: 0.001,
        }
    },
    count: {
        base: 'piece',
        units: {
            piece: 1,
            pc: 1,
            dozen: 12,
            hali: 4,
        }
    }
} as const;

// All supported units
export const ALL_UNITS = [
    'kg', 'g', 'gram',
    'liter', 'litre', 'l', 'ml', 'milliliter', 'millilitre',
    'piece', 'pc', 'dozen', 'hali',
    'bottle', 'pack', 'bundle', 'jar', 'can', 'box', 'roll', 'block', 'cup'
] as const;

export type UnitType = typeof ALL_UNITS[number];

/**
 * Find which family a unit belongs to
 */
export function getUnitFamily(unit: string): keyof typeof UNIT_FAMILIES | null {
    const normalizedUnit = unit.toLowerCase();

    for (const [family, config] of Object.entries(UNIT_FAMILIES)) {
        if (normalizedUnit in config.units) {
            return family as keyof typeof UNIT_FAMILIES;
        }
    }

    return null;
}

/**
 * Check if two units are compatible (can be converted)
 */
export function areUnitsCompatible(unit1: string, unit2: string): boolean {
    const family1 = getUnitFamily(unit1);
    const family2 = getUnitFamily(unit2);

    return family1 !== null && family1 === family2;
}

/**
 * Get all units compatible with given unit
 */
export function getCompatibleUnits(unit: string): string[] {
    const family = getUnitFamily(unit);

    if (!family) {
        // If unit doesn't belong to a family, only itself is compatible
        return [unit];
    }

    return Object.keys(UNIT_FAMILIES[family].units);
}

/**
 * Convert quantity from one unit to another
 * Returns null if units are incompatible
 */
export function convertQuantity(
    quantity: number,
    fromUnit: string,
    toUnit: string
): number | null {
    const normalizedFrom = fromUnit.toLowerCase();
    const normalizedTo = toUnit.toLowerCase();

    // Same unit - no conversion needed
    if (normalizedFrom === normalizedTo) {
        return quantity;
    }

    // Check compatibility
    if (!areUnitsCompatible(normalizedFrom, normalizedTo)) {
        return null;
    }

    const family = getUnitFamily(normalizedFrom)!;
    const fromFactor = UNIT_FAMILIES[family].units[normalizedFrom as keyof typeof UNIT_FAMILIES[typeof family]['units']];
    const toFactor = UNIT_FAMILIES[family].units[normalizedTo as keyof typeof UNIT_FAMILIES[typeof family]['units']];

    // Convert to base unit, then to target unit
    const baseQuantity = quantity * fromFactor;
    return baseQuantity / toFactor;
}

/**
 * Calculate price for a quantity in target unit based on base price per base unit
 * 
 * @param basePrice - Price per base unit (e.g., 78 BDT per kg)
 * @param baseUnit - Base unit (e.g., "kg")
 * @param targetQuantity - Desired quantity (e.g., 500)
 * @param targetUnit - Target unit (e.g., "g")
 * @returns Calculated price or null if incompatible
 * 
 * @example
 * calculateConvertedPrice(78, "kg", 500, "g") // Returns 39 (78 * 0.5)
 */
export function calculateConvertedPrice(
    basePrice: number,
    baseUnit: string,
    targetQuantity: number,
    targetUnit: string
): number | null {
    // Convert target quantity to base unit
    const convertedQuantity = convertQuantity(targetQuantity, targetUnit, baseUnit);

    if (convertedQuantity === null) {
        return null;
    }

    return basePrice * convertedQuantity;
}

/**
 * Format unit display (normalize common variations)
 */
export function formatUnit(unit: string): string {
    const normalized = unit.toLowerCase();

    // Map common variations to preferred display
    const displayMap: Record<string, string> = {
        'g': 'g',
        'gram': 'g',
        'kg': 'kg',
        'ml': 'ml',
        'milliliter': 'ml',
        'millilitre': 'ml',
        'l': 'L',
        'liter': 'L',
        'litre': 'L',
        'pc': 'pc',
        'piece': 'pc',
    };

    return displayMap[normalized] || unit;
}
