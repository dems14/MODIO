import { ControllerStateModel } from '../models/ControllerStateModel.js';

const MPC_PAD_ORDER = Object.freeze([12, 13, 14, 15, 8, 9, 10, 11, 4, 5, 6, 7, 0, 1, 2, 3]);

export class ControlSurfaceView {
    constructor() {
        this.statusDot = document.getElementById('statusDot');
        this.statusText = document.getElementById('statusText');
        this.sustainBtn = document.getElementById('sustainBtn');
        this.editModeBtn = document.getElementById('editModeBtn');
        this.resetMapBtn = document.getElementById('resetMapBtn');
        this.channelSelect = document.getElementById('midiChannel');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');

        this.tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
        this.chordPanel = document.getElementById('chordPanel');
        this.mainWorkspace = document.getElementById('mainWorkspace');
        this.controlsSection = document.getElementById('controlsSection');

        this.knobsContainer = document.getElementById('knobsContainer');
        this.fadersContainer = document.getElementById('fadersContainer');
        this.switchesContainer = document.getElementById('switchesContainer');
        this.padsContainer = document.getElementById('padsContainer');

        this.knobElements = [];
        this.faderElements = [];
        this.switchElements = [];
        this.padElements = new Array(16);
    }

    renderChannelOptions() {
        this.channelSelect.innerHTML = '';
        for (let ch = 0; ch < 16; ch++) {
            const option = document.createElement('option');
            option.value = String(ch);
            option.textContent = String(ch + 1);
            this.channelSelect.appendChild(option);
        }
    }

    setConnectionStatus(isConnected, label) {
        this.statusDot.classList.toggle('connected', isConnected);
        this.statusText.textContent = label;
    }

    setActiveTab(tabName) {
        this.tabButtons.forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        const isSingleTab = tabName !== 'all';
        document.body.classList.toggle('single-tab-mode', isSingleTab);

        const showChords = tabName === 'all' || tabName === 'chords';
        const showControls = tabName === 'all' || tabName === 'controls';
        const showPads = tabName === 'all' || tabName === 'pads';

        this.chordPanel.classList.toggle('tab-hidden', !showChords);
        this.controlsSection.classList.toggle('tab-hidden', !showControls);
        this.padsContainer.classList.toggle('tab-hidden', !showPads);
        this.mainWorkspace.classList.toggle('tab-hidden', !showControls && !showPads);

        this.refreshAllMarquees();
    }

    setSustainState(isOn) {
        this.sustainBtn.classList.toggle('sustain-active', isOn);
        this.sustainBtn.textContent = isOn ? 'Sustain: ON' : 'Sustain: OFF';
        if (!isOn) {
            this.clearAllSustainedPads();
        }
    }

    setEditMode(isEditMode) {
        document.body.classList.toggle('edit-mode', isEditMode);
        this.editModeBtn.classList.toggle('edit-active', isEditMode);
        this.editModeBtn.textContent = isEditMode ? 'Done Editing' : 'Edit Controls';
    }

    renderSurface(model, handlers) {
        this.#renderKnobs(model, handlers);
        this.#renderFaders(model, handlers);
        this.#renderSwitches(model, handlers);
        this.#renderPads(model, handlers);
        this.refreshAllMarquees();
    }

