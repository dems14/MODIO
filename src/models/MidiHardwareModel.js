'use strict';

const EventEmitter = require('events');
const easymidi = require('easymidi');

class MidiHardwareModel extends EventEmitter {
    constructor(outPortName, inPortName) {
        super();
        this.outPortName = outPortName;
        this.inPortName = inPortName || outPortName;
        this.midiOut = null;
        this.midiIn = null;
    }

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

        const targetOut = outputs.find((name) => name.includes(this.outPortName));
        const targetIn = inputs.find((name) => name.includes(this.inPortName));

        if (!targetOut || !targetIn) {
            throw new Error(
                `Missing loopMIDI ports. Create both "${this.outPortName}" and "${this.inPortName}" in loopMIDI.`
            );
        }

        if (targetOut === targetIn) {
            console.warn(
                `[MIDI Model Warning] Out and In are mapped to the same port ("${targetOut}"). Use two separate ports to prevent feedback loops.`
            );
        }

        this.midiOut = new easymidi.Output(targetOut);
        this.midiIn = new easymidi.Input(targetIn);
        console.log(`[MIDI Model] Connected Windows ports -> Out: "${targetOut}", In: "${targetIn}"`);
    }

    #initializeUnixVirtualPorts() {
        this.midiOut = new easymidi.Output(this.outPortName, true);
        this.midiIn = new easymidi.Input(this.inPortName, true);
        console.log(`[MIDI Model] Created virtual ports -> Out: "${this.outPortName}", In: "${this.inPortName}"`);
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

        this.midiIn.on('noteon', (msg) => {
            const isNoteOff = msg.velocity === 0;
            this.emit('daw:note', {
                type: isNoteOff ? 'noteoff' : 'noteon',
                note: msg.note,
                velocity: msg.velocity,
                channel: msg.channel,
            });
        });

        this.midiIn.on('noteoff', (msg) => {
            this.emit('daw:note', {
                type: 'noteoff',
                note: msg.note,
                velocity: 0,
                channel: msg.channel,
            });
        });
    }

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