/**
 * build-engine.js
 * ─────────────────────────────────────────────────────────────
 * Core "Build My PC" filtering logic. Ported from OLD_WEB.
 * Takes a use-case + budget, returns a complete, budget-respecting,
 * compatibility-aware component list pulled from window.forgePCData.
 * ─────────────────────────────────────────────────────────────
 */

const MAX_BUILD_BUDGET = 275000;
const EXCLUDED_TIERS = ["extreme", "ultimate", "server", "cloud", "density", "hyperscale"];

function isWithinAllowedTier(item) {
    const tier = (item.tier || "").toLowerCase();
    return !EXCLUDED_TIERS.some(excluded => tier.includes(excluded));
}

const USE_CASE_MAP = {
    "gaming": ["Gaming", "1080p Gaming", "1440p Gaming", "4K Gaming", "Budget Gaming", "1080p/1440p Gaming", "1440p/4K Gaming"],
    "creation": ["Content Creation", "Video Editing", "Streaming", "Professional Rendering"],
    "aiml": ["AI/ML Workstation", "AI/ML Entry", "Entry AI/ML", "Professional 3D/Video", "Local LLM Hosting"],
    "office": ["Office", "Budget Build", "Budget Office", "Entry Build"],
};

function matchesUseCase(component, useCaseId) {
    const tags = component.useCase || component.use || [];
    const tagArray = Array.isArray(tags) ? tags : [tags];
    const wanted = USE_CASE_MAP[useCaseId] || [];
    return tagArray.some(tag =>
        wanted.some(w => tag.toLowerCase().includes(w.toLowerCase()) || w.toLowerCase().includes(tag.toLowerCase()))
    );
}

const BUDGET_SPLIT = {
    "gaming":              { cpu: 0.20, gpu: 0.35, ram: 0.08, motherboard: 0.10, psu: 0.08, storage: 0.08, case: 0.06, cooler: 0.05 },
    "creation":            { cpu: 0.25, gpu: 0.28, ram: 0.12, motherboard: 0.10, psu: 0.08, storage: 0.10, case: 0.04, cooler: 0.03 },
    "aiml":                { cpu: 0.18, gpu: 0.40, ram: 0.14, motherboard: 0.08, psu: 0.09, storage: 0.06, case: 0.03, cooler: 0.02 },
    "office":              { cpu: 0.34, ram: 0.16, motherboard: 0.20, psu: 0.14, storage: 0.12, case: 0.04 },
};

const IGPU_ONLY_USE_CASES = new Set(["office"]);

function extractYear(item) {
    const src = item.launched || item.year || "";
    const match = String(src).match(/20\d{2}/);
    return match ? parseInt(match[0], 10) : 0;
}

const TIER_ORDER = [
    "entry", "budget", "budget-mid", "mid-range", "mid-high", "high-end",
    "flagship", "extreme", "ultimate",
];
function tierRank(tier) {
    if (!tier) return 2;
    const norm = tier.toLowerCase();
    const idx = TIER_ORDER.findIndex(t => norm.includes(t));
    return idx === -1 ? 2 : idx;
}

function isLikelyBottleneck(cpuItem, gpuItem) {
    if (!cpuItem || !gpuItem) return false;
    const yearGap = Math.abs(extractYear(cpuItem) - extractYear(gpuItem));
    const tierGap = Math.abs(tierRank(cpuItem.tier) - tierRank(gpuItem.tier));
    return yearGap >= 3 && tierGap >= 2;
}

function pickClosestToBudget(candidates, targetBudget) {
    if (!candidates.length) return undefined;
    const underBudget = candidates.filter(item => item.parsedPrice <= targetBudget);
    if (underBudget.length) {
        return underBudget.reduce((best, item) => item.parsedPrice > best.parsedPrice ? item : best);
    }
    return candidates.reduce((cheapest, item) => item.parsedPrice < cheapest.parsedPrice ? item : cheapest);
}

function boardSocketMatches(moboItem, requiredSocket) {
    if (!moboItem || !requiredSocket) return false;
    const socketNorm = requiredSocket.toUpperCase().replace(/\s/g, "");
    
    // Check keySpecs which contains socket in ForgePC data processing
    const specsNorm = (moboItem.keySpecs || "").toUpperCase().replace(/\s/g, "");
    if (specsNorm.includes(socketNorm)) return true;
    
    return false;
}

const ALLOWED_SOCKETS = ["LGA1700", "LGA1851", "AM4", "AM5"];

function isDesktopSocket(socket) {
    if (!socket) return false;
    const s = socket.toUpperCase().replace(/\s/g, "");
    return ALLOWED_SOCKETS.some(allowed => s.includes(allowed));
}

function isConsumerTier(item) {
    const tier = (item.tier || "").toLowerCase();
    const segment = (item.segment || "").toLowerCase();
    if (tier.includes("server") || tier.includes("cloud") || tier.includes("density") || tier.includes("workstation")) return false;
    if (segment.includes("data center") || segment.includes("server") || segment.includes("workstation")) return false;
    return true;
}

window.generateAdvancedBuild = function(useCaseId, minBudget, maxBudget) {
    if (!window.prebuiltCatalog) {
        throw new Error("Prebuilt catalog not loaded! Ensure prebuilds.js is included.");
    }
    
    // Find builds matching the usecase
    const categoryBuilds = window.prebuiltCatalog.filter(b => b.useCase === useCaseId);
    
    if (!categoryBuilds.length) {
        throw new Error(`No prebuilt setups found for use case: ${useCaseId}`);
    }
    
    // Find builds within budget range
    let matchingBuilds = categoryBuilds.filter(b => b.estimatedTotal >= minBudget && b.estimatedTotal <= maxBudget);
    
    let selectedPrebuild;
    let warnings = [];
    
    if (matchingBuilds.length > 0) {
        // Return the best one (highest price) within budget
        selectedPrebuild = matchingBuilds.reduce((best, b) => b.estimatedTotal > best.estimatedTotal ? b : best);
    } else {
        // Find closest build
        const sorted = [...categoryBuilds].sort((a, b) => Math.abs(a.estimatedTotal - maxBudget) - Math.abs(b.estimatedTotal - maxBudget));
        selectedPrebuild = sorted[0];
        
        if (selectedPrebuild.estimatedTotal > maxBudget) {
            warnings.push(`We couldn't find a build completely under your maximum budget. This is the closest recommended setup at ₹${selectedPrebuild.estimatedTotal.toLocaleString('en-IN')}.`);
        } else if (selectedPrebuild.estimatedTotal < minBudget) {
            warnings.push(`Your minimum budget is quite high! We found this excellent setup at ₹${selectedPrebuild.estimatedTotal.toLocaleString('en-IN')} which should handle your needs perfectly while saving you money.`);
        }
    }
    
    // Re-hydrate the build components using window.forgePCData
    const data = window.forgePCData;
    const finalComponents = {};
    
    for (const [key, id] of Object.entries(selectedPrebuild.componentIds)) {
        let found = null;
        for (const arrKey of ['cpus', 'gpus', 'motherboards', 'rams', 'psus', 'storages', 'cases', 'coolers']) {
            if (data[arrKey]) {
                found = data[arrKey].find(c => c.id === id || c.name === id);
                if (found) break;
            }
        }
        if (found) {
            finalComponents[key] = found;
        }
    }
    
    return {
        useCase: useCaseId,
        requestedBudgetMin: minBudget,
        requestedBudgetMax: maxBudget,
        estimatedTotal: selectedPrebuild.estimatedTotal,
        components: finalComponents,
        total: selectedPrebuild.estimatedTotal,
        warnings: warnings
    };
};
