const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

// Transpõe uma nota N semitons
export function transposeNote(note, steps) {
  const i = NOTES.indexOf(note);
  if (i === -1) return note;
  return NOTES[((i + steps) % 12 + 12) % 12];
}

// Transpõe um acorde completo (ex: "D/F#", "Em7", "Bb7M", "C#m7")
export function transposeChord(chord, steps) {
  if (steps === 0) return chord;
  return chord
    .replace(/^[A-G]b/, match => {
      // converte bemol para sustenido antes de transpor
      const enharmonic = { 'Db':'C#','Eb':'D#','Fb':'E','Gb':'F#','Ab':'G#','Bb':'A#','Cb':'B' };
      return enharmonic[match] || match;
    })
    .replace(/^[A-G]#?/, match => transposeNote(match, steps))
    .replace(/\/[A-G]b/, match => {
      const enharmonic = { '/Db':'/C#','/Eb':'/D#','/Fb':'/E','/Gb':'/F#','/Ab':'/G#','/Bb':'/A#','/Cb':'/B' };
      return enharmonic[match] || match;
    })
    .replace(/\/[A-G]#?/, match => '/' + transposeNote(match.slice(1), steps));
}

// Transpõe o tom base
export function transposeTom(tom, steps) {
  if (!tom) return '';
  return tom.trim().replace(/^[A-G]#?/, match => transposeNote(match, steps));
}

// Detecta se uma linha é uma linha de acordes puros
// Exemplos que devem retornar true: "G  D  Em  C", "Bb7M  F7M", "Am7/D",
// "A6(9)", "F#m11/A", "Bm11", "C7(b9)"
export function isChordLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Token de acorde: nota + acidente opcional + qualidade opcional (m, M,
  // maj, min, dim, aug, sus, add) + até 2 dígitos de extensão (6,7,9,11,13)
  // + sufixo M opcional (ex: 7M) + alterações entre parênteses (ex: (9),
  // (b9), (#11)) + baixo opcional após barra
  const chordTokenRegex = /^[A-G](?:b|#)?(?:maj|min|dim|aug|sus|add|M|m)?\d{0,2}M?(?:\([^)]*\))*(?:\/[A-G](?:b|#)?)?$/;

  const tokens = trimmed.split(/\s+/);
  if (tokens.length === 0) return false;

  // Todos os tokens devem ser acordes válidos
  return tokens.every(token => chordTokenRegex.test(token));
}

// Transpõe todos os acordes de uma linha de acordes
export function transposeChordLine(line, steps) {
  if (steps === 0) return line;
  return line.replace(/[A-G](?:b|#)?(?:maj|min|dim|aug|sus|add|M|m)?\d{0,2}M?(?:\([^)]*\))*(?:\/[A-G](?:b|#)?)?/g, chord => transposeChord(chord, steps));
}

// Parseia o texto da cifra e retorna array de pares { type, ... }
// Suporta dois formatos:
//   1. Formato colchete: [G]texto [D]outro
//   2. Formato brasileiro: linha de acordes / linha de texto
export function parsePairs(cifraText, steps) {
  const rawLines = (cifraText || '').split('\n');
  const result = [];

  let i = 0;
  while (i < rawLines.length) {
    const line = rawLines[i];

    // Linha em branco
    if (!line.trim()) {
      result.push({ type: 'blank' });
      i++;
      continue;
    }

    // Ignora linhas de metadados como "Tom: F", "Tom - F", "TOM: F#"
    if (/^Tom\s*[:\-]?\s*[A-G]/i.test(line.trim())) {
      i++;
      continue;
    }

    // Formato colchete: contém [X]
    if (/\[[^\]]+\]/.test(line)) {
      // NÃO grava steps aqui — a renderização usa steps do estado
      result.push({ type: 'inline', line });
      i++;
      continue;
    }

    // Formato brasileiro: linha de acordes seguida de linha de texto
    if (isChordLine(line)) {
      const nextLine = rawLines[i + 1];
      if (nextLine !== undefined && nextLine.trim() && !isChordLine(nextLine) && !/^Tom\s*:/i.test(nextLine)) {
        result.push({
          type: 'chord-text',
          chordLine: transposeChordLine(line, steps),
          textLine: nextLine,
        });
        i += 2;
        continue;
      }
      result.push({
        type: 'chord-only',
        chordLine: transposeChordLine(line, steps),
      });
      i++;
      continue;
    }

    // Texto puro
    result.push({ type: 'text', line });
    i++;
  }

  return result;
}

// Parseia seções (blocos separados por linha em branco)
export function parseSections(cifraText) {
  const sectionLabels = [
    "Verso 1","Pré-Refrão","Refrão","Verso 2","Ponte","Refrão Final","Outro"
  ];
  const lines = (cifraText || '').split('\n');
  const sections = [];
  let currentLines = [];
  let sectionIndex = 0;

  lines.forEach(line => {
    if (!line.trim()) {
      if (currentLines.length > 0) {
        sections.push({
          label: sectionLabels[sectionIndex] || 'Outro',
          lines: currentLines,
        });
        sectionIndex++;
        currentLines = [];
      }
    } else {
      currentLines.push(line);
    }
  });

  if (currentLines.length > 0) {
    sections.push({
      label: sectionLabels[sectionIndex] || 'Outro',
      lines: currentLines,
    });
  }

  return sections;
}

// Parseia uma linha no formato colchete [G]texto
export function parseLineParts(line, steps) {
  const regex = /\[([^\]]+)\]/g;
  const segments = [];
  let last = 0, m;

  while ((m = regex.exec(line)) !== null) {
    if (m.index > last) segments.push({ type: 'text', val: line.slice(last, m.index) });
    segments.push({ type: 'chord', val: transposeChord(m[1], steps) });
    last = m.index + m[0].length;
  }
  if (last < line.length) segments.push({ type: 'text', val: line.slice(last) });

  const pairs = [];
  let i = 0;
  while (i < segments.length) {
    if (segments[i].type === 'chord') {
      const text = segments[i+1]?.type === 'text' ? segments[i+1].val : '';
      pairs.push({ chord: segments[i].val, text });
      i += segments[i+1]?.type === 'text' ? 2 : 1;
    } else {
      pairs.push({ chord: null, text: segments[i].val });
      i++;
    }
  }
  return pairs.length > 0 ? pairs : [{ chord: null, text: line }];
}

// Cores por seção
export const SECTION_COLORS = {
  "Verso 1":     "#28a888",
  "Verso 2":     "#28a888",
  "Pré-Refrão":  "#4878c8",
  "Refrão":      "#c9a84c",
  "Refrão Final":"#c9a84c",
  "Ponte":       "#8048c8",
  "Outro":       "#888888",
};

export const ALL_TOMS = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

// Extrai o tom da linha "Tom: X" dentro do texto da cifra
// Retorna o tom (ex: "F", "A#", "G") ou null se não encontrar
export function extractTomFromCifra(cifraText) {
  if (!cifraText) return null;
  const lines = cifraText.split('\n');
  for (const line of lines) {
    const match = line.trim().match(/^Tom\s*[:\-]?\s*([A-G][#b]?)/i);
    if (match) {
      // Normaliza bemol para sustenido
      const enharmonic = {
        'Db':'C#','Eb':'D#','Fb':'E','Gb':'F#',
        'Ab':'G#','Bb':'A#','Cb':'B'
      };
      const tom = match[1];
      return enharmonic[tom] || tom;
    }
  }
  return null;
}

export function stepsParaTom(tomOriginal, tomDestino) {
  const orig = ALL_TOMS.indexOf(tomOriginal?.trim());
  const dest = ALL_TOMS.indexOf(tomDestino?.trim());
  if (orig === -1 || dest === -1) return 0;
  return ((dest - orig) + 12) % 12;
}
