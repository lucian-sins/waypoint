---
name: WayPoint Control System
description: Precision, fluid Apple/Material hybrid design system for local OpenWrt policy routing
colors:
  bg-surface-light: "#f8f9fa"
  bg-surface-dark: "#191b22"
  card-bg-light: "#ffffff"
  card-bg-dark: "#232733"
  card-border-light: "rgba(0, 0, 0, 0.06)"
  card-border-dark: "rgba(255, 255, 255, 0.08)"
  brand-primary-light: "#2563eb"
  brand-primary-dark: "#3b82f6"
  status-emerald: "#10b981"
  status-amber: "#f59e0b"
  status-rose: "#ef4444"
typography:
  family-sans: "-apple-system, BlinkMacSystemFont, 'Google Sans', 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
  family-mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  pill-active:
    backgroundColor: "{colors.brand-primary-light}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 14px"
  card-container:
    backgroundColor: "{colors.card-bg-light}"
    rounded: "{rounded.xl}"
    padding: "16px 20px"
---

## Overview
WayPoint's visual design combines the restraint and fluid haptics of modern Apple iOS interfaces with the structured clarity of Material Design 3. The interface functions strictly in **Operate** mode: prioritizing fast cognitive processing, predictable layout density, and instant touch feedback for router controls.

## Colors
- **Light Surface**: `#f8f9fa` base background with crisp `#ffffff` cards and subtle `rgba(0, 0, 0, 0.06)` borders. Pitch black (`bg-neutral-900`) elements are strictly forbidden on light surfaces.
- **Dark Surface**: `#191b22` base with `#232733` elevated surfaces and `rgba(255, 255, 255, 0.08)` borders.
- **Semantic Accents**:
  - **Blue (`#2563eb` / `#3b82f6`)**: Primary routing selection, active location tags, focus rings.
  - **Emerald (`#10b981`)**: Live online gateway, healthy ping latencies (RTT ≤ 45ms), fresh WireGuard handshakes.
  - **Amber (`#f59e0b`)**: Moderate latency (46–110ms), unnamed devices needing labels, setup alerts.
  - **Rose (`#ef4444`)**: High latency (>110ms), routing errors, offline gateways.

## Typography
- **Primary Typeface**: Native platform sans (`-apple-system`, `BlinkMacSystemFont`, `Google Sans`, `SF Pro Text`, `Segoe UI`, `Roboto`). No unnecessary webfont payload; renders instantly with zero layout shift.
- **Monospace Stack**: `JetBrains Mono` and system mono for IP addresses, MAC addresses, CIDRs, byte counters, and diagnostic terminal outputs.
- **Tabular Numerals**: Numerical telemetry and metrics enforce `tabular-nums` (`font-variant-numeric: tabular-nums`) to avoid optical twitching during live polling.

## Layout
- Maximum content width of `56rem` (`max-w-4xl`), centered with fluid horizontal margins.
- Clean vertical rhythm: `space-y-4` inside cards, `space-y-8` between major sections.
- Mobile-first responsive grid: single-column list for devices, 2-column grid for tunnel overviews on tablet and desktop (`grid-cols-1 md:grid-cols-2`).

## Elevation & Depth
- Elevation is defined by crisp, 1px hairline borders (`border-black/[0.06]` in light, `border-white/[0.08]` in dark) combined with subtle, soft ambient shadows (`shadow-sm`, `shadow-md` on hover).
- Zero-offset, harsh drop-shadows are banned.

## Shapes
- Outer cards and dialogs feature generous continuous curvature (`rounded-3xl`, 24px).
- Internal buttons, input fields, and pill selectors use comfortable tactile curves (`rounded-xl` and `rounded-2xl`).
- Telemetry badges, status indicators, and quick filter chips use full capsules (`rounded-full`).

## Components
- **Segmented Tunnel Selector**: Horizontal touch-scrollable pill row per device. Active selection elevates as an accent pill with a checkmark and live loading spinner during router reconfiguration.
- **Hardware Vendor Badge**: Displays detected manufacturer (`Amazon Technologies Inc.`, `Tuya Smart`, `Canon`, etc.) alongside IP and MAC with an icon badge.
- **FlagIcon**: Dynamic SVG flags using CircleFlags with unicode emoji fallback.
- **Diagnostic Sheet**: Accordion card providing live uptime, WAN IP, strict PBR policies, and verbatim error outputs.

## Do's and Don'ts
- **DO** use `tabular-nums` for all dynamic numerical telemetry.
- **DO** maintain strict parity between light and dark themes.
- **DO** provide immediate optimistic feedback with automatic rollback on network mutation errors.
- **DON'T** introduce pitch black (`bg-neutral-900`) elements into light mode.
- **DON'T** use multi-level nested cards or decorative gradient text.
- **DON'T** add gratuitous multi-element pinging animations on the same screen area.
