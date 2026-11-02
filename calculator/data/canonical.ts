import type {
  BaseUnit,
  CanonicalItem,
  Category,
  Confidence,
  Mapping,
} from "../lib/types.ts";

// The canonical layer: one entry per product we actually buy, mapped to each
// supplier's SKU. Mappings reference catalog ids, which stay stable when a
// supplier's prices change. unitsPerPurchase converts each SKU to the base unit.

function m(
  itemId: string,
  unitsPerPurchase = 1,
  confidence: Confidence = "high",
  extra: Pick<Mapping, "alternate" | "note"> = {},
): Mapping {
  return { itemId, unitsPerPurchase, confidence, ...extra };
}

function c(
  id: string,
  name: string,
  category: Category,
  baseUnit: BaseUnit,
  ...mappings: Mapping[]
): CanonicalItem {
  return { id, name, category, baseUnit, mappings };
}

function spectraCoil(gauge: "027" | "032", widthCode: string): Mapping[] {
  return [
    m(`spectra:coil-${gauge}-${widthCode}-full`),
    m(`spectra:coil-${gauge}-${widthCode}-spin`, 1, "high", {
      alternate: true,
      note: "Spin down, same price per pound.",
    }),
  ];
}

const tcGaugeNote =
  "T&C doesn't print the gauge; Spectra's is .019. Confirm they're the same weight.";

