/**
 * Hydrophobic interaction detection
 * Finds close contacts between ligand atoms and hydrophobic residues
 */

import { Atom, BindingSite, HydrophobicInteraction, Ligand } from '../../types/interaction';
import { SpatialGrid, findNeighbors, distance } from '../spatialGrid';
import { HYDROPHOBIC_RESIDUES } from '../pdbParser';

/**
 * Check if a residue is hydrophobic
 */
function isHydrophobicResidue(resn: string): boolean {
  return HYDROPHOBIC_RESIDUES.has(resn.toUpperCase());
}

/**
 * Find hydrophobic interactions for a binding site
 */
export function findHydrophobicInteractions(
  bindingSite: BindingSite,
  proteinGrid: SpatialGrid,
  maxDist: number
): HydrophobicInteraction[] {
  const interactions: HydrophobicInteraction[] = [];
  const { ligand, pocketResidues, pocketAtoms } = bindingSite;

  // Build a map of pocket atoms by residue for quick lookup
  const pocketAtomsByResidue = new Map<string, Atom[]>();
  for (const atom of pocketAtoms) {
    const key = `${atom.chain}:${atom.resi}:${atom.resn}`;
    if (!pocketAtomsByResidue.has(key)) {
      pocketAtomsByResidue.set(key, []);
    }
    pocketAtomsByResidue.get(key)!.push(atom);
  }

  // Find hydrophobic pocket residues
  const hydrophobicResidues = pocketResidues.filter(r => isHydrophobicResidue(r.resn));

  let index = 1;

  // For each hydrophobic residue, find closest ligand atom
  for (const residue of hydrophobicResidues) {
    const residueKey = `${residue.chain}:${residue.resi}:${residue.resn}`;
    const residueAtoms = pocketAtomsByResidue.get(residueKey);

    if (!residueAtoms || residueAtoms.length === 0) continue;

    // Find the closest pair of atoms
    let minDistance = Infinity;
    let closestLigandAtom: Atom | null = null;
    let closestProteinAtom: Atom | null = null;

    for (const ligandAtom of ligand.atoms) {
      // Get neighbors of ligand atom within max distance
      const neighbors = findNeighbors(proteinGrid, ligandAtom, maxDist);

      for (const proteinAtom of neighbors) {
        // Only consider atoms from this residue
        if (proteinAtom.chain !== residue.chain ||
            proteinAtom.resi !== residue.resi ||
            proteinAtom.resn !== residue.resn) {
          continue;
        }

        const dist = distance(ligandAtom, proteinAtom);
        if (dist < minDistance) {
          minDistance = dist;
          closestLigandAtom = ligandAtom;
          closestProteinAtom = proteinAtom;
        }
      }
    }

    // If we found a close contact, record it
    if (closestLigandAtom && closestProteinAtom && minDistance <= maxDist) {
      interactions.push({
        index: index++,
        residue: `${closestProteinAtom.resi} ${closestProteinAtom.chain}`,
        aa: closestProteinAtom.resn,
        distance: Number(minDistance.toFixed(3)),
        ligandAtomSerial: closestLigandAtom.serial,
        proteinAtomSerial: closestProteinAtom.serial,
        ligandAtomName: closestLigandAtom.atomName,
        proteinAtomName: closestProteinAtom.atomName,
      });
    }
  }

  // Sort by distance
  interactions.sort((a, b) => a.distance - b.distance);

  // Update indices after sorting
  interactions.forEach((interaction, i) => {
    interaction.index = i + 1;
  });

  return interactions;
}

/**
 * Alternative approach: find hydrophobic interactions by atom-atom contact
 * This version may find multiple interactions per residue
 */
export function findHydrophobicInteractionsByAtom(
  bindingSite: BindingSite,
  proteinGrid: SpatialGrid,
  maxDist: number
): HydrophobicInteraction[] {
  const interactions: HydrophobicInteraction[] = new Array();
  const { ligand, pocketAtoms } = bindingSite;
  const seen = new Set<string>();

  let index = 1;

  // Filter pocket atoms to only hydrophobic residues
  const hydrophobicPocketAtoms = pocketAtoms.filter(atom =>
    isHydrophobicResidue(atom.resn)
  );

  // For each ligand atom, find close hydrophobic atoms
  for (const ligandAtom of ligand.atoms) {
    const neighbors = findNeighbors(proteinGrid, ligandAtom, maxDist);

    for (const proteinAtom of neighbors) {
      // Only consider atoms from hydrophobic residues
      if (!isHydrophobicResidue(proteinAtom.resn)) continue;

      const dist = distance(ligandAtom, proteinAtom);
      if (dist <= maxDist) {
        // Create a unique key for this interaction
        const key = `${proteinAtom.chain}:${proteinAtom.resi}:${proteinAtom.resn}:${ligandAtom.serial}`;

        if (!seen.has(key)) {
          seen.add(key);
          interactions.push({
            index: index++,
            residue: `${proteinAtom.resi} ${proteinAtom.chain}`,
            aa: proteinAtom.resn,
            distance: Number(dist.toFixed(3)),
            ligandAtomSerial: ligandAtom.serial,
            proteinAtomSerial: proteinAtom.serial,
            ligandAtomName: ligandAtom.atomName,
            proteinAtomName: proteinAtom.atomName,
          });
        }
      }
    }
  }

  // Sort by distance
  interactions.sort((a, b) => a.distance - b.distance);

  // Update indices after sorting
  interactions.forEach((interaction, i) => {
    interaction.index = i + 1;
  });

  return interactions;
}