    #renderKnobs(model, handlers) {
        this.knobsContainer.innerHTML = '';
        for (let i = 0; i < 8; i++) {
            const unit = document.createElement('div');
            unit.className = 'knob-unit';
            unit.innerHTML = `
                <div class="marquee-box"><span class="marquee-text">${model.map.knobNames[i]}</span></div>
                <span class="cc-sub">CC ${model.map.knobs[i]}</span>
                <div class="knob-dial"><div class="knob-indicator"></div></div>
                <span class="val-mini">64</span>
            `;

            const refs = {
                unit,
                marqueeBox: unit.querySelector('.marquee-box'),
                labelEl: unit.querySelector('.marquee-text'),
                ccSubEl: unit.querySelector('.cc-sub'),
                indicator: unit.querySelector('.knob-indicator'),
                valDisplay: unit.querySelector('.val-mini'),
            };
            this.knobElements[i] = refs;
            this.updateKnobValue(i, model.knobValues[i]);
            handlers.bindKnobEvents(i, refs);

            this.knobsContainer.appendChild(unit);
        }
    }

    #renderFaders(model, handlers) {
        this.fadersContainer.innerHTML = '';
        for (let i = 0; i < 8; i++) {
            const unit = document.createElement('div');
            unit.className = 'fader-unit';
            unit.innerHTML = `
                <span class="val-mini">0</span>
                <div class="fader-track">
                    <div class="fader-fill"></div>
                    <div class="fader-cap"></div>
                </div>
                <div class="marquee-box"><span class="marquee-text">${model.map.faderNames[i]}</span></div>
                <span class="cc-sub">CC ${model.map.faders[i]}</span>
            `;

            const refs = {
                unit,
                track: unit.querySelector('.fader-track'),
                fill: unit.querySelector('.fader-fill'),
                cap: unit.querySelector('.fader-cap'),
                valDisplay: unit.querySelector('.val-mini'),
                marqueeBox: unit.querySelector('.marquee-box'),
                labelEl: unit.querySelector('.marquee-text'),
                ccSubEl: unit.querySelector('.cc-sub'),
            };
            this.faderElements[i] = refs;
            this.updateFaderValue(i, model.faderValues[i]);
            handlers.bindFaderEvents(i, refs);

            this.fadersContainer.appendChild(unit);
        }
    }

    #renderSwitches(model, handlers) {
        if (!this.switchesContainer) return;
        this.switchesContainer.innerHTML = '';
        for (let i = 0; i < 8; i++) {
            const unit = document.createElement('div');
            unit.className = 'switch-unit';
            unit.innerHTML = `
                <button type="button" class="switch-btn" aria-pressed="false">
                    <span class="switch-led"></span>
                    <span class="switch-state">OFF</span>
                </button>
                <div class="marquee-box"><span class="marquee-text">${model.map.switchNames[i]}</span></div>
                <span class="cc-sub">CC ${model.map.switches[i]}</span>
            `;

            const refs = {
                unit,
                btn: unit.querySelector('.switch-btn'),
                stateEl: unit.querySelector('.switch-state'),
                marqueeBox: unit.querySelector('.marquee-box'),
                labelEl: unit.querySelector('.marquee-text'),
                ccSubEl: unit.querySelector('.cc-sub'),
            };
            this.switchElements[i] = refs;
            this.updateSwitchValue(i, model.switchValues[i]);
            handlers.bindSwitchEvents(i, refs);

            this.switchesContainer.appendChild(unit);
        }
    }

    #renderPads(model, handlers) {
        this.padsContainer.innerHTML = '';
        MPC_PAD_ORDER.forEach((index) => {
            const note = model.map.pads[index];
            const pad = document.createElement('div');
            pad.className = 'pad';
            pad.innerHTML = `
                <div class="marquee-box"><span class="marquee-text">${model.map.padNames[index]}</span></div>
                <span class="pad-note">${ControllerStateModel.formatNoteName(note)} (${note})</span>
            `;

            const refs = {
                pad,
                marqueeBox: pad.querySelector('.marquee-box'),
                nameLabel: pad.querySelector('.marquee-text'),
                noteLabel: pad.querySelector('.pad-note'),
            };
            this.padElements[index] = refs;
            handlers.bindPadEvents(index, refs);

            this.padsContainer.appendChild(pad);
        });
    }

    updateKnobValue(index, value) {
        const refs = this.knobElements[index];
        if (!refs) return;
        const deg = (value / 127) * 270 - 135;
        refs.indicator.style.transform = `rotate(${deg}deg)`;
        refs.valDisplay.textContent = String(value);
    }

    updateKnobMeta(index, name, cc) {
        const refs = this.knobElements[index];
        if (!refs) return;
        this.applyMarquee(refs.marqueeBox, refs.labelEl, name);
        refs.ccSubEl.textContent = `CC ${cc}`;
    }

    updateFaderValue(index, value) {
        const refs = this.faderElements[index];
        if (!refs) return;
        const pct = (value / 127) * 100;
        refs.fill.style.height = `${pct}%`;
        refs.cap.style.bottom = `${pct}%`;
        refs.valDisplay.textContent = String(value);
    }

    updateFaderMeta(index, name, cc) {
        const refs = this.faderElements[index];
        if (!refs) return;
        this.applyMarquee(refs.marqueeBox, refs.labelEl, name);
        refs.ccSubEl.textContent = `CC ${cc}`;
    }

    updateSwitchValue(index, isOn) {
        const refs = this.switchElements[index];
        if (!refs) return;
        refs.btn.classList.toggle('active', isOn);
        refs.btn.setAttribute('aria-pressed', String(isOn));
        refs.stateEl.textContent = isOn ? 'ON' : 'OFF';
    }

    updateSwitchMeta(index, name, cc) {
        const refs = this.switchElements[index];
        if (!refs) return;
        this.applyMarquee(refs.marqueeBox, refs.labelEl, name);
        refs.ccSubEl.textContent = `CC ${cc}`;
    }

    updatePadMeta(index, name, note) {
        const refs = this.padElements[index];
        if (!refs) return;
        this.applyMarquee(refs.marqueeBox, refs.nameLabel, name);
        refs.noteLabel.textContent = `${ControllerStateModel.formatNoteName(note)} (${note})`;
    }

    setPadActive(index, isActive) {
        const refs = this.padElements[index];
        if (refs) refs.pad.classList.toggle('active', isActive);
    }

    setPadSustained(index, isSustained) {
        const refs = this.padElements[index];
        if (refs) refs.pad.classList.toggle('sustained', isSustained);
    }

    clearAllSustainedPads() {
        this.padElements.forEach((refs) => {
            if (refs) refs.pad.classList.remove('sustained');
        });
    }

    applyMarquee(boxEl, textEl, newText) {
        if (newText !== undefined) textEl.textContent = newText;

        boxEl.classList.remove('is-scrolling');
        boxEl.style.removeProperty('--scroll-distance');
        boxEl.style.removeProperty('--scroll-duration');

        requestAnimationFrame(() => {
            const overflow = textEl.scrollWidth - boxEl.clientWidth;
            if (overflow > 2) {
                const distance = -(overflow + 12);
                const duration = Math.max(3, overflow / 25 + 2);
                boxEl.style.setProperty('--scroll-distance', `${distance}px`);
                boxEl.style.setProperty('--scroll-duration', `${duration.toFixed(1)}s`);
                boxEl.classList.add('is-scrolling');
            }
        });
    }

    refreshAllMarquees() {
        document.querySelectorAll('.marquee-box').forEach((box) => {
            const textEl = box.querySelector('.marquee-text');
            if (textEl) this.applyMarquee(box, textEl);
        });
    }
}