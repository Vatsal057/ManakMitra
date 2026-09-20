// Each of these was run against the live /recommend endpoint before being
// added here (see the build notes) — every one returns non-abstained,
// high-confidence, useful results. "LED street lighting" was tried first
// (four different phrasings) and dropped: the corpus genuinely doesn't
// cover it, every phrasing abstained. Never keep a sample that abstains or
// returns nothing — a bad demo is worse than no demo.
export const SAMPLE_SPECS = [
  {
    label: 'Cement / RCC',
    titleKey: 'sample2Title',
    queryKey: 'sample2Query',
    text: 'Supply and delivery of OPC 43 grade cement for RCC foundation and structural concrete work as per project specifications.',
  },
  {
    label: 'Electrical cable',
    titleKey: 'sample1Title',
    queryKey: 'sample1Query',
    text: 'PVC insulated copper conductor cables required for internal electrical wiring installation of the office building.',
  },
  {
    label: 'Safety helmets',
    titleKey: 'sample3Title',
    queryKey: 'sample3Query',
    text: 'Industrial safety helmets to be provided to construction site workers, conforming to applicable Indian Standard.',
  },
  {
    label: 'Packaged drinking water',
    text: 'Packaged drinking water in sealed bottles for supply at the project site, quality as per BIS specification.',
  },
  {
    label: 'Hallmarking',
    titleKey: 'sample5Title',
    queryKey: 'sample5Query',
    text: 'Procurement of gold jewellery items requiring BIS hallmarking certification for the departmental store.',
  },
];
