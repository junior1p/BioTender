/**
 * Type definitions for molecular interaction analysis
 */

// Atomic position and properties
export interface Atom {
  serial: number;
  atomName: string;
  resn: string;      // Residue name (3-letter code)
  chain: string;     // Chain identifier
  resi: number;      // Residue sequence number
  x: number;
  y: number;
  z: number;
  element: string;   // Chemical element symbol
  hetflag: boolean;  // true for HETATM, false for ATOM
  altLoc: string;    // Alternate location indicator
}

// Reference to a specific residue
export interface ResidueRef {
  chain: string;
  resi: number;
  resn: string;
}

// Ligand definition (grouped by chain+resi+resn)
export interface Ligand {
  siteId: number;
  chain: string;
  resi: number;
  resn: string;
  atoms: Atom[];
  type: 'SMALLMOLECULE' | 'ION' | 'WATER';
}

// Binding site containing a ligand and its pocket residues
export interface BindingSite {
  siteId: number;
  ligand: Ligand;
  pocketResidues: ResidueRef[];
  pocketAtoms: Atom[];  // All protein atoms within binding site distance
}

// Analysis parameters
export interface AnalysisParams {
  bindingSiteDistance: number;    // Default: 7.5 Å
  hydrophobicMaxDist: number;     // Default: 4.0 Å
  hbondMaxDist: number;           // Default: 3.5 Å
  saltBridgeMaxDist: number;      // Default: 5.5 Å
  waterBridgeMaxDist: number;     // Default: 4.1 Å
  piStackingMaxDist: number;      // Default: 6.0 Å
  piCationMaxDist: number;        // Default: 6.0 Å
  halogenBondMaxDist: number;     // Default: 4.0 Å
}

// Hydrophobic interaction record
export interface HydrophobicInteraction {
  index: number;
  residue: string;      // Format: "316 A"
  aa: string;           // Three-letter amino acid code
  distance: number;     // Minimum distance in Å
  ligandAtomSerial: number;
  proteinAtomSerial: number;
  ligandAtomName: string;
  proteinAtomName: string;
}

// Hydrogen bond interaction record
export interface HbondInteraction {
  index: number;
  residue: string;
  aa: string;
  distanceHA: number;      // Distance H-A (Å) - can be approximate or empty
  distanceDA: number;      // Distance D-A (Å)
  donorAngle: number;      // D-H-A angle (degrees) - can be empty for MVP
  proteinDonor: boolean;   // true if protein is donor
  sideChain: boolean;      // true if side chain atom (false for backbone)
  donorAtomSerial: number;
  acceptorAtomSerial: number;
  donorAtomName: string;
  acceptorAtomName: string;
}

// Water bridge interaction record
export interface WaterbridgeInteraction {
  index: number;
  residue: string;
  aa: string;
  distanceAW: number;      // Distance Acceptor-Water (Å)
  distanceDW: number;      // Distance Donor-Water (Å)
  donorAngle: number;      // D-H-A angle (degrees) - can be empty
  waterAngle: number;      // Angle at water (degrees) - can be empty
  proteinDonor: boolean;
  donorAtomSerial: number;
  acceptorAtomSerial: number;
  waterAtomSerial: number;
  donorAtomName: string;
  acceptorAtomName: string;
  waterAtomName: string;
}

// Salt bridge interaction record (placeholder for future)
export interface SaltbridgeInteraction {
  index: number;
  residue: string;
  aa: string;
  distance: number;
  ligandAtomSerial: number;
  proteinAtomSerial: number;
}

// Pi-stacking interaction (placeholder for future)
export interface PistackingInteraction {
  index: number;
  residue: string;
  aa: string;
  distance: number;
  type: 'parallel' | 'perpendicular';
  ligandRingSerial: number;
  proteinRingSerial: number;
}

// Pi-cation interaction (placeholder for future)
export interface PicationInteraction {
  index: number;
  residue: string;
  aa: string;
  distance: number;
  ligandAtomSerial: number;
  proteinAtomSerial: number;
}

// Halogen bond interaction (placeholder for future)
export interface HalogenbondInteraction {
  index: number;
  residue: string;
  aa: string;
  distance: number;
  donorAngle: number;
  ligandAtomSerial: number;
  proteinAtomSerial: number;
}

// All interactions for a binding site
export interface SiteInteractions {
  siteId: number;
  ligand: Ligand;
  hydrophobic: HydrophobicInteraction[];
  hbond: HbondInteraction[];
  waterbridge: WaterbridgeInteraction[];
  saltbridge: SaltbridgeInteraction[];
  pistacking: PistackingInteraction[];
  pication: PicationInteraction[];
  halogenbond: HalogenbondInteraction[];
}

// Complete analysis result
export interface AnalysisResult {
  success: boolean;
  error?: string;
  pdbId?: string;
  filename?: string;
  timestamp: number;
  params: AnalysisParams;
  ligands: Ligand[];
  bindingSites: BindingSite[];
  interactions: SiteInteractions[];
  stats: {
    totalAtoms: number;
    proteinAtoms: number;
    ligandAtoms: number;
    totalSites: number;
    totalHydrophobic: number;
    totalHbond: number;
    totalWaterbridge: number;
    analysisTime: number;  // in milliseconds
  };
}

// Progress status for worker
export type AnalysisStatus = 'idle' | 'parsing' | 'building-grid' | 'finding-sites' | 'analyzing-hydrophobic' | 'analyzing-hbond' | 'analyzing-waterbridge' | 'complete' | 'error';

export interface ProgressUpdate {
  status: AnalysisStatus;
  progress: number;  // 0-100
  message: string;
  currentSite?: number;
  totalSites?: number;
}

// Worker message types
export interface WorkerRequest {
  type: 'analyze';
  pdbContent: string;
  filename?: string;
  params: AnalysisParams;
}

export interface WorkerResponse {
  type: 'progress' | 'result' | 'error';
  data?: ProgressUpdate | AnalysisResult;
  error?: string;
}
