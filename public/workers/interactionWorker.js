/**
 * Web Worker for molecular interaction analysis
 * Performs heavy computation off the main thread
 */

// Import analysis modules (will be inlined)
// For Next.js, we'll use a different approach with blob URLs

let analysisState = {
  status: 'idle',
  progress: 0,
  message: '',
};

// Worker message handler
self.onmessage = async function(e) {
  const { type, pdbContent, filename, params } = e.data;

  if (type !== 'analyze') {
    self.postMessage({ type: 'error', error: 'Unknown message type' });
    return;
  }

  try {
    const startTime = Date.now();

    // Send progress updates
    sendProgress('parsing', 5, 'Parsing PDB file...');

    // Import the analysis functions
    // Since we can't use ES modules in workers easily, we'll implement inline
    const result = await analyzePDB(pdbContent, filename, params, startTime);

    self.postMessage({ type: 'result', data: result });

  } catch (error) {
    console.error('Worker error:', error);
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
};

function sendProgress(status, progress, message, currentSite, totalSites) {
  self.postMessage({
    type: 'progress',
    data: { status, progress, message, currentSite, totalSites }
  });
}

// Inline analysis functions (simplified versions of the TypeScript modules)

// Constants
const EXCLUDED_RESIDUES = new Set([
  'HOH', 'WAT', 'DOD', 'NA', 'SOD', 'CL', 'CLA', 'MG', 'CA', 'K', 'POT',
  'ZN', 'FE', 'MN', 'CU', 'CO', 'NI', 'CD', 'BA', 'SR', 'BE', 'LI',
  'CS', 'AG', 'AU', 'HG', 'AL', 'GA', 'IN', 'TL', 'PB', 'BI', 'YB',
  'EU', 'SM', 'GD', 'TB', 'DY', 'Y', 'W', 'MO', 'V', 'CR', 'PT',
  'RU', 'RH', 'PD', 'OS', 'IR', 'XE', 'KR', 'F', 'BR', 'I', 'S',
]);

const HYDROPHOBIC_RESIDUES = new Set([
  'ALA', 'VAL', 'LEU', 'ILE', 'MET', 'PHE', 'TRP', 'PRO', 'TYR',
]);

// PDB Parser
function parseElementFromAtomName(atomName) {
  const trimmed = atomName.trim();
  let element = '';
  for (let i = trimmed.length - 1; i >= 0; i--) {
    const char = trimmed[i];
    if (!/\d/.test(char)) {
      element = char + element;
      if (element.length === 2 || i === 0) break;
    }
  }
  return element.length > 0
    ? element[0].toUpperCase() + (element[1]?.toLowerCase() || '')
    : 'C';
}

function parseAtomLine(line) {
  if (line.length < 54) return null;

  const recordName = line.substring(0, 6).trim();
  if (recordName !== 'ATOM' && recordName !== 'HETATM') return null;

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

    let element = line.substring(76, 78).trim();
    if (!element) {
      element = parseElementFromAtomName(atomName);
    }
    element = element[0].toUpperCase() + (element[1]?.toLowerCase() || '');

    if (element === 'H' || element === 'D') return null;

    return {
      serial, atomName, resn, chain, resi, x, y, z, element,
      hetflag: recordName === 'HETATM', altLoc
    };
  } catch (e) {
    return null;
  }
}

function parsePDB(pdbContent) {
  const lines = pdbContent.split('\n');
  const proteinAtoms = [];
  const ligandAtoms = [];
  const atomPositions = new Map();

  for (const line of lines) {
    const atom = parseAtomLine(line);
    if (!atom) continue;

    const posKey = `${atom.chain}:${atom.resi}:${atom.resn}:${atom.atomName}`;
    const existing = atomPositions.get(posKey);

    if (existing) {
      if (existing.altLoc === '' || existing.altLoc === 'A') continue;
      else if (atom.altLoc === '' || atom.altLoc === 'A') {
        atomPositions.set(posKey, atom);
      }
    } else {
      atomPositions.set(posKey, atom);
    }
  }

  for (const atom of atomPositions.values()) {
    if (atom.hetflag) {
      if (!EXCLUDED_RESIDUES.has(atom.resn.toUpperCase())) {
        ligandAtoms.push(atom);
      } else {
        proteinAtoms.push(atom);
      }
    } else {
      proteinAtoms.push(atom);
    }
  }

  return { proteinAtoms, ligandAtoms, allAtoms: [...proteinAtoms, ...ligandAtoms] };
}

