/**
 * PDB file parser
 * Parses ATOM and HETATM records from PDB format files
 */

import { Atom } from '../types/interaction';

// Residues to exclude from ligand detection (water, ions, etc.)
export const EXCLUDED_RESIDUES = new Set([
  'HOH', 'WAT', 'DOD',  // Water
  'NA', 'SOD',          // Sodium
  'CL', 'CLA',          // Chloride
  'MG',  // Magnesium
  'CA',  // Calcium
  'K', 'POT',  // Potassium
  'ZN',  // Zinc
  'FE', 'FE2', 'FE3',  // Iron
  'MN',  // Manganese
  'CU',  // Copper
  'CO',  // Cobalt
  'NI',  // Nickel
  'CD',  // Cadmium
  'BA',  // Barium
  'SR',  // Strontium
  'BE',  // Beryllium
  'LI',  // Lithium
  'CS',  // Cesium
  'AG',  // Silver
  'AU',  // Gold
  'HG',  // Mercury
  'AL',  // Aluminum
  'GA',  // Gallium
  'IN',  // Indium
  'TL',  // Thallium
  'PB',  // Lead
  'BI',  // Bismuth
  'YB',  // Ytterbium
  'EU',  // Europium
  'SM',  // Samarium
  'GD',  // Gadolinium
  'TB',  // Terbium
  'DY',  // Dysprosium
  'Y',   // Yttrium
  'W',   // Tungsten
  'MO',  // Molybdenum
  'V',   // Vanadium
  'CR',  // Chromium
  'PT',  // Platinum
  'RU',  // Ruthenium
  'RH',  // Rhodium
  'PD',  // Palladium
  'OS',  // Osmium
  'IR',  // Iridium
  'XE',  // Xenon
  'KR',  // Krypton
  'F',   // Fluorine
  'BR',  // Bromine
  'I',   // Iodine
  'S',   // Sulfur
]);

// Hydrophobic amino acids
export const HYDROPHOBIC_RESIDUES = new Set([
  'ALA', 'VAL', 'LEU', 'ILE', 'MET', 'PHE', 'TRP', 'PRO', 'TYR',
]);

/**
 * Parse element symbol from atom name
 * Atom names in PDB are formatted like " CA ", " N  ", "1HG ", " OXT"
 * Rules: Start from right, skip digits, take 1-2 characters
 */
function parseElementFromAtomName(atomName: string): string {
  const trimmed = atomName.trim();
  // Start from the right, skip digits
  let element = '';
  for (let i = trimmed.length - 1; i >= 0; i--) {
    const char = trimmed[i];
    if (!/\d/.test(char)) {
      element = char + element;
      // Element symbols are 1-2 characters
      if (element.length === 2 || i === 0) {
        break;
      }
    }
  }
  // Capitalize first letter, lowercase second (if present)
  return element.length > 0
    ? element[0].toUpperCase() + (element[1]?.toLowerCase() || '')
    : 'C';  // Default to carbon
}

/**
 * Parse a single ATOM/HETATM line from PDB file
 */
