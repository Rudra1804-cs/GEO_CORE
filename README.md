# GEO_CORE: Global Surveillance & Identification Protocol (V4.5)

**Live Mission Link:** [https://ais-pre-hvbywr5xj3y6fnehkuokdd-760174548296.europe-west2.run.app](https://ais-pre-hvbywr5xj3y6fnehkuokdd-760174548296.europe-west2.run.app)

GEO_CORE is a high-precision, interactive world geography simulation designed for operatives to test their territorial identification speed and accuracy. Built with a tactical "cyber-industrial" aesthetic, it utilizes advanced geospatial data and real-time cloud synchronization to track global dominance.

---
## 📸 Mission Gallery

*   **[Main Menu/Landing]** -
*   <img width="1710" height="873" alt="Screenshot 2026-05-16 at 11 41 08" src="https://github.com/user-attachments/assets/a9712c9d-572a-46f9-a49d-b28a6a7d331f" />

*   **[Global Identification Map]** -
*   <img width="1708" height="872" alt="Screenshot 2026-05-16 at 11 42 27" src="https://github.com/user-attachments/assets/d23f04aa-71ff-4e21-8df0-21700c5c1355" />

*   **[Tactical Flag Feedback]** - *Insert screenshot showing the 2-second flag reveal on guess here
*   <img width="1710" height="878" alt="Screenshot 2026-05-16 at 11 42 44" src="https://github.com/user-attachments/assets/895f62a4-8c84-4f35-b0a1-3184061974f3" />

*   **[Leaderboard/Intel Archive]** - *Insert screenshot of the competitive mission logs here
*   <img width="1710" height="876" alt="Screenshot 2026-05-16 at 11 43 00" src="https://github.com/user-attachments/assets/56718e9f-7f71-417e-9c69-01e58620973c" />

*   **[Debriefing/Expansion Survey]** - *Insert screenshot of the final results and continent drill-down here*
*  <img width="1710" height="916" alt="image" src="https://github.com/user-attachments/assets/3869ce86-9635-4f66-aed9-821ee5aaa108" />
---
## 🚀 The Protocol: Game Logic & Mechanics

### 1. The "Tetra-Pillar" Scoring Algorithm
Every territory identified contributes to a complex multidimensional score. Your performance is measured across four tactical vectors:

*   **📏 Territorial Magnitude (25%)**: Percentage of total global landmass (~148.9M km²) secured. Identifying large landmasses like Russia or Canada provides massive baseline points.
*   **💰 Economic Dominance (25%)**: Percentage of global GDP (~$110 Trillion) secured. Tactical priority on economic powerhouses (USA, China, Japan) boosts this metric significantly.
*   **🎯 Strategic Volume (25%)**: Raw count of successfully identified sovereign sectors. Essential for maintaining momentum and climbing the ranks.
*   **⚡ Operational Efficiency (25%)**: 
    - **Speed Multiplier**: Points decay over time in Challenge Mode.
    - **Difficulty Scaling**: Small, "Hard-to-Focus" territories (Micro-states like Vatican City or Monaco) receive an inverse-area bonus multiplier.

### 2. Operational Modes
- **Zen Mode (Infinite)**: No time constraints. Focused on 100% precision and global clearance. Point multiplier: **1.0x**.
- **Challenge Mode (Timed)**: Choice of 5, 10, or 20-minute mission windows. Dynamic scaling multipliers from **1.2x to 2.0x** based on the intensity of the time limit.

---

## 📡 Tactical Features

### 1. Visual Intelligence Suite
- **D3.js Geospatial Engine**: High-performance TopoJSON rendering with custom "Orthographic" and "Equirectangular" projection transitions.
- **Satellite Overlay**: Real-time toggleable satellite imagery for terrain verification and landmark spotting.
- **The "Command Center" Input**: Predictive data entry supporting official names, ISO-3166 alpha-3 codes, and tactical aliases.
- **Authentication Feedback**: High-resolution 160px flag verification pulse (2-second duration) upon successful identification.

### 2. Intelligence Archive (Mission Logs)
- **Hybrid Storage Protocol**: Your missions are secured using both `Cloud Firestore` (for logged-in operatives) and `LocalStorage` (for anonymous field agents).
- **Mission Designation**: Full control over your records. Hover over any mission name in the Tactical Logs to **Rename** the protocol (e.g., "Pacific Expansion Plan").
- **Intel Search**: Within any archived mission, use the identification terminal to search for specific territories to verify their "Secured" or "Missing" status from that session.

### 3. Expansion Survey (Debriefing)
After every mission, a deep-dive analysis is provided:
- **Continental Drill-Down**: Interactive continental sectors with specific metrics for Landmass and GDP coverage per region.
- **Sector Track & Trace**: A specialized search bar within the survey to instantly locate and highlight any territory on the survey map.
- **Advanced Sorting Protocols**:
    - **Alpha-Sort**: Standard A-Z manifest.
    - **Wealth-Sort**: Prioritize territories by their economic output (GDP).

---

## ⌨️ Command Shortcuts (Strategic Control)

| Key | Action |
| :--- | :--- |
| `[ENTER] / [SPACE]` | **Focus Identification Terminal** |
| `[CMD / CTRL] + [X]` | **Toggle Satellite Intelligence Overlay** |
| `[ALT / OPTION]` | **Strategic Pause / Resume (Challenge Mode)** |
| `[ARROW KEYS]` | **Fluid Map Panning** |
| `[+] / [-]` | **Micro/Macro Zooming** |
| `[ESCAPE]` | **Clear Input / Close Modals** |

---

## 🛠 Strategic Tech Stack

- **Framework**: React 18+ (Vite)
- **Language**: TypeScript (Strict Typing)
- **Geospatial**: D3.js & TopoJSON
- **Intelligence Persistence**: Firebase Firestore (NoSQL)
- **Credential Management**: Firebase Google Auth
- **Motion Engine**: Motion for React (Tactical UI transitions)
- **Styling**: Tailwind CSS (Cyan/Emerald Tactical Theme)

---
