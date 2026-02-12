/**
 * AI Category Prediction Engine
 * 
 * Rule-based category prediction with confidence scoring.
 * Analyzes description text, transaction amount, and time-of-day
 * to suggest the most likely expense categories.
 * 
 * TODO: Integrate TensorFlow.js ML model trained on user history.
 */

const CORRECTION_STORAGE_KEY = 'lifeOS_category_corrections'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CategoryPrediction {
    category: string
    confidence: number
    reasoning?: string
}

interface CorrectionRecord {
    description: string
    amount: number
    predictedCategory: string
    actualCategory: string
    timestamp: number
}

// ─── Keyword dictionaries ───────────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<string, { keywords: string[]; baseConfidence: number }> = {
    food: {
        keywords: [
            'restaurant', 'food', 'cafe', 'coffee', 'tea', 'grocery', 'groceries',
            'lunch', 'dinner', 'breakfast', 'snack', 'pizza', 'burger', 'chicken',
            'rice', 'biryani', 'bakery', 'sweet', 'juice', 'milk', 'bread',
            'meat', 'fish', 'vegetable', 'fruit', 'egg', 'cooking', 'kitchen',
            'swiggy', 'zomato', 'foodpanda', 'eat', 'meal', 'dine',
        ],
        baseConfidence: 0.85,
    },
    transport: {
        keywords: [
            'uber', 'taxi', 'bus', 'metro', 'train', 'fuel', 'gas', 'petrol',
            'diesel', 'parking', 'toll', 'ride', 'cab', 'rickshaw', 'auto',
            'grab', 'lyft', 'ola', 'pathao', 'flight', 'airline', 'travel',
        ],
        baseConfidence: 0.92,
    },
    housing: {
        keywords: [
            'rent', 'mortgage', 'utility', 'electric', 'electricity', 'water',
            'gas bill', 'internet', 'wifi', 'broadband', 'maintenance',
            'repair', 'plumber', 'cleaning', 'furniture', 'appliance',
        ],
        baseConfidence: 0.88,
    },
    shopping: {
        keywords: [
            'amazon', 'shop', 'store', 'mall', 'daraz', 'flipkart', 'online',
            'purchase', 'buy', 'order', 'delivery', 'clothes', 'shoes',
            'electronics', 'gadget', 'accessory', 'gift',
        ],
        baseConfidence: 0.75,
    },
    healthcare: {
        keywords: [
            'pharmacy', 'doctor', 'hospital', 'clinic', 'medicine', 'medical',
            'health', 'dental', 'eye', 'lab', 'test', 'prescription', 'therapy',
        ],
        baseConfidence: 0.90,
    },
    education: {
        keywords: [
            'school', 'college', 'university', 'course', 'class', 'tuition',
            'book', 'textbook', 'study', 'exam', 'tutorial', 'udemy', 'coursera',
        ],
        baseConfidence: 0.82,
    },
    entertainment: {
        keywords: [
            'movie', 'cinema', 'netflix', 'spotify', 'youtube', 'game', 'gaming',
            'concert', 'show', 'subscription', 'streaming', 'music', 'party',
        ],
        baseConfidence: 0.78,
    },
    personal: {
        keywords: [
            'salon', 'haircut', 'spa', 'gym', 'fitness', 'grooming',
            'cosmetic', 'skincare', 'barber',
        ],
        baseConfidence: 0.80,
    },
    bills: {
        keywords: [
            'bill', 'payment', 'subscription', 'premium', 'plan', 'recharge',
            'mobile', 'phone', 'insurance', 'emi', 'installment',
        ],
        baseConfidence: 0.83,
    },
}

// ─── Time-based heuristics ──────────────────────────────────────────────────

function getTimePrediction(hour: number, amount: number): CategoryPrediction | null {
    // Meal times with small amounts strongly suggest food
    const isMealTime =
        (hour >= 7 && hour <= 10) ||   // Breakfast
        (hour >= 12 && hour <= 14) ||  // Lunch
        (hour >= 18 && hour <= 21)     // Dinner

    if (isMealTime && amount < 500) {
        return {
            category: 'food',
            confidence: 0.70,
            reasoning: 'Time of day and moderate amount suggest a meal',
        }
    }

    return null
}

// ─── Amount-based heuristics ────────────────────────────────────────────────

function getAmountPrediction(amount: number): CategoryPrediction | null {
    if (amount > 5000) {
        return {
            category: 'housing',
            confidence: 0.65,
            reasoning: 'Large amount suggests housing or major expense',
        }
    }
    return null
}

// ─── Correction-based learning ──────────────────────────────────────────────

