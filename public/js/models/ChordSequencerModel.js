const CHORD_STORAGE_KEY = 'wifi_midi_chord_sequencer_v3';

const ROOT_OFFSETS = Object.freeze({
    C: 0, 'B#': 0,
    'C#': 1, Db: 1,
    D: 2,
    'D#': 3, Eb: 3,
    E: 4, Fb: 4,
    F: 5, 'E#': 5,
    'F#': 6, Gb: 6,
    G: 7,
    'G#': 8, Ab: 8,
    A: 9,
    'A#': 10, Bb: 10,
    B: 11, Cb: 11,
});

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const CHORD_FORMULAS = Object.freeze({
    '': [0, 4, 7],
    maj: [0, 4, 7],
    M: [0, 4, 7],
    m: [0, 3, 7],
    min: [0, 3, 7],
    '-': [0, 3, 7],
    dim: [0, 3, 6],
    o: [0, 3, 6],
    aug: [0, 4, 8],
    '+': [0, 4, 8],
    sus2: [0, 2, 7],
    sus4: [0, 5, 7],
    sus: [0, 5, 7],
    '5': [0, 7],
    '6': [0, 4, 7, 9],
    m6: [0, 3, 7, 9],
    '7': [0, 4, 7, 10],
    dom7: [0, 4, 7, 10],
    maj7: [0, 4, 7, 11],
    M7: [0, 4, 7, 11],
    m7: [0, 3, 7, 10],
    min7: [0, 3, 7, 10],
    '-7': [0, 3, 7, 10],
    mMaj7: [0, 3, 7, 11],
    dim7: [0, 3, 6, 9],
    m7b5: [0, 3, 6, 10],
    'ø7': [0, 3, 6, 10],
    '7sus4': [0, 5, 7, 10],
    '7b9': [0, 4, 7, 10, 13],
    '7#9': [0, 4, 7, 10, 15],
    '9': [0, 4, 7, 10, 14],
    maj9: [0, 4, 7, 11, 14],
    m9: [0, 3, 7, 10, 14],
    add9: [0, 4, 7, 14],
    madd9: [0, 3, 7, 14],
    '11': [0, 4, 7, 10, 14, 17],
    m11: [0, 3, 7, 10, 14, 17],
    '13': [0, 4, 7, 10, 14, 21],
    maj13: [0, 4, 7, 11, 14, 21],
});

const MUSICXML_KIND_MAP = Object.freeze({
    major: '',
    minor: 'm',
    augmented: 'aug',
    diminished: 'dim',
    dominant: '7',
    'major-seventh': 'maj7',
    'minor-seventh': 'm7',
    'diminished-seventh': 'dim7',
    'half-diminished': 'm7b5',
    'major-minor': 'mMaj7',
    'major-sixth': '6',
    'minor-sixth': 'm6',
    'dominant-ninth': '9',
    'major-ninth': 'maj9',
    'minor-ninth': 'm9',
    'dominant-11th': '11',
    'minor-11th': 'm11',
    'dominant-13th': '13',
    'major-13th': 'maj13',
    'suspended-second': 'sus2',
    'suspended-fourth': 'sus4',
    power: '5',
});

