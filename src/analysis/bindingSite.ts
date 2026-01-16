/**
 * Binding site detection logic
 * Identifies ligands and their surrounding pocket residues
 */

import { Atom, Ligand, BindingSite, ResidueRef } from '../types/interaction';
import { groupLigands } from './pdbParser';
import { SpatialGrid, findNeighbors } from './spatialGrid';

/**
 * Determine ligand type based on residue name
 */
function getLigandType(resn: string): Ligand['type'] {
  const water = new Set(['HOH', 'WAT', 'DOD']);
  const ions = new Set([
    'NA', 'SOD', 'CL', 'CLA', 'MG', 'CA', 'K', 'POT', 'ZN', 'FE', 'MN',
    'CU', 'CO', 'NI', 'CD', 'BA', 'SR', 'BE', 'LI', 'CS', 'AG', 'AU',
  ]);

  const upperResn = resn.toUpperCase();
  if (water.has(upperResn)) return 'WATER';
  if (ions.has(upperResn)) return 'ION';
  return 'SMALLMOLECULE';
}

/**
 * Create a ligand object from grouped atoms
 */
function createLigand(siteId: number, chain: string, resi: number, resn: string, atoms: Atom[]): Ligand {
  return {
    siteId,
    chain,
    resi,
    resn,
    atoms,
    type: getLigandType(resn),
  };
}

/**
 * Create a residue reference key for deduplication
 */
function residueKey(chain: string, resi: number, resn: string): string {
  return `${chain}:${resi}:${resn}`;
}

/**
 * Parse residue key back to components
 */
export function parseResidueKey(key: string): ResidueRef {
  const [chain, resi, resn] = key.split(':');
  return {
    chain,
    resi: parseInt(resi),
    resn,
  };
}

/**
 * Find all protein atoms within binding site distance of the ligand
 */
function findPocketAtoms(ligand: Ligand, proteinGrid: SpatialGrid, bindingSiteDistance: number): Atom[] {
  const pocketAtomsSet = new Set<Atom>();

  // For each ligand atom, find nearby protein atoms
  for (const ligandAtom of ligand.atoms) {
    const neighbors = findNeighbors(proteinGrid, ligandAtom, bindingSiteDistance);
    for (const neighbor of neighbors) {
      pocketAtomsSet.add(neighbor);
    }
  }

  return Array.from(pocketAtomsSet);
}

/**
 * Extract unique residues from a list of atoms
 */
function extractResidues(atoms: Atom[]): ResidueRef[] {
  const residueMap = new Map<string, ResidueRef>();

  for (const atom of atoms) {
    const key = residueKey(atom.chain, atom.resi, atom.resn);
    if (!residueMap.has(key)) {
      residueMap.set(key, {
        chain: atom.chain,
        resi: atom.resi,
        resn: atom.resn,
      });
    }
  }

  return Array.from(residueMap.values()).sort((a, b) => {
    if (a.chain !== b.chain) return a.chain.localeCompare(b.chain);
    return a.resi - b.resi;
  });
}

/**
 * Detect all binding sites in the structure
 */
export function detectBindingSites(
  proteinAtoms: Atom[],
  ligandAtoms: Atom[],
  proteinGrid: SpatialGrid,
  bindingSiteDistance: number
): BindingSite[] {
  const bindingSites: BindingSite[] = [];
  const ligandGroups = groupLigands(ligandAtoms);

  let siteId = 1;
  for (const [key, atoms] of ligandGroups.entries()) {
    const [chain, resi, resn] = key.split(':');
    const ligand = createLigand(siteId, chain, parseInt(resi), resn, atoms);

    // Skip water molecules as binding sites
    if (ligand.type === 'WATER') {
      continue;
    }

    // Find pocket residues
    const pocketAtoms = findPocketAtoms(ligand, proteinGrid, bindingSiteDistance);
    const pocketResidues = extractResidues(pocketAtoms);

    // Only create a binding site if there are pocket residues
    if (pocketResidues.length > 0) {
      bindingSites.push({
        siteId,
        ligand,
        pocketResidues,
        pocketAtoms,
      });
      siteId++;
    }
  }

  return bindingSites;
}

/**
 * Create a spatial grid from protein atoms
 */
export function createProteinGrid(proteinAtoms: Atom[]): SpatialGrid {
  // Import here to avoid circular dependency
  const { buildSpatialGrid } = require('./spatialGrid');
  // Use a cell size slightly larger than typical interaction distance
  return buildSpatialGrid(proteinAtoms, 5.0);
}
