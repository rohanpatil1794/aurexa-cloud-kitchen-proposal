// Placeholders used across the site. Swap these when the client details are confirmed.
export const CLIENT_NAME = '[Client Name]';
export const KITCHEN_NAME = '[Kitchen Name]';

export const STUDIO_NAME = 'Aurexa Design Consultants';
export const SITE_TITLE = `Aurexa × ${KITCHEN_NAME} — Cloud Kitchen Proposal`;
export const SITE_DESCRIPTION =
  `A walkable 3D proposal for ${CLIENT_NAME} by ${STUDIO_NAME}: a 3,000 sq ft commercial cloud kitchen and office, designed for hygiene, one-way flow and the people who work in it.`;

export const HERO = {
  headline: 'Your cloud kitchen, before it exists.',
  subline: `A walkable 3D proposal for ${CLIENT_NAME} by ${STUDIO_NAME}`,
  cta: 'Enter the space',
} as const;

// Placeholder contact details for the Next steps band.
export const CONTACT = {
  person: '[Contact Name], Principal Designer',
  email: 'hello@aurexa.example',
  phone: '+00 00000 00000',
  address: '[Studio address line 1], [City]',
  hours: 'Mon–Sat, 10:00–18:00',
} as const;

export const FLOORPLAN_URL = '/assets/floorplan.png';

/** Height of the sticky stage wrapper in viewport heights. A later walkthrough prompt can raise this to drive the camera by scroll. */
export const STAGE_SCROLL_VH = 100;