export const GENRE_STYLES = Object.freeze({
    clayderman: {
        label: 'Artist: Richard Clayderman (Romantic Piano)',
        strumMs: 45,
        swing: 0.01,
        artistProfile: 'clayderman',
        hits: [
            { at: 0.0, len: 0.88, vel: 0.92, part: 'bass' },
            { at: 0.08, len: 0.4, vel: 0.78, part: 'arp_low' },
            { at: 0.16, len: 0.65, vel: 1.02, part: 'upper_octave' },
            { at: 0.5, len: 0.38, vel: 0.84, part: 'upper' },
            { at: 0.625, len: 0.25, vel: 0.76, part: 'arp_high' },
            { at: 0.75, len: 0.22, vel: 0.94, part: 'upper_octave' },
        ],
    },
    molina: {
        label: 'Artist: Jesús Molina (Jazz Fusion Virtuoso)',
        strumMs: 8,
        swing: 0.035,
        artistProfile: 'molina',
        hits: [
            { at: 0.0, len: 0.14, vel: 1.08, part: 'full' },
            { at: 0.1875, len: 0.12, vel: 0.94, part: 'upper' },
            { at: 0.375, len: 0.18, vel: 1.02, part: 'full' },
            { at: 0.5625, len: 0.08, vel: 0.85, part: 'arp_high' },
            { at: 0.625, len: 0.08, vel: 0.92, part: 'arp_low' },
            { at: 0.6875, len: 0.12, vel: 1.04, part: 'upper_octave' },
        ],
    },
    cory_henry: {
        label: 'Artist: Cory Henry (Gospel Soul / Organ)',
        strumMs: 26,
        swing: 0.048,
        artistProfile: 'cory',
        hits: [
            { at: 0.0, len: 0.36, vel: 1.04, part: 'full' },
            { at: 0.375, len: 0.14, vel: 0.88, part: 'upper' },
            { at: 0.5, len: 0.22, vel: 0.94, part: 'bass' },
            { at: 0.625, len: 0.16, vel: 0.98, part: 'upper_octave' },
            { at: 0.8125, len: 0.14, vel: 0.86, part: 'full' },
        ],
    },
    block: {
        label: 'Block Pad (Sustained)',
        strumMs: 12,
        swing: 0,
        hits: [{ at: 0.0, len: 0.96, vel: 1.0, part: 'full' }],
    },
    block_v2: {
        label: 'Block Pad V2 (Half-Bar Pulse)',
        strumMs: 22,
        swing: 0,
        hits: [
            { at: 0.0, len: 0.46, vel: 0.98, part: 'full' },
            { at: 0.5, len: 0.46, vel: 0.86, part: 'full' },
        ],
    },
    neosoul: {
        label: 'Neo-Soul / R&B',
        strumMs: 34,
        swing: 0.03,
        hits: [
            { at: 0.0, len: 0.52, vel: 1.0, part: 'full' },
            { at: 0.5625, len: 0.14, vel: 0.68, part: 'upper' },
            { at: 0.75, len: 0.22, vel: 0.88, part: 'full' },
        ],
    },
    neosoul_v2: {
        label: 'Neo-Soul V2 (Gospel Push)',
        strumMs: 38,
        swing: 0.035,
        hits: [
            { at: 0.0, len: 0.22, vel: 0.92, part: 'bass' },
            { at: 0.125, len: 0.34, vel: 1.0, part: 'upper' },
            { at: 0.5, len: 0.18, vel: 0.74, part: 'upper' },
            { at: 0.6875, len: 0.12, vel: 0.66, part: 'upper' },
            { at: 0.8125, len: 0.16, vel: 0.9, part: 'full' },
        ],
    },
    bossa: {
        label: 'Bossa Nova',
        strumMs: 18,
        swing: 0,
        hits: [
            { at: 0.0, len: 0.22, vel: 0.95, part: 'full' },
            { at: 0.375, len: 0.18, vel: 0.82, part: 'upper' },
            { at: 0.5, len: 0.2, vel: 0.85, part: 'bass' },
            { at: 0.75, len: 0.16, vel: 0.88, part: 'upper' },
            { at: 0.875, len: 0.1, vel: 0.72, part: 'upper' },
        ],
    },
    bossa_v2: {
        label: 'Bossa Nova V2 (Anticipated)',
        strumMs: 20,
        swing: 0,
        hits: [
            { at: 0.0, len: 0.24, vel: 0.9, part: 'bass' },
            { at: 0.125, len: 0.22, vel: 0.94, part: 'upper' },
            { at: 0.375, len: 0.12, vel: 0.76, part: 'upper' },
            { at: 0.5, len: 0.22, vel: 0.88, part: 'bass' },
            { at: 0.625, len: 0.2, vel: 0.92, part: 'upper' },
            { at: 0.875, len: 0.1, vel: 0.78, part: 'upper' },
        ],
    },
    reggae: {
        label: 'Reggae Skank',
        strumMs: 14,
        swing: 0.02,
        hits: [
            { at: 0.0, len: 0.2, vel: 0.85, part: 'bass' },
            { at: 0.25, len: 0.1, vel: 1.0, part: 'upper' },
            { at: 0.5, len: 0.2, vel: 0.8, part: 'bass' },
            { at: 0.75, len: 0.1, vel: 0.95, part: 'upper' },
        ],
    },
    reggae_v2: {
        label: 'Reggae V2 (Double Bubble)',
        strumMs: 12,
        swing: 0.03,
        hits: [
            { at: 0.0, len: 0.18, vel: 0.84, part: 'bass' },
            { at: 0.25, len: 0.08, vel: 1.0, part: 'upper' },
            { at: 0.375, len: 0.08, vel: 0.74, part: 'upper' },
            { at: 0.5, len: 0.18, vel: 0.82, part: 'bass' },
            { at: 0.75, len: 0.08, vel: 0.96, part: 'upper' },
            { at: 0.875, len: 0.08, vel: 0.72, part: 'upper' },
        ],
    },
    lofi: {
        label: 'Lo-Fi Chill',
        strumMs: 42,
        swing: 0.04,
        hits: [
            { at: 0.0, len: 0.65, vel: 0.9, part: 'full' },
            { at: 0.6875, len: 0.26, vel: 0.72, part: 'upper' },
        ],
    },
    lofi_v2: {
        label: 'Lo-Fi V2 (Lazy Trip-Hop)',
        strumMs: 48,
        swing: 0.045,
        hits: [
            { at: 0.0, len: 0.35, vel: 0.92, part: 'full' },
            { at: 0.4375, len: 0.22, vel: 0.76, part: 'upper' },
            { at: 0.75, len: 0.2, vel: 0.82, part: 'upper' },
        ],
    },
    house: {
        label: 'House Piano Stab',
        strumMs: 8,
        swing: 0,
        hits: [
            { at: 0.0, len: 0.14, vel: 1.0, part: 'full' },
            { at: 0.1875, len: 0.14, vel: 0.86, part: 'full' },
            { at: 0.375, len: 0.16, vel: 0.94, part: 'full' },
            { at: 0.625, len: 0.14, vel: 0.84, part: 'full' },
            { at: 0.875, len: 0.1, vel: 0.9, part: 'upper' },
        ],
    },
    house_v2: {
        label: 'House V2 (Deep Offbeat)',
        strumMs: 10,
        swing: 0.015,
        hits: [
            { at: 0.125, len: 0.14, vel: 0.96, part: 'full' },
            { at: 0.375, len: 0.14, vel: 0.92, part: 'full' },
            { at: 0.625, len: 0.14, vel: 0.95, part: 'full' },
            { at: 0.8125, len: 0.08, vel: 0.76, part: 'upper' },
            { at: 0.875, len: 0.1, vel: 0.9, part: 'full' },
        ],
    },
    arp: {
        label: 'Broken Arpeggio',
        strumMs: 0,
        swing: 0,
        isArpeggio: true,
        hits: [
            { at: 0.0, len: 0.22, vel: 0.95, noteIdx: 0 },
            { at: 0.125, len: 0.22, vel: 0.78, noteIdx: 1 },
            { at: 0.25, len: 0.22, vel: 0.85, noteIdx: 2 },
            { at: 0.375, len: 0.22, vel: 0.8, noteIdx: 3 },
            { at: 0.5, len: 0.22, vel: 0.92, noteIdx: 2 },
            { at: 0.625, len: 0.22, vel: 0.76, noteIdx: 1 },
            { at: 0.75, len: 0.22, vel: 0.88, noteIdx: 3 },
            { at: 0.875, len: 0.12, vel: 0.74, noteIdx: 1 },
        ],
    },
    arp_v2: {
        label: 'Broken Arp V2 (Cascading Down)',
        strumMs: 0,
        swing: 0.02,
        isArpeggio: true,
        hits: [
            { at: 0.0, len: 0.2, vel: 0.96, noteIdx: 3 },
            { at: 0.125, len: 0.2, vel: 0.82, noteIdx: 2 },
            { at: 0.25, len: 0.2, vel: 0.86, noteIdx: 1 },
            { at: 0.375, len: 0.2, vel: 0.78, noteIdx: 0 },
            { at: 0.5, len: 0.2, vel: 0.92, noteIdx: 1 },
            { at: 0.625, len: 0.2, vel: 0.84, noteIdx: 2 },
            { at: 0.75, len: 0.2, vel: 0.9, noteIdx: 3 },
            { at: 0.875, len: 0.12, vel: 0.76, noteIdx: 2 },
        ],
    },
    salsa_montuno: {
        label: 'Latin: Salsa Montuno',
        strumMs: 6,
        swing: 0,
        isArpeggio: true,
        hits: [
            { at: 0.0, len: 0.11, vel: 0.96, noteIdx: 0 },
            { at: 0.125, len: 0.11, vel: 0.86, noteIdx: 2 },
            { at: 0.25, len: 0.11, vel: 0.92, noteIdx: 1 },
            { at: 0.375, len: 0.18, vel: 1.0, noteIdx: 3 },
            { at: 0.625, len: 0.11, vel: 0.88, noteIdx: 2 },
            { at: 0.75, len: 0.11, vel: 0.94, noteIdx: 1 },
            { at: 0.875, len: 0.11, vel: 0.9, noteIdx: 3 },
        ],
    },
    latin_tumbao: {
        label: 'Latin: Son / Tumbao Comping',
        strumMs: 10,
        swing: 0,
        hits: [
            { at: 0.0, len: 0.2, vel: 0.92, part: 'bass' },
            { at: 0.1875, len: 0.14, vel: 0.96, part: 'upper' },
            { at: 0.375, len: 0.18, vel: 0.88, part: 'bass' },
            { at: 0.5, len: 0.16, vel: 0.94, part: 'upper' },
            { at: 0.75, len: 0.14, vel: 0.9, part: 'upper' },
            { at: 0.875, len: 0.1, vel: 0.82, part: 'bass' },
        ],
    },
    bolero: {
        label: 'Latin: Bolero Romantico',
        strumMs: 28,
        swing: 0,
        hits: [
            { at: 0.0, len: 0.42, vel: 0.95, part: 'full' },
            { at: 0.5, len: 0.2, vel: 0.8, part: 'bass' },
            { at: 0.75, len: 0.22, vel: 0.86, part: 'upper' },
        ],
    },
    cumbia: {
        label: 'Latin: Cumbia Groove',
        strumMs: 10,
        swing: 0.015,
        hits: [
            { at: 0.0, len: 0.22, vel: 0.94, part: 'bass' },
            { at: 0.25, len: 0.1, vel: 0.96, part: 'upper' },
            { at: 0.375, len: 0.1, vel: 0.76, part: 'upper' },
            { at: 0.5, len: 0.22, vel: 0.9, part: 'bass' },
            { at: 0.75, len: 0.1, vel: 0.98, part: 'upper' },
            { at: 0.875, len: 0.1, vel: 0.78, part: 'upper' },
        ],
    },
    merengue: {
        label: 'Latin: Merengue Punch',
        strumMs: 6,
        swing: 0,
        hits: [
            { at: 0.0, len: 0.12, vel: 1.0, part: 'full' },
            { at: 0.25, len: 0.12, vel: 0.9, part: 'upper' },
            { at: 0.5, len: 0.12, vel: 0.96, part: 'full' },
            { at: 0.625, len: 0.1, vel: 0.8, part: 'upper' },
            { at: 0.75, len: 0.12, vel: 0.94, part: 'full' },
        ],
    },
});

