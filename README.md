<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>
# Global Hegemony: Territorial Retrieval Protocol

A high-fidelity regional identification system designed to test and evaluate global geographic dominance. This application serves as a tactical interface for identifying and reclaiming the world's sovereign territories based on landmass and economic output.

## 🌏 Mission Overview

The objective is to identify all recognized global territories through the primary command interface. As you input designations, the tactical world map updates in real-time, visualizing your progress toward total global coverage.

## 🚀 Core Features

### 1. Tactical Command Interface
- **Dynamic Input Analysis**: Real-time name verification with support for common aliases and international designations (e.g., "USA", "UK", "UAE").
- **Visual Feedback System**: Immediate map updates using a high-precision SVG engine. Correctly identified sectors transition to "Captured" (Green) status.
- **GDP & Area Tracking**: Live telemetry showing the percentage of total global landmass and combined world GDP secured under your protocol.

### 2. High-Precision Mapping Engine
- **Interactive SVG Map**: Powered by D3.js and TopoJSON for smooth, responsive interactions.
- **Deep Zoom Protocol**: Advanced zoom and pan capabilities to locate even the smallest island nations and city-states.
- **Special Territorial Mappings**: Integrated regional logic for complex geopolitical zones (e.g., Kosovo/Serbia, Somaliland/Somalia) as requested by operational requirements.

### 3. Mission Analytics & Verdict
Upon completion or manual extraction, the system generates a **Final Verdict** report:
- **Sector Analysis**: A breakdown of the 6 major continental sectors (Africa, Asia, Europe, North America, South America, and Oceania).
- **Efficiency Metrics**: Calculates retrieval success based on the number of marks found versus total available sectors.
- **Detailed Surveillance Maps**: Selective framing for each continent with specialized padding logic to ensure perfect optical centering.

### 4. Post-Mission Surveillance
- **Retrieval Failures**: Exhaustive lists of missed territories categorized by sector for future operational improvements.
- **High-Precision Overlays**: Individual continent reviews featuring a dedicated map view, "Captured" vs "Missing" list toggles, and specific regional telemetry (Captured Area in km², Recovered Wealth in $T).
- **Precision Hover Tooltips**: Re-identification tooltips that appear during review when hovering over specific landmasses.

## 🛠 Technical Specification

- **Frontend**: React 18+ with TypeScript
- **Visualization**: D3.js (Data-Driven Documents)
- **Animation**: Framer Motion for smooth UI transitions and mission report deployments
- **Styling**: Tailwind CSS with a "Dark Modern/Tactical" aesthetic
- **Data Layers**: Custom country database with Area and GDP metrics, synced with TopoJSON world atlas data.

---

*Operational Note: This system is optimized for desktop surveillance. For full tactical awareness, ensure you are in a high-bandwidth environment.*
# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/592b797d-1425-41e9-9d37-3360e09e9fe1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
