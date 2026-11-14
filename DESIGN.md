---
name: Smart Sprinkler
description: A nursery care-tag system for weather-aware watering. The verdict is a coloured tag you read in one glance.
colors:
  stake-green: "oklch(0.3 0.055 158)"
  sage-ground: "oklch(0.925 0.022 140)"
  tag-stock: "oklch(0.994 0.004 120)"
  tag-stock-shade: "oklch(0.953 0.014 140)"
  field-ink: "oklch(0.22 0.035 155)"
  muted-ink: "oklch(0.44 0.03 155)"
  hairline: "oklch(0.86 0.018 145)"
  focus-blue: "oklch(0.5 0.17 255)"
  water-blue: "oklch(0.5 0.15 252)"
  water-tint: "oklch(0.95 0.03 250)"
  reduce-yellow: "oklch(0.86 0.165 92)"
  reduce-text: "oklch(0.45 0.1 75)"
  delay-violet: "oklch(0.48 0.17 300)"
  skip-green: "oklch(0.47 0.115 148)"
  off-grey: "oklch(0.45 0.015 155)"
typography:
  display:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "6rem"
    fontWeight: 700
    lineHeight: 0.85
    letterSpacing: "-0.005em"
  headline:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.07em"
  body:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.12em"
rounded:
  stub: "2px"
  control: "4px"
  panel: "6px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "36px"
  gutter: "clamp(16px, 4vw, 32px)"
components:
  panel:
    backgroundColor: "{colors.tag-stock}"
    textColor: "{colors.field-ink}"
    rounded: "{rounded.panel}"
    padding: "18px 22px 22px"
  button-primary:
    backgroundColor: "{colors.stake-green}"
    textColor: "{colors.tag-stock}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.tag-stock}"
    textColor: "{colors.field-ink}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "44px"
  button-stop:
    backgroundColor: "{colors.field-ink}"
    textColor: "{colors.tag-stock}"
    rounded: "{rounded.control}"
    height: "44px"
  topbar:
    backgroundColor: "{colors.stake-green}"
    textColor: "{colors.tag-stock}"
  day-stub-action:
    backgroundColor: "{colors.water-blue}"
    textColor: "{colors.tag-stock}"
    typography: "{typography.label}"
  zone-running:
    backgroundColor: "{colors.water-tint}"
    rounded: "{rounded.control}"
    padding: "14px 16px 16px"
---

# Design System: Smart Sprinkler

## Overview

**Creative North Star: "The Nursery Care Tag"**

The interface is the plastic care tag stuck in a plant pot. Today's verdict is a full-bleed tag in its category colour, with a punched hole and clipped corners, and the amount of water is read from a three-drop pictogram rather than decoration. Everything else is tag stock: white panels with a 2px ink rule under each heading, laid on a pale sage ground beneath a stake-green header band. The dark theme is a greenhouse at dusk, the same system with the ground dropped to near-black green and the category hues lifted to light tints.

Density is moderate and information-first. Numbers and labels are set in Barlow Condensed so figures read like stamped specs; reading text is Barlow. Every figure carries its unit. Depth is almost absent: a hairline and a faint ambient shadow, never a lifted card.

**Key Characteristics:**
- Flat category fills carry meaning: one hue per verdict (WATER, REDUCE, DELAY, SKIP, OFF).
- Water level is a 0 to 3 drop pictogram, filled by how much water the plan gives.
- Ink rules (2px) under headings and as ruler ticks; 1.5px hairline rows for spec tables.
- Condensed uppercase for labels and numerals, tight tracking on big words, open tracking on small ones.
- Authored moment: the verdict rises in and drops fill one by one; otherwise motion is state feedback only.

## Colors

A stake-green shell and sage ground with white tag stock, one ink, and five flat category colours that each keep one job.

### Primary
- **Stake Green** (oklch(0.3 0.055 158)): the header band, primary buttons, scrollbar, selection and caret. Dark theme: header darkens to oklch(0.25 0.045 155) and primary buttons become light green oklch(0.8 0.12 150).

### Secondary (verdict categories)
- **Water Blue** (oklch(0.5 0.15 252)): WATER verdict fill, rain bars, running zone state, forecast rain percentages. Tint oklch(0.95 0.03 250) fills a running zone.
- **Nursery Yellow** (oklch(0.86 0.165 92)): REDUCE verdict fill, with ink text on it. As text on tag stock it darkens to oklch(0.45 0.1 75), also used for the error status line.
- **Delay Violet** (oklch(0.48 0.17 300)): DELAY verdict fill.
- **Deep Green** (oklch(0.47 0.115 148)): SKIP verdict fill and the water-saved figure and bar.
- **Off Grey** (oklch(0.45 0.015 155)): OFF verdict fill.

### Neutral
- **Sage Ground** (oklch(0.925 0.022 140)): page background; also the colour of the punched hole.
- **Tag Stock** (oklch(0.994 0.004 120)): panels, controls, day stubs.
- **Tag Stock Shade** (oklch(0.953 0.014 140)): hover fills, bar track.
- **Field Ink** (oklch(0.22 0.035 155)): text, 2px heading rules, stop button.
- **Muted Ink** (oklch(0.44 0.03 155)): secondary text, state chips.
- **Hairline** (oklch(0.86 0.018 145)): row dividers and chart gridlines.
- **Focus Blue** (oklch(0.5 0.17 255)): focus ring only (light blue oklch(0.8 0.12 255) in dark).

### Named Rules
**The One Hue Per Verdict Rule.** A category colour appears only as its own verdict (fill, drops, stub header). Water Blue also marks water itself (rain, running). No category colour is used decoratively.