const DEFAULT_SHEET = `[Intro - Arpeggio & Glissando]
| ~[C3G3B3E4] | ~v[A2E3G3C4] | C4~>G5 | G13 |

[Verse]
|: Cmaj9 | Am7 | Dm9 | G13 :| x2`;

const DEFAULT_CONFIG = Object.freeze({
    progressionText: DEFAULT_SHEET,
    bpm: 105,
    beatsPerBar: 4,
    beatUnit: 4,
    octave: 4,
    barsPerChord: 1,
    velocity: 96,
    style: 'cory_henry',
    humanize: 70,
    loop: true,
});

export class ChordSequencerModel {
    constructor() {
        const saved = this.#load();
        this.progressionText = saved.progressionText;
        this.bpm = saved.bpm;
        this.beatsPerBar = saved.beatsPerBar;
        this.beatUnit = saved.beatUnit;
        this.octave = saved.octave;
        this.barsPerChord = saved.barsPerChord;
        this.velocity = saved.velocity;
        this.style = saved.style in GENRE_STYLES ? saved.style : 'cory_henry';
        this.humanize = saved.humanize;
        this.loop = saved.loop;

        this.isPlaying = false;
        this.currentStepIndex = -1;
        this.parsedChords = this.parseProgression(this.progressionText, this.octave);
    }