function getStoredCorrections(): CorrectionRecord[] {
    if (typeof window === 'undefined') return []
    try {
        const raw = localStorage.getItem(CORRECTION_STORAGE_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

function getCorrectionBoost(description: string): CategoryPrediction | null {
    const corrections = getStoredCorrections()
    if (corrections.length === 0) return null

    const desc = description.toLowerCase().trim()

    // Find corrections with similar descriptions
    const matches = corrections.filter(c => {
        const corrDesc = c.description.toLowerCase().trim()
        // Exact match or significant word overlap
        if (corrDesc === desc) return true
        const descWords = desc.split(/\s+/)
        const corrWords = corrDesc.split(/\s+/)
        const overlap = descWords.filter(w => corrWords.includes(w)).length
        return overlap >= Math.min(2, descWords.length)
    })

    if (matches.length === 0) return null

    // Count how often each actual category appears
    const categoryCounts: Record<string, number> = {}
    for (const m of matches) {
        categoryCounts[m.actualCategory] = (categoryCounts[m.actualCategory] || 0) + 1
    }

    // Pick the most frequent correction
    const topCategory = Object.entries(categoryCounts)
        .sort(([, a], [, b]) => b - a)[0]

    if (!topCategory) return null

    const frequency = topCategory[1] / matches.length

    return {
        category: topCategory[0],
        confidence: Math.min(0.95, 0.70 + frequency * 0.20),
        reasoning: `Learned from ${matches.length} previous correction(s)`,
    }
}

// ─── Main prediction function ───────────────────────────────────────────────

export async function predictCategory(
    description: string,
    amount: number,
    time?: Date
): Promise<CategoryPrediction[]> {
    const predictions: CategoryPrediction[] = []
    const hour = time ? time.getHours() : new Date().getHours()
    const desc = description.toLowerCase().trim()

    // Handle empty description
    if (!desc) {
        // Only use amount and time heuristics
        const timePred = getTimePrediction(hour, amount)
        if (timePred) predictions.push(timePred)

        const amountPred = getAmountPrediction(amount)
        if (amountPred) predictions.push(amountPred)

        if (predictions.length === 0) {
            predictions.push({
                category: 'other',
                confidence: 0.5,
                reasoning: 'No description provided',
            })
        }

        return predictions.slice(0, 3)
    }

    // 1. Check correction history first (highest priority – user has taught us)
    const correctionPred = getCorrectionBoost(description)
    if (correctionPred) {
        predictions.push(correctionPred)
    }

    // 2. Keyword matching across all categories
    for (const [category, { keywords, baseConfidence }] of Object.entries(CATEGORY_KEYWORDS)) {
        const matchedKeywords = keywords.filter(kw => desc.includes(kw))
        if (matchedKeywords.length > 0) {
            // Boost confidence if multiple keywords match
            const multiMatchBoost = Math.min(0.10, (matchedKeywords.length - 1) * 0.05)
            predictions.push({
                category,
                confidence: Math.min(0.98, baseConfidence + multiMatchBoost),
                reasoning: `Matched keywords: ${matchedKeywords.slice(0, 3).join(', ')}`,
            })
        }
    }

    // 3. Time-based prediction (lower priority)
    const timePred = getTimePrediction(hour, amount)
    if (timePred) {
        // Only add if food isn't already predicted with higher confidence
        const existingFood = predictions.find(p => p.category === 'food')
        if (!existingFood) {
            predictions.push(timePred)
        } else {
            // Boost existing food prediction slightly
            existingFood.confidence = Math.min(0.98, existingFood.confidence + 0.05)
            existingFood.reasoning += ' (confirmed by time of day)'
        }
    }

    // 4. Amount-based prediction (lowest priority)
    const amountPred = getAmountPrediction(amount)
    if (amountPred) {
        const existingHousing = predictions.find(p => p.category === 'housing')
        if (!existingHousing) {
            predictions.push(amountPred)
        } else {
            existingHousing.confidence = Math.min(0.98, existingHousing.confidence + 0.05)
        }
    }

    // ── Deduplicate by category (keep highest confidence) ────────────────────
    const deduped = new Map<string, CategoryPrediction>()
    for (const pred of predictions) {
        const existing = deduped.get(pred.category)
        if (!existing || pred.confidence > existing.confidence) {
            deduped.set(pred.category, pred)
        }
    }

    const sorted = Array.from(deduped.values())
        .sort((a, b) => b.confidence - a.confidence)

    // If no predictions matched, return a default
    if (sorted.length === 0) {
        sorted.push({
            category: 'other',
            confidence: 0.5,
            reasoning: 'No strong indicators found',
        })
    }

    return sorted.slice(0, 3)
}

// ─── Correction recording (learn from user) ────────────────────────────────

/**
 * Record when a user corrects a predicted category.
 * This data is used to improve future predictions.
 */
export function recordCorrection(
    description: string,
    amount: number,
    predictedCategory: string,
    actualCategory: string
): void {
    if (typeof window === 'undefined') return
    if (predictedCategory === actualCategory) return // No correction needed

    try {
        const corrections = getStoredCorrections()

        corrections.push({
            description,
            amount,
            predictedCategory,
            actualCategory,
            timestamp: Date.now(),
        })

        // Keep only the last 200 corrections to avoid localStorage bloat
        const trimmed = corrections.slice(-200)
        localStorage.setItem(CORRECTION_STORAGE_KEY, JSON.stringify(trimmed))

        console.log(`📝 Category correction recorded: "${predictedCategory}" → "${actualCategory}"`)
    } catch (err) {
        console.warn('Failed to save category correction:', err)
    }
}

// ─── TODO: ML-based prediction ──────────────────────────────────────────────
//
// Future implementation using TensorFlow.js:
//
// export async function trainModel(transactions: Transaction[]) {
//   // Convert transactions to training data (description embeddings + amount → category)
//   // Train simple neural network
//   // Save model to IndexedDB via tf.io.browserIndexedDB
// }
//
// export async function predictWithML(
//   description: string,
//   amount: number
// ): Promise<CategoryPrediction[]> {
//   // Load model from IndexedDB
//   // Run inference
//   // Return predictions with confidence
// }
