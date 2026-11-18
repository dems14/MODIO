'use strict';

const EventEmitter = require('events');
const easymidi = require('easymidi');

class MidiHardwareModel extends EventEmitter {
    /**
     * @param {string} portName
     */
    constructor(portName) {
        super();
        this.portName = portName;
        this.midiOut = null;
        this.midiIn = null;
    }

    /**
     * Initializes bidirectional virtual MIDI ports.
     * @throws {Error} If required Windows loopMIDI ports are missing.
     */
    initialize() {
        if (process.platform === 'win32') {
            this.#initializeWindowsPorts();
        } else {
            this.#initializeUnixVirtualPorts();
        }

        this.#bindIncomingEvents();
    }

    #initializeWindowsPorts() {
        const outputs = easymidi.getOutputs();
        const inputs = easymidi.getInputs();

        const targetOut = outputs.find((name) => name.includes(this.portName)) || outputs[0];
        const targetIn = inputs.find((name) => name.includes(this.portName)) || inputs[0];

        if (!targetOut || !targetIn) {
            throw new Error(
                `No virtual MIDI ports found. Open loopMIDI and create "${this.portName}".`
            );
        }

        this.midiOut = new easymidi.Output(targetOut);
        this.midiIn = new easymidi.Input(targetIn);
        console.log(`[MIDI Model] Connected Windows ports -> Out: "${targetOut}", In: "${targetIn}"`);
    }

    #initializeUnixVirtualPorts() {
        this.midiOut = new easymidi.Output(this.portName, true);
        this.midiIn = new easymidi.Input(this.portName, true);
        console.log(`[MIDI Model] Created virtual bidirectional port: "${this.portName}"`);
    }

    #bindIncomingEvents() {
        this.midiIn.on('cc', (msg) => {
            this.emit('daw:cc', {
                type: 'cc',
                cc: msg.controller,
                value: msg.value,
                channel: msg.channel,
            });
        });
    }

    /**
     * Dispatches a validated MIDI message to the DAW.
     * @param {{ type: string, channel?: number, cc?: number, value?: number, note?: number, velocity?: number }} payload
     */
    sendMidiMessage(payload) {
        if (!this.midiOut) return;

        const channel = this.#clampMidi(payload.channel ?? 0, 0, 15);

        switch (payload.type) {
            case 'cc':
                this.midiOut.send('cc', {
                    controller: this.#clampMidi(payload.cc),
                    value: this.#clampMidi(payload.value),
                    channel,
                });
                break;

            case 'noteon':
                this.midiOut.send('noteon', {
                    note: this.#clampMidi(payload.note),
                    velocity: this.#clampMidi(payload.velocity ?? 120),
                    channel,
                });
                break;

            case 'noteoff':
                this.midiOut.send('noteoff', {
                    note: this.#clampMidi(payload.note),
                    velocity: 0,
                    channel,
                });
                break;

            default:
                console.warn(`[MIDI Model] Ignored unsupported message type: ${payload.type}`);
        }
    }

    /**
     * @param {number} val
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    #clampMidi(val, min = 0, max = 127) {
        const num = Number(val);
        if (Number.isNaN(num)) return min;
        return Math.max(min, Math.min(max, Math.round(num)));
    }

    close() {
        if (this.midiOut) this.midiOut.close();
        if (this.midiIn) this.midiIn.close();
    }
}

module.exports = MidiHardwareModel;