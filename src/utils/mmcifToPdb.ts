/**
 * mmCIF to PDB Converter Utility
 * Uses Mol* library to parse mmCIF files and export to PDB format
 */

export interface ConversionResult {
  success: boolean;
  pdbContent?: string;
  error?: string;
  stats?: {
    atomCount: number;
    chainCount: number;
    residueCount: number;
    hasLigands: boolean;
  };
}

export interface ConversionOptions {
  includeHydrogens?: boolean;
  preserveAltLoc?: boolean;
}

/**
 * Parse mmCIF content and convert to PDB format
 * This is a simplified parser that handles the most common mmCIF fields
 */
export async function convertMMCIFToPDB(
  mmcifContent: string,
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  try {
    const lines = mmcifContent.split('\n');

    // Find atom_site loop section
    let atomSiteLoopIndex = -1;
    let columnNames: string[] = [];

    // First pass: find the atom_site loop
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      // Look for loop_ followed by _atom_site.
      if (trimmed === 'loop_') {
        // Check if the next lines are atom_site columns
        let j = i + 1;
        let foundAtomSite = false;
        const tempColumns: string[] = [];

        while (j < lines.length && lines[j].trim().startsWith('_atom_site.')) {
          const colName = lines[j].trim().replace('_atom_site.', '');
          tempColumns.push(colName);
          foundAtomSite = true;
          j++;
        }

        if (foundAtomSite && tempColumns.length > 0) {
          atomSiteLoopIndex = i;
          columnNames = tempColumns;
          break;
        }
      }
    }

    if (atomSiteLoopIndex === -1 || columnNames.length === 0) {
      throw new Error('No atom_site category found in mmCIF file');
    }

    // Second pass: parse atom data starting after the column definitions
    const atomData: string[][] = [];
    let dataStartIndex = atomSiteLoopIndex + 1 + columnNames.length;

    for (let i = dataStartIndex; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      // Stop at empty line, comment, or new category/loop/data block
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('_') || trimmed.startsWith('data_') || trimmed.startsWith('loop_')) {
        break;
      }

      // Split by whitespace, respecting quotes
      const values = parseCifLine(trimmed);
      if (values.length > 0) {
        atomData.push(values);
      }
    }

    if (atomData.length === 0) {
      throw new Error('No atom data found in mmCIF file');
    }

    // Create column index map
    const colIndex: { [key: string]: number } = {};
    columnNames.forEach((name, idx) => {
      colIndex[name] = idx;
    });

    // Helper function to get field value
    const getField = (row: string[], fieldName: string, defaultValue: string = ''): string => {
      const idx = colIndex[fieldName];
      if (idx === undefined || idx >= row.length) return defaultValue;
      return row[idx] || defaultValue;
    };

    // Generate PDB format lines
    const pdbLines: string[] = [];
    const chains = new Set<string>();
    const residues = new Set<string>();
    let hetAtmCount = 0;

    for (let i = 0; i < atomData.length; i++) {
      const row = atomData[i];

      const groupPDB = getField(row, 'group_PDB', 'ATOM');
      const isHetAtom = groupPDB === 'HETATM';
      if (isHetAtom) hetAtmCount++;

      const recordName = isHetAtom ? 'HETATM' : 'ATOM';
      const serial = i + 1;
      const atomName = getField(row, 'label_atom_id', 'X');
      const altLoc = getField(row, 'label_alt_id', '');
      const resName = getField(row, 'label_comp_id', 'UNK');
      const chainID = getField(row, 'auth_asym_id', 'A').substring(0, 1) || 'A';
      const resSeq = parseInt(getField(row, 'auth_seq_id', '1')) || 1;
      const iCode = getField(row, 'pdbx_PDB_ins_code', '');

      const x = parseFloat(getField(row, 'Cartn_x', '0')) || 0;
      const y = parseFloat(getField(row, 'Cartn_y', '0')) || 0;
      const z = parseFloat(getField(row, 'Cartn_z', '0')) || 0;

      const occupancy = parseFloat(getField(row, 'occupancy', '1.0')) || 1.0;
      const tempFactor = parseFloat(getField(row, 'B_iso_or_equiv', '0.0')) || 0.0;
      const element = getField(row, 'type_symbol', 'C');
      const charge = getField(row, 'pdbx_formal_charge', '');

      // Track stats
      chains.add(chainID);
      residues.add(`${chainID}:${resSeq}:${resName.trim()}`);

      // Format PDB line according to specification
      // COLUMNS        DATA TYPE       FIELD           DEFINITION
      // -------------------------------------------------------------------------
      // 1 - 6          Record name     "ATOM  " or "HETATM"
      // 7 - 11         Integer         serial          Atom serial number
      // 13 - 16        Atom            name            Atom name
      // 17             Character       altLoc          Alternate location indicator
      // 18 - 20        Residue name    resName         Residue name
      // 22             Character       chainID         Chain identifier
      // 23 - 26        Integer         resSeq          Residue sequence number
      // 27             AChar           iCode           Code for insertion of residues
      // 31 - 38        Real(8.3)       x               Orthogonal coordinates for X
      // 39 - 46        Real(8.3)       y               Orthogonal coordinates for Y
      // 47 - 54        Real(8.3)       z               Orthogonal coordinates for Z
      // 55 - 60        Real(6.2)       occupancy       Occupancy
      // 61 - 66        Real(6.2)       tempFactor      Temperature factor
      // 77 - 78        LString(2)      element         Element symbol
      // 79 - 80        LString(2)      charge          Charge

      // Format atom name properly (4 chars, left-aligned for 4-char names, right-aligned for shorter)
      let formattedAtomName = atomName.substring(0, 4);
      if (formattedAtomName.length < 4) {
        // For short names, left-align is standard
        formattedAtomName = formattedAtomName.padEnd(4);
      }

      const pdbLine = [
        recordName.padEnd(6),                    // 1-6
        String(serial).padStart(5),              // 7-11
        ' ',                                     // 12
        formattedAtomName,                        // 13-16
        altLoc.substring(0, 1),                  // 17
        resName.substring(0, 3).padEnd(3),       // 18-20
        ' ',                                     // 21
        chainID.substring(0, 1),                 // 22
        String(resSeq).padStart(4),              // 23-26
        iCode.substring(0, 1),                   // 27
        '   ',                                   // 28-30
        x.toFixed(3).padStart(8),                // 31-38
        y.toFixed(3).padStart(8),                // 39-46
        z.toFixed(3).padStart(8),                // 47-54
        occupancy.toFixed(2).padStart(6),        // 55-60
        tempFactor.toFixed(2).padStart(6),       // 61-66
        '          ',                            // 67-76
        element.trim().substring(0, 2).padStart(2), // 77-78
        charge ? charge.substring(0, 2).padStart(2) : '  ', // 79-80
      ].join('');

      // Ensure exactly 80 characters
      pdbLines.push(pdbLine.padEnd(80).substring(0, 80));
    }

    // Add END record
    pdbLines.push('END'.padEnd(80));

    const pdbContent = pdbLines.join('\n');

    return {
      success: true,
      pdbContent,
      stats: {
        atomCount: atomData.length,
        chainCount: chains.size,
        residueCount: residues.size,
        hasLigands: hetAtmCount > 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Parse a CIF data line, handling quoted strings
 */
function parseCifLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = '';
    } else if (char === ' ' && !inQuotes) {
      if (current || values.length > 0) {
        values.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current || values.length > 0) {
    values.push(current);
  }

  // Handle single value (space in quoted string)
  if (values.length === 1 && values[0].startsWith("'") && values[0].endsWith("'")) {
    return [values[0].slice(1, -1)];
  }

  return values;
}

/**
 * Parse gzipped content using browser's DecompressionStream API
 */
export async function decompressGzip(arrayBuffer: ArrayBuffer): Promise<string> {
  // Check if DecompressionStream is supported
  if (!('DecompressionStream' in window)) {
    throw new Error('Gzip 压缩文件不支持：浏览器不支持 DecompressionStream API');
  }

  const blob = new Blob([arrayBuffer]);
  const ds = new DecompressionStream('gzip');
  const decompressedStream = blob.stream().pipeThrough(ds);
  const decompressedBlob = await new Response(decompressedStream).blob();
  return await decompressedBlob.text();
}

/**
 * Read file and handle potential gzip compression
 */
export async function readFileContent(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  // Check if file is gzipped (magic number: 0x1f 0x8b)
  const bytes = new Uint8Array(arrayBuffer.slice(0, 2));
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    // Gzipped file
    return await decompressGzip(arrayBuffer);
  }

  // Plain text file
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(arrayBuffer);
}