export function parseAtomLine(line: string): Atom | null {
  // PDB format specification:
  // COLUMNS        DATA TYPE       FIELD           DEFINITION
  // -----------------------------------------------------------------
  // 1 - 6          Record name     "ATOM  " or "HETATM"
  // 7 - 11         Integer         serial          Atom serial number
  // 13 - 16        Atom            name            Atom name
  // 17             Character       altLoc          Alternate location
  // 18 - 20        Residue name    resn            Residue name
  // 22             Character       chain           Chain identifier
  // 23 - 26        Integer         resi            Residue sequence number
  // 27             AChar           iCode           Code for insertions
  // 31 - 38        Real(8.3)       x               Orthogonal X coordinate
  // 39 - 46        Real(8.3)       y               Orthogonal Y coordinate
  // 47 - 54        Real(8.3)       z               Orthogonal Z coordinate
  // 55 - 60        Real(6.2)       occupancy       Occupancy
  // 61 - 66        Real(6.2)       tempFactor      Temperature factor
  // 73 - 76        LString(4)      segId           Segment identifier
  // 77 - 78        LString(2)      element         Element symbol
  // 79 - 80        LString(2)      charge          Charge on the atom

  if (line.length < 54) {
    return null;
  }

  const recordName = line.substring(0, 6).trim();
  if (recordName !== 'ATOM' && recordName !== 'HETATM') {
    return null;
  }

  try {
    const serial = parseInt(line.substring(6, 11).trim());
    const atomName = line.substring(12, 16).trim();
    const altLoc = line.substring(16, 17).trim();
    const resn = line.substring(17, 20).trim();
    const chain = line.substring(21, 22).trim();
    const resi = parseInt(line.substring(22, 26).trim());
    const x = parseFloat(line.substring(30, 38).trim());
    const y = parseFloat(line.substring(38, 46).trim());
    const z = parseFloat(line.substring(46, 54).trim());

    // Element symbol: check columns 77-78 first, otherwise parse from atom name
    let element = line.substring(76, 78).trim();
    if (!element) {
      element = parseElementFromAtomName(atomName);
    }
    // Capitalize properly
    element = element[0].toUpperCase() + (element[1]?.toLowerCase() || '');

    // Skip hydrogen atoms (including deuterium)
    if (element === 'H' || element === 'D') {
      return null;
    }

    return {
      serial,
      atomName,
      resn,
      chain,
      resi,
      x,
      y,
      z,
      element,
      hetflag: recordName === 'HETATM',
      altLoc,
    };
  } catch (e) {
    console.warn('Failed to parse atom line:', line, e);
    return null;
  }
}

/**
 * Parse complete PDB file content
 * Returns protein atoms (ATOM records) and ligand atoms (HETATM records, filtered)
 */
export function parsePDB(pdbContent: string): {
  proteinAtoms: Atom[];
  ligandAtoms: Atom[];
  allAtoms: Atom[];
} {
  const lines = pdbContent.split('\n');
  const proteinAtoms: Atom[] = [];
  const ligandAtoms: Atom[] = [];
  const allAtoms: Atom[] = [];

  // Track which altLoc we've seen for each atom position
  const atomPositions = new Map<string, Atom>();

  for (const line of lines) {
    const atom = parseAtomLine(line);
    if (!atom) continue;

    // Position key: chain + resi + resn + atomName
    const posKey = `${atom.chain}:${atom.resi}:${atom.resn}:${atom.atomName}`;

    // Handle alternate locations: prefer empty or 'A'
    const existing = atomPositions.get(posKey);
    if (existing) {
      // If we already have an atom at this position
      if (existing.altLoc === '' || existing.altLoc === 'A') {
        // Keep the existing one
        continue;
      } else if (atom.altLoc === '' || atom.altLoc === 'A') {
        // Replace with this one (better altLoc)
        atomPositions.set(posKey, atom);
      } else {
        // Keep the first one we saw
        continue;
      }
    } else {
      atomPositions.set(posKey, atom);
    }
  }

  // Categorize atoms
  for (const atom of atomPositions.values()) {
    allAtoms.push(atom);

    if (atom.hetflag) {
      // HETATM - check if it's a ligand (not excluded)
      if (!EXCLUDED_RESIDUES.has(atom.resn.toUpperCase())) {
        ligandAtoms.push(atom);
      } else {
        // Water and ions are treated as protein context for spatial queries
        proteinAtoms.push(atom);
      }
    } else {
      // ATOM records are always protein
      proteinAtoms.push(atom);
    }
  }

  return {
    proteinAtoms,
    ligandAtoms,
    allAtoms,
  };
}

/**
 * Group ligand atoms by (chain, resi, resn) to identify unique ligands
 */
export function groupLigands(ligandAtoms: Atom[]): Map<string, Atom[]> {
  const ligands = new Map<string, Atom[]>();

  for (const atom of ligandAtoms) {
    const key = `${atom.chain}:${atom.resi}:${atom.resn}`;
    if (!ligands.has(key)) {
      ligands.set(key, []);
    }
    ligands.get(key)!.push(atom);
  }

  return ligands;
}

/**
 * Calculate Euclidean distance between two atoms
 */
export function distance(a: Atom, b: Atom): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate squared distance (faster comparison)
 */
export function distanceSquared(a: Atom, b: Atom): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}
