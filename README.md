# Global Surveillance & Retrieval Protocol (GEO_CORE)

A high-precision, interactive world geography game built with React, D3.js, and Tailwind CSS. The application features a "cyber-industrial" tactical aesthetic, designed for rapid territorial identification and sector analysis.

## 🚀 Core Features

### 1. Tactical Gameplay Engine
- **Predictive Identification**: Input country names or ISO codes to "reclaim" territories.
- **Dynamic Feedback**: Visual confirmation on the world map with custom state transitions (Standard -> Identified -> Highlighted).
- **Global Metrics**: Real-time tracking of:
    - **Total Entities Identified** (Count)
    - **Wealth Capture** (Global GDP percentage)
    - **Area Coverage** (Global Landmass percentage)

### 2. Sector Analysis Mode (Continent Review)
- **Precision Zooming**: After the mission ends (or via selection), specific continental sectors can be deployed for detailed surveillance.
- **Dynamic Framing Logic**: Individual continents feature custom padding and framing to ensure perfect visibility:
    - **North America**: Enhanced focus specifically to capture the Caribbean and Central American archipelagos.
    - **Europe/Asia/Africa/Oceania**: Tailored zoom levels for optimal geometric representation.
- **Micro-Stats Analysis**: View specific GDP and Area metrics for the selected continent.

### 3. Advanced Map Logistics
- **Territorial Mapping & Geopolitical Handling**:
    - **Somaliland** maps to **Somalia**.
    - **Kosovo** maps to **Serbia**.
    - **Northern Cyprus** maps to **Cyprus**.
    - **Western Sahara** maps to **Morocco**.
- **Interactive Tooltips**: High-speed, lightweight tooltips provide instant sector naming upon hover during review.
- **Dynamic SVG Zoom/Pan**: Full zoom and pan capabilities across the global projection.

### 4. Precision Reporting
- **Identified List**: A detailed manifest of all reclaimed sectors within a continent.
- **Missing Coverage**: Clear, high-contrast list of sectors still under neutral/unidentified status.
- **Efficiency Metric**: Calculated as `(Identified Sectors / Total Regional Sectors) * 100`.

### 5. Tactical Aesthetic
- **Cyber-Industrial UI**: Minimalist neutral-900 palette with emerald-500 highlights.
- **Glassmorphism Overlays**: Tactical readouts use backdrop-blur and semi-transparent layers.
- **Atmospheric Pulsing**: Active "Surveillance" indicators to simulate live atmospheric capture.

## 🛠 Technical Stack
- **Framework**: React 18+ (Vite)
- **Visuals**: D3.js (TopoJSON, Geo-Projections)
- **Animations**: Framer Motion
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

## 📊 Deployment
The application is designed for full-precision desk surveillance but includes responsive breakpoints for mobile tactical oversight.

View your app in AI Studio: https://ai.studio/apps/592b797d-1425-41e9-9d37-3360e09e9fe1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
