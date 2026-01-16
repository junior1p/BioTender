/**
 * Water bridge detection (simplified version)
 * Finds water-mediated interactions between protein and ligand
 */

import { Atom, BindingSite, WaterbridgeInteraction } from '../../types/interaction';
import { SpatialGrid, findNeighbors, distance } from '../spatialGrid';
import { getProteinAtomProperties } from './hbond';

/**
 * Find water bridge interactions for a binding site
 */
export function findWaterbridgeInteractions(
  bindingSite: BindingSite,
  proteinGrid: SpatialGrid,
  waterGrid: SpatialGrid,
  maxDist: number
): WaterbridgeInteraction[] {
  const interactions: WaterbridgeInteraction[] = [];
  const { ligand, pocketAtoms } = bindingSite;

  let index = 1;

  // Find all water oxygen atoms (HOH/WAT/DOD residue with O atom)
  const waterAtoms = waterGrid.grid.values().flatMap(cell =>
    cell.atoms.filter(atom => {
      const resn = atom.resn.toUpperCase();
      return (resn === 'HOH' || resn === 'WAT' || resn === 'DOD') &&
             atom.element.toUpperCase() === 'O';
    })
  );

  // For each ligand atom that could be a donor or acceptor
  for (const ligandAtom of ligand.atoms) {
    const element = ligandAtom.element.toUpperCase();
    if (element !== 'N' && element !== 'O' && element !== 'S') continue;

    // Find nearby water molecules
    for (const waterAtom of waterAtoms) {
      const ligandWaterDist = distance(ligandAtom, waterAtom);
      if (ligandWaterDist > maxDist) continue;

      // Find protein atoms that could interact with this water
      const proteinNeighbors = findNeighbors(proteinGrid, waterAtom, maxDist);

      for (const proteinAtom of proteinNeighbors) {
        const proteinProps = getProteinAtomProperties(proteinAtom);
        if (!proteinProps.donor && !proteinProps.acceptor) continue;

        const proteinWaterDist = distance(proteinAtom, waterAtom);
        if (proteinWaterDist > maxDist) continue;

        // Determine if this is a valid water bridge
        // We need: protein - water - ligand with donor/acceptor pattern
        // For MVP, we'll be permissive and check if both distances are within cutoff

        const proteinIsDonor = proteinProps.donor;

        // Check if ligand atom could be acceptor or donor
        const ligandIsAcceptor = element === 'O' || element === 'N' || element === 'S';
        const ligandIsDonor = element === 'N' || element === 'O';

        // Valid bridge: protein donor - water - ligand acceptor OR ligand donor - water - protein acceptor
        const isValidBridge = (proteinIsDonor && ligandIsAcceptor) ||
                              (!proteinIsDonor && proteinProps.acceptor && ligandIsDonor);

        if (!isValidBridge) continue;

        interactions.push({
          index: index++,
          residue: `${proteinAtom.resi} ${proteinAtom.chain}`,
          aa: proteinAtom.resn,
          distanceAW: Number(ligandWaterDist.toFixed(3)),
          distanceDW: Number(proteinWaterDist.toFixed(3)),
          donorAngle: 0,  // Not calculated in MVP
          waterAngle: 0,  // Not calculated in MVP
          proteinDonor: proteinIsDonor,
          donorAtomSerial: proteinIsDonor ? proteinAtom.serial : ligandAtom.serial,
          acceptorAtomSerial: proteinIsDonor ? ligandAtom.serial : proteinAtom.serial,
          waterAtomSerial: waterAtom.serial,
          donorAtomName: proteinIsDonor ? proteinAtom.atomName : ligandAtom.atomName,
          acceptorAtomName: proteinIsDonor ? ligandAtom.atomName : proteinAtom.atomName,
          waterAtomName: waterAtom.atomName,
        });
      }
    }
  }

  // Sort by combined distance
  interactions.sort((a, b) => {
    const distA = a.distanceAW + a.distanceDW;
    const distB = b.distanceAW + b.distanceDW;
    return distA - distB;
  });

  // Update indices after sorting
  interactions.forEach((interaction, i) => {
    interaction.index = i + 1;
  });

  return interactions;
}

/**
 * Create a simplified version that returns empty results for MVP
 */
export function findWaterbridgeInteractionsSimple(
  bindingSite: BindingSite,
  proteinGrid: SpatialGrid,
  waterGrid: SpatialGrid,
  maxDist: number
): WaterbridgeInteraction[] {
  // For MVP, return empty array to avoid computational complexity
  // Full implementation requires finding water atoms and checking geometric constraints
  return [];
}
