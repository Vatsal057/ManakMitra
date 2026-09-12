// Each of these was run against the live /recommend endpoint before being
// added here (see the build notes) — every one returns non-abstained,
// high-confidence, useful results. "LED street lighting" was tried first
// (four different phrasings) and dropped: the corpus genuinely doesn't
// cover it, every phrasing abstained. Never keep a sample that abstains or
// returns nothing — a bad demo is worse than no demo.
export const SAMPLE_SPECS = [
  {
    label: 'Cement / RCC',
    text: 'Supply and delivery of OPC 43 grade cement for RCC foundation and structural concrete work as per project specifications.',
  },
  {
    label: 'Electrical cable',
    text: 'PVC insulated copper conductor cables required for internal electrical wiring installation of the office building.',
  },
  {
    label: 'Safety helmets',
    text: 'Industrial safety helmets to be provided to construction site workers, conforming to applicable Indian Standard.',
  },
  {
    label: 'Packaged drinking water',
    text: 'Packaged drinking water in sealed bottles for supply at the project site, quality as per BIS specification.',
  },
  {
    label: 'Hallmarking',
    text: 'Procurement of gold jewellery items requiring BIS hallmarking certification for the departmental store.',
  },
];
