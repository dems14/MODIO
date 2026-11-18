import { ControllerStateModel } from '../models/ControllerStateModel.js';

const PRESETS_BY_TYPE = Object.freeze({
    knob: ['Cutoff', 'Resonance', 'Pan', 'Reverb', 'Delay', 'Drive', 'Attack', 'Release'],
    fader: ['Volume', 'Kick', 'Snare', 'Bass', 'Vocals', 'Synth', 'Drums', 'Master'],
    pad: ['Kick', 'Snare', 'Clap', 'Hi-Hat', 'Crash', 'Perc', 'FX', 'Loop'],
});

export class ModalView {
    constructor() {
        this.backdrop = document.getElementById('customModal');
        this.titleEl = document.getElementById('modalTitle');
        this.messageEl = document.getElementById('modalMessage');
        this.fieldsEl = document.getElementById('modalFields');
        this.nameInput = document.getElementById('modalNameInput');
        this.clearNameBtn = document.getElementById('clearNameBtn');
        this.presetChipsEl = document.getElementById('presetChips');
        this.midiLabelEl = document.getElementById('modalMidiLabel');
        this.notePreviewBadge = document.getElementById('notePreviewBadge');
        this.midiInput = document.getElementById('modalMidiInput');
        this.errorEl = document.getElementById('modalError');
        this.cancelBtn = document.getElementById('modalCancelBtn');
        this.confirmBtn = document.getElementById('modalConfirmBtn');

        this.activeResolver = null;
        this.activeMode = null;
        this.showNotePreview = false;

        this.#bindInternalEvents();
    }

    #bindInternalEvents() {
        document.querySelectorAll('.step-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const delta = parseInt(btn.dataset.step, 10);
                const current = parseInt(this.midiInput.value, 10) || 0;
                this.midiInput.value = Math.max(0, Math.min(127, current + delta));
                this.errorEl.classList.remove('visible');
                this.#updateNotePreview();
            });
        });

        this.midiInput.addEventListener('input', () => this.#updateNotePreview());

        this.clearNameBtn.addEventListener('click', () => {
            this.nameInput.value = '';
            this.nameInput.focus();
        });

        this.cancelBtn.addEventListener('click', () => this.close(null));
        this.backdrop.addEventListener('click', (e) => {
            if (e.target === this.backdrop) this.close(null);
        });

        this.confirmBtn.addEventListener('click', () => this.#handleConfirm());

        document.addEventListener('keydown', (e) => {
            if (!this.backdrop.classList.contains('open')) return;
            if (e.key === 'Escape') this.close(null);
            if (e.key === 'Enter') {
                e.preventDefault();
                this.confirmBtn.click();
            }
        });
    }

    #updateNotePreview() {
        if (!this.showNotePreview) {
            this.notePreviewBadge.textContent = '';
            return;
        }
        const val = parseInt(this.midiInput.value, 10);
        this.notePreviewBadge.textContent =
            !Number.isNaN(val) && val >= 0 && val <= 127
                ? `(${ControllerStateModel.formatNoteName(val)})`
                : '';
    }

    #handleConfirm() {
        if (this.activeMode === 'edit') {
            const parsedMidi = parseInt(this.midiInput.value.trim(), 10);
            if (Number.isNaN(parsedMidi) || parsedMidi < 0 || parsedMidi > 127) {
                this.errorEl.textContent = 'MIDI number must be between 0 and 127.';
                this.errorEl.classList.add('visible');
                return;
            }
            const cleanName = this.nameInput.value.trim();
            if (!cleanName) {
                this.errorEl.textContent = 'Control name cannot be empty.';
                this.errorEl.classList.add('visible');
                return;
            }
            this.close({ name: cleanName, midi: parsedMidi });
        } else {
            this.close(true);
        }
    }

    openEdit({ title, currentName, currentMidi, controlType = 'fader' }) {
        return new Promise((resolve) => {
            this.activeResolver = resolve;
            this.activeMode = 'edit';
            this.showNotePreview = controlType === 'pad';

            this.titleEl.textContent = title;
            this.messageEl.style.display = 'none';
            this.fieldsEl.style.display = 'flex';
            this.errorEl.classList.remove('visible');

            this.nameInput.value = currentName;
            this.midiLabelEl.textContent = this.showNotePreview ? 'MIDI Note (0 – 127)' : 'MIDI CC (0 – 127)';
            this.midiInput.value = currentMidi;
            this.#updateNotePreview();

            this.presetChipsEl.innerHTML = '';
            (PRESETS_BY_TYPE[controlType] || []).forEach((preset) => {
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'chip-btn';
                chip.textContent = preset;
                chip.addEventListener('click', () => {
                    this.nameInput.value = preset;
                    this.errorEl.classList.remove('visible');
                });
                this.presetChipsEl.appendChild(chip);
            });

            this.cancelBtn.style.display = 'inline-block';
            this.confirmBtn.textContent = 'Save';
            this.confirmBtn.className = 'btn-modal btn-primary';

            this.backdrop.scrollTop = 0;
            this.backdrop.classList.add('open');
            this.backdrop.setAttribute('aria-hidden', 'false');
        });
    }

    openConfirm({ title, message, confirmText = 'Confirm', isDanger = false }) {
        return new Promise((resolve) => {
            this.activeResolver = resolve;
            this.activeMode = 'confirm';

            this.titleEl.textContent = title;
            this.messageEl.textContent = message;
            this.messageEl.style.display = 'block';
            this.fieldsEl.style.display = 'none';
            this.errorEl.classList.remove('visible');

            this.cancelBtn.style.display = 'inline-block';
            this.confirmBtn.textContent = confirmText;
            this.confirmBtn.className = isDanger ? 'btn-modal btn-danger' : 'btn-modal btn-primary';

            this.backdrop.scrollTop = 0;
            this.backdrop.classList.add('open');
            this.backdrop.setAttribute('aria-hidden', 'false');
        });
    }

    close(result = null) {
        if (document.activeElement) document.activeElement.blur();
        this.backdrop.classList.remove('open');
        this.backdrop.setAttribute('aria-hidden', 'true');
        if (this.activeResolver) {
            const resolve = this.activeResolver;
            this.activeResolver = null;
            resolve(result);
        }
    }
}