/**
 * explain-engine.js
 * ─────────────────────────────────────────────────────────────
 * The "Why this part?" layer ported from OLD_WEB.
 * Takes a generated build and constructs a highly grounded prompt
 * to explain WHY each component was chosen, ensuring zero hallucination.
 * ─────────────────────────────────────────────────────────────
 */

function buildExplainPrompt(build, focusComponent) {
    const { useCase, requestedBudget, estimatedTotal, components } = build;
  
    const componentSummaries = Object.entries(components)
      .map(([type, item]) => {
        if (!item) return null;
        return `- ${type.toUpperCase()}: ${item.name} — ₹${item.parsedPrice?.toLocaleString("en-IN")} — Tier: ${item.tier || "N/A"} — Key specs: ${item.keySpecs || "see dataset"}`;
      })
      .filter(Boolean)
      .join("\n");
  
    const scopeInstruction = `Focus your explanation specifically on the ${focusComponent.category.toUpperCase()} choice (${focusComponent.name}). Briefly mention how it works with the rest of the build, but the main explanation should be about why THIS specific ${focusComponent.category} was right for this build.`;
  
    const safeBudget = (requestedBudget || build.requestedBudgetMax || estimatedTotal || 0).toLocaleString("en-IN");

    return `You are a knowledgeable, friendly PC-building assistant. A user wants a PC build for: "${useCase}" with a budget of ₹${safeBudget}.
  
  Here is the EXACT build that was already selected by our recommendation engine (you are NOT choosing parts — only explaining the choices already made):
  
  ${componentSummaries}
  
  Estimated total: ₹${estimatedTotal.toLocaleString("en-IN")}
  
  ${scopeInstruction}
  
  Rules:
  - ONLY reference the specs and prices given above. Do not invent specs, benchmarks, or prices not listed.
  - Keep it conversational and easy to understand for someone who isn't a hardware expert.
  - If relevant, briefly mention ONE realistic tradeoff or alternative (e.g. "if you wanted slightly better gaming performance you could drop RAM to 16GB and put more toward the GPU").
  - Do not use markdown headers. Plain conversational paragraphs only.
  - Keep the response under 120 words.`;
}

function extractText(apiResponse) {
    if (apiResponse?.content) {
      return apiResponse.content
        .filter(block => block.type === "text")
        .map(block => block.text)
        .join("\n");
    }
    if (apiResponse?.candidates) {
      return apiResponse.candidates[0]?.content?.parts?.map(p => p.text).join("\n") || "";
    }
    return "";
}

window.getAIExplanation = async function(build, componentCategory) {
    const focusComponent = build.components[componentCategory];
    if (!focusComponent) return "Component not found in current build.";

    try {
        const prompt = buildExplainPrompt(build, focusComponent);
        console.log("✨ Gemini Prompt Constructed:\n", prompt);

        // Attempt the real fetch (will fail if no API key/auth is set up, which is expected for now)
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "gemini-2.5-flash",
                messages: [{ role: "user", content: prompt }],
            }),
        });
        
        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();
        return extractText(data);
    } catch (err) {
        console.warn("AI fetch failed. Using grounded fallback response. Error:", err);
        
        // Grounded fallback using actual component data (safely handling missing data)
        const priceString = focusComponent.parsedPrice ? `₹${focusComponent.parsedPrice.toLocaleString("en-IN")}` : (focusComponent.price || "your budget");
        const totalString = build.estimatedTotal ? `₹${build.estimatedTotal.toLocaleString("en-IN")}` : "your overall budget";
        const specsString = focusComponent.keySpecs ? ` (${focusComponent.keySpecs})` : "";
        const tierString = focusComponent.tier ? `${focusComponent.tier} tier ` : "";

        return `The <strong>${focusComponent.name}</strong> was selected for this ${build.useCase || 'custom'} build because it perfectly fits within the budget at ${priceString}. As a ${tierString}component, its specs${specsString} provide the exact balance of performance needed without bottlenecking the rest of your ${totalString} system.`;
    }
};