    static #formatNoteLabel(midi) {
        const name = NOTE_NAMES[midi % 12];
        const oct = Math.floor(midi / 12) - 1;
        return `${name}${oct}`;
    }

    static #singleNoteToMidi(token, defaultOctave = 4) {
        const m = token.trim().match(/^([A-Ga-g])([#b]?)(\d?)$/);
        if (!m) return null;
        const step = m[1].toUpperCase();
        const acc = m[2] || '';
        const oct = m[3] ? parseInt(m[3], 10) : defaultOctave;
        const semitone = ROOT_OFFSETS[`${step}${acc}`];
        if (semitone === undefined) return null;
        const midi = (oct + 1) * 12 + semitone;
        return midi >= 0 && midi <= 127 ? midi : null;
    }

    static parseGlissandoToken(token, defaultOctave = 4) {
        const glissMatch = token.match(/^([A-Ga-g][#b]?\d?)~>([A-Ga-g][#b]?\d?)$/);
        if (!glissMatch) return null;

        const startMidi = ChordSequencerModel.#singleNoteToMidi(glissMatch[1], defaultOctave);
        const endMidi = ChordSequencerModel.#singleNoteToMidi(glissMatch[2], defaultOctave);
        if (startMidi === null || endMidi === null) return null;

        return {
            symbol: `${glissMatch[1].toUpperCase()}~>${glissMatch[2].toUpperCase()}`,
            notes: [startMidi, endMidi],
            rootPitchClass: startMidi % 12,
            hasExplicitBass: true,
            isRest: false,
            isWrittenStaff: true,
            articulation: 'glissando',
            glissRange: [startMidi, endMidi],
            valid: true,
        };
    }

    static parseNoteClusterToken(token, defaultOctave = 4) {
        const clusterMatch = token.match(/^\[([A-Ga-g][#b]?\d?(?:\s*[A-Ga-g][#b]?\d?)*)\]$/);
        if (!clusterMatch) return null;

        const noteTokens = clusterMatch[1].match(/[A-Ga-g][#b]?\d?/g) || [];
        const notes = noteTokens
            .map((nt) => ChordSequencerModel.#singleNoteToMidi(nt, defaultOctave))
            .filter((n) => n !== null)
            .sort((a, b) => a - b);

        if (!notes.length) return null;

        return {
            symbol: noteTokens.join(' '),
            notes,
            rootPitchClass: notes[0] % 12,
            hasExplicitBass: true,
            isRest: false,
            isWrittenStaff: true,
            articulation: null,
            valid: true,
        };
    }

    static parseChordSymbol(symbol, octave = 4) {
        const clean = symbol.trim();
        if (!clean) {
            return { symbol: '', notes: [], rootPitchClass: 0, hasExplicitBass: false, isRest: false, isWrittenStaff: false, articulation: null, valid: false };
        }

        if (/^(NC|N\.C\.|REST|-)$/i.test(clean)) {
            return {
                symbol: 'N.C.',
                notes: [],
                rootPitchClass: 0,
                hasExplicitBass: false,
                isRest: true,
                isWrittenStaff: false,
                articulation: null,
                valid: true,
            };
        }

        const match = clean.match(/^([A-Ga-g][#b]?)(.*?)(?:\/([A-Ga-g][#b]?))?$/);
        if (!match) {
            return { symbol: clean, notes: [], rootPitchClass: 0, hasExplicitBass: false, isRest: false, isWrittenStaff: false, articulation: null, valid: false };
        }

        const rawRoot = match[1][0].toUpperCase() + (match[1][1] || '');
        const quality = match[2] || '';
        const rawBass = match[3] ? match[3][0].toUpperCase() + (match[3][1] || '') : null;

        const rootSemitone = ROOT_OFFSETS[rawRoot];
        const intervals = CHORD_FORMULAS[quality];

        if (rootSemitone === undefined || !intervals) {
            return { symbol: clean, notes: [], rootPitchClass: 0, hasExplicitBass: false, isRest: false, isWrittenStaff: false, articulation: null, valid: false };
        }

        const baseMidi = (octave + 1) * 12 + rootSemitone;
        const notes = intervals
            .map((interval) => baseMidi + interval)
            .filter((n) => n >= 0 && n <= 127);

        let hasExplicitBass = false;
        if (rawBass && ROOT_OFFSETS[rawBass] !== undefined) {
            const bassSemitone = ROOT_OFFSETS[rawBass];
            let bassNote = octave * 12 + bassSemitone;
            while (bassNote >= baseMidi) bassNote -= 12;
            if (bassNote >= 0) {
                const existingIdx = notes.indexOf(bassNote);
                if (existingIdx !== -1) notes.splice(existingIdx, 1);
                notes.unshift(bassNote);
                hasExplicitBass = true;
            }
        }

        return {
            symbol: clean,
            notes,
            rootPitchClass: rootSemitone,
            hasExplicitBass,
            isRest: false,
            isWrittenStaff: false,
            articulation: null,
            valid: notes.length > 0,
        };
    }

    /**
     * Parses a MusicXML (.musicxml / .xml) document into:
     *  - sheetText: readable Lead Sheet / Pentagram notation for the editor
     *  - timelineSteps: beat-accurate per-measure note schedules with <arpeggiate>,
     *    <glissando>/<slide>, <staccato>, <tenuto>, <accent>, and multi-part voices.
     */
    static parseMusicXmlTimeline(xmlString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlString, 'application/xml');
        if (doc.querySelector('parsererror')) {
            throw new Error('Invalid MusicXML file.');
        }

        let detectedBpm = null;
        let detectedBeats = 4;
        let detectedBeatType = 4;

        const soundEl = doc.querySelector('sound[tempo]');
        if (soundEl) {
            const t = parseFloat(soundEl.getAttribute('tempo'));
            if (!Number.isNaN(t) && t >= 30 && t <= 300) detectedBpm = Math.round(t);
        }

        const timeEl = doc.querySelector('attributes > time');
        if (timeEl) {
            const b = parseInt(timeEl.querySelector('beats')?.textContent || '', 10);
            const bt = parseInt(timeEl.querySelector('beat-type')?.textContent || '', 10);
            if (!Number.isNaN(b) && b >= 1 && b <= 16) detectedBeats = b;
            if (!Number.isNaN(bt) && [2, 4, 8, 16].includes(bt)) detectedBeatType = bt;
        }

        const alterToAccidental = (alterText) => {
            const a = parseInt(alterText || '0', 10);
            if (a === 1) return '#';
            if (a === -1) return 'b';
            return '';
        };

        const pitchToMidi = (noteEl) => {
            const step = noteEl.querySelector('pitch > step')?.textContent?.trim().toUpperCase();
            if (!step || ROOT_OFFSETS[step] === undefined) return null;
            const alter = parseInt(noteEl.querySelector('pitch > alter')?.textContent || '0', 10) || 0;
            const oct = parseInt(noteEl.querySelector('pitch > octave')?.textContent || '4', 10);
            const midi = (oct + 1) * 12 + ROOT_OFFSETS[step] + alter;
            return midi >= 0 && midi <= 127 ? midi : null;
        };

        const parts = Array.from(doc.querySelectorAll('part'));
        const maxMeasures = Math.max(0, ...parts.map((p) => p.querySelectorAll(':scope > measure').length));
        const partDivisions = parts.map(() => 1);

        const timelineSteps = [];
        const lines = [];
        let currentLineBars = [];
        let activeSection = '';

        for (let mIdx = 0; mIdx < maxMeasures; mIdx++) {
            const rawMeasureNotes = [];
            let measureQuarterSpan = detectedBeats * (4 / detectedBeatType);
            let measureArticulation = null;
            let glissRange = null;
            let harmonyLabels = [];

            parts.forEach((part, pIdx) => {
                const measure = part.querySelectorAll(':scope > measure')[mIdx];
                if (!measure) return;

                if (pIdx === 0) {
                    const rehearsal = measure.querySelector('direction rehearsal')?.textContent?.trim();
                    if (rehearsal) {
                        activeSection = rehearsal;
                        if (currentLineBars.length) {
                            lines.push(`| ${currentLineBars.join(' | ')} |`);
                            currentLineBars = [];
                        }
                        lines.push(`\n[${rehearsal}]`);
                    }

                    const mTimeEl = measure.querySelector('attributes > time');
                    if (mTimeEl) {
                        const b = parseInt(mTimeEl.querySelector('beats')?.textContent || '', 10);
                        const bt = parseInt(mTimeEl.querySelector('beat-type')?.textContent || '', 10);
                        if (!Number.isNaN(b) && b >= 1 && b <= 16) detectedBeats = b;
                        if (!Number.isNaN(bt) && [2, 4, 8, 16].includes(bt)) detectedBeatType = bt;
                        measureQuarterSpan = detectedBeats * (4 / detectedBeatType);
                    }

                    const harmonies = Array.from(measure.querySelectorAll('harmony'));
                    if (harmonies.length > 0) {
                        harmonyLabels = harmonies.map((h) => {
                            const rootStep = h.querySelector('root > root-step')?.textContent?.trim() || 'C';
                            const rootAlt = alterToAccidental(h.querySelector('root > root-alter')?.textContent);
                            const kindRaw = h.querySelector('kind')?.textContent?.trim() || 'major';
                            const kindText = h.querySelector('kind')?.getAttribute('text');
                            const suffix = kindText !== null && kindText !== undefined
                                ? kindText
                                : (MUSICXML_KIND_MAP[kindRaw] ?? '');
                            const bassStep = h.querySelector('bass > bass-step')?.textContent?.trim();
                            const bassAlt = alterToAccidental(h.querySelector('bass > bass-alter')?.textContent);
                            return `${rootStep}${rootAlt}${suffix}${bassStep ? `/${bassStep}${bassAlt}` : ''}`;
                        });
                    }
                }

                const divEl = measure.querySelector('attributes > divisions');
                if (divEl) {
                    const d = parseFloat(divEl.textContent || '');
                    if (!Number.isNaN(d) && d > 0) partDivisions[pIdx] = d;
                }
                const divs = partDivisions[pIdx];

                let cursorQuarters = 0;
                let lastStartQuarters = 0;

                Array.from(measure.children).forEach((child) => {
                    if (child.tagName === 'backup') {
                        const dur = parseFloat(child.querySelector('duration')?.textContent || '0');
                        cursorQuarters = Math.max(0, cursorQuarters - dur / divs);
                        return;
                    }
                    if (child.tagName === 'forward') {
                        const dur = parseFloat(child.querySelector('duration')?.textContent || '0');
                        cursorQuarters += dur / divs;
                        return;
                    }
                    if (child.tagName !== 'note') return;

                    const isChord = Boolean(child.querySelector('chord'));
                    const isRest = Boolean(child.querySelector('rest'));
                    const isGrace = Boolean(child.querySelector('grace'));
                    const durDiv = parseFloat(child.querySelector('duration')?.textContent || String(divs));
                    const durQuarters = isGrace ? 0.125 : Math.max(0.0625, durDiv / divs);
                    const startQuarters = isChord ? lastStartQuarters : cursorQuarters;

                    if (!isChord && !isGrace) {
                        lastStartQuarters = startQuarters;
                        cursorQuarters += durQuarters;
                        measureQuarterSpan = Math.max(measureQuarterSpan, cursorQuarters);
                    }

                    if (isRest) return;

                    const hasTieStop = Boolean(child.querySelector('tie[type="stop"], notations > tied[type="stop"]'));
                    const hasTieStart = Boolean(child.querySelector('tie[type="start"], notations > tied[type="start"]'));
                    if (hasTieStop && !hasTieStart) return;

                    const midi = pitchToMidi(child);
                    if (midi === null) return;

                    const arpEl = child.querySelector('notations > arpeggiate');
                    const glissStartEl = child.querySelector('notations > glissando[type="start"], notations > slide[type="start"]');
                    const glissStopEl = child.querySelector('notations > glissando[type="stop"], notations > slide[type="stop"]');
                    const isStaccato = Boolean(child.querySelector('notations > articulations > staccato'));
                    const isTenuto = Boolean(child.querySelector('notations > articulations > tenuto'));
                    const isAccent = Boolean(child.querySelector('notations > articulations > accent, notations > articulations > strong-accent'));

                    const arpDir = arpEl
                        ? (arpEl.getAttribute('direction') === 'down' ? 'arp_down' : 'arp_up')
                        : null;
                    if (arpDir && !measureArticulation) measureArticulation = arpDir;
                    if (glissStartEl) {
                        measureArticulation = 'glissando';
                        glissRange = [midi, midi];
                    }
                    if (glissStopEl && glissRange) {
                        glissRange[1] = midi;
                    }

                    rawMeasureNotes.push({
                        midi,
                        startFraction: Math.min(0.98, startQuarters / Math.max(0.25, measureQuarterSpan)),
                        durationFraction: Math.min(1.0, (hasTieStart ? durQuarters * 1.8 : durQuarters) / Math.max(0.25, measureQuarterSpan)),
                        arpDir,
                        isGlissStart: Boolean(glissStartEl),
                        isGlissStop: Boolean(glissStopEl),
                        isStaccato,
                        isTenuto,
                        isAccent,
                    });
                });
            });

            const arpGroups = new Map();
            rawMeasureNotes.forEach((n) => {
                if (!n.arpDir) return;
                const key = `${n.arpDir}_${Math.round(n.startFraction * 1000)}`;
                if (!arpGroups.has(key)) arpGroups.set(key, []);
                arpGroups.get(key).push(n);
            });

            arpGroups.forEach((group) => {
                const isDown = group[0].arpDir === 'arp_down';
                group.sort((a, b) => (isDown ? b.midi - a.midi : a.midi - b.midi));
                group.forEach((n, idx) => {
                    n.arpIndex = idx;
                    n.arpCount = group.length;
                });
            });

            const uniqueNotes = Array.from(new Set(rawMeasureNotes.map((n) => n.midi))).sort((a, b) => a - b);
            const durationFactor = Math.max(0.25, measureQuarterSpan / (detectedBeats * (4 / detectedBeatType)));

            let displaySymbol;
            if (harmonyLabels.length > 0) {
                const prefix = measureArticulation === 'arp_down' ? '~v' : measureArticulation === 'arp_up' ? '~' : '';
                displaySymbol = `${prefix}${harmonyLabels.join(' ')}`;
            } else if (measureArticulation === 'glissando' && glissRange && glissRange[0] !== glissRange[1]) {
                displaySymbol = `${ChordSequencerModel.#formatNoteLabel(glissRange[0])}~>${ChordSequencerModel.#formatNoteLabel(glissRange[1])}`;
            } else if (uniqueNotes.length > 0) {
                const prefix = measureArticulation === 'arp_down' ? '~v' : measureArticulation === 'arp_up' ? '~' : '';
                const noteStr = uniqueNotes.slice(0, 5).map((m) => ChordSequencerModel.#formatNoteLabel(m)).join('');
                displaySymbol = `${prefix}[${noteStr}]`;
            } else {
                displaySymbol = mIdx === 0 ? 'NC' : '%';
            }

            currentLineBars.push(displaySymbol);
            if (currentLineBars.length === 4) {
                lines.push(`| ${currentLineBars.join(' | ')} |`);
                currentLineBars = [];
            }

            timelineSteps.push({
                symbol: displaySymbol,
                notes: uniqueNotes,
                rootPitchClass: uniqueNotes.length ? uniqueNotes[0] % 12 : 0,
                hasExplicitBass: true,
                isRest: rawMeasureNotes.length === 0,
                isWrittenStaff: true,
                articulation: measureArticulation,
                glissRange,
                section: activeSection,
                durationFactor,
                writtenEvents: rawMeasureNotes,
                valid: true,
            });
        }

        if (currentLineBars.length) {
            lines.push(`| ${currentLineBars.join(' | ')} |`);
        }

        return {
            sheetText: lines.join('\n').trim(),
            timelineSteps,
            bpm: detectedBpm,
            beatsPerBar: detectedBeats,
            beatUnit: detectedBeatType,
        };
    }

    static applyVoiceLeading(chords, octave = 4) {
        const registerMin = Math.max(24, (octave + 1) * 12 - 5);
        const registerMax = Math.min(108, (octave + 2) * 12 + 4);
        let prevUpperNotes = null;

        return chords.map((chord) => {
            if (!chord.valid || chord.isRest || !chord.notes.length) return chord;

            if (chord.isWrittenStaff) {
                prevUpperNotes = chord.notes.length > 1 ? chord.notes.slice(1) : [...chord.notes];
                return chord;
            }

            const bassNote = chord.hasExplicitBass ? chord.notes[0] : null;
            const upperRaw = chord.hasExplicitBass ? chord.notes.slice(1) : [...chord.notes];

            if (!prevUpperNotes) {
                const initialUpper = upperRaw
                    .map((n) => {
                        let shifted = n;
                        while (shifted > registerMax) shifted -= 12;
                        while (shifted < registerMin) shifted += 12;
                        return shifted;
                    })
                    .sort((a, b) => a - b);

                prevUpperNotes = initialUpper;
                return {
                    ...chord,
                    notes: bassNote !== null ? [bassNote, ...initialUpper] : initialUpper,
                };
            }

            const prevAvg = prevUpperNotes.reduce((sum, n) => sum + n, 0) / prevUpperNotes.length;
            const usedNotes = new Set();

            const voicedUpper = upperRaw
                .map((rawNote) => {
                    const pitchClass = ((rawNote % 12) + 12) % 12;
                    let bestCandidate = rawNote;
                    let bestScore = Infinity;

                    for (let oct = 1; oct <= 8; oct++) {
                        const candidate = oct * 12 + pitchClass;
                        if (candidate < registerMin || candidate > registerMax) continue;
                        if (bassNote !== null && candidate <= bassNote) continue;

                        const nearestPrevDist = Math.min(
                            ...prevUpperNotes.map((prev) => Math.abs(candidate - prev))
                        );
                        const centerPull = Math.abs(candidate - prevAvg) * 0.25;
                        const duplicatePenalty = usedNotes.has(candidate) ? 24 : 0;
                        const score = nearestPrevDist + centerPull + duplicatePenalty;

                        if (score < bestScore) {
                            bestScore = score;
                            bestCandidate = candidate;
                        }
                    }

                    usedNotes.add(bestCandidate);
                    return bestCandidate;
                })
                .sort((a, b) => a - b);

            prevUpperNotes = voicedUpper;

            return {
                ...chord,
                notes: bassNote !== null ? [bassNote, ...voicedUpper] : voicedUpper,
            };
        });
    }

    parseProgression(text, octave = this.octave) {
        const expandedText = text.replace(/\|:([\s\S]*?):\|(?:\s*x(\d+))?/gi, (_, body, countStr) => {
            const count = Math.max(1, Math.min(8, parseInt(countStr || '2', 10) || 2));
            return Array.from({ length: count }, () => body.trim()).join(' | ');
        });

        const rawSteps = [];
        let activeSection = '';
        let activeStyleOverride = null;
        let activeBpmOverride = null;
        let lastValidChordToken = 'NC';

        const lines = expandedText.split(/\r?\n/);

        lines.forEach((rawLine) => {
            let line = rawLine.trim();
            if (!line) return;

            const sectionMatch = line.match(/^\[([^\]]+)\]$/);
            if (sectionMatch) {
                activeSection = sectionMatch[1].trim();
                return;
            }

            line = line.replace(/\{(style|bpm)\s*:\s*([^}]+)\}/gi, (_, key, val) => {
                const k = key.toLowerCase();
                const v = val.trim();
                if (k === 'style' && v in GENRE_STYLES) activeStyleOverride = v;
                if (k === 'bpm') {
                    const num = Number(v);
                    if (!Number.isNaN(num) && num >= 30 && num <= 300) activeBpmOverride = num;
                }
                return '';
            }).trim();

            if (!line) return;

            const hasBars = line.includes('|');
            const barChunks = hasBars
                ? line.split('|').map((b) => b.trim()).filter(Boolean)
                : line.split(/,+|\s{2,}/).map((b) => b.trim()).filter(Boolean);

            barChunks.forEach((chunk) => {
                const tokensInBar = chunk.match(/~v?\[[^\]]+\]|\[[^\]]+\]|\S+/g) || [];
                const barShare = hasBars ? (1 / Math.max(1, tokensInBar.length)) : 1;

                tokensInBar.forEach((rawToken) => {
                    let token = rawToken;
                    let durationFactor = barShare * this.barsPerChord;

                    const barMultMatch = token.match(/^(.+?)\*(\d+(?:\.\d+)?)$/);
                    const beatMultMatch = token.match(/^(.+?)\((\d+(?:\.\d+)?)b\)$/i);

                    if (barMultMatch) {
                        token = barMultMatch[1];
                        durationFactor = parseFloat(barMultMatch[2]);
                    } else if (beatMultMatch) {
                        token = beatMultMatch[1];
                        durationFactor = parseFloat(beatMultMatch[2]) / this.beatsPerBar;
                    }

                    if (token === '%') {
                        token = lastValidChordToken;
                    } else {
                        lastValidChordToken = token;
                    }

                    let explicitArticulation = null;
                    let cleanSymbol = token;
                    if (cleanSymbol.startsWith('~v')) {
                        explicitArticulation = 'arp_down';
                        cleanSymbol = cleanSymbol.slice(2);
                    } else if (cleanSymbol.startsWith('~') && !cleanSymbol.includes('~>')) {
                        explicitArticulation = 'arp_up';
                        cleanSymbol = cleanSymbol.slice(1);
                    }

                    const parsed =
                        ChordSequencerModel.parseGlissandoToken(cleanSymbol, octave) ||
                        ChordSequencerModel.parseNoteClusterToken(cleanSymbol, octave) ||
                        ChordSequencerModel.parseChordSymbol(cleanSymbol, octave);

                    const articulation = parsed.articulation || explicitArticulation;
                    const displaySymbol = explicitArticulation === 'arp_down'
                        ? `~v${parsed.symbol}`
                        : explicitArticulation === 'arp_up'
                            ? `~${parsed.symbol}`
                            : parsed.symbol;

                    rawSteps.push({
                        ...parsed,
                        symbol: displaySymbol,
                        articulation,
                        section: activeSection,
                        durationFactor: Math.max(0.125, durationFactor),
                        styleOverride: activeStyleOverride,
                        bpmOverride: activeBpmOverride,
                    });
                });
            });
        });

        return ChordSequencerModel.applyVoiceLeading(rawSteps, octave);
    }

    loadImportedScore({ sheetText, timelineSteps, bpm, beatsPerBar, beatUnit }) {
        this.progressionText = sheetText;
        if (bpm) this.bpm = Math.max(30, Math.min(300, Number(bpm)));
        if (beatsPerBar) this.beatsPerBar = Math.max(1, Math.min(16, Number(beatsPerBar)));
        if (beatUnit && [2, 4, 8, 16].includes(Number(beatUnit))) this.beatUnit = Number(beatUnit);

        this.parsedChords = Array.isArray(timelineSteps) && timelineSteps.length
            ? timelineSteps
            : this.parseProgression(this.progressionText, this.octave);

        this.#save();
    }

    updateSettings(partial) {
        if (partial.progressionText !== undefined) this.progressionText = partial.progressionText;
        if (partial.bpm !== undefined) this.bpm = Math.max(30, Math.min(300, Number(partial.bpm) || 110));
        if (partial.beatsPerBar !== undefined) this.beatsPerBar = Math.max(1, Math.min(16, Number(partial.beatsPerBar) || 4));
        if (partial.beatUnit !== undefined) this.beatUnit = [2, 4, 8, 16].includes(Number(partial.beatUnit)) ? Number(partial.beatUnit) : 4;
        if (partial.octave !== undefined) this.octave = Math.max(1, Math.min(7, Number(partial.octave) || 4));
        if (partial.barsPerChord !== undefined) this.barsPerChord = Math.max(0.25, Math.min(8, Number(partial.barsPerChord) || 1));
        if (partial.style !== undefined && partial.style in GENRE_STYLES) this.style = partial.style;
        if (partial.humanize !== undefined) this.humanize = Math.max(0, Math.min(100, Number(partial.humanize) || 0));
        if (partial.loop !== undefined) this.loop = Boolean(partial.loop);

        const hasImportedTimeline = this.parsedChords.some((c) => Array.isArray(c.writtenEvents));
        const onlyLiveParamChanged =
            partial.progressionText === undefined &&
            partial.octave === undefined &&
            partial.barsPerChord === undefined;

        if (!hasImportedTimeline || !onlyLiveParamChanged) {
            this.parsedChords = this.parseProgression(this.progressionText, this.octave);
        }
        this.#save();
    }

    getStepDurationMs(stepIndex = this.currentStepIndex) {
        const step = this.parsedChords[stepIndex];
        const effectiveBpm = step?.bpmOverride || this.bpm;
        const factor = step?.durationFactor ?? this.barsPerChord;

        const quarterNoteMs = 60000 / effectiveBpm;
        const beatUnitMs = quarterNoteMs * (4 / this.beatUnit);
        return beatUnitMs * this.beatsPerBar * factor;
    }

    buildStepEvents(chord, stepDurationMs, barIndex = 0, nextChord = null) {
        if (!chord || !chord.valid || chord.isRest || !chord.notes.length) return [];

        const humanRatio = this.humanize / 100;

        // 1. Beat-accurate MusicXML/MXL written score timeline
        if (Array.isArray(chord.writtenEvents) && chord.writtenEvents.length > 0) {
            return this.#buildWrittenTimelineEvents(chord, stepDurationMs, humanRatio);
        }

        // 2. Explicit Glissando Articulation (e.g., C4~>G5)
        if (chord.articulation === 'glissando' && Array.isArray(chord.glissRange)) {
            return this.#buildGlissandoEvents(chord.glissRange[0], chord.glissRange[1], stepDurationMs, humanRatio);
        }

        // 3. Explicit Arpeggiate Articulation (e.g., ~Cmaj9 or ~v[C3G3B3E4])
        if (chord.articulation === 'arp_up' || chord.articulation === 'arp_down') {
            return this.#buildArpeggiateRollEvents(
                chord.notes,
                chord.articulation === 'arp_down',
                stepDurationMs,
                humanRatio
            );
        }

        // 4. Genre & Artist Playstyle Grooves
        const effectiveStyleKey = chord.styleOverride || this.style;
        const preset = GENRE_STYLES[effectiveStyleKey] || GENRE_STYLES.block;
        const events = [];

        let voicedNotes = [...chord.notes].sort((a, b) => a - b);
        if (!chord.isWrittenStaff && voicedNotes.length >= 4 && humanRatio > 0.35 && barIndex % 2 === 1) {
            const dropIdx = voicedNotes.length - 2;
            const dropped = voicedNotes[dropIdx] - 12;
            if (dropped >= 36 && !voicedNotes.includes(dropped)) {
                voicedNotes[dropIdx] = dropped;
                voicedNotes.sort((a, b) => a - b);
            }
        }

        const bassRoot = voicedNotes[0];
        const topNote = voicedNotes[voicedNotes.length - 1];
        const bassNotes = preset.artistProfile === 'clayderman' && bassRoot >= 36
            ? [bassRoot - 12, bassRoot]
            : [bassRoot];
        const upperNotes = voicedNotes.length > 1 ? voicedNotes.slice(1) : voicedNotes;
        const upperOctaveNotes = topNote + 12 <= 108 ? [...upperNotes, topNote + 12] : upperNotes;

        const phrasePosition = barIndex % 4;
        const phraseMultipliers = [0.92, 0.98, 1.03, 1.08];
        const phraseGain = 1 + (phraseMultipliers[phrasePosition] - 1) * humanRatio;

        const slideProbability = preset.artistProfile === 'cory' ? 0.55 : 0.25;
        const useChromaticSlide =
            !preset.isArpeggio &&
            humanRatio > 0.3 &&
            (barIndex > 0 || preset.artistProfile === 'cory') &&
            Math.random() < slideProbability * humanRatio;

        if (useChromaticSlide) {
            if (preset.artistProfile === 'cory' && upperNotes.length > 0) {
                const targetGrace = upperNotes[0];
                events.push({
                    note: Math.max(0, targetGrace - 1),
                    velocity: Math.max(35, Math.round(this.velocity * 0.72)),
                    delayMs: 4,
                    durationMs: 48,
                });
            } else {
                const slideDir = Math.random() < 0.65 ? -1 : 1;
                const slideDuration = Math.round(50 + Math.random() * 30);
                upperNotes.forEach((note) => {
                    events.push({
                        note: Math.max(0, Math.min(127, note + slideDir)),
                        velocity: Math.max(25, Math.round(this.velocity * 0.56)),
                        delayMs: 0,
                        durationMs: slideDuration,
                    });
                });
            }
        }

        const slideOffsetMs = useChromaticSlide ? 55 : 0;

        preset.hits.forEach((hit, hitIdx) => {
            const isSecondaryHit = hitIdx > 0 && hit.vel < 0.85;
            if (isSecondaryHit && Math.random() < 0.16 * humanRatio) return;

            let targetNotes;
            if (preset.isArpeggio) {
                targetNotes = [voicedNotes[hit.noteIdx % voicedNotes.length]];
            } else if (hit.part === 'bass') {
                targetNotes = bassNotes;
            } else if (hit.part === 'upper') {
                targetNotes = upperNotes;
            } else if (hit.part === 'upper_octave') {
                targetNotes = upperOctaveNotes;
            } else if (hit.part === 'arp_low') {
                targetNotes = voicedNotes.slice(0, Math.min(3, voicedNotes.length));
            } else if (hit.part === 'arp_high') {
                targetNotes = voicedNotes.slice(-Math.min(3, voicedNotes.length));
            } else {
                targetNotes = voicedNotes;
            }

            const isOffbeat = Math.round(hit.at * 16) % 2 === 1;
            const swingShift = isOffbeat ? preset.swing * humanRatio : 0;
            const baseStartMs = (hit.at + swingShift) * stepDurationMs + (hitIdx === 0 ? slideOffsetMs : 0);
            const baseDurationMs = Math.max(45, hit.len * stepDurationMs);

            const isRolledArpPart = hit.part === 'arp_low' || hit.part === 'arp_high';
            const effectiveStrumMs = isRolledArpPart ? Math.max(38, preset.strumMs * 1.4) : preset.strumMs;

            const reverseStrum = hitIdx % 2 === 1 && humanRatio > 0.45 && Math.random() < 0.35;
            const orderedFingers = reverseStrum ? [...targetNotes].reverse() : targetNotes;

            orderedFingers.forEach((note, fingerIdx) => {
                const isTopMelodyNote = note >= topNote;
                const isBass = note <= bassRoot;

                let fingerBalance = 0.88;
                if (isTopMelodyNote) fingerBalance = 1.14;
                else if (isBass) fingerBalance = 1.03;

                const strumOffset = fingerIdx * effectiveStrumMs * (0.55 + 0.5 * humanRatio);
                const timingJitter = (Math.random() * 2 - 1) * 11 * humanRatio;
                const delayMs = Math.max(0, Math.round(baseStartMs + strumOffset + timingJitter));

                const velJitter = (Math.random() * 2 - 1) * 12 * humanRatio;
                const rawVel = this.velocity * hit.vel * phraseGain * fingerBalance + velJitter;
                const velocity = Math.max(24, Math.min(127, Math.round(rawVel)));

                const releaseJitter = (Math.random() * 2 - 1) * 20 * humanRatio;
                const durationMs = Math.max(40, Math.round(baseDurationMs + releaseJitter));

                events.push({ note, velocity, delayMs, durationMs });
            });
        });

        if (humanRatio > 0.25 && nextChord && nextChord.valid && !nextChord.isRest && nextChord.notes.length) {
            this.#appendOrganicTransitions({
                events,
                currentNotes: voicedNotes,
                nextNotes: [...nextChord.notes].sort((a, b) => a - b),
                stepDurationMs,
                humanRatio,
                artistProfile: preset.artistProfile,
            });
        }

        return events;
    }

    #buildWrittenTimelineEvents(chord, stepDurationMs, humanRatio) {
        const events = [];

        if (
            chord.articulation === 'glissando' &&
            Array.isArray(chord.glissRange) &&
            chord.glissRange[0] !== chord.glissRange[1]
        ) {
            events.push(
                ...this.#buildGlissandoEvents(
                    chord.glissRange[0],
                    chord.glissRange[1],
                    stepDurationMs,
                    humanRatio
                )
            );
        }

        chord.writtenEvents.forEach((wn) => {
            if ((wn.isGlissStart || wn.isGlissStop) && chord.articulation === 'glissando') {
                return;
            }

            const baseStartMs = wn.startFraction * stepDurationMs;
            const arpOffsetMs = wn.arpDir
                ? (wn.arpIndex || 0) * (26 + 14 * humanRatio)
                : 0;
            const timingJitter = (Math.random() * 2 - 1) * 9 * humanRatio;
            const delayMs = Math.max(0, Math.round(baseStartMs + arpOffsetMs + timingJitter));

            let gateRatio = 0.9;
            if (wn.isStaccato) gateRatio = 0.45;
            else if (wn.isTenuto) gateRatio = 0.98;

            const rawDurMs = wn.durationFraction * stepDurationMs * gateRatio;
            const releaseJitter = (Math.random() * 2 - 1) * 14 * humanRatio;
            const durationMs = Math.max(45, Math.round(rawDurMs + releaseJitter));

            const isDownbeat = wn.startFraction < 0.03;
            const isMelodyRegister = wn.midi >= 60;
            const balance = (isDownbeat ? 1.06 : 0.94) * (isMelodyRegister ? 1.06 : 0.92);
            const accentBoost = wn.isAccent ? 16 : 0;
            const velJitter = (Math.random() * 2 - 1) * 9 * humanRatio;

            const velocity = Math.max(
                24,
                Math.min(127, Math.round(this.velocity * balance + accentBoost + velJitter))
            );

            events.push({
                note: wn.midi,
                velocity,
                delayMs,
                durationMs,
            });
        });

        return events;
    }

    #buildArpeggiateRollEvents(notes, isDown, stepDurationMs, humanRatio) {
        const ordered = [...notes].sort((a, b) => (isDown ? b - a : a - b));
        const spreadWindowMs = Math.min(stepDurationMs * 0.45, ordered.length * 65);
        const stepMs = ordered.length > 1 ? spreadWindowMs / (ordered.length - 1) : 0;

        return ordered.map((note, idx) => {
            const jitter = (Math.random() * 2 - 1) * 8 * humanRatio;
            const delayMs = Math.max(0, Math.round(idx * stepMs + jitter));
            const durationMs = Math.max(80, Math.round(stepDurationMs * 0.94 - delayMs));
            const accent = idx === ordered.length - 1 ? 1.12 : 0.88 + (idx / ordered.length) * 0.14;
            const velocity = Math.max(30, Math.min(127, Math.round(this.velocity * accent)));

            return { note, velocity, delayMs, durationMs };
        });
    }

    #buildGlissandoEvents(startMidi, endMidi, stepDurationMs, humanRatio) {
        const direction = endMidi >= startMidi ? 1 : -1;
        const whiteKeyPitchClasses = new Set([0, 2, 4, 5, 7, 9, 11]);
        const sweepNotes = [];

        for (let n = startMidi; direction > 0 ? n <= endMidi : n >= endMidi; n += direction) {
            if (n === startMidi || n === endMidi || whiteKeyPitchClasses.has(n % 12)) {
                sweepNotes.push(n);
            }
        }

        const sweepDurationMs = stepDurationMs * 0.65;
        const intervalMs = sweepNotes.length > 1 ? sweepDurationMs / (sweepNotes.length - 1) : 0;

        return sweepNotes.map((note, idx) => {
            const isTargetNote = idx === sweepNotes.length - 1;
            const progress = sweepNotes.length > 1 ? idx / (sweepNotes.length - 1) : 1;
            const delayMs = Math.max(0, Math.round(idx * intervalMs));

            const durationMs = isTargetNote
                ? Math.max(120, Math.round(stepDurationMs * 0.92 - delayMs))
                : Math.max(45, Math.round(intervalMs * 2.2));

            const velCurve = isTargetNote ? 1.14 : (0.68 + progress * 0.32);
            const velJitter = (Math.random() * 2 - 1) * 8 * humanRatio;
            const velocity = Math.max(28, Math.min(127, Math.round(this.velocity * velCurve + velJitter)));

            return { note, velocity, delayMs, durationMs };
        });
    }

    #appendOrganicTransitions({
        events,
        currentNotes,
        nextNotes,
        stepDurationMs,
        humanRatio,
        artistProfile,
    }) {
        const roll = Math.random();
        const triggerThreshold = artistProfile ? 0.82 * humanRatio : 0.65 * humanRatio;
        if (roll > triggerThreshold) return;

        const nextBass = nextNotes[0];
        const nextTop = nextNotes[nextNotes.length - 1];
        const transitionType = Math.random();

        if (artistProfile === 'molina' || (transitionType < 0.34 && humanRatio > 0.45)) {
            const runOffsets = artistProfile === 'molina' ? [-5, -3, -2, -1] : [-3, -2, -1];
            const noteStepMs = (stepDurationMs * 0.22) / runOffsets.length;
            const runStartMs = stepDurationMs * 0.76;

            runOffsets.forEach((semitoneOffset, idx) => {
                const runNote = Math.max(36, Math.min(108, nextTop + semitoneOffset));
                const velCurve = 0.72 + idx * 0.08;
                events.push({
                    note: runNote,
                    velocity: Math.max(30, Math.min(127, Math.round(this.velocity * velCurve))),
                    delayMs: Math.round(runStartMs + idx * noteStepMs),
                    durationMs: Math.max(45, Math.round(noteStepMs * 1.15)),
                });
            });
            return;
        }

        if (artistProfile === 'clayderman') {
            const bellNotes = [
                currentNotes[currentNotes.length - 1] + 12,
                currentNotes[Math.max(0, currentNotes.length - 2)] + 12,
                nextTop + 12,
            ].filter((n) => n <= 108);

            const startMs = stepDurationMs * 0.78;
            const stepMs = (stepDurationMs * 0.2) / Math.max(1, bellNotes.length);

            bellNotes.forEach((n, idx) => {
                events.push({
                    note: n,
                    velocity: Math.max(35, Math.round(this.velocity * (0.78 - idx * 0.05))),
                    delayMs: Math.round(startMs + idx * stepMs),
                    durationMs: Math.round(stepMs * 1.4),
                });
            });
            return;
        }

        if (transitionType < 0.72) {
            const approachDir = Math.random() < 0.65 ? -1 : 1;
            const passingStartMs = Math.round(stepDurationMs * 0.82);
            const passingDurMs = Math.max(60, Math.round(stepDurationMs * 0.16));

            nextNotes.forEach((targetNote, idx) => {
                const passingNote = Math.max(24, Math.min(108, targetNote + approachDir));
                events.push({
                    note: passingNote,
                    velocity: Math.max(28, Math.round(this.velocity * 0.74)),
                    delayMs: passingStartMs + idx * 12,
                    durationMs: passingDurMs,
                });
            });
            return;
        }

        const walkSteps = nextBass > currentNotes[0] ? [-2, -1] : [2, 1];
        const walkStartMs = stepDurationMs * 0.75;
        const walkStepMs = stepDurationMs * 0.12;

        walkSteps.forEach((offset, idx) => {
            const bassWalkNote = Math.max(24, Math.min(96, nextBass + offset));
            events.push({
                note: bassWalkNote,
                velocity: Math.max(35, Math.round(this.velocity * (0.82 + idx * 0.08))),
                delayMs: Math.round(walkStartMs + idx * walkStepMs),
                durationMs: Math.max(50, Math.round(walkStepMs * 0.95)),
            });
        });
    }

    #load() {
        try {
            const raw = localStorage.getItem(CHORD_STORAGE_KEY);
            return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
        } catch {
            return { ...DEFAULT_CONFIG };
        }
    }

    #save() {
        localStorage.setItem(
            CHORD_STORAGE_KEY,
            JSON.stringify({
                progressionText: this.progressionText,
                bpm: this.bpm,
                beatsPerBar: this.beatsPerBar,
                beatUnit: this.beatUnit,
                octave: this.octave,
                barsPerChord: this.barsPerChord,
                velocity: this.velocity,
                style: this.style,
                humanize: this.humanize,
                loop: this.loop,
            })
        );
    }
}
