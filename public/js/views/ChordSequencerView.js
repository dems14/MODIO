import { ControllerStateModel } from '../models/ControllerStateModel.js';

export class ChordSequencerView {
    constructor() {
        this.progressionInput = document.getElementById('chordProgressionInput');
        this.bpmInput = document.getElementById('chordBpmInput');
        this.beatsPerBarInput = document.getElementById('timeSigNumerator');
        this.beatUnitSelect = document.getElementById('timeSigDenominator');
        this.barsPerChordSelect = document.getElementById('barsPerChordSelect');
        this.octaveSelect = document.getElementById('chordOctaveSelect');
        this.loopToggleBtn = document.getElementById('chordLoopBtn');
        this.playStopBtn = document.getElementById('chordPlayBtn');
        this.cardsContainer = document.getElementById('chordCardsContainer');
        this.cardElements = [];
    }

    syncFromModel(model) {
        this.progressionInput.value = model.progressionText;
        this.bpmInput.value = String(model.bpm);
        this.beatsPerBarInput.value = String(model.beatsPerBar);
        this.beatUnitSelect.value = String(model.beatUnit);
        this.barsPerChordSelect.value = String(model.barsPerChord);
        this.octaveSelect.value = String(model.octave);
        this.setLoopState(model.loop);
        this.setPlaybackState(model.isPlaying);
        this.renderChordCards(model.parsedChords, model.currentStepIndex);
    }

    renderChordCards(chords, activeIndex = -1) {
        this.cardsContainer.innerHTML = '';
        this.cardElements = [];

        if (!chords.length) {
            this.cardsContainer.innerHTML =
                '<span class="chord-empty-hint">Enter chords separated by | (e.g. Cmaj7 | Am7 | Dm9 | G13)</span>';
            return;
        }

        chords.forEach((chord, idx) => {
            const card = document.createElement('div');
            card.className = 'chord-card';
            if (!chord.valid) card.classList.add('invalid');
            if (idx === activeIndex) card.classList.add('playing');

            const noteLabels = chord.valid
                ? chord.notes.map((n) => ControllerStateModel.formatNoteName(n)).join(' ')
                : 'Unknown chord';

            card.innerHTML = `
                <span class="chord-symbol">${chord.symbol}</span>
                <span class="chord-notes">${noteLabels}</span>
            `;

            this.cardElements.push(card);
            this.cardsContainer.appendChild(card);
        });
    }

    highlightStep(activeIndex) {
        this.cardElements.forEach((el, idx) => {
            el.classList.toggle('playing', idx === activeIndex);
        });
    }

    setPlaybackState(isPlaying) {
        this.playStopBtn.classList.toggle('playing', isPlaying);
        this.playStopBtn.textContent = isPlaying ? '■ Stop' : '▶ Play Chords';
    }

    setLoopState(isLooping) {
        this.loopToggleBtn.classList.toggle('active', isLooping);
        this.loopToggleBtn.textContent = isLooping ? 'Loop: ON' : 'Loop: OFF';
    }
}
