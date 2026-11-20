import { ChordSequencerModel } from '../models/ChordSequencerModel.js';

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

        // Multitouch pad state (supports simultaneous pads & duplicate note mappings)
        this.padPointersByIndex = Array.from({ length: 16 }, () => new Set());
        this.activePadNotes = new Map();       // padIndex -> { note, channel }
        this.activeNoteRefCounts = new Map();  // `${channel}:${note}` -> count

        this.chordTimerId = null;
        this.scheduledNoteTimers = new Set();
        this.activeChordNotes = new Set();
        this.nextStepDeadline = 0;
        this.totalBarsPlayed = 0;
    }

    initialize() {
        this.surfaceView.renderChannelOptions();
        this.surfaceView.channelSelect.value = String(this.model.midiChannel);
        this.#bindHeaderEvents();
        this.#bindTabEvents();
        this.#bindChordSequencerEvents();
        this.#bindControlRowsScrollSync();
        this.#bindTwoFingerScroll();
        this.#bindSafetyReleaseEvents();

        this.chordView.syncFromModel(this.chordModel);
        this.surfaceView.renderSurface(this.model, {
            bindKnobEvents: (i, refs) => this.#bindKnobEvents(i, refs),
            bindFaderEvents: (i, refs) => this.#bindFaderEvents(i, refs),
            bindSwitchEvents: (i, refs) => this.#bindSwitchEvents(i, refs),
            bindPadEvents: (i, refs) => this.#bindPadEvents(i, refs),
        });

        this.surfaceView.setActiveTab(this.model.activeTab);

        window.addEventListener('resize', () => this.surfaceView.refreshAllMarquees());
        this.#connectWebSocket();
    }

    /**
     * Keeps Knobs, Faders, and Switches horizontally aligned when any row is scrolled.
     */
    #bindControlRowsScrollSync() {
        const rows = [
            this.surfaceView.knobsContainer,
            this.surfaceView.fadersContainer,
            this.surfaceView.switchesContainer,
        ].filter(Boolean);

        let isSyncing = false;

        rows.forEach((sourceRow) => {
            sourceRow.addEventListener(
                'scroll',
                () => {
                    if (isSyncing) return;
                    isSyncing = true;
                    const targetLeft = sourceRow.scrollLeft;
                    rows.forEach((otherRow) => {
                        if (otherRow !== sourceRow && Math.abs(otherRow.scrollLeft - targetLeft) > 1) {
                            otherRow.scrollLeft = targetLeft;
                        }
                    });
                    requestAnimationFrame(() => {
                        isSyncing = false;
                    });
                },
                { passive: true }
            );
        });
    }

    #bindSafetyReleaseEvents() {
        const releaseAll = () => {
            this.draggingKnobs.fill(false);
            this.draggingFaders.fill(false);
            this.#releaseAllActivePads();
        };

        window.addEventListener('blur', releaseAll);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) releaseAll();
        });
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
            if (this.model.isEditMode) {
                this.draggingKnobs.fill(false);
                this.draggingFaders.fill(false);
                this.#releaseAllActivePads();
            }
            this.surfaceView.setEditMode(this.model.isEditMode);
        });

        this.surfaceView.resetMapBtn.addEventListener('click', async () => {
            const confirmed = await this.modalView.openConfirm({
                title: 'Reset Controller Mapping',
                message: 'Restore all knob, fader, switch, and pad names and MIDI numbers back to defaults?',
                confirmText: 'Reset All',
                isDanger: true,
            });
            if (confirmed) {
                this.#releaseAllActivePads();
                this.model.reset();
                this.surfaceView.renderSurface(this.model, {
                    bindKnobEvents: (i, refs) => this.#bindKnobEvents(i, refs),
                    bindFaderEvents: (i, refs) => this.#bindFaderEvents(i, refs),
                    bindSwitchEvents: (i, refs) => this.#bindSwitchEvents(i, refs),
                    bindPadEvents: (i, refs) => this.#bindPadEvents(i, refs),
                });
                this.surfaceView.setActiveTab(this.model.activeTab);
            }
        });

        this.surfaceView.channelSelect.addEventListener('change', (e) => {
            this.#releaseAllActivePads();
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
        let isTouchOnActiveSlider = false;
        let lastMidX = 0;
        let lastMidY = 0;
        let horizontalTarget = null;

        const isPadTarget = (target) =>
            target instanceof Element && Boolean(target.closest('.pad, .pads-grid'));

        const isSliderTarget = (target) =>
            target instanceof Element && Boolean(target.closest('.fader-track, .knob-dial'));

        const getMidpoint = (t1, t2) => ({
            x: (t1.clientX + t2.clientX) / 2,
            y: (t1.clientY + t2.clientY) / 2,
        });

        document.addEventListener(
            'touchstart',
            (e) => {
                if (e.touches.length !== 2) {
                    isTwoFingerScrolling = false;
                    isTouchOnActiveSlider = false;
                    horizontalTarget = null;
                    return;
                }

                const touches = Array.from(e.touches);
                // Never scroll when playing multitouch pads
                if (touches.some((t) => isPadTarget(t.target))) {
                    isTwoFingerScrolling = false;
                    horizontalTarget = null;
                    return;
                }

                isTouchOnActiveSlider = touches.some((t) => isSliderTarget(t.target));
                isTwoFingerScrolling = true;

                const mid = getMidpoint(e.touches[0], e.touches[1]);
                lastMidX = mid.x;
                lastMidY = mid.y;

                const targetEl = e.target instanceof Element ? e.target : null;
                horizontalTarget =
                    targetEl?.closest(
                        '.faders-row, .knobs-row, .switches-row, .chord-cards-strip, .pentagram-strip'
                    ) || null;
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

                // If fingers are on fader tracks or knob dials, only scroll horizontally on clear horizontal motion
                if (isTouchOnActiveSlider) {
                    if (horizontalTarget && Math.abs(deltaX) > Math.abs(deltaY) * 1.4 && Math.abs(deltaX) > 2) {
                        horizontalTarget.scrollLeft += deltaX;
                    }
                    return;
                }

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
                isTouchOnActiveSlider = false;
                horizontalTarget = null;
            }
        };

        document.addEventListener('touchend', endGesture, { passive: true });
        document.addEventListener('touchcancel', endGesture, { passive: true });
    }

    async #extractSheetContent(file) {
        const lowerName = file.name.toLowerCase();

        if (lowerName.endsWith('.mxl')) {
            if (typeof window.JSZip === 'undefined') {
                throw new Error('JSZip library failed to load. Check internet connection or install jszip locally.');
            }

            const arrayBuffer = await file.arrayBuffer();
            const zip = await window.JSZip.loadAsync(arrayBuffer);

            let targetXmlPath = null;
            const containerFile = zip.file('META-INF/container.xml');
            if (containerFile) {
                const containerXml = await containerFile.async('string');
                const doc = new DOMParser().parseFromString(containerXml, 'application/xml');
                const rootfileEl = doc.querySelector('rootfile[full-path]');
                if (rootfileEl) {
                    targetXmlPath = rootfileEl.getAttribute('full-path');
                }
            }

            if (!targetXmlPath || !zip.file(targetXmlPath)) {
                targetXmlPath = Object.keys(zip.files).find(
                    (path) =>
                        !path.startsWith('META-INF/') &&
                        !zip.files[path].dir &&
                        (path.toLowerCase().endsWith('.musicxml') || path.toLowerCase().endsWith('.xml'))
                );
            }

            if (!targetXmlPath || !zip.file(targetXmlPath)) {
                throw new Error('No MusicXML score found inside the .mxl archive.');
            }

            const xmlString = await zip.file(targetXmlPath).async('string');
            return { content: xmlString, isXml: true };
        }

        const text = await file.text();
        const isXml =
            lowerName.endsWith('.xml') ||
            lowerName.endsWith('.musicxml') ||
            text.trimStart().startsWith('<');

        return { content: text, isXml };
    }

    #bindChordSequencerEvents() {
        const refreshProgression = (partialOverride) => {
            this.chordModel.updateSettings({
                ...(partialOverride || {
                    progressionText: this.chordView.progressionInput.value,
                    bpm: this.chordView.bpmInput.value,
                    beatsPerBar: this.chordView.beatsPerBarInput.value,
                    beatUnit: this.chordView.beatUnitSelect.value,
                    barsPerChord: this.chordView.barsPerChordSelect.value,
                    octave: this.chordView.octaveSelect.value,
                    style: this.chordView.styleSelect?.value,
                    humanize: this.chordView.humanizeInput?.value,
                }),
            });
            this.chordView.renderChordCards(
                this.chordModel.parsedChords,
                this.chordModel.currentStepIndex
            );
        };

        this.chordView.progressionInput.addEventListener('input', () =>
            refreshProgression({ progressionText: this.chordView.progressionInput.value })
        );
        this.chordView.bpmInput.addEventListener('change', () =>
            refreshProgression({ bpm: this.chordView.bpmInput.value })
        );
        this.chordView.beatsPerBarInput.addEventListener('change', () =>
            refreshProgression({ beatsPerBar: this.chordView.beatsPerBarInput.value })
        );
        this.chordView.beatUnitSelect.addEventListener('change', () =>
            refreshProgression({ beatUnit: this.chordView.beatUnitSelect.value })
        );
        this.chordView.barsPerChordSelect.addEventListener('change', () =>
            refreshProgression({ barsPerChord: this.chordView.barsPerChordSelect.value })
        );
        this.chordView.octaveSelect.addEventListener('change', () =>
            refreshProgression({ octave: this.chordView.octaveSelect.value })
        );
        this.chordView.styleSelect?.addEventListener('change', () =>
            refreshProgression({ style: this.chordView.styleSelect.value })
        );
        this.chordView.humanizeInput?.addEventListener('input', () =>
            refreshProgression({ humanize: this.chordView.humanizeInput.value })
        );

        this.chordView.sheetFileInput?.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            try {
                const { content, isXml } = await this.#extractSheetContent(file);

                if (isXml) {
                    const importedScore = ChordSequencerModel.parseMusicXmlTimeline(content);
                    this.chordModel.loadImportedScore(importedScore);
                } else {
                    this.chordModel.updateSettings({ progressionText: content.trim() });
                }

                if (this.chordModel.isPlaying) this.#stopChordPlayback();
                this.chordView.syncFromModel(this.chordModel);
            } catch (err) {
                console.error('[Sheet Import Error]', err.message);
                await this.modalView.openConfirm({
                    title: 'Sheet Import Error',
                    message: err.message,
                    confirmText: 'OK',
                    isDanger: true,
                });
            } finally {
                e.target.value = '';
            }
        });

        this.chordView.onCardSelect = (index) => {
            if (this.chordModel.isPlaying) {
                this.chordModel.currentStepIndex = index;
                this.#triggerChordStep(index);
                this.nextStepDeadline = performance.now() + this.chordModel.getStepDurationMs(index);
            } else {
                this.#startChordPlayback(index);
            }
        };

        this.chordView.loopToggleBtn.addEventListener('click', () => {
            this.chordModel.updateSettings({ loop: !this.chordModel.loop });
            this.chordView.setLoopState(this.chordModel.loop);
        });

        this.chordView.playStopBtn.addEventListener('click', () => {
            if (this.chordModel.isPlaying) {
                this.#stopChordPlayback();
            } else {
                this.#startChordPlayback(0);
            }
        });
    }

    #startChordPlayback(startIndex = 0) {
        if (!this.chordModel.parsedChords.length) return;

        const safeStart = Math.max(0, Math.min(this.chordModel.parsedChords.length - 1, startIndex));
        this.chordModel.isPlaying = true;
        this.chordModel.currentStepIndex = safeStart;
        this.totalBarsPlayed = safeStart;
        this.chordView.setPlaybackState(true);

        this.#triggerChordStep(safeStart);
        this.nextStepDeadline = performance.now() + this.chordModel.getStepDurationMs(safeStart);

        if (this.chordTimerId) clearInterval(this.chordTimerId);

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
                this.nextStepDeadline += this.chordModel.getStepDurationMs(nextIdx);
            }
        }, 15);
    }

    #stopChordPlayback() {
        this.chordModel.isPlaying = false;
        this.chordModel.currentStepIndex = -1;
        this.totalBarsPlayed = 0;
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

        const chords = this.chordModel.parsedChords;
        const chord = chords[index];
        if (!chord || !chord.valid) return;

        const nextIndex = (index + 1) % chords.length;
        const nextChord = chords[nextIndex] || null;

        const stepDurationMs = this.chordModel.getStepDurationMs(index);
        const events = this.chordModel.buildStepEvents(
            chord,
            stepDurationMs,
            this.totalBarsPlayed++,
            nextChord
        );

        events.forEach(({ note, velocity, delayMs, durationMs }) => {
            const onTimer = setTimeout(() => {
                this.scheduledNoteTimers.delete(onTimer);
                if (!this.chordModel.isPlaying) return;

                this.#sendMidi({ type: 'noteon', note, velocity });
                this.activeChordNotes.add(note);

                const offTimer = setTimeout(() => {
                    this.scheduledNoteTimers.delete(offTimer);
                    this.#sendMidi({ type: 'noteoff', note });
                    this.activeChordNotes.delete(note);
                }, durationMs);

                this.scheduledNoteTimers.add(offTimer);
            }, delayMs);

            this.scheduledNoteTimers.add(onTimer);
        });
    }

    #releaseActiveChordNotes() {
        this.scheduledNoteTimers.forEach((id) => clearTimeout(id));
        this.scheduledNoteTimers.clear();

        this.activeChordNotes.forEach((note) => {
            this.#sendMidi({ type: 'noteoff', note });
        });
        this.activeChordNotes.clear();
    }

    #releasePadNote(index) {
        const activeInfo = this.activePadNotes.get(index);
        this.surfaceView.setPadActive(index, false);

        if (!activeInfo) return;
        this.activePadNotes.delete(index);

        const key = `${activeInfo.channel}:${activeInfo.note}`;
        const nextCount = (this.activeNoteRefCounts.get(key) || 1) - 1;

        if (nextCount <= 0) {
            this.activeNoteRefCounts.delete(key);
            this.#sendMidi({
                type: 'noteoff',
                note: activeInfo.note,
                channel: activeInfo.channel,
            });
        } else {
            this.activeNoteRefCounts.set(key, nextCount);
        }
    }

    #releaseAllActivePads() {
        for (let i = 0; i < this.padPointersByIndex.length; i++) {
            this.padPointersByIndex[i].clear();
            if (this.activePadNotes.has(i)) {
                this.#releasePadNote(i);
            } else {
                this.surfaceView.setPadActive(i, false);
            }
        }
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

            this.model.map.switches.forEach((cc, idx) => {
                if (cc === msg.cc) {
                    const isOn = msg.value >= 64;
                    this.model.switchValues[idx] = isOn;
                    this.surfaceView.updateSwitchValue(idx, isOn);
                }
            });
        } catch {
            // Ignore malformed socket frames
        }
    }

    #sendMidi(payload) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ channel: this.model.midiChannel, ...payload }));
        }
    }

    #bindKnobEvents(index, { unit }) {
        const dial = unit.querySelector('.knob-dial') || unit;
        let activePointerId = null;
        let startY = 0;
        let startVal = 64;

        unit.addEventListener('contextmenu', (e) => e.preventDefault());

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

        dial.addEventListener('pointerdown', (e) => {
            if (this.model.isEditMode) return;
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            if (activePointerId !== null) return;

            e.preventDefault();
            activePointerId = e.pointerId;
            startY = e.clientY;
            startVal = this.model.knobValues[index];
            this.draggingKnobs[index] = true;

            try {
                dial.setPointerCapture(e.pointerId);
            } catch {}
        });

        dial.addEventListener('pointermove', (e) => {
            if (this.model.isEditMode || e.pointerId !== activePointerId || !this.draggingKnobs[index]) return;

            const deltaY = startY - e.clientY;
            const newVal = Math.max(0, Math.min(127, Math.round(startVal + deltaY * 0.85)));

            if (newVal !== this.model.knobValues[index]) {
                this.model.knobValues[index] = newVal;
                this.surfaceView.updateKnobValue(index, newVal);
                this.#sendMidi({ type: 'cc', cc: this.model.map.knobs[index], value: newVal });
            }
        });

        const release = (e) => {
            if (e && e.pointerId !== activePointerId) return;
            activePointerId = null;
            this.draggingKnobs[index] = false;
        };

        dial.addEventListener('pointerup', release);
        dial.addEventListener('pointercancel', release);
        dial.addEventListener('lostpointercapture', release);
    }

    #bindFaderEvents(index, { unit, track }) {
        let activePointerId = null;

        const computeAndSend = (clientY) => {
            const rect = track.getBoundingClientRect();
            if (rect.height <= 0) return;
            const relY = Math.max(0, Math.min(rect.height, rect.bottom - clientY));
            const midiVal = Math.round((relY / rect.height) * 127);

            if (midiVal !== this.model.faderValues[index]) {
                this.model.faderValues[index] = midiVal;
                this.surfaceView.updateFaderValue(index, midiVal);
                this.#sendMidi({ type: 'cc', cc: this.model.map.faders[index], value: midiVal });
            }
        };

        unit.addEventListener('contextmenu', (e) => e.preventDefault());

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

        track.addEventListener('pointerdown', (e) => {
            if (this.model.isEditMode) return;
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            if (activePointerId !== null) return;

            e.preventDefault();
            activePointerId = e.pointerId;
            this.draggingFaders[index] = true;

            try {
                track.setPointerCapture(e.pointerId);
            } catch {}

            computeAndSend(e.clientY);
        });

        track.addEventListener('pointermove', (e) => {
            if (this.model.isEditMode || e.pointerId !== activePointerId || !this.draggingFaders[index]) return;
            computeAndSend(e.clientY);
        });

        const release = (e) => {
            if (e && e.pointerId !== activePointerId) return;
            activePointerId = null;
            this.draggingFaders[index] = false;
        };

        track.addEventListener('pointerup', release);
        track.addEventListener('pointercancel', release);
        track.addEventListener('lostpointercapture', release);
    }

    #bindSwitchEvents(index, { unit, btn }) {
        let activePointerId = null;
        let startX = 0;
        let startY = 0;
        let moved = false;

        unit.addEventListener('contextmenu', (e) => e.preventDefault());

        unit.addEventListener('click', async () => {
            if (!this.model.isEditMode) return;
            const res = await this.modalView.openEdit({
                title: `Edit Switch ${index + 1}`,
                currentName: this.model.map.switchNames[index],
                currentMidi: this.model.map.switches[index],
                controlType: 'switch',
            });
            if (res) {
                this.model.updateControlConfig('switch', index, res.name, res.midi);
                this.surfaceView.updateSwitchMeta(index, res.name, res.midi);
            }
        });

        btn.addEventListener('pointerdown', (e) => {
            if (this.model.isEditMode) return;
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            if (activePointerId !== null) return;

            activePointerId = e.pointerId;
            startX = e.clientX;
            startY = e.clientY;
            moved = false;
            btn.classList.add('pressed');
        });

        btn.addEventListener('pointermove', (e) => {
            if (e.pointerId !== activePointerId) return;
            if (Math.hypot(e.clientX - startX, e.clientY - startY) > 10) {
                moved = true;
                btn.classList.remove('pressed');
            }
        });

        btn.addEventListener('pointerup', (e) => {
            if (e.pointerId !== activePointerId) return;
            btn.classList.remove('pressed');
            activePointerId = null;

            if (!moved && !this.model.isEditMode) {
                const nextState = !this.model.switchValues[index];
                this.model.switchValues[index] = nextState;
                this.surfaceView.updateSwitchValue(index, nextState);
                this.#sendMidi({
                    type: 'cc',
                    cc: this.model.map.switches[index],
                    value: nextState ? 127 : 0,
                });
            }
        });

        const cancelSwitch = (e) => {
            if (e && e.pointerId !== activePointerId) return;
            btn.classList.remove('pressed');
            activePointerId = null;
        };

        btn.addEventListener('pointercancel', cancelSwitch);
        btn.addEventListener('lostpointercapture', cancelSwitch);
    }

    #bindPadEvents(index, { pad }) {
        const activePointers = this.padPointersByIndex[index];

        pad.addEventListener('contextmenu', (e) => e.preventDefault());

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
            if (this.model.isEditMode) return;
            if (e.pointerType === 'mouse' && e.button !== 0) return;

            e.preventDefault();

            const wasEmpty = activePointers.size === 0;
            activePointers.add(e.pointerId);

            try {
                pad.setPointerCapture(e.pointerId);
            } catch {}

            if (!wasEmpty) return;

            const note = this.model.map.pads[index];
            const channel = this.model.midiChannel;
            const key = `${channel}:${note}`;

            this.activePadNotes.set(index, { note, channel });
            this.activeNoteRefCounts.set(key, (this.activeNoteRefCounts.get(key) || 0) + 1);
            this.surfaceView.setPadActive(index, true);

            if (this.model.isSustainOn) {
                this.model.sustainedPads.add(index);
                this.surfaceView.setPadSustained(index, true);
            }

            this.#sendMidi({
                type: 'noteon',
                note,
                velocity: 120,
                channel,
            });
        };

        const triggerOff = (e) => {
            if (!activePointers.has(e.pointerId)) return;
            activePointers.delete(e.pointerId);

            if (activePointers.size === 0) {
                this.#releasePadNote(index);
            }
        };

        pad.addEventListener('pointerdown', triggerOn);
        pad.addEventListener('pointerup', triggerOff);
        pad.addEventListener('pointercancel', triggerOff);
        pad.addEventListener('lostpointercapture', triggerOff);
    }
}