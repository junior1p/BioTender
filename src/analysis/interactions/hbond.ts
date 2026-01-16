/**
 * Hydrogen bond detection (simplified version without RDKit)
 * Uses geometric criteria and element-based donor/acceptor rules
 */

import { Atom, BindingSite, HbondInteraction } from '../../types/interaction';
import { SpatialGrid, findNeighbors, distance } from '../spatialGrid';

/**
 * Donor/acceptor rules for protein atoms
 * Format: resn:atomName -> {donor, acceptor, sideChain}
 */
const PROTEIN_DONOR_ACCEPTOR_RULES: Record<string, { donor: boolean; acceptor: boolean; sideChain: boolean }> = {
  // Backbone atoms (all amino acids)
  'BACKBONE:N': { donor: true, acceptor: false, sideChain: false },
  'BACKBONE:O': { donor: false, acceptor: true, sideChain: false },

  // Side chain donors/acceptors
  'SER:OG': { donor: true, acceptor: true, sideChain: true },
  'THR:OG1': { donor: true, acceptor: true, sideChain: true },
  'TYR:OH': { donor: true, acceptor: true, sideChain: true },
  'CYS:SG': { donor: true, acceptor: true, sideChain: true },
  'ASN:ND2': { donor: true, acceptor: false, sideChain: true },
  'ASN:OD1': { donor: false, acceptor: true, sideChain: true },
  'GLN:NE2': { donor: true, acceptor: false, sideChain: true },
  'GLN:OE1': { donor: false, acceptor: true, sideChain: true },
  'HIS:ND1': { donor: true, acceptor: true, sideChain: true },
  'HIS:NE2': { donor: true, acceptor: true, sideChain: true },
  'TRP:NE1': { donor: true, acceptor: true, sideChain: true },
  'ARG:NH1': { donor: true, acceptor: false, sideChain: true },
  'ARG:NH2': { donor: true, acceptor: false, sideChain: true },
  'ARG:NE': { donor: true, acceptor: false, sideChain: true },
  'LYS:NZ': { donor: true, acceptor: false, sideChain: true },
  'ASP:OD1': { donor: false, acceptor: true, sideChain: true },
  'ASP:OD2': { donor: false, acceptor: true, sideChain: true },
  'GLU:OE1': { donor: false, acceptor: true, sideChain: true },
  'GLU:OE2': { donor: false, acceptor: true, sideChain: true },

  // Water
  'HOH:O': { donor: true, acceptor: true, sideChain: false },
  'WAT:O': { donor: true, acceptor: true, sideChain: false },
};

/**
 * Get atom properties (donor/acceptor/sideChain) for protein atoms
 */
function getProteinAtomProperties(atom: Atom): { donor: boolean; acceptor: boolean; sideChain: boolean } {
  const atomName = atom.atomName.trim().toUpperCase();

  // Check backbone atoms
  if (atomName === 'N') {
    return { donor: true, acceptor: false, sideChain: false };
  }
  if (atomName === 'O' || atomName === 'OT1' || atomName === 'OXT') {
    return { donor: false, acceptor: true, sideChain: false };
  }

  // Check side chain atoms
  const key = `${atom.resn.toUpperCase()}:${atomName}`;
  if (PROTEIN_DONOR_ACCEPTOR_RULES[key]) {
    return PROTEIN_DONOR_ACCEPTOR_RULES[key];
  }

  // Fallback: element-based rules
  const element = atom.element.toUpperCase();
  if (element === 'N' || element === 'O') {
    return { donor: true, acceptor: true, sideChain: true };
  }
  if (element === 'S') {
    return { donor: true, acceptor: true, sideChain: true };
  }

  return { donor: false, acceptor: false, sideChain: false };
}

/**
 * Get atom properties for ligand atoms (simplified, element-based)
 */
function getLigandAtomProperties(atom: Atom): { donor: boolean; acceptor: boolean } {
  const element = atom.element.toUpperCase();

  // Simplified rules: N/O can be donors or acceptors, S can be acceptor
  if (element === 'N' || element === 'O') {
    return { donor: true, acceptor: true };
  }
  if (element === 'S') {
    return { donor: false, acceptor: true };
  }

  return { donor: false, acceptor: false };
}

/**
 * Find hydrogen bonds for a binding site
 */
export function findHbondInteractions(
  bindingSite: BindingSite,
  proteinGrid: SpatialGrid,
  maxDist: number
): HbondInteraction[] {
  const interactions: HbondInteraction[] = [];
  const { ligand, pocketAtoms } = bindingSite;

  let index = 1;

  // For each ligand atom that could be a donor or acceptor
  for (const ligandAtom of ligand.atoms) {
    const ligandProps = getLigandAtomProperties(ligandAtom);
    if (!ligandProps.donor && !ligandProps.acceptor) continue;

    // Find nearby protein atoms
    const neighbors = findNeighbors(proteinGrid, ligandAtom, maxDist);

    for (const proteinAtom of neighbors) {
      // Check if this protein atom is a donor or acceptor
      const proteinProps = getProteinAtomProperties(proteinAtom);
      if (!proteinProps.donor && !proteinProps.acceptor) continue;

      const dist = distance(ligandAtom, proteinAtom);
      if (dist > maxDist) continue;

      // Determine if this could be a hydrogen bond
      // Need one donor and one acceptor
      const proteinIsDonor = proteinProps.donor && ligandProps.acceptor;
      const ligandIsDonor = ligandProps.donor && proteinProps.acceptor;

      if (!proteinIsDonor && !ligandIsDonor) continue;

      // For MVP, we'll record all potential H-bonds
      // In a full implementation, we'd check angles and confirm hydrogen positions
      interactions.push({
        index: index++,
        residue: `${proteinAtom.resi} ${proteinAtom.chain}`,
        aa: proteinAtom.resn,
        distanceHA: 0,  // Not calculated in MVP (would need H positions)
        distanceDA: Number(dist.toFixed(3)),
        donorAngle: 0,  // Not calculated in MVP
        proteinDonor: proteinIsDonor,
        sideChain: proteinProps.sideChain,
        donorAtomSerial: proteinIsDonor ? proteinAtom.serial : ligandAtom.serial,
        acceptorAtomSerial: proteinIsDonor ? ligandAtom.serial : proteinAtom.serial,
        donorAtomName: proteinIsDonor ? proteinAtom.atomName : ligandAtom.atomName,
        acceptorAtomName: proteinIsDonor ? ligandAtom.atomName : proteinAtom.atomName,
      });
    }
  }

  // Sort by distance
  interactions.sort((a, b) => a.distanceDA - b.distanceDA);

  // Update indices after sorting
  interactions.forEach((interaction, i) => {
    interaction.index = i + 1;
  });

  return interactions;
}

/**
 * Export helper function for water bridge analysis
 */
export { getProteinAtomProperties };
