const CHORD_STORAGE_KEY = 'wifi_midi_chord_sequencer_v1';

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

const DEFAULT_CONFIG = Object.freeze({
    progressionText: 'Cmaj7 | Am7 | Dm9 | G13',
    bpm: 110,
    beatsPerBar: 4,
    beatUnit: 4,
    octave: 4,
    barsPerChord: 1,
    velocity: 100,
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
        this.loop = saved.loop;

        this.isPlaying = false;
        this.currentStepIndex = -1;
        this.parsedChords = this.parseProgression(this.progressionText, this.octave);
    }

    static parseChordSymbol(symbol, octave = 4) {
        const clean = symbol.trim();
        if (!clean) return { symbol: '', notes: [], valid: false };

        const match = clean.match(/^([A-Ga-g][#b]?)(.*?)(?:\/([A-Ga-g][#b]?))?$/);
        if (!match) return { symbol: clean, notes: [], valid: false };

        const rawRoot = match[1][0].toUpperCase() + (match[1][1] || '');
        const quality = match[2] || '';
        const rawBass = match[3] ? match[3][0].toUpperCase() + (match[3][1] || '') : null;

        const rootSemitone = ROOT_OFFSETS[rawRoot];
        const intervals = CHORD_FORMULAS[quality];

        if (rootSemitone === undefined || !intervals) {
            return { symbol: clean, notes: [], valid: false };
        }

        const baseMidi = (octave + 1) * 12 + rootSemitone;
        const notes = intervals
            .map((interval) => baseMidi + interval)
            .filter((n) => n >= 0 && n <= 127);

        if (rawBass && ROOT_OFFSETS[rawBass] !== undefined) {
            const bassSemitone = ROOT_OFFSETS[rawBass];
            let bassNote = octave * 12 + bassSemitone;
            while (bassNote >= baseMidi) bassNote -= 12;
            if (bassNote >= 0 && !notes.includes(bassNote)) {
                notes.unshift(bassNote);
            }
        }

        return { symbol: clean, notes, valid: notes.length > 0 };
    }

    parseProgression(text, octave = this.octave) {
        const tokens = text
            .split(/[\|,\n]+|\s{2,}/)
            .flatMap((chunk) => (chunk.includes(' ') && !text.includes('|') && !text.includes(',')
                ? chunk.split(/\s+/)
                : [chunk]))
            .map((t) => t.trim())
            .filter(Boolean);

        return tokens.map((token) => ChordSequencerModel.parseChordSymbol(token, octave));
    }

    updateSettings(partial) {
        if (partial.progressionText !== undefined) this.progressionText = partial.progressionText;
        if (partial.bpm !== undefined) this.bpm = Math.max(30, Math.min(300, Number(partial.bpm) || 120));
        if (partial.beatsPerBar !== undefined) this.beatsPerBar = Math.max(1, Math.min(16, Number(partial.beatsPerBar) || 4));
        if (partial.beatUnit !== undefined) this.beatUnit = [2, 4, 8, 16].includes(Number(partial.beatUnit)) ? Number(partial.beatUnit) : 4;
        if (partial.octave !== undefined) this.octave = Math.max(1, Math.min(7, Number(partial.octave) || 4));
        if (partial.barsPerChord !== undefined) this.barsPerChord = Math.max(0.25, Math.min(8, Number(partial.barsPerChord) || 1));
        if (partial.loop !== undefined) this.loop = Boolean(partial.loop);

        this.parsedChords = this.parseProgression(this.progressionText, this.octave);
        this.#save();
    }

    getStepDurationMs() {
        const quarterNoteMs = 60000 / this.bpm;
        const beatUnitMs = quarterNoteMs * (4 / this.beatUnit);
        const barDurationMs = beatUnitMs * this.beatsPerBar;
        return barDurationMs * this.barsPerChord;
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
                loop: this.loop,
            })
        );
    }
}