export const canonicalItems: CanonicalItem[] = [
  // Gutter coil and stock
  c("coil-027-11.75", 'Gutter coil .027 x 11-3/4"', "gutter-coil-stock", "lb", ...spectraCoil("027", "11")),
  c("coil-032-11.75", 'Gutter coil .032 x 11-3/4"', "gutter-coil-stock", "lb", ...spectraCoil("032", "11")),
  c("coil-027-11.875", 'Gutter coil .027 x 11-7/8"', "gutter-coil-stock", "lb", ...spectraCoil("027", "11875")),
  c("coil-032-11.875", 'Gutter coil .032 x 11-7/8"', "gutter-coil-stock", "lb", ...spectraCoil("032", "11875")),
  c(
    "coil-027-15",
    'Gutter coil .027 x 15"',
    "gutter-coil-stock",
    "lb",
    ...spectraCoil("027", "15"),
    m("town-country:coil-027-15-frost", 1, "high", { note: "T&C lists frost only." }),
  ),
  c("coil-032-15", 'Gutter coil .032 x 15"', "gutter-coil-stock", "lb", ...spectraCoil("032", "15")),
  c("coil-027-17.875", 'Gutter coil .027 x 17-7/8"', "gutter-coil-stock", "lb", ...spectraCoil("027", "17875")),
  c(
    "coil-032-17.875",
    'Gutter coil .032 x 17-7/8" (or 18")',
    "gutter-coil-stock",
    "lb",
    ...spectraCoil("032", "17875"),
    m("town-country:coil-032-18-royal-frost", 1, "low", {
      note: 'T&C coil is 18" wide, not 17-7/8". Only the same item if both widths work on your machine.',
    }),
  ),
  c("coil-032-20", 'Gutter coil .032 x 20", full coils only', "gutter-coil-stock", "lb", m("spectra:coil-032-20-full")),
  c("k-gutter-6-preformed", '6" K-style gutter, preformed', "gutter-coil-stock", "ft", m("town-country:k-gutter-6-hgw")),
  c("roll-form-gutter-white", "Roll form gutter, white", "gutter-coil-stock", "ft", m("town-country:roll-form-gutter-wht")),
  c("roll-form-gutter-032", "Roll form gutter .032, white", "gutter-coil-stock", "ft", m("town-country:roll-form-gutter-032")),

  // Trim coil, compared per roll
  c("trim-coil-24-polyester", '24" white polyester trim coil, roll', "accessories", "each", m("spectra:280WHITE")),
  c(
    "trim-coil-24-pvc",
    '24" white PVC trim coil, roll',
    "accessories",
    "each",
    m("spectra:189PVC"),
    m("town-country:trim-coil-pvc-24-white", 1, "low", {
      note: "T&C doesn't print the roll length or gauge. Spectra's is 50 ft, .019.",
    }),
  ),

  // Downspouts, compared per foot
  c("ds-2x3-8", "Downspout 2x3, 8 ft", "downspouts", "ft", m("spectra:3DP8", 8)),
  c("ds-2x3-10", "Downspout 2x3, 10 ft", "downspouts", "ft", m("spectra:3DP10", 10)),
  c("ds-3x4-8", "Downspout 3x4, 8 ft", "downspouts", "ft", m("spectra:4DP8", 8), m("town-country:ds-3x4-8-frost", 8, "medium", { note: tcGaugeNote })),
  c("ds-3x4-10", "Downspout 3x4, 10 ft", "downspouts", "ft", m("spectra:4DP10", 10), m("town-country:ds-3x4-10-frost", 10, "medium", { note: tcGaugeNote })),
  c("ds-4round-10", "Downspout 4 in round, 10 ft", "downspouts", "ft", m("spectra:4RDP10", 10)),
  c("ds-4x5-10", "Downspout 4x5, 10 ft, .027", "downspouts", "ft", m("spectra:5DP10", 10), m("town-country:ds-4x5-10-white", 10)),

  // Elbows
  c("elbow-2x3-a", "Elbow 2x3, A style", "elbows", "each", m("spectra:3AEL")),
  c("elbow-2x3-b", "Elbow 2x3, B style", "elbows", "each", m("spectra:3BEL")),
  c("elbow-3x4-a", "Elbow 3x4, A style", "elbows", "each", m("spectra:4AEL"), m("town-country:elbow-3x4-a-frost", 1, "medium", { note: tcGaugeNote })),
  c("elbow-3x4-b", "Elbow 3x4, B style", "elbows", "each", m("spectra:4BEL")),
  c("elbow-4x5-a", "Elbow 4x5, A style", "elbows", "each", m("spectra:5AEL"), m("town-country:elbow-4x5-a-white")),
  c("elbow-4x5-b", "Elbow 4x5, B style", "elbows", "each", m("spectra:5BEL")),
  c("elbow-4round", "Elbow 4 in round", "elbows", "each", m("spectra:4REL")),

  // Miters
  c("miter-5-box-outside", "Box miter 5 in, outside", "miters", "each", m("spectra:5OTM")),
  c("miter-5-box-inside", "Box miter 5 in, inside", "miters", "each", m("spectra:5INM")),
  c("miter-6-box-outside", "Box miter 6 in, outside", "miters", "each", m("spectra:6OTM")),
  c("miter-6-box-inside", "Box miter 6 in, inside", "miters", "each", m("spectra:6INM"), m("town-country:miter-6-box-inside-frost")),
  c("miter-5-strip-outside", "Strip miter 5 in, outside", "miters", "each", m("spectra:5OSM")),
  c("miter-5-strip-inside", "Strip miter 5 in, inside", "miters", "each", m("spectra:5ISM")),
  c("miter-6-strip-outside", "Strip miter 6 in, outside", "miters", "each", m("spectra:6OSM")),
  c("miter-6-strip-inside", "Strip miter 6 in, inside", "miters", "each", m("spectra:6ISM"), m("town-country:miter-6-strip-inside-frost")),
  c("miter-5-bay-outside", "Bay strip miter 5 in, outside", "miters", "each", m("spectra:5OBS")),
  c("miter-5-bay-inside", "Bay strip miter 5 in, inside", "miters", "each", m("spectra:5IBS")),
  c("miter-6-bay-outside", "Bay strip miter 6 in, outside", "miters", "each", m("spectra:6OBS")),
  c(
    "miter-6-bay-inside",
    "Bay miter 6 in, inside",
    "miters",
    "each",
    m("spectra:6IBS"),
    m("town-country:miter-6-bay-inside-frost", 1, "medium", {
      note: 'T&C says "bay miter"; Spectra says "bay strip miter". Confirm they are the same part.',
    }),
  ),
  c("miter-7-strip-outside", "Strip miter 7 in, outside", "miters", "each", m("spectra:7OSM")),
  c("miter-7-strip-inside", "Strip miter 7 in, inside", "miters", "each", m("spectra:7ISM")),

  // End caps
  c("endcap-5", "End cap 5 in", "end-caps", "each", m("spectra:5EN")),
  c(
    "endcap-6",
    "End cap 6 in",
    "end-caps",
    "each",
    m("spectra:6EN"),
    m("town-country:endcap-6-left-frost", 1, "medium", { note: "T&C lists a left cap only." }),
  ),
  c("endcap-7", "End cap 7 in", "end-caps", "each", m("spectra:7EN")),

  // Outlets
  c("outlet-2x3", "Outlet 2x3 rectangular", "outlets", "each", m("spectra:3ROT")),
  c(
    "outlet-3x4",
    "Outlet 3x4 rectangular",
    "outlets",
    "each",
    m("spectra:4ROT"),
    m("town-country:outlet-3x4-mill", 1, "medium", { note: "T&C's is mill finish; Spectra doesn't say." }),
  ),
  c(
    "outlet-4x5",
    "Outlet 4x5 rectangular",
    "outlets",
    "each",
    m("spectra:5WOTAL"),
    m("town-country:outlet-4x5-mill", 1, "medium", { note: "T&C's is mill finish; Spectra doesn't say." }),
  ),
  c("outlet-4-oval", "Outlet 4 in oval", "outlets", "each", m("spectra:4OVOT")),
  c("outlet-round-2.375", "Outlet 2-3/8 in round", "outlets", "each", m("spectra:238R")),
  c("outlet-round-2.75", "Outlet 2-3/4 in round", "outlets", "each", m("spectra:234R")),
  c("outlet-round-3.375", "Outlet 3-3/8 in round", "outlets", "each", m("spectra:338R")),

  // Hangers
  c("hanger-5-speed-screw", "Hanger 5 in speed screw, with screw", "hangers", "each", m("spectra:5HFH")),
  c("hanger-6-elite-speed-screw-clip", "Hanger 6 in Elite speed screw, with screw and clip", "hangers", "each", m("spectra:6HFEH")),
  c("hanger-6-hidden-no-strap", "Hanger 6 in hidden, no strap", "hangers", "each", m("spectra:6HNS")),
  c(
    "hanger-6-speed-screw",
    "Hanger 6 in hidden, with screw",
    "hangers",
    "each",
    m("spectra:6SSH"),
    m("town-country:hanger-6-hangfast-mill", 1, "medium", {
      note: "T&C's is a Hang Fast with screw; Spectra's is a speed screw hanger. Both are hidden hangers with a screw, but confirm they're interchangeable.",
    }),
  ),
  c("hanger-6-speed-screw-no-clip", "Hanger 6 in speed screw, no clip", "hangers", "each", m("spectra:6SSHNCUA")),
  c("hanger-6-ultra-no-clip", "Hanger 6 in Ultra, no clip", "hangers", "each", m("spectra:6UHNC")),
  c("hanger-6-hook", "Hook hanger 6 in", "hangers", "each", m("town-country:hanger-6-hook-mill")),
  c("hanger-7-hidden-no-strap", "Hanger 7 in hidden, no strap", "hangers", "each", m("spectra:7HNS")),
  c("hanger-7-speed-screw", "Hanger 7 in speed screw", "hangers", "each", m("spectra:7SSH")),

  // Fasteners, compared per screw or rivet
  c(
    "screw-8x0.5",
    "Screw #8 x 1/2 in (zip screw)",
    "fasteners",
    "each",
    m("spectra:812", 100),
    m("town-country:screw-8x1-2-hex-white-100", 100),
    m("town-country:screw-8x1-2-sms-1000", 1000, "high", { alternate: true }),
  ),
  c(
    "screw-10x1.5",
    "Screw #10 x 1-1/2 in, hex head",
    "fasteners",
    "each",
    m("spectra:10112H", 1000),
    m("town-country:screw-10x1-1-2-sms-500", 500),
  ),
  c(
    "pop-rivet",
    "Pop rivet",
    "fasteners",
    "each",
    m("spectra:PR42", 100),
    m("town-country:pop-rivets-white", 100, "low", {
      note: "T&C doesn't print the rivet size or bag count. The per-rivet price assumes 100 per bag.",
    }),
  ),

  // Sealant, compared per tube
  c("sealant-npc-900", "NPC Solar Seal #900", "sealant", "each", m("spectra:GS900"), m("town-country:solar-seal-900")),
  c("sealant-npc-400", "NPC #400 gutter sealant", "sealant", "each", m("spectra:GS400"), m("town-country:npc-400")),
  c(
    "sealant-osi",
    "OSI gutter sealant",
    "sealant",
    "each",
    m("spectra:GS121"),
    m("town-country:osi-sbr-100", 1, "low", {
      note: "Spectra's is OSI GS121; T&C's is OSI SBR 100. These may be different products.",
    }),
  ),
  c("sealant-geocel-2320", "Geocel 2320", "sealant", "each", m("spectra:G2320")),
  c("sealant-geocel-2300", "Geocel 2300", "sealant", "each", m("town-country:geocel-2300")),
  c(
    "touch-up-paint",
    "Touch-up paint",
    "accessories",
    "each",
    m("spectra:TUP", 1, "medium", { note: "Spectra doesn't print the can size." }),
    m("town-country:touch-up-paint-white80", 1, "medium", { note: "T&C's is a 12 oz can." }),
    m("town-country:ro-touch-up-paint", 1, "medium", { alternate: true, note: "Second T&C listing, also 12 oz." }),
  ),

  // Straps
  c("downspout-band", "Downspout band", "straps", "each", m("spectra:DPB")),

  // Gutter guards
  c("guard-5-ls-lock", "LS-Lock guard 5 in", "gutter-guards", "ft", m("spectra:GS441FM", 4)),
  c("guard-6-ls-lock", "LS-Lock guard 6 in", "gutter-guards", "ft", m("spectra:GS442FM", 4)),
  c("guard-6-ls-lock-step-down", "LS-Lock guard 6 in, step down", "gutter-guards", "ft", m("spectra:GS442FMSD", 4)),
  c("guard-7-ls-lock-step-down", "LS-Lock guard 7 in, step down", "gutter-guards", "ft", m("spectra:GS443FMSD", 4)),
  c("guard-5-ls-screen", "LS-Screen guard 5 in", "gutter-guards", "ft", m("spectra:GS501LC", 4)),
  c("guard-6-ls-screen", "LS-Screen guard 6 in", "gutter-guards", "ft", m("spectra:GS502LC", 4)),
  c("guard-5-leaf-blok", "Leaf Blok guard 5 in, per piece", "gutter-guards", "each", m("spectra:LFB5SS")),
  c("guard-6-leaf-blok", "Leaf Blok guard 6 in, per piece", "gutter-guards", "each", m("spectra:LFB6SS")),
  c("guard-5-stainless", "Stainless steel guard 5 in", "gutter-guards", "ft", m("spectra:GG5SSLB", 4)),
  c("guard-6-stainless", "Stainless steel guard 6 in", "gutter-guards", "ft", m("spectra:GG6SSLB", 4)),
  c("guard-5-eco", "Eco Guard 5 in", "gutter-guards", "ft", m("spectra:5EG", 6)),
  c("guard-6-eco", "Eco Guard 6 in", "gutter-guards", "ft", m("spectra:6EG", 6)),
  c("guard-7-eco", "Eco Guard 7 in", "gutter-guards", "ft", m("spectra:7GC", 4)),
  c("guard-6-alu-rex", "Alu-Rex Gutter Clean Pro 6 in", "gutter-guards", "ft", m("spectra:6ALRGCP", 180)),
  c("guard-6-hydro-flo", "Hydro Flo guard 6 in", "gutter-guards", "ft", m("spectra:6HF", 4)),
  c("guard-6-ez-step-down", "E-Z step down guard 6 in, per piece", "gutter-guards", "each", m("town-country:guard-6-ez-step-down")),

  // Accessories
  c("conductor-box-4-galvanized", "Conductor box 4 in, galvanized", "accessories", "each", m("spectra:4CBOX-GALV")),
  c("conductor-box-4-painted", "Conductor box 4 in, painted aluminum", "accessories", "each", m("spectra:4CBOX-PAINTED")),
  c("splash-block", "Splash block", "accessories", "each", m("spectra:SBLOCK")),
  c("ground-spout", "Ground spout", "accessories", "each", m("spectra:GRNDSPT")),
  c("adapter-3x4", "Adapter 3x4", "accessories", "each", m("spectra:4ADA")),
  c("downspout-filter", "Downspout filter", "accessories", "each", m("spectra:DSFLTRT")),
  c("wedge-5", "Gutter wedge 5 in", "accessories", "each", m("spectra:WEDGE")),
  c("wedge-6", "Gutter wedge 6 in", "accessories", "each", m("spectra:6WEDGE")),
  c("t-wedge", "T wedge #4400", "accessories", "each", m("spectra:TWEDGE")),
  c("t-wedge-jumbo", "Jumbo T wedge #4500", "accessories", "each", m("spectra:TWEDGE-J")),
  c("defend-x-sheet-8x16", 'Defend-X sheet 8" x 16"', "accessories", "each", m("spectra:DX8X16BK")),
  c("defend-x-sheet-24x24", 'Defend-X sheet 24" x 24"', "accessories", "each", m("spectra:DX24X24BK")),
  c("defend-x-roll-2x5", "Defend-X roll 2' x 5'", "accessories", "each", m("spectra:DX24RL5BK")),
  c("defend-x-roll-3x5", "Defend-X roll 3' x 5'", "accessories", "each", m("spectra:DX36RL5BK")),
  c("defend-x-roll-2x25", "Defend-X roll 2' x 25', mill", "accessories", "each", m("spectra:DX24RL25MF")),
  c("defend-x-roll-3x25", "Defend-X roll 3' x 25', mill", "accessories", "each", m("spectra:DX36RL25MF")),
  c("defend-x-strip-7x48", 'Defend-X strip 7" x 48"', "accessories", "each", m("spectra:7EXPSTRIPBK")),
  c("gutter-apron-4-bare", "Gutter apron 4 ft, bare", "accessories", "each", m("spectra:FLASHGA4GALV")),
  c("gutter-apron-4-black", "Gutter apron 4 ft, black", "accessories", "each", m("spectra:FLASHGA4BK")),
  c("gutter-apron-10-bare", "Gutter apron 10 ft, bare", "accessories", "each", m("spectra:FLASHGA10GALV")),
  c("gutter-apron-10-black", "Gutter apron 10 ft, black", "accessories", "each", m("spectra:FLASHGA10BK")),
  c("ridge-shield-4", "Ridge Shield 4 ft, per piece", "other", "each", m("spectra:RS4BK", 25)),
];
