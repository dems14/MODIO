import { ControllerStateModel } from '../models/ControllerStateModel.js';
import { GENRE_STYLES } from '../models/ChordSequencerModel.js';

export class ChordSequencerView {
    constructor() {
        this.progressionInput = document.getElementById('chordProgressionInput');
        this.sheetFileInput = document.getElementById('sheetFileInput');
        this.bpmInput = document.getElementById('chordBpmInput');
        this.beatsPerBarInput = document.getElementById('timeSigNumerator');
        this.beatUnitSelect = document.getElementById('timeSigDenominator');
        this.barsPerChordSelect = document.getElementById('barsPerChordSelect');
        this.octaveSelect = document.getElementById('chordOctaveSelect');
        this.styleSelect = document.getElementById('chordStyleSelect');
        this.humanizeInput = document.getElementById('chordHumanizeInput');
        this.loopToggleBtn = document.getElementById('chordLoopBtn');
        this.playStopBtn = document.getElementById('chordPlayBtn');
        this.pentagramContainer = document.getElementById('pentagramContainer');
        this.cardsContainer = document.getElementById('chordCardsContainer');
        this.cardElements = [];
        this.lastRenderedChords = [];
        this.onCardSelect = null;

        this.#populateStyleOptions();
    }

    #populateStyleOptions() {
        if (!this.styleSelect) return;
        this.styleSelect.innerHTML = '';
        Object.entries(GENRE_STYLES).forEach(([key, cfg]) => {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = cfg.label;
            this.styleSelect.appendChild(opt);
        });
    }

    syncFromModel(model) {
        this.progressionInput.value = model.progressionText;
        this.bpmInput.value = String(model.bpm);
        this.beatsPerBarInput.value = String(model.beatsPerBar);
        this.beatUnitSelect.value = String(model.beatUnit);
        this.barsPerChordSelect.value = String(model.barsPerChord);
        this.octaveSelect.value = String(model.octave);
        if (this.styleSelect) this.styleSelect.value = model.style;
        if (this.humanizeInput) this.humanizeInput.value = String(model.humanize);
        this.setLoopState(model.loop);
        this.setPlaybackState(model.isPlaying);
        this.renderChordCards(model.parsedChords, model.currentStepIndex);
    }

    renderChordCards(chords, activeIndex = -1) {
        this.lastRenderedChords = chords;
        this.renderPentagram(chords, activeIndex);

        this.cardsContainer.innerHTML = '';
        this.cardElements = [];

        if (!chords.length) {
            this.cardsContainer.innerHTML =
                '<span class="chord-empty-hint">Type chords (Cmaj7), arpeggios (~Cmaj9), glissandos (C4~>G5), or import .mxl/.musicxml</span>';
            return;
        }

        let lastRenderedSection = '';

        chords.forEach((chord, idx) => {
            if (chord.section && chord.section !== lastRenderedSection) {
                lastRenderedSection = chord.section;
                const badge = document.createElement('div');
                badge.className = 'sheet-section-badge';
                badge.textContent = chord.section;
                this.cardsContainer.appendChild(badge);
            }

            const card = document.createElement('div');
            card.className = 'chord-card';
            if (!chord.valid) card.classList.add('invalid');
            if (chord.isRest) card.classList.add('is-rest');
            if (idx === activeIndex) card.classList.add('playing');

            const noteLabels = !chord.valid
                ? 'Unknown'
                : chord.isRest
                    ? 'Tacet / Rest'
                    : chord.notes.map((n) => ControllerStateModel.formatNoteName(n)).join(' ');

            const durBadge = chord.durationFactor !== 1
                ? `<span class="chord-dur-tag">${chord.durationFactor}x bar</span>`
                : '';

            card.innerHTML = `
                <span class="chord-symbol">${chord.symbol} ${durBadge}</span>
                <span class="chord-notes">${noteLabels}</span>
            `;

            card.addEventListener('click', () => {
                if (typeof this.onCardSelect === 'function') {
                    this.onCardSelect(idx);
                }
            });

            this.cardElements.push(card);
            this.cardsContainer.appendChild(card);
        });
    }

    renderPentagram(chords, activeIndex = -1) {
        if (!this.pentagramContainer) return;

        const barWidth = 88;
        const leftMargin = 46;
        const count = Math.max(4, chords.length);
        const width = leftMargin + count * barWidth + 16;
        const height = 156;

        const stepMap = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        const midiToStaffPos = (midi) => {
            const name = noteNames[midi % 12];
            const octave = Math.floor(midi / 12) - 1;
            const isSharp = name.includes('#');
            const diatonicStep = octave * 7 + stepMap[name[0]];
            return { diatonicStep, isSharp };
        };

        const stepToY = (step) => {
            if (step >= 28) {
                return 66 - (step - 30) * 4;
            }
            return 94 + (26 - step) * 4;
        };

        const renderLedgerLines = (diatonicStep, noteX) => {
            let linesSvg = '';
            if (diatonicStep === 28) {
                linesSvg += `<line x1="${noteX - 9}" y1="74" x2="${noteX + 9}" y2="74" stroke="#a1a1aa" stroke-width="1.2" />`;
            } else if (diatonicStep >= 42) {
                for (let s = 42; s <= diatonicStep; s += 2) {
                    const ly = stepToY(s);
                    linesSvg += `<line x1="${noteX - 9}" y1="${ly}" x2="${noteX + 9}" y2="${ly}" stroke="#a1a1aa" stroke-width="1.2" />`;
                }
            } else if (diatonicStep <= 16) {
                for (let s = 16; s >= diatonicStep; s -= 2) {
                    const ly = stepToY(s);
                    linesSvg += `<line x1="${noteX - 9}" y1="${ly}" x2="${noteX + 9}" y2="${ly}" stroke="#a1a1aa" stroke-width="1.2" />`;
                }
            }
            return linesSvg;
        };

        let svg = `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" class="pentagram-svg">`;

        [34, 42, 50, 58, 66, 94, 102, 110, 118, 126].forEach((y) => {
            svg += `<line x1="10" y1="${y}" x2="${width - 8}" y2="${y}" stroke="#3f3f46" stroke-width="1" />`;
        });

        svg += `<line x1="10" y1="34" x2="10" y2="126" stroke="#71717a" stroke-width="2" />`;
        svg += `<text x="14" y="62" fill="#00e5ff" font-size="34" font-family="serif">𝄞</text>`;
        svg += `<text x="14" y="118" fill="#00e5ff" font-size="28" font-family="serif">𝄢</text>`;

        chords.forEach((chord, idx) => {
            const xStart = leftMargin + idx * barWidth;
            const xCenter = xStart + barWidth / 2;
            const barEndX = xStart + barWidth;
            const isPlaying = idx === activeIndex;

            if (isPlaying) {
                svg += `<rect x="${xStart + 2}" y="18" width="${barWidth - 4}" height="124" rx="6" fill="rgba(0, 229, 255, 0.14)" stroke="#00e5ff" stroke-width="1" />`;
            }

            svg += `<line x1="${barEndX}" y1="34" x2="${barEndX}" y2="126" stroke="#52525b" stroke-width="1" />`;
            svg += `<text x="${xCenter}" y="14" text-anchor="middle" fill="${isPlaying ? '#00e5ff' : '#e4e4e7'}" font-size="11" font-weight="700">${chord.symbol}</text>`;

            if (!chord.valid || chord.isRest) return;

            if (chord.articulation === 'glissando' && chord.notes.length >= 2) {
                const startPos = midiToStaffPos(chord.notes[0]);
                const endPos = midiToStaffPos(chord.notes[chord.notes.length - 1]);
                const y1 = stepToY(startPos.diatonicStep);
                const y2 = stepToY(endPos.diatonicStep);
                const x1 = xStart + 18;
                const x2 = barEndX - 18;

                svg += renderLedgerLines(startPos.diatonicStep, x1);
                svg += renderLedgerLines(endPos.diatonicStep, x2);

                if (startPos.isSharp) {
                    svg += `<text x="${x1 - 12}" y="${y1 + 4}" fill="#fbbf24" font-size="11" font-weight="700">♯</text>`;
                }
                if (endPos.isSharp) {
                    svg += `<text x="${x2 - 12}" y="${y2 + 4}" fill="#fbbf24" font-size="11" font-weight="700">♯</text>`;
                }

                svg += `<ellipse cx="${x1}" cy="${y1}" rx="5" ry="3.6" transform="rotate(-18 ${x1} ${y1})" fill="${isPlaying ? '#00e5ff' : '#e4e4e7'}" />`;
                svg += `<line x1="${x1 + 6}" y1="${y1}" x2="${x2 - 6}" y2="${y2}" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="3,2" />`;
                svg += `<text x="${xCenter}" y="${(y1 + y2) / 2 - 4}" text-anchor="middle" fill="#fbbf24" font-size="9" font-style="italic">gliss.</text>`;
                svg += `<ellipse cx="${x2}" cy="${y2}" rx="5" ry="3.6" transform="rotate(-18 ${x2} ${y2})" fill="${isPlaying ? '#00e5ff' : '#e4e4e7'}" />`;
                return;
            }

            if (chord.articulation === 'arp_up' || chord.articulation === 'arp_down') {
                const ys = chord.notes.map((m) => stepToY(midiToStaffPos(m).diatonicStep));
                const topY = Math.min(...ys) - 4;
                const botY = Math.max(...ys) + 4;
                const waveX = xCenter - 15;

                let wavePath = `M ${waveX} ${topY}`;
                for (let y = topY; y < botY; y += 4) {
                    const nextY = Math.min(botY, y + 4);
                    const ctrlX = ((y - topY) / 4) % 2 === 0 ? waveX - 2.5 : waveX + 2.5;
                    wavePath += ` Q ${ctrlX} ${(y + nextY) / 2}, ${waveX} ${nextY}`;
                }

                svg += `<path d="${wavePath}" fill="none" stroke="#fbbf24" stroke-width="1.5" />`;
                const arrowY = chord.articulation === 'arp_down' ? botY + 6 : topY - 2;
                const arrowChar = chord.articulation === 'arp_down' ? '▼' : '▲';
                svg += `<text x="${waveX - 3.5}" y="${arrowY}" fill="#fbbf24" font-size="7">${arrowChar}</text>`;
            }

            chord.notes.forEach((midi, nIdx) => {
                const { diatonicStep, isSharp } = midiToStaffPos(midi);
                const y = stepToY(diatonicStep);
                const noteX = xCenter + (nIdx % 2 === 1 ? 5 : -3);

                svg += renderLedgerLines(diatonicStep, noteX);

                if (isSharp) {
                    svg += `<text x="${noteX - 13}" y="${y + 4}" fill="#fbbf24" font-size="11" font-weight="700">♯</text>`;
                }

                svg += `<ellipse cx="${noteX}" cy="${y}" rx="5.2" ry="3.8" transform="rotate(-18 ${noteX} ${y})" fill="${isPlaying ? '#00e5ff' : '#e4e4e7'}" />`;
            });
        });

        svg += `</svg>`;
        this.pentagramContainer.innerHTML = svg;

        if (activeIndex >= 0) {
            const targetScroll = Math.max(
                0,
                leftMargin + activeIndex * barWidth - this.pentagramContainer.clientWidth / 2 + barWidth / 2
            );
            this.pentagramContainer.scrollTo({ left: targetScroll, behavior: 'smooth' });
        }
    }

    highlightStep(activeIndex) {
        this.renderPentagram(this.lastRenderedChords, activeIndex);
        this.cardElements.forEach((el, idx) => {
            const isCurrent = idx === activeIndex;
            el.classList.toggle('playing', isCurrent);
            if (isCurrent) {
                el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        });
    }

    setPlaybackState(isPlaying) {
        this.playStopBtn.classList.toggle('playing', isPlaying);
        this.playStopBtn.textContent = isPlaying ? '■ Stop' : '▶ Play Song';
    }

    setLoopState(isLooping) {
        this.loopToggleBtn.classList.toggle('active', isLooping);
        this.loopToggleBtn.textContent = isLooping ? 'Loop: ON' : 'Loop: OFF';
    }
}
