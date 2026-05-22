export interface NewsItem {
  id: string;
  countryCode: string; // ISO-2 lowercase
  category: 'economic' | 'political' | 'tech' | 'finance';
  title: string;
  subtitle: string;
  content: string;
  date: string;
  source: string;
  link: string;
}

export const NEWS_HOTSPOTS: NewsItem[] = [
  {
    id: "news-1",
    countryCode: "us",
    category: "tech",
    title: "Silicon Valley AI Unicorn IPO Valuation Climbs to $65B",
    subtitle: "San Francisco GenAI Hub Shatters Funding Records",
    content: "A major Silicon Valley foundational AI model startup has officially filed for its public listing. Early prospectus disclosures reveal net margins scaling at unprecedented rates, supercharged by sovereign cloud agreements and enterprise deployment contracts across the G7. Analysts project this IPO will trigger a fresh wave of public high-compute infrastructure investments.",
    date: "May 22, 2026",
    source: "Google News Real-time",
    link: "https://news.google.com/search?q=United+States+Silicon+Valley+AI+Unicorn+IPO"
  },
  {
    id: "news-2",
    countryCode: "sg",
    category: "economic",
    title: "Singapore Maritime Exports Hit Historical High Amid Supply Chain Re-Routing",
    subtitle: "Changi Strait Logistics Hub Absorbs Global Pivot",
    content: "Unprecedented global shipping lane re-routing has funneled massive container volumes through the Strait of Malacca. The Singapore Port Authority reported a record-setting surge in terminal cargo metrics, driving maritime logistics profits. Industry heads confirm expanded warehousing and bunkering contracts are locking in high yields for the remainder of 2026.",
    date: "May 22, 2026",
    source: "Google News Real-time",
    link: "https://news.google.com/search?q=Singapore+maritime+exports+shipping+hub+volumes"
  },
  {
    id: "news-3",
    countryCode: "gb",
    category: "finance",
    title: "London FinTech Corridor Establishes New Treasury Yield Sandbox",
    subtitle: "DeFi and Traditional Banking Convergence Speeds Up",
    content: "UK financial regulators have officially greenlit an advanced regulatory environment for high-security tokenized sovereign treasury protocols. Combining traditional sterling clearing channels with cryptographically anchored security deposits, London aims to cement its status as a major high-liquidity digital banking hub for institutional investors.",
    date: "May 21, 2026",
    source: "Google News Real-time",
    link: "https://news.google.com/search?q=London+FinTech+treasury+yield+protocols+sandbox"
  },
  {
    id: "news-4",
    countryCode: "jp",
    category: "tech",
    title: "Tokyo Injects $12B into Sub-2nm Lithography Semiconductor Infrastructure",
    subtitle: "Hardware Sovereignty Push Restructures East Asian Supplies",
    content: "In a collaborative effort with multinational lithography suppliers, Japan's Ministry of Economy has initiated the development of a state-of-the-art semiconductor fab. Focused on sub-2nm nodes, the facility aims to satisfy critical high-compute needs, fully shielding regional electronics and AI hardware manufacturers from external logistical shocks.",
    date: "May 21, 2026",
    source: "Google News Real-time",
    link: "https://news.google.com/search?q=Japan+semiconductor+fab+sub-2nm+lithography"
  },
  {
    id: "news-5",
    countryCode: "ua",
    category: "political",
    title: "Kyiv Signs Border Telemetry & Autonomous Grid Security Pact",
    subtitle: "Integrated AI Drone Network Shield Set for Deployment",
    content: "Government delegates in Kyiv have ratified an alliance to deploy real-time border telemetry. Combining high-frequency autonomous sensors, secure decentralized communication nodes, and drone monitoring arrays, the border shield is hailed as a template for digital-first national territorial insurance and regional stability.",
    date: "May 22, 2026",
    source: "Google News Real-time",
    link: "https://news.google.com/search?q=Kyiv+border+telemetry+autonomous+drone+shield"
  },
  {
    id: "news-6",
    countryCode: "de",
    category: "economic",
    title: "Berlin Breaks Ground on Europe’s Largest Green Hydrogen Pipeline",
    subtitle: "Heavy Industry Decarbonization Hub Commences Construction",
    content: "Construction has officially commenced on Berlin's high-capacity liquid hydrogen transport network. Slated to link direct offshore wind farms with central industrial zones by late 2027, the pipeline represents the continent's most ambitious clean energy pivot, drastically reducing production overheads for steel and manufacturing sectors.",
    date: "May 20, 2026",
    source: "Google News Real-time",
    link: "https://news.google.com/search?q=Berlin+green+hydrogen+pipeline+pipeline+construction"
  },
  {
    id: "news-7",
    countryCode: "sa",
    category: "finance",
    title: "Riyadh Injects $45B Desert Solar Array Portfolio to Diversify Sovereign Fund",
    subtitle: "Sovereign Wealth Transitions Decisively Toward Renewable Export",
    content: "The Saudi Arabian Public Investment Fund has approved a massive scale-up of solar installations across the southern desert regions. This clean-grid initiative aims to convert solar-derived electricity into liquid energy commodities, establishing long-term green power export dominance as petroleum demand continues its structured descent.",
    date: "May 19, 2026",
    source: "Google News Real-time",
    link: "https://news.google.com/search?q=Riyadh+PIF+solar+array+sovereign+wealth"
  },
  {
    id: "news-8",
    countryCode: "in",
    category: "tech",
    title: "Bengaluru Silicon Park Activates Smart Grid Datacenters",
    subtitle: "High-Density Silicon Hub Ready for Dynamic Cloud Workloads",
    content: "Bengaluru's tech corridor has commissioned its first completely wind-powered modular server facility. Designed to run ultra-high-density neural network training models, the hub supports server racks at unprecedented power usage effectiveness (PUE) ratios, attracting developers seeking carbon-neutral computing resources.",
    date: "May 22, 2026",
    source: "Google News Real-time",
    link: "https://news.google.com/search?q=Bengaluru+Silicon+Park+AI+datacenters+wind+power"
  },
  {
    id: "news-9",
    countryCode: "br",
    category: "political",
    title: "Amazon Biosphere Restoration Bonds Secure Record Capital",
    subtitle: "Global Financial Markets Back Carbon Credit Anchor Projects",
    content: "Brazil's Treasury has successfully listed a landmark ESG bond on international exchanges, raising capital dedicated strictly to sovereign reforestation. Backed by rigorous satellite telemetry monitoring, the bonds will pay variable yields based on verified carbon capture levels, attracting major sovereign wealth funds.",
    date: "May 21, 2026",
    source: "Google News Real-time",
    link: "https://news.google.com/search?q=Brazil+sovereign+green+bond+Amazon+reforestation"
  },
  {
    id: "news-10",
    countryCode: "au",
    category: "economic",
    title: "Australia Mines Strike Direct Refining Partnerships with EV Automakers",
    subtitle: "Bypassing Middlemen to Mitigate Battery Mineral Supply Bottlenecks",
    content: "Western Australian lithium operators have finalized bilateral off-take agreements with global consumer automotive brands. By directly shipping raw ore to domestic electrochemical refineries and bypassing volatile spot-price trading, the contracts ensure decade-long price predictability for global battery supply chains.",
    date: "May 18, 2026",
    source: "Google News Real-time",
    link: "https://news.google.com/search?q=Australia+lithium+mines+EV+automakers+refining"
  }
];
