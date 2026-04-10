# Changelog

All notable changes to Hi-Control will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [1.1.0] - 2026-04-10

### 🎨 Frontend Redesign — HI Branding & Navigation Consolidation

> **9 files changed** | **483 insertions** | **530 deletions** | **0 TypeScript errors**

#### Added
- **"Novo Cliente"** registration button + modal in both `HI emissão` and `HI buscador` dashboards
- **"Emissão rápida"** panel with 4 shortcut buttons (NF-e, NFC-e, CT-e, NFS-e) with dedicated icons in the Emission Dashboard
- **Sidebar re-expand button** — floating `PanelLeftOpen` icon on desktop when sidebar is collapsed
- **HI agenda** added to extra modules sidebar section

#### Changed
- **Sidebar menu items renamed** to HI branding convention:
  - `Dashboard de Emissão` → `HI emissão`
  - `Dashboard de Busca` → `HI buscador`
  - `Tarefas` → `HI tarefas`
  - `WhatsApp` → `HI comunicação`
  - `Agenda Médica` → `HI agenda`
- **Sidebar toggle** moved from TopBar hamburger menu into sidebar header (`PanelLeftClose` icon)
- **CTe.tsx, NFSe.tsx, PDV.tsx** migrated from legacy Tailwind (`bg-gray-*`, `dark:bg-slate-*`) to `hc-*` design tokens for consistent theming
- **TopBar** interface simplified — removed `toggleSidebar` prop

#### Removed
- **Standalone navigation tabs**: `Clientes`, `Consultar Notas`, `Emissão de NF` (accordion with 4 sub-items)
- **KPI cards** from Emission Dashboard (Prontas para emitir, Cert. expirando, Sem certificado)
- **Charts & Resumo Geral** panel from Search Dashboard main view (charts remain inside individual client dashboards)
- **"Consultar Notas"** shortcut button from Search Dashboard
- **"Emitir NF-e"** standalone action button from Emission Dashboard
- **Hamburger menu button** from TopBar

#### Files Modified
| File | Changes |
|------|---------|
| `components/Sidebar.tsx` | Navigation cleanup, HI branding, toggle relocation |
| `components/TopBar.tsx` | Removed toggle button and prop |
| `shells/AdminShell.tsx` | Removed toggleSidebar from TopBar |
| `shells/ClientShell.tsx` | Removed toggleSidebar from TopBar |
| `components/EmissionDashboard.tsx` | Removed KPIs, added quick-emit + Novo Cliente |
| `components/SearchDashboard.tsx` | Removed charts, added Novo Cliente |
| `components/CTe.tsx` | hc-* token migration |
| `components/NFSe.tsx` | hc-* token migration |
| `components/PDV.tsx` | hc-* token migration |

#### ⚠️ Non-Breaking
- **Zero business logic changes** — all API calls, form submissions, validations, and auth flows remain untouched
- **ViewState enum** fully preserved — no routing changes
- **Per-client dashboards** (ClientDashboard, ClientEmissionDashboard, ClientSearchDashboard) remain unchanged with their charts and KPIs intact

---

## [1.0.0] - Initial Release

- Hi-Control accounting management platform
- NF-e, NFC-e, CT-e, NFS-e emission modules
- Search dashboard with invoice lookup
- Client management
- AI assistant (Hi Intelligence)
- Dark/light theme support
