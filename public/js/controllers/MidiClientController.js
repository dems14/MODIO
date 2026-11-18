export class MidiClientController {
    /**
     * @param {import('../models/ControllerStateModel.js').ControllerStateModel} model
     * @param {import('../views/ControlSurfaceView.js').ControlSurfaceView} surfaceView
     * @param {import('../views/ModalView.js').ModalView} modalView
     */
    constructor(model, surfaceView, modalView) {
        this.model = model;
        this.surfaceView = surfaceView;
        this.modalView = modalView;

        this.ws = null;
        this.draggingKnobs = new Array(8).fill(false);
        this.draggingFaders = new Array(8).fill(false);
    }

    initialize() {
        this.surfaceView.renderChannelOptions();
        this.surfaceView.channelSelect.value = String(this.model.midiChannel);
        this.#bindHeaderEvents();
        this.surfaceView.renderSurface(this.model, {
            bindKnobEvents: (i, refs) => this.#bindKnobEvents(i, refs),
            bindFaderEvents: (i, refs) => this.#bindFaderEvents(i, refs),
            bindPadEvents: (i, refs) => this.#bindPadEvents(i, refs),
        });

        window.addEventListener('resize', () => this.surfaceView.refreshAllMarquees());
        this.#connectWebSocket();
    }

    #bindHeaderEvents() {
        this.surfaceView.editModeBtn.addEventListener('click', () => {
            this.model.isEditMode = !this.model.isEditMode;
            this.surfaceView.setEditMode(this.model.isEditMode);
        });

        this.surfaceView.channelSelect.addEventListener('change', (e) => {
            this.model.setMidiChannel(parseInt(e.target.value, 10));
        });

        this.surfaceView.resetMapBtn.addEventListener('click', async () => {
            const confirmed = await this.modalView.openConfirm({
                title: 'Reset Controller Mapping',
                message: 'Restore all knob, fader, and pad names and MIDI numbers back to defaults?',
                confirmText: 'Reset All',
                isDanger: true,
            });
            if (confirmed) {
                this.model.reset();
                this.surfaceView.renderSurface(this.model, {
                    bindKnobEvents: (i, refs) => this.#bindKnobEvents(i, refs),
                    bindFaderEvents: (i, refs) => this.#bindFaderEvents(i, refs),
                    bindPadEvents: (i, refs) => this.#bindPadEvents(i, refs),
                });
            }
        });

        this.surfaceView.channelSelect.addEventListener('change', (e) => {
            this.model.midiChannel = parseInt(e.target.value, 10);
        });

        this.surfaceView.fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            } else {
                document.exitFullscreen();
            }
        });
    }

    #connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.ws = new WebSocket(`${protocol}//${window.location.host}`);

        this.ws.onopen = () => this.surfaceView.setConnectionStatus(true, 'Connected');
        this.ws.onclose = () => {
            this.surfaceView.setConnectionStatus(false, 'Reconnecting...');
            setTimeout(() => this.#connectWebSocket(), 1500);
        };
        this.ws.onmessage = (event) => this.#handleIncomingMidi(event.data);
    }

    #handleIncomingMidi(rawData) {
        try {
            const msg = JSON.parse(rawData);
            if (msg.type !== 'cc' || msg.channel !== this.model.midiChannel) return;

            this.model.map.knobs.forEach((cc, idx) => {
                if (cc === msg.cc && !this.draggingKnobs[idx]) {
                    this.model.knobValues[idx] = msg.value;
                    this.surfaceView.updateKnobValue(idx, msg.value);
                }
            });

            this.model.map.faders.forEach((cc, idx) => {
                if (cc === msg.cc && !this.draggingFaders[idx]) {
                    this.model.faderValues[idx] = msg.value;
                    this.surfaceView.updateFaderValue(idx, msg.value);
                }
            });
        } catch {
            // Ignore malformed socket frames
        }
    }

    #sendMidi(payload) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ ...payload, channel: this.model.midiChannel }));
        }
    }

    #bindKnobEvents(index, { unit }) {
        let startY = 0;
        let startVal = 64;

        unit.addEventListener('click', async () => {
            if (!this.model.isEditMode) return;
            const res = await this.modalView.openEdit({
                title: `Edit Knob ${index + 1}`,
                currentName: this.model.map.knobNames[index],
                currentMidi: this.model.map.knobs[index],
                controlType: 'knob',
            });
            if (res) {
                this.model.updateControlConfig('knob', index, res.name, res.midi);
                this.surfaceView.updateKnobMeta(index, res.name, res.midi);
            }
        });

        unit.addEventListener('pointerdown', (e) => {
            if (this.model.isEditMode) return;
            unit.setPointerCapture(e.pointerId);
            this.draggingKnobs[index] = true;
            startY = e.clientY;
            startVal = this.model.knobValues[index];
        });

        unit.addEventListener('pointermove', (e) => {
            if (this.model.isEditMode || !unit.hasPointerCapture(e.pointerId)) return;
            const deltaY = startY - e.clientY;
            const newVal = Math.max(0, Math.min(127, Math.round(startVal + deltaY * 0.8)));

            if (newVal !== this.model.knobValues[index]) {
                this.model.knobValues[index] = newVal;
                this.surfaceView.updateKnobValue(index, newVal);
                this.#sendMidi({ type: 'cc', cc: this.model.map.knobs[index], value: newVal });
            }
        });

        const release = () => {
            this.draggingKnobs[index] = false;
        };
        unit.addEventListener('pointerup', release);
        unit.addEventListener('pointercancel', release);
    }

    #bindFaderEvents(index, { unit, track }) {
        const computeAndSend = (clientY) => {
            const rect = track.getBoundingClientRect();
            const relY = Math.max(0, Math.min(rect.height, rect.bottom - clientY));
            const midiVal = Math.round((relY / rect.height) * 127);

            if (midiVal !== this.model.faderValues[index]) {
                this.model.faderValues[index] = midiVal;
                this.surfaceView.updateFaderValue(index, midiVal);
                this.#sendMidi({ type: 'cc', cc: this.model.map.faders[index], value: midiVal });
            }
        };

        unit.addEventListener('click', async () => {
            if (!this.model.isEditMode) return;
            const res = await this.modalView.openEdit({
                title: `Edit Fader ${index + 1}`,
                currentName: this.model.map.faderNames[index],
                currentMidi: this.model.map.faders[index],
                controlType: 'fader',
            });
            if (res) {
                this.model.updateControlConfig('fader', index, res.name, res.midi);
                this.surfaceView.updateFaderMeta(index, res.name, res.midi);
            }
        });

        unit.addEventListener('pointerdown', (e) => {
            if (this.model.isEditMode) return;
            track.setPointerCapture(e.pointerId);
            this.draggingFaders[index] = true;
            computeAndSend(e.clientY);
        });

        track.addEventListener('pointermove', (e) => {
            if (this.model.isEditMode || !track.hasPointerCapture(e.pointerId)) return;
            computeAndSend(e.clientY);
        });

        const release = () => {
            this.draggingFaders[index] = false;
        };
        track.addEventListener('pointerup', release);
        track.addEventListener('pointercancel', release);
    }

    #bindPadEvents(index, { pad }) {
        let isActive = false;

        pad.addEventListener('click', async () => {
            if (!this.model.isEditMode) return;
            const res = await this.modalView.openEdit({
                title: `Edit Pad ${index + 1}`,
                currentName: this.model.map.padNames[index],
                currentMidi: this.model.map.pads[index],
                controlType: 'pad',
            });
            if (res) {
                this.model.updateControlConfig('pad', index, res.name, res.midi);
                this.surfaceView.updatePadMeta(index, res.name, res.midi);
            }
        });

        const triggerOn = (e) => {
            e.preventDefault();
            if (this.model.isEditMode) return;
            pad.setPointerCapture(e.pointerId);
            if (!isActive) {
                isActive = true;
                this.surfaceView.setPadActive(index, true);
                this.#sendMidi({ type: 'noteon', note: this.model.map.pads[index], velocity: 120 });
            }
        };

        const triggerOff = () => {
            if (isActive) {
                isActive = false;
                this.surfaceView.setPadActive(index, false);
                this.#sendMidi({ type: 'noteoff', note: this.model.map.pads[index] });
            }
        };

        pad.addEventListener('pointerdown', triggerOn);
        pad.addEventListener('pointerup', triggerOff);
        pad.addEventListener('pointercancel', triggerOff);
    }
}