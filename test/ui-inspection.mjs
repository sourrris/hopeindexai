import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const SCREENSHOT_DIR = "/tmp/hopeindex_screenshots";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const findings = [];

  try {
    // 1. Load the main page
    console.log("=== 1. LOADING MAIN PAGE ===");
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    const title = await page.title();
    console.log("Page title:", title);

    // 2. Check what the top events show
    console.log("\n=== 2. CHECKING TOP EVENTS ON MAP ===");
    const eventElements = await page.$$(".leaflet-marker-icon");
    console.log("Visible markers on map:", eventElements.length);

    // 3. Check the event list/sidebar
    const eventListItems = await page.$$('[class*="event"]');
    console.log("Event-related elements:", eventListItems.length);

    // Check filter panel
    const filterPanel = await page.$('[class*="filter"]');
    const filterExists = !!filterPanel;
    console.log("Filter panel visible:", filterExists);

    // Get AI status
    console.log("\n=== 3. API DIRECT CHECKS ===");
    const aiResponse = await fetch(`${BASE}/api/ai-status`);
    const aiStatus = await aiResponse.json();
    console.log("AI status:", aiStatus);

    // Get events
    const evResponse = await fetch(`${BASE}/api/events?days=7`);
    const evData = await evResponse.json();
    const evCount = evData.events?.length || 0;
    console.log(`Events loaded (7 days): ${evCount}`);

    // Check for events with/without surfaceScore
    const hasScore = evData.events?.filter(e => e.surfaceScore !== null && e.surfaceScore !== undefined).length || 0;
    const noScore = evCount - hasScore;
    console.log(`With surfaceScore: ${hasScore}, Without: ${noScore}`);

    // Sample some surfaceScore values
    const sampleScores = (evData.events || []).slice(0, 5).map(e => ({
      id: e.id,
      score: e.surfaceScore,
      band: e.surfaceBand,
      modelProb: e.surfaceModelProbability,
      actor1: e.actor1,
      actor2: e.actor2,
      theme: e.theme,
      category: e.category,
    }));
    console.log("Sample top events:", JSON.stringify(sampleScores, null, 2));

    // 4. Try getting a probe for a top event
    console.log("\n=== 4. PROBE INSPECTION ===");
    const topEventId = evData.events?.[0]?.id;
    if (topEventId) {
      const probeResp = await fetch(`${BASE}/api/probe?id=${topEventId}`);
      const probeData = await probeResp.json();
      
      const p = probeData.probe;
      console.log("Probed event ID:", p?.selectedEvent?.id);
      console.log("surfaceScore:", p?.selectedEvent?.surfaceScore);
      console.log("surfaceModelProbability:", p?.selectedEvent?.surfaceModelProbability);
      console.log("surfaceBand:", p?.selectedEvent?.surfaceBand);
      
      const pred = p?.prediction;
      if (pred) {
        console.log("\nModel prediction:");
        console.log("  Probability:", pred.probability, "%");
        console.log("  Label:", pred.label);
        console.log("  Threshold:", pred.threshold);
        console.log("  Target:", pred.target);
        console.log("  Model version:", pred.modelVersion);
        console.log("  AUC:", pred.metrics?.auc);
        console.log("\n  Top feature drivers:");
        (pred.drivers || []).slice(0, 5).forEach(d => {
          console.log(`    ${d.feature}: ${d.contribution} (${d.direction})`);
        });
      }

      // Check source/review info
      console.log("\nEvidence grade:", p?.evidenceGrade);
      console.log("Uncertainty warnings:", p?.uncertaintyWarnings?.length ?? 0);
      console.log("Related signals:", p?.relatedSignals?.length ?? 0);
      console.log("Hypotheses:", p?.hypotheses?.length ?? 0);
    }

    // 5. Check surfacing-policy.json
    console.log("\n=== 5. SURFACING POLICY ===");
    const policyResp = await fetch(`${BASE}/data/surfacing-policy.json`);
    const policy = await policyResp.json();
    console.log("Policy version:", policy.version);
    console.log("Label source:", policy.labelSource);
    console.log("Threshold:", policy.threshold);
    console.log("Human labels:", policy.metrics?.labels?.humanReviewedRows);
    console.log("LLM labels:", policy.metrics?.labels?.sourceCounts?.llm_article_review);
    console.log("Surface F1 (on 120 labels):", policy.metrics?.surfacePolicy?.f1);
    console.log("Warning:", policy.warning);

    // 6. Check escalation model
    console.log("\n=== 6. ESCALATION MODEL ===");
    const modelResp = await fetch(`${BASE}/data/escalation-model.json`);
    const model = await modelResp.json();
    console.log("Model version:", model.version);
    console.log("Train samples:", model.metrics?.train?.samples);
    console.log("Test samples:", model.metrics?.test?.samples);
    console.log("Test AUC:", model.metrics?.test?.auc);
    console.log("Test F1:", model.metrics?.test?.f1);
    console.log("Test accuracy:", model.metrics?.test?.accuracy);
    console.log("Test confusion:", model.metrics?.test?.confusion);
    console.log("Label source:", model.target?.labelSource);

    // 7. Screenshot of main page
    await page.screenshot({ path: `${SCREENSHOT_DIR}/main_page.png` });
    console.log("\n=== 7. SCREENSHOT SAVED ===");
    console.log(`${SCREENSHOT_DIR}/main_page.png`);

    // 8. Click on a marker if possible
    console.log("\n=== 8. CLICKING MAP MARKERS ===");
    const markers = await page.$$(".leaflet-marker-icon.leaflet-zoom-animated.leaflet-interactive");
    console.log("Interactive markers:", markers.length);
    if (markers.length > 0) {
      await markers[0].click();
      await page.waitForTimeout(1500);
      // Check if EventDetail opened
      const detailPanel = await page.$('[class*="event"]');
      console.log("Event detail visible after click:", !!detailPanel);
    }

    // 9. Check for data rendered by the frontend
    console.log("\n=== 9. FRONTEND RENDER CHECK ===");
    const mapContainer = await page.$("#map");
    console.log("Map container found:", !!mapContainer);

    // Check what the frontend sees for a specific event
    const frontendState = await page.evaluate(() => {
      const el = document.querySelector(".leaflet-marker-icon");
      if (el) {
        const style = window.getComputedStyle(el);
        return {
          markerFound: true,
          transform: style.transform,
          width: style.width,
          height: style.height,
        };
      }
      return { markerFound: false };
    });
    console.log("Frontend marker state:", frontendState);

    // 10. Check events that lack surfaceScore and how they'd render
    console.log("\n=== 10. NO-SURFACE-SCORE EVENTS ===");
    if (noScore > 0) {
      const noScoreSample = (evData.events || []).filter(e => !e.surfaceScore).slice(0, 3);
      noScoreSample.forEach(e => {
        console.log(`  id=${e.id} actor1=${e.actor1} markerRadius=${e.markerRadius} fallbackScore=${e.markerRadius * 10}`);
      });
    }

  } catch (err) {
    console.error("Error during inspection:", err.message);
  } finally {
    await browser.close();
  }

  return findings;
}

main().then(() => {
  console.log("\n=== INSPECTION COMPLETE ===");
}).catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
