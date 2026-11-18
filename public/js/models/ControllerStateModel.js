const STORAGE_KEY = 'wifi_midi_custom_map_v2';
const CHANNEL_STORAGE_KEY = 'wifi_midi_selected_channel_v1';
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const DEFAULT_MAP = Object.freeze({
    knobs: [16, 17, 18, 19, 20, 21, 22, 23],
    knobNames: ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8'],
    faders: [1, 2, 3, 4, 5, 6, 7, 8],
    faderNames: ['Fader 1', 'Fader 2', 'Fader 3', 'Fader 4', 'Fader 5', 'Fader 6', 'Fader 7', 'Fader 8'],
    pads: [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51],
    padNames: Array.from({ length: 16 }, (_, idx) => `PAD ${idx + 1}`),
});

export class ControllerStateModel {
    constructor() {
        this.midiChannel = this.#loadChannelFromStorage();
        this.isEditMode = false;
        this.map = this.#loadFromStorage();
        this.knobValues = new Array(8).fill(64);
        this.faderValues = new Array(8).fill(0);
    }

    /**
     * Converts a MIDI note number (0–127) into scientific pitch notation.
     * @param {number} noteNumber
     * @returns {string}
     */
    static formatNoteName(noteNumber) {
        const name = NOTE_NAMES[noteNumber % 12];
        const octave = Math.floor(noteNumber / 12) - 1;
        return `${name}${octave}`;
    }

    #loadChannelFromStorage() {
        const savedChannel = parseInt(localStorage.getItem(CHANNEL_STORAGE_KEY), 10);
        return !Number.isNaN(savedChannel) && savedChannel >= 0 && savedChannel <= 15
            ? savedChannel
            : 0;
    }

    setMidiChannel(channelIndex) {
        const clamped = Math.max(0, Math.min(15, Number(channelIndex) || 0));
        this.midiChannel = clamped;
        localStorage.setItem(CHANNEL_STORAGE_KEY, String(clamped));
    }

    #loadFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const saved = raw ? JSON.parse(raw) : {};
            return {
                knobs: saved.knobs || [...DEFAULT_MAP.knobs],
                knobNames: saved.knobNames || [...DEFAULT_MAP.knobNames],
                faders: saved.faders || [...DEFAULT_MAP.faders],
                faderNames: saved.faderNames || [...DEFAULT_MAP.faderNames],
                pads: saved.pads || [...DEFAULT_MAP.pads],
                padNames: saved.padNames || [...DEFAULT_MAP.padNames],
            };
        } catch {
            return structuredClone(DEFAULT_MAP);
        }
    }

    save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.map));
    }

    reset() {
        localStorage.removeItem(STORAGE_KEY);
        this.map = structuredClone(DEFAULT_MAP);
    }

    updateControlConfig(type, index, name, midiNumber) {
        if (type === 'knob') {
            this.map.knobNames[index] = name;
            this.map.knobs[index] = midiNumber;
        } else if (type === 'fader') {
            this.map.faderNames[index] = name;
            this.map.faders[index] = midiNumber;
        } else if (type === 'pad') {
            this.map.padNames[index] = name;
            this.map.pads[index] = midiNumber;
        }
        this.save();
    }
}