/**
 * Typography tokens — the ONLY font sizes permitted in this app.
 * Import FS (font sizes), FW (font weights), LH (line heights), and
 * Typography (pre-built style objects) instead of hardcoding values.
 */

export const FS = {
  display:   32,
  title:     24,
  section:   20,
  body:      16,
  secondary: 14,
  caption:   12,
} as const;

export const FW = {
  regular:  '400' as const,
  medium:   '500' as const,
  semibold: '600' as const,
  bold:     '700' as const,
};

/** lineHeight = fontSize * 1.4, rounded to nearest even number */
export const LH = {
  display:   44,
  title:     34,
  section:   28,
  body:      22,
  secondary: 20,
  caption:   17,
} as const;

export const Typography = {
  display: {
    fontSize:   FS.display,
    lineHeight: LH.display,
    fontWeight: FW.semibold,
  },
  title: {
    fontSize:   FS.title,
    lineHeight: LH.title,
    fontWeight: FW.semibold,
  },
  section: {
    fontSize:   FS.section,
    lineHeight: LH.section,
    fontWeight: FW.semibold,
  },
  body: {
    fontSize:   FS.body,
    lineHeight: LH.body,
    fontWeight: FW.regular,
  },
  bodyMedium: {
    fontSize:   FS.body,
    lineHeight: LH.body,
    fontWeight: FW.medium,
  },
  bodySemibold: {
    fontSize:   FS.body,
    lineHeight: LH.body,
    fontWeight: FW.semibold,
  },
  secondary: {
    fontSize:   FS.secondary,
    lineHeight: LH.secondary,
    fontWeight: FW.regular,
  },
  secondaryMedium: {
    fontSize:   FS.secondary,
    lineHeight: LH.secondary,
    fontWeight: FW.medium,
  },
  secondarySemibold: {
    fontSize:   FS.secondary,
    lineHeight: LH.secondary,
    fontWeight: FW.semibold,
  },
  caption: {
    fontSize:   FS.caption,
    lineHeight: LH.caption,
    fontWeight: FW.regular,
  },
  captionMedium: {
    fontSize:   FS.caption,
    lineHeight: LH.caption,
    fontWeight: FW.medium,
  },
  captionSemibold: {
    fontSize:   FS.caption,
    lineHeight: LH.caption,
    fontWeight: FW.semibold,
  },
} as const;
