/**
 * Spatial grid indexing for fast neighbor queries
 * Uses a 3D grid to avoid O(N^2) distance calculations
 */

import { Atom } from '../types/interaction';
export { distance, distanceSquared } from './pdbParser';

export interface GridCell {
  atoms: Atom[];
}

export interface SpatialGrid {
  cellSize: number;
  grid: Map<string, GridCell>;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
}

/**
 * Get grid cell key for a position
 */
function getCellKey(x: number, y: number, z: number, cellSize: number): string {
  const ix = Math.floor(x / cellSize);
  const iy = Math.floor(y / cellSize);
  const iz = Math.floor(z / cellSize);
  return `${ix},${iy},${iz}`;
}

/**
 * Build spatial grid from atoms
 */
export function buildSpatialGrid(atoms: Atom[], cellSize: number = 5.0): SpatialGrid {
  const grid = new Map<string, GridCell>();
  const bounds = {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity,
  };

  // First pass: find bounds
  for (const atom of atoms) {
    bounds.minX = Math.min(bounds.minX, atom.x);
    bounds.maxX = Math.max(bounds.maxX, atom.x);
    bounds.minY = Math.min(bounds.minY, atom.y);
    bounds.maxY = Math.max(bounds.maxY, atom.y);
    bounds.minZ = Math.min(bounds.minZ, atom.z);
    bounds.maxZ = Math.max(bounds.maxZ, atom.z);
  }

  // Second pass: insert atoms into grid
  for (const atom of atoms) {
    const key = getCellKey(atom.x, atom.y, atom.z, cellSize);
    if (!grid.has(key)) {
      grid.set(key, { atoms: [] });
    }
    grid.get(key)!.atoms.push(atom);
  }

  return { cellSize, grid, bounds };
}

/**
 * Get neighboring cells within a radius
 */
function getNeighborCells(
  grid: SpatialGrid,
  x: number,
  y: number,
  z: number,
  radius: number
): GridCell[] {
  const cells: GridCell[] = [];
  const { cellSize } = grid;

  // Calculate range of cells to check
  const minIx = Math.floor((x - radius) / cellSize);
  const maxIx = Math.floor((x + radius) / cellSize);
  const minIy = Math.floor((y - radius) / cellSize);
  const maxIy = Math.floor((y + radius) / cellSize);
  const minIz = Math.floor((z - radius) / cellSize);
  const maxIz = Math.floor((z + radius) / cellSize);

  for (let ix = minIx; ix <= maxIx; ix++) {
    for (let iy = minIy; iy <= maxIy; iy++) {
      for (let iz = minIz; iz <= maxIz; iz++) {
        const key = `${ix},${iy},${iz}`;
        const cell = grid.grid.get(key);
        if (cell) {
          cells.push(cell);
        }
      }
    }
  }

  return cells;
}

/**
 * Find all atoms within a given radius of a point
 */
export function findAtomsWithinRadius(
  grid: SpatialGrid,
  x: number,
  y: number,
  z: number,
  radius: number
): Atom[] {
  const radiusSquared = radius * radius;
  const result: Atom[] = [];

  const neighborCells = getNeighborCells(grid, x, y, z, radius);

  for (const cell of neighborCells) {
    for (const atom of cell.atoms) {
      const dx = atom.x - x;
      const dy = atom.y - y;
      const dz = atom.z - z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq <= radiusSquared && distSq > 0.0001) {  // Exclude self (dist > 0)
        result.push(atom);
      }
    }
  }

  return result;
}

/**
 * Find all atoms within a given radius of another atom
 */
export function findNeighbors(
  grid: SpatialGrid,
  atom: Atom,
  radius: number,
  excludeAtomSerial?: number
): Atom[] {
  const result = findAtomsWithinRadius(grid, atom.x, atom.y, atom.z, radius);

  // Optionally exclude the query atom itself
  if (excludeAtomSerial !== undefined) {
    return result.filter(a => a.serial !== excludeAtomSerial);
  }

  return result;
}

/**
 * Find the closest atom within a radius
 */
export function findClosestAtom(
  grid: SpatialGrid,
  x: number,
  y: number,
  z: number,
  radius: number,
  excludeAtomSerial?: number
): { atom: Atom; distance: number } | null {
  const radiusSquared = radius * radius;
  let closest: { atom: Atom; distance: number } | null = null;

  const neighborCells = getNeighborCells(grid, x, y, z, radius);

  for (const cell of neighborCells) {
    for (const atom of cell.atoms) {
      if (excludeAtomSerial !== undefined && atom.serial === excludeAtomSerial) {
        continue;
      }

      const dx = atom.x - x;
      const dy = atom.y - y;
      const dz = atom.z - z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq <= radiusSquared && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        if (!closest || dist < closest.distance) {
          closest = { atom, distance: dist };
        }
      }
    }
  }

  return closest;
}