**The Paired Text Rule.** Each category defines its fill, the text on that fill, and a text-on-tag-stock variant. Never put raw fill colour as small text on tag stock when a `-ct` variant exists.

## Typography

**Display Font:** Barlow Condensed (700 and 600, with Arial Narrow)
**Body Font:** Barlow (400, 500, 600, with system-ui)

**Character:** A stamped, utilitarian condensed face for labels and numerals against a friendly humanist workhorse. Numerals are tabular throughout.

### Hierarchy
- **Display** (700, clamp(4rem, 11vw, 6rem), 0.85): the verdict word, uppercase.
- **Headline** (600 Barlow, clamp(1.75rem, 4vw, 2.75rem), 1.1, max 20ch): the one-sentence reason under the verdict.
- **Title** (700 Barlow Condensed, 1.125rem, uppercase, 0.07em): panel headings.
- **Body** (400 Barlow, 1rem, 1.5): reasons run at 1.125rem, max 52ch; notes max 60-70ch.
- **Label** (600 Barlow Condensed, 0.75rem, 0.12em): stamps and state chips (PROTOTYPE, simulated, RUNNING).
- **Numerals** (700 Barlow Condensed, 1.25rem to 4rem): temperatures, timers, metrics, litres saved.

### Named Rules
**The Unit Always Rule.** A figure is never shown without its unit beside it (mm, L, degC, km/h, %).

## Layout

A 1160px centered wrap with a fluid gutter (16px to 32px). Below 900px everything is one column with 16px gaps. From 900px it is a 12-column grid with 20px gaps: the verdict tag spans columns 1-8 across two rows, Right now and rain chance stack in columns 9-12, then the week plan and zones (1-8) beside the 7-day forecast (9-12), and a full-width savings band. The header band is sticky.

The week plan is seven equal stubs; at 620px and below each stub becomes a horizontal row, and below 420px it wraps. Spacing is a loose 4px-based rhythm (8, 12, 14, 16, 20 inside panels) rather than a strict scale. Touch targets are 44px minimum.

## Elevation & Depth

Flat by default. Panels carry a 1px hairline underline plus a faint ambient shadow (`0 1px 0 hairline, 0 6px 14px -10px oklch(0.2 0.04 155 / 0.35)`). The verdict tag has no shadow; its shape (clipped top corners and a punched hole) is what separates it. The only strong shadow belongs to the location dialog (`0 18px 40px -16px oklch(0.15 0.04 155 / 0.5)`) over a 60% green backdrop.

### Named Rules
**The Tag Stock Rule.** Hierarchy comes from fill, ink rules and tag shape, not from lifted cards.

## Shapes

Small, honest radii: 6px on panels, 4px on controls and stubs, 2px on stamps and chips. The signature silhouette is the verdict tag, a rectangle with 26px clipped top corners and a 16px punched hole centered at the top. Progress and savings use a graduated stake: a 2px ink-bordered bar with a tick every 10% across its upper half. Borders are 1.5px (controls, stubs) or 2px (ink rules, today's stub, dialog).

## Components

### Buttons
- **Shape:** 4px radius, 44px minimum height, 1.5px ink border, Barlow 600 0.9375rem.
- **Primary:** Stake Green fill with near-white text (light green fill with dark text in dark theme).
- **Secondary:** tag stock with ink border; hover shifts to Tag Stock Shade; active moves down 1px.
- **Stop:** ink fill with tag stock text. **Ghost:** transparent, muted text, shade on hover.
- **Disabled:** 50% opacity, not-allowed cursor.

### Panels
- **Style:** tag stock, 6px radius, padding 18px 22px 22px; heading in Title style over a 2px ink rule.

### Verdict tag (signature)
- Full-bleed category fill with its paired text colour, clipped corners, punched hole, giant verdict word, large drops (30-44px), headline, reasons marked by a 12px rule dash, and a two-column ruled spec table (1.5px translucent rules, label left, condensed figure right).

### Week stubs
- Seven bordered stubs: category-coloured header strip with the action word, weekday in condensed type, date, drops, reason. Today has a 2px ink border.

### Zones
- Bordered 4px-radius rows with name, a state chip (idle muted, running Water Blue fill), big timer, per-zone controls and a 4px progress line. Running rows take the Water Tint fill.

### Inputs
- Search and select share the button's 44px, 1.5px ink border and tag stock fill. Focus: 3px Focus Blue outline, 2px offset (bar-ink in the header).

### Navigation
- A sticky stake-green band: tag-shaped brand mark, uppercase condensed wordmark, PROTOTYPE stamp (hidden at 480px and below), and an outlined location button.

## Do's and Don'ts

### Do:
- **Do** colour a verdict with its single category fill and pair it with its defined on-colour.
- **Do** show water level as the three-drop pictogram (WATER 3, REDUCE 2, DELAY 1, SKIP and OFF 0).
- **Do** put a 2px ink rule under panel headings and keep spec rows hairline-ruled.
- **Do** set numerals in Barlow Condensed 700 and label them with units.
- **Do** keep disclosures (PROTOTYPE, simulated, Open-Meteo attribution) visible.
- **Do** design dark as its own theme with lifted category hues and dark-on-light fills.

### Don't:
- **Don't** return to the white-card bento look with a single teal accent.
- **Don't** use category hues for decoration or as a second accent on neutral UI.
- **Don't** lift panels with heavy shadows; depth is fill, rule and shape.
- **Don't** add icons or pictograms that carry no information.
- **Don't** set small text in a raw category fill on tag stock; use its text variant.