// Spatial Grid
function buildSpatialGrid(atoms, cellSize = 5.0) {
  const grid = new Map();
  const bounds = {
    minX: Infinity, maxX: -Infinity,
    minY: Infinity, maxY: -Infinity,
    minZ: Infinity, maxZ: -Infinity,
  };

  for (const atom of atoms) {
    bounds.minX = Math.min(bounds.minX, atom.x);
    bounds.maxX = Math.max(bounds.maxX, atom.x);
    bounds.minY = Math.min(bounds.minY, atom.y);
    bounds.maxY = Math.max(bounds.maxY, atom.y);
    bounds.minZ = Math.min(bounds.minZ, atom.z);
    bounds.maxZ = Math.max(bounds.maxZ, atom.z);
  }

  for (const atom of atoms) {
    const ix = Math.floor(atom.x / cellSize);
    const iy = Math.floor(atom.y / cellSize);
    const iz = Math.floor(atom.z / cellSize);
    const key = `${ix},${iy},${iz}`;

    if (!grid.has(key)) grid.set(key, { atoms: [] });
    grid.get(key).atoms.push(atom);
  }

  return { cellSize, grid, bounds };
}

function findNeighbors(grid, atom, radius, excludeSerial) {
  const result = [];
  const { cellSize } = grid;
  const radiusSq = radius * radius;

  const minIx = Math.floor((atom.x - radius) / cellSize);
  const maxIx = Math.floor((atom.x + radius) / cellSize);
  const minIy = Math.floor((atom.y - radius) / cellSize);
  const maxIy = Math.floor((atom.y + radius) / cellSize);
  const minIz = Math.floor((atom.z - radius) / cellSize);
  const maxIz = Math.floor((atom.z + radius) / cellSize);

  for (let ix = minIx; ix <= maxIx; ix++) {
    for (let iy = minIy; iy <= maxIy; iy++) {
      for (let iz = minIz; iz <= maxIz; iz++) {
        const key = `${ix},${iy},${iz}`;
        const cell = grid.grid.get(key);
        if (!cell) continue;

        for (const other of cell.atoms) {
          if (other.serial === excludeSerial) continue;
          const dx = other.x - atom.x;
          const dy = other.y - atom.y;
          const dz = other.z - atom.z;
          const distSq = dx * dx + dy * dy + dz * dz;
          if (distSq <= radiusSq && distSq > 0.0001) {
            result.push({ atom: other, distance: Math.sqrt(distSq) });
          }
        }
      }
    }
  }

  return result;
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Binding Site Detection
function detectBindingSites(proteinAtoms, ligandAtoms, proteinGrid, bindingSiteDistance) {
  const bindingSites = [];
  const ligandMap = new Map();

  for (const atom of ligandAtoms) {
    const key = `${atom.chain}:${atom.resi}:${atom.resn}`;
    if (!ligandMap.has(key)) ligandMap.set(key, []);
    ligandMap.get(key).push(atom);
  }

  let siteId = 1;
  for (const [key, atoms] of ligandMap) {
    const [chain, resi, resn] = key.split(':');
    const ligand = {
      siteId,
      chain,
      resi: parseInt(resi),
      resn,
      atoms,
      type: resn.toUpperCase() === 'HOH' || resn.toUpperCase() === 'WAT' ? 'WATER' : 'SMALLMOLECULE'
    };

    if (ligand.type === 'WATER') continue;

    const pocketAtomsSet = new Set();
    for (const ligandAtom of atoms) {
      const neighbors = findNeighbors(proteinGrid, ligandAtom, bindingSiteDistance, ligandAtom.serial);
      for (const n of neighbors) {
        pocketAtomsSet.add(n.atom);
      }
    }

    const pocketAtoms = Array.from(pocketAtomsSet);
    const residueMap = new Map();
    for (const atom of pocketAtoms) {
      const rKey = `${atom.chain}:${atom.resi}:${atom.resn}`;
      if (!residueMap.has(rKey)) {
        residueMap.set(rKey, { chain: atom.chain, resi: atom.resi, resn: atom.resn });
      }
    }

    const pocketResidues = Array.from(residueMap.values()).sort((a, b) => {
      if (a.chain !== b.chain) return a.chain.localeCompare(b.chain);
      return a.resi - b.resi;
    });

    if (pocketResidues.length > 0) {
      bindingSites.push({ siteId, ligand, pocketResidues, pocketAtoms });
      siteId++;
    }
  }

  return bindingSites;
}

// Hydrophobic Interactions
function findHydrophobicInteractions(bindingSite, proteinGrid, maxDist) {
  const interactions = [];
  const { ligand, pocketAtoms } = bindingSite;
  const seen = new Set();
  let index = 1;

  const hydrophobicPocketAtoms = pocketAtoms.filter(a =>
    HYDROPHOBIC_RESIDUES.has(a.resn.toUpperCase())
  );

  for (const ligandAtom of ligand.atoms) {
    const neighbors = findNeighbors(proteinGrid, ligandAtom, maxDist, ligandAtom.serial);

    for (const { atom: proteinAtom, distance: dist } of neighbors) {
      if (!HYDROPHOBIC_RESIDUES.has(proteinAtom.resn.toUpperCase())) continue;
      if (dist > maxDist) continue;

      const key = `${proteinAtom.chain}:${proteinAtom.resi}:${proteinAtom.resn}:${ligandAtom.serial}`;
      if (seen.has(key)) continue;
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

  interactions.sort((a, b) => a.distance - b.distance);
  interactions.forEach((int, i) => int.index = i + 1);
  return interactions;
}

// H-bond Interactions
function findHbondInteractions(bindingSite, proteinGrid, maxDist) {
  const interactions = [];
  const { ligand, pocketAtoms } = bindingSite;
  let index = 1;

  const proteinDonorAcceptors = new Map();
  for (const atom of pocketAtoms) {
    const atomName = atom.atomName.trim().toUpperCase();
    let isDonor = false;
    let isAcceptor = false;
    let isSideChain = true;

    if (atomName === 'N') {
      isDonor = true;
      isSideChain = false;
    } else if (atomName === 'O' || atomName === 'OT1' || atomName === 'OXT') {
      isAcceptor = true;
      isSideChain = false;
    } else {
      const element = atom.element.toUpperCase();
      if (element === 'N' || element === 'O' || element === 'S') {
        isDonor = true;
        isAcceptor = true;
      }
    }

    if (isDonor || isAcceptor) {
      proteinDonorAcceptors.set(atom.serial, { isDonor, isAcceptor, isSideChain, atom });
    }
  }

  for (const ligandAtom of ligand.atoms) {
    const element = ligandAtom.element.toUpperCase();
    const ligandIsDonor = element === 'N' || element === 'O';
    const ligandIsAcceptor = element === 'O' || element === 'N' || element === 'S';

    if (!ligandIsDonor && !ligandIsAcceptor) continue;

    const neighbors = findNeighbors(proteinGrid, ligandAtom, maxDist, ligandAtom.serial);

    for (const { atom: proteinAtom, distance: dist } of neighbors) {
      const props = proteinDonorAcceptors.get(proteinAtom.serial);
      if (!props) continue;

      const proteinIsDonor = props.isDonor && ligandIsAcceptor;
      const ligandActsAsDonor = ligandIsDonor && props.isAcceptor;

      if (!proteinIsDonor && !ligandActsAsDonor) continue;
      if (dist > maxDist) continue;

      interactions.push({
        index: index++,
        residue: `${proteinAtom.resi} ${proteinAtom.chain}`,
        aa: proteinAtom.resn,
        distanceHA: 0,
        distanceDA: Number(dist.toFixed(3)),
        donorAngle: 0,
        proteinDonor: proteinIsDonor,
        sideChain: props.isSideChain,
        donorAtomSerial: proteinIsDonor ? proteinAtom.serial : ligandAtom.serial,
        acceptorAtomSerial: proteinIsDonor ? ligandAtom.serial : proteinAtom.serial,
        donorAtomName: proteinIsDonor ? proteinAtom.atomName : ligandAtom.atomName,
        acceptorAtomName: proteinIsDonor ? ligandAtom.atomName : proteinAtom.atomName,
      });
    }
  }

  interactions.sort((a, b) => a.distanceDA - b.distanceDA);
  interactions.forEach((int, i) => int.index = i + 1);
  return interactions;
}

// Water bridge interactions (simplified - returns empty)
function findWaterbridgeInteractions() {
  return [];
}

// Main analysis function
async function analyzePDB(pdbContent, filename, params, startTime) {
  // Parse PDB
  sendProgress('parsing', 10, 'Parsing PDB file...');
  const { proteinAtoms, ligandAtoms, allAtoms } = parsePDB(pdbContent);

  if (ligandAtoms.length === 0) {
    throw new Error('No ligands found in PDB file');
  }

  // Build spatial grid
  sendProgress('building-grid', 20, 'Building spatial index...');
  const proteinGrid = buildSpatialGrid(proteinAtoms, 5.0);

  // Find binding sites
  sendProgress('finding-sites', 30, 'Detecting binding sites...');
  const bindingSites = detectBindingSites(
    proteinAtoms,
    ligandAtoms,
    proteinGrid,
    params.bindingSiteDistance
  );

  if (bindingSites.length === 0) {
    throw new Error('No binding sites found');
  }

  // Analyze each binding site
  const interactions = [];
  let totalHydrophobic = 0;
  let totalHbond = 0;

  for (let i = 0; i < bindingSites.length; i++) {
    const site = bindingSites[i];
    sendProgress(
      'analyzing-hydrophobic',
      40 + (i / bindingSites.length) * 20,
      `Analyzing site ${i + 1}/${bindingSites.length}...`,
      i + 1,
      bindingSites.length
    );

    const hydrophobic = findHydrophobicInteractions(site, proteinGrid, params.hydrophobicMaxDist);
    totalHydrophobic += hydrophobic.length;

    sendProgress(
      'analyzing-hbond',
      60 + (i / bindingSites.length) * 20,
      `Analyzing H-bonds for site ${i + 1}...`,
      i + 1,
      bindingSites.length
    );

    const hbond = findHbondInteractions(site, proteinGrid, params.hbondMaxDist);
    totalHbond += hbond.length;

    const waterbridge = findWaterbridgeInteractions();

    interactions.push({
      siteId: site.siteId,
      ligand: site.ligand,
      hydrophobic,
      hbond,
      waterbridge,
      saltbridge: [],
      pistacking: [],
      pication: [],
      halogenbond: [],
    });
  }

  sendProgress('complete', 100, 'Analysis complete');

  const endTime = Date.now();

  return {
    success: true,
    filename,
    timestamp: Date.now(),
    params,
    ligands: bindingSites.map(s => s.ligand),
    bindingSites,
    interactions,
    stats: {
      totalAtoms: allAtoms.length,
      proteinAtoms: proteinAtoms.length,
      ligandAtoms: ligandAtoms.length,
      totalSites: bindingSites.length,
      totalHydrophobic,
      totalHbond,
      totalWaterbridge: 0,
      analysisTime: endTime - startTime,
    },
  };
}
