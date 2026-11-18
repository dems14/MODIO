export class MidiClientController {
    constructor(model, surfaceView, modalView, chordModel, chordView) {
        this.model = model;
        this.surfaceView = surfaceView;
        this.modalView = modalView;
        this.chordModel = chordModel;
        this.chordView = chordView;

        this.ws = null;
        this.draggingKnobs = new Array(8).fill(false);
        this.draggingFaders = new Array(8).fill(false);

        this.chordTimerId = null;
        this.activeChordNotes = [];
        this.nextStepDeadline = 0;
    }

    initialize() {
        this.surfaceView.renderChannelOptions();
        this.surfaceView.channelSelect.value = String(this.model.midiChannel);
        this.#bindHeaderEvents();
        this.#bindTabEvents();
        this.#bindChordSequencerEvents();
        this.#bindTwoFingerScroll();

        this.chordView.syncFromModel(this.chordModel);
        this.surfaceView.renderSurface(this.model, {
            bindKnobEvents: (i, refs) => this.#bindKnobEvents(i, refs),
            bindFaderEvents: (i, refs) => this.#bindFaderEvents(i, refs),
            bindPadEvents: (i, refs) => this.#bindPadEvents(i, refs),
        });

        this.surfaceView.setActiveTab(this.model.activeTab);

        window.addEventListener('resize', () => this.surfaceView.refreshAllMarquees());
        this.#connectWebSocket();
    }

    #bindTabEvents() {
        this.surfaceView.tabButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const selectedTab = btn.dataset.tab;
                this.model.setActiveTab(selectedTab);
                this.surfaceView.setActiveTab(selectedTab);
                window.scrollTo(0, 0);
            });
        });
    }

    #bindHeaderEvents() {
        this.surfaceView.sustainBtn.addEventListener('click', () => {
            const nextState = !this.model.isSustainOn;
            this.model.setSustain(nextState);
            this.surfaceView.setSustainState(nextState);
            this.#sendMidi({
                type: 'cc',
                cc: 64,
                value: nextState ? 127 : 0,
            });
        });

        this.surfaceView.editModeBtn.addEventListener('click', () => {
            this.model.isEditMode = !this.model.isEditMode;
            this.surfaceView.setEditMode(this.model.isEditMode);
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
                this.surfaceView.setActiveTab(this.model.activeTab);
            }
        });

        this.surfaceView.channelSelect.addEventListener('change', (e) => {
            if (this.model.isSustainOn) {
                this.#sendMidi({ type: 'cc', cc: 64, value: 0 });
                this.model.setSustain(false);
                this.surfaceView.setSustainState(false);
            }
            if (this.chordModel.isPlaying) {
                this.#stopChordPlayback();
            }
            this.model.setMidiChannel(parseInt(e.target.value, 10));
        });

        this.surfaceView.fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            } else {
                document.exitFullscreen();
            }
        });
    }

    #bindTwoFingerScroll() {
        let isTwoFingerScrolling = false;
        let lastMidX = 0;
        let lastMidY = 0;
        let horizontalTarget = null;

        const getMidpoint = (t1, t2) => ({
            x: (t1.clientX + t2.clientX) / 2,
            y: (t1.clientY + t2.clientY) / 2,
        });

        document.addEventListener(
            'touchstart',
            (e) => {
                if (e.touches.length === 2) {
                    isTwoFingerScrolling = true;
                    this.draggingKnobs.fill(false);
                    this.draggingFaders.fill(false);

                    const mid = getMidpoint(e.touches[0], e.touches[1]);
                    lastMidX = mid.x;
                    lastMidY = mid.y;

                    const targetEl = e.target instanceof Element ? e.target : null;
                    horizontalTarget = targetEl?.closest('.faders-row, .knobs-row, .chord-cards-strip') || null;
                }
            },
            { passive: true }
        );

        document.addEventListener(
            'touchmove',
            (e) => {
                if (!isTwoFingerScrolling || e.touches.length !== 2) return;

                const mid = getMidpoint(e.touches[0], e.touches[1]);
                const deltaX = lastMidX - mid.x;
                const deltaY = lastMidY - mid.y;

                lastMidX = mid.x;
                lastMidY = mid.y;

                if (horizontalTarget && Math.abs(deltaX) > 0.5) {
                    horizontalTarget.scrollLeft += deltaX;
                }

                if (Math.abs(deltaY) > 0.5) {
                    window.scrollBy(0, deltaY);
                }
            },
            { passive: true }
        );

        const endGesture = (e) => {
            if (e.touches.length < 2) {
                isTwoFingerScrolling = false;
                horizontalTarget = null;
            }
        };

        document.addEventListener('touchend', endGesture, { passive: true });
        document.addEventListener('touchcancel', endGesture, { passive: true });
    }

    #bindChordSequencerEvents() {
        const refreshProgression = () => {
            this.chordModel.updateSettings({
                progressionText: this.chordView.progressionInput.value,
                bpm: this.chordView.bpmInput.value,
                beatsPerBar: this.chordView.beatsPerBarInput.value,
                beatUnit: this.chordView.beatUnitSelect.value,
                barsPerChord: this.chordView.barsPerChordSelect.value,
                octave: this.chordView.octaveSelect.value,
            });
            this.chordView.renderChordCards(
                this.chordModel.parsedChords,
                this.chordModel.currentStepIndex
            );
        };

        this.chordView.progressionInput.addEventListener('input', refreshProgression);
        this.chordView.bpmInput.addEventListener('change', refreshProgression);
        this.chordView.beatsPerBarInput.addEventListener('change', refreshProgression);
        this.chordView.beatUnitSelect.addEventListener('change', refreshProgression);
        this.chordView.barsPerChordSelect.addEventListener('change', refreshProgression);
        this.chordView.octaveSelect.addEventListener('change', refreshProgression);

        this.chordView.loopToggleBtn.addEventListener('click', () => {
            this.chordModel.updateSettings({ loop: !this.chordModel.loop });
            this.chordView.setLoopState(this.chordModel.loop);
        });

        this.chordView.playStopBtn.addEventListener('click', () => {
            if (this.chordModel.isPlaying) {
                this.#stopChordPlayback();
            } else {
                this.#startChordPlayback();
            }
        });
    }

    #startChordPlayback() {
        if (!this.chordModel.parsedChords.length) return;

        this.chordModel.isPlaying = true;
        this.chordModel.currentStepIndex = 0;
        this.chordView.setPlaybackState(true);

        this.#triggerChordStep(0);
        this.nextStepDeadline = performance.now() + this.chordModel.getStepDurationMs();

        this.chordTimerId = setInterval(() => {
            if (!this.chordModel.isPlaying) return;

            const now = performance.now();
            if (now >= this.nextStepDeadline) {
                const total = this.chordModel.parsedChords.length;
                let nextIdx = this.chordModel.currentStepIndex + 1;

                if (nextIdx >= total) {
                    if (this.chordModel.loop) {
                        nextIdx = 0;
                    } else {
                        this.#stopChordPlayback();
                        return;
                    }
                }

                this.chordModel.currentStepIndex = nextIdx;
                this.#triggerChordStep(nextIdx);
                this.nextStepDeadline += this.chordModel.getStepDurationMs();
            }
        }, 15);
    }

    #stopChordPlayback() {
        this.chordModel.isPlaying = false;
        this.chordModel.currentStepIndex = -1;
        if (this.chordTimerId) {
            clearInterval(this.chordTimerId);
            this.chordTimerId = null;
        }
        this.#releaseActiveChordNotes();
        this.chordView.setPlaybackState(false);
        this.chordView.highlightStep(-1);
    }

    #triggerChordStep(index) {
        this.#releaseActiveChordNotes();
        this.chordView.highlightStep(index);

        const chord = this.chordModel.parsedChords[index];
        if (!chord || !chord.valid) return;

        chord.notes.forEach((note) => {
            this.#sendMidi({
                type: 'noteon',
                note,
                velocity: this.chordModel.velocity,
            });
        });
        this.activeChordNotes = [...chord.notes];
    }

    #releaseActiveChordNotes() {
        this.activeChordNotes.forEach((note) => {
            this.#sendMidi({ type: 'noteoff', note });
        });
        this.activeChordNotes = [];
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
            if (this.model.isEditMode || !e.isPrimary) return;
            unit.setPointerCapture(e.pointerId);
            this.draggingKnobs[index] = true;
            startY = e.clientY;
            startVal = this.model.knobValues[index];
        });

        unit.addEventListener('pointermove', (e) => {
            if (this.model.isEditMode || !this.draggingKnobs[index] || !unit.hasPointerCapture(e.pointerId)) return;
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
            if (this.model.isEditMode || !e.isPrimary) return;
            track.setPointerCapture(e.pointerId);
            this.draggingFaders[index] = true;
            computeAndSend(e.clientY);
        });

        track.addEventListener('pointermove', (e) => {
            if (this.model.isEditMode || !this.draggingFaders[index] || !track.hasPointerCapture(e.pointerId)) return;
            computeAndSend(e.clientY);
        });

        const release = () => {
            this.draggingFaders[index] = false;
        };
        track.addEventListener('pointerup', release);
        track.addEventListener('pointercancel', release);
    }

    #bindPadEvents(index, { pad }) {
        let activePointerId = null;

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
            if (this.model.isEditMode || !e.isPrimary) return;
            activePointerId = e.pointerId;
            pad.setPointerCapture(e.pointerId);
            this.surfaceView.setPadActive(index, true);

            if (this.model.isSustainOn) {
                this.model.sustainedPads.add(index);
                this.surfaceView.setPadSustained(index, true);
            }

            this.#sendMidi({
                type: 'noteon',
                note: this.model.map.pads[index],
                velocity: 120,
            });
        };

        const triggerOff = (e) => {
            if (activePointerId !== null && (!e || e.pointerId === activePointerId)) {
                activePointerId = null;
                this.surfaceView.setPadActive(index, false);
                this.#sendMidi({
                    type: 'noteoff',
                    note: this.model.map.pads[index],
                });
            }
        };

        pad.addEventListener('pointerdown', triggerOn);
        pad.addEventListener('pointerup', triggerOff);
        pad.addEventListener('pointercancel', triggerOff);
    }
}
