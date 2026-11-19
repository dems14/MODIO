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
        this.lastActiveIndex = -1;
        this.onCardSelect = null;

        this.#populateStyleOptions();
        this.#bindResponsiveResize();
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

    #bindResponsiveResize() {
        if (!this.pentagramContainer || typeof ResizeObserver === 'undefined') return;
        let resizeRaf = null;
        const observer = new ResizeObserver(() => {
            if (resizeRaf) cancelAnimationFrame(resizeRaf);
            resizeRaf = requestAnimationFrame(() => {
                if (this.lastRenderedChords.length) {
                    this.renderPentagram(this.lastRenderedChords, this.lastActiveIndex, false);
                }
            });
        });
        observer.observe(this.pentagramContainer);
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
        this.lastActiveIndex = activeIndex;
        this.renderPentagram(chords, activeIndex, true);

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
                    : chord.notes.slice(0, 5).map((n) => ControllerStateModel.formatNoteName(n)).join(' ');

            const artLabel = chord.articulation === 'glissando'
                ? '<span class="chord-art-badge">GLISS</span>'
                : chord.articulation === 'arp_up'
                    ? '<span class="chord-art-badge">ARP ▲</span>'
                    : chord.articulation === 'arp_down'
                        ? '<span class="chord-art-badge">ARP ▼</span>'
                        : '';

            const durBadge = chord.durationFactor !== 1
                ? `<span class="chord-dur-tag">${chord.durationFactor}x</span>`
                : '';

            card.innerHTML = `
                <div class="chord-card-header">
                    <span class="chord-bar-num">m.${idx + 1}</span>
                    ${artLabel || durBadge}
                </div>
                <span class="chord-symbol" title="${chord.symbol}">${chord.symbol}</span>
                <span class="chord-notes" title="${noteLabels}">${noteLabels}</span>
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

    /**
     * Renders a responsive, multi-row Grand Staff (Treble + Bass Clef SVG Pentagram)
     * that wraps measures cleanly across screen widths and scrolls vertically.
     */
    renderPentagram(chords, activeIndex = -1, autoScroll = true) {
        if (!this.pentagramContainer) return;

        const containerWidth = Math.max(320, this.pentagramContainer.clientWidth - 16);
        const leftMargin = 46;
        const rightMargin = 10;
        const usableWidth = containerWidth - leftMargin - rightMargin;

        // Calculate optimal bars per system row based on screen width & note density
        const hasDenseWrittenScores = chords.some(
            (c) => Array.isArray(c.writtenEvents) && c.writtenEvents.length > 4
        );
        const targetMinBarWidth = hasDenseWrittenScores ? 148 : 96;
        const barsPerRow = Math.max(2, Math.min(8, Math.floor(usableWidth / targetMinBarWidth)));
        const barWidth = usableWidth / barsPerRow;

        const systemHeight = 164;
        const totalItems = Math.max(barsPerRow, chords.length);
        const rowCount = Math.ceil(totalItems / barsPerRow);
        const totalHeight = rowCount * systemHeight + 8;

        const stepMap = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        const midiToStaffPos = (midi) => {
            const name = noteNames[midi % 12];
            const octave = Math.floor(midi / 12) - 1;
            const isSharp = name.includes('#');
            const diatonicStep = octave * 7 + stepMap[name[0]];
            return { diatonicStep, isSharp };
        };

        // Returns Y offset relative to the top of a single system row
        const stepToLocalY = (step) => {
            if (step >= 28) {
                return 68 - (step - 30) * 4; // Treble bottom line E4 (step 30) at y = 68
            }
            return 96 + (26 - step) * 4;     // Bass top line A3 (step 26) at y = 96
        };

        const renderLedgerLines = (diatonicStep, noteX, rowOffsetY) => {
            let linesSvg = '';
            if (diatonicStep === 28) {
                const ly = rowOffsetY + 76;
                linesSvg += `<line x1="${noteX - 8}" y1="${ly}" x2="${noteX + 8}" y2="${ly}" stroke="#a1a1aa" stroke-width="1.2" />`;
            } else if (diatonicStep >= 42) {
                for (let s = 42; s <= diatonicStep; s += 2) {
                    const ly = rowOffsetY + stepToLocalY(s);
                    linesSvg += `<line x1="${noteX - 8}" y1="${ly}" x2="${noteX + 8}" y2="${ly}" stroke="#a1a1aa" stroke-width="1.2" />`;
                }
            } else if (diatonicStep <= 16) {
                for (let s = 16; s >= diatonicStep; s -= 2) {
                    const ly = rowOffsetY + stepToLocalY(s);
                    linesSvg += `<line x1="${noteX - 8}" y1="${ly}" x2="${noteX + 8}" y2="${ly}" stroke="#a1a1aa" stroke-width="1.2" />`;
                }
            }
            return linesSvg;
        };

        const parts = [
            `<svg viewBox="0 0 ${containerWidth} ${totalHeight}" width="100%" height="${totalHeight}" class="pentagram-svg">`
        ];

        for (let row = 0; row < rowCount; row++) {
            const rowY = row * systemHeight;
            const rowRightX = containerWidth - rightMargin;

            // 5 Treble lines (36..68) & 5 Bass lines (96..128)
            [36, 44, 52, 60, 68, 96, 104, 112, 120, 128].forEach((localY) => {
                const y = rowY + localY;
                parts.push(`<line x1="10" y1="${y}" x2="${rowRightX}" y2="${y}" stroke="#3f3f46" stroke-width="1" />`);
            });

            // Grand staff brace, clefs & system measure number
            parts.push(`<line x1="10" y1="${rowY + 36}" x2="10" y2="${rowY + 128}" stroke="#71717a" stroke-width="2" />`);
            parts.push(`<text x="14" y="${rowY + 64}" fill="#00e5ff" font-size="34" font-family="serif">𝄞</text>`);
            parts.push(`<text x="14" y="${rowY + 120}" fill="#00e5ff" font-size="28" font-family="serif">𝄢</text>`);
            parts.push(`<text x="12" y="${rowY + 26}" fill="#71717a" font-size="9" font-weight="700">m.${row * barsPerRow + 1}</text>`);
        }

        let lastSectionPrinted = '';

        chords.forEach((chord, idx) => {
            const row = Math.floor(idx / barsPerRow);
            const col = idx % barsPerRow;
            const rowY = row * systemHeight;

            const xStart = leftMargin + col * barWidth;
            const xCenter = xStart + barWidth / 2;
            const barEndX = xStart + barWidth;
            const isPlaying = idx === activeIndex;

            if (isPlaying) {
                parts.push(
                    `<rect x="${xStart + 2}" y="${rowY + 18}" width="${barWidth - 4}" height="126" rx="6" fill="rgba(0, 229, 255, 0.14)" stroke="#00e5ff" stroke-width="1.2" />`
                );
            }

            // Section badge above measure if a new section starts here
            if (chord.section && chord.section !== lastSectionPrinted) {
                lastSectionPrinted = chord.section;
                parts.push(
                    `<text x="${xStart + 4}" y="${rowY + 11}" fill="#fbbf24" font-size="9" font-weight="800">[${chord.section}]</text>`
                );
            }

            // Measure barline (double barline on final measure)
            const isFinalBar = idx === chords.length - 1;
            parts.push(`<line x1="${barEndX}" y1="${rowY + 36}" x2="${barEndX}" y2="${rowY + 128}" stroke="#52525b" stroke-width="${isFinalBar ? 2 : 1}" />`);
            if (isFinalBar) {
                parts.push(`<line x1="${barEndX - 4}" y1="${rowY + 36}" x2="${barEndX - 4}" y2="${rowY + 128}" stroke="#52525b" stroke-width="1" />`);
            }

            // Chord / measure label
            const maxChars = Math.max(8, Math.floor(barWidth / 6.5));
            const shortLabel = chord.symbol.length > maxChars
                ? `${chord.symbol.slice(0, maxChars - 1)}…`
                : chord.symbol;
            parts.push(
                `<text x="${xCenter}" y="${rowY + 23}" text-anchor="middle" fill="${isPlaying ? '#00e5ff' : '#e4e4e7'}" font-size="10.5" font-weight="700">${shortLabel}</text>`
            );

            if (!chord.valid || chord.isRest) return;

            // 1. Glissando diagonal line & "gliss." label
            if (chord.articulation === 'glissando' && chord.notes.length >= 2) {
                const startPos = midiToStaffPos(chord.notes[0]);
                const endPos = midiToStaffPos(chord.notes[chord.notes.length - 1]);
                const y1 = rowY + stepToLocalY(startPos.diatonicStep);
                const y2 = rowY + stepToLocalY(endPos.diatonicStep);
                const x1 = xStart + Math.min(18, barWidth * 0.2);
                const x2 = barEndX - Math.min(18, barWidth * 0.2);

                parts.push(renderLedgerLines(startPos.diatonicStep, x1, rowY));
                parts.push(renderLedgerLines(endPos.diatonicStep, x2, rowY));

                if (startPos.isSharp) {
                    parts.push(`<text x="${x1 - 11}" y="${y1 + 4}" fill="#fbbf24" font-size="10" font-weight="700">♯</text>`);
                }
                if (endPos.isSharp) {
                    parts.push(`<text x="${x2 - 11}" y="${y2 + 4}" fill="#fbbf24" font-size="10" font-weight="700">♯</text>`);
                }

                parts.push(`<ellipse cx="${x1}" cy="${y1}" rx="4.6" ry="3.4" transform="rotate(-18 ${x1} ${y1})" fill="${isPlaying ? '#00e5ff' : '#e4e4e7'}" />`);
                parts.push(`<line x1="${x1 + 5}" y1="${y1}" x2="${x2 - 5}" y2="${y2}" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="3,2" />`);
                parts.push(`<text x="${xCenter}" y="${(y1 + y2) / 2 - 4}" text-anchor="middle" fill="#fbbf24" font-size="8.5" font-style="italic">gliss.</text>`);
                parts.push(`<ellipse cx="${x2}" cy="${y2}" rx="4.6" ry="3.4" transform="rotate(-18 ${x2} ${y2})" fill="${isPlaying ? '#00e5ff' : '#e4e4e7'}" />`);
                return;
            }

            // 2. Beat-accurate horizontal note plotting for dense MusicXML/MXL measures
            if (Array.isArray(chord.writtenEvents) && chord.writtenEvents.length > 0) {
                const innerPad = 12;
                const drawableSpan = Math.max(24, barWidth - innerPad * 2);

                // Deduplicate identical pitch+time events so visual staff stays crisp
                const seenKeys = new Set();
                chord.writtenEvents.forEach((wn) => {
                    const bucket = Math.round(wn.startFraction * 32);
                    const key = `${wn.midi}_${bucket}`;
                    if (seenKeys.has(key)) return;
                    seenKeys.add(key);

                    const { diatonicStep, isSharp } = midiToStaffPos(wn.midi);
                    const y = rowY + stepToLocalY(diatonicStep);
                    const noteX = xStart + innerPad + wn.startFraction * drawableSpan;
                    const noteColor = isPlaying ? '#00e5ff' : '#e4e4e7';

                    parts.push(renderLedgerLines(diatonicStep, noteX, rowY));

                    if (isSharp) {
                        parts.push(`<text x="${noteX - 10}" y="${y + 3.5}" fill="#fbbf24" font-size="9.5" font-weight="700">♯</text>`);
                    }

                    // Draw stem for notes shorter than a whole note
                    if (wn.durationFraction < 0.85) {
                        const stemUp = diatonicStep < 34;
                        const stemX = stemUp ? noteX + 3.8 : noteX - 3.8;
                        const stemY2 = stemUp ? y - 18 : y + 18;
                        parts.push(`<line x1="${stemX}" y1="${y}" x2="${stemX}" y2="${stemY2}" stroke="${noteColor}" stroke-width="1" opacity="0.85" />`);
                    }

                    const isHollow = wn.durationFraction >= 0.45;
                    parts.push(
                        `<ellipse cx="${noteX}" cy="${y}" rx="4.3" ry="3.1" transform="rotate(-18 ${noteX} ${y})" fill="${isHollow ? '#141418' : noteColor}" stroke="${noteColor}" stroke-width="1.3" />`
                    );

                    if (wn.isStaccato) {
                        const dotY = diatonicStep < 34 ? y + 7 : y - 7;
                        parts.push(`<circle cx="${noteX}" cy="${dotY}" r="1.4" fill="#fbbf24" />`);
                    }
                });
                return;
            }

            // 3. Wavy vertical Arpeggio line next to rolled chords
            if (chord.articulation === 'arp_up' || chord.articulation === 'arp_down') {
                const ys = chord.notes.map((m) => rowY + stepToLocalY(midiToStaffPos(m).diatonicStep));
                const topY = Math.min(...ys) - 4;
                const botY = Math.max(...ys) + 4;
                const waveX = xCenter - 14;

                let wavePath = `M ${waveX} ${topY}`;
                for (let y = topY; y < botY; y += 4) {
                    const nextY = Math.min(botY, y + 4);
                    const ctrlX = ((y - topY) / 4) % 2 === 0 ? waveX - 2.5 : waveX + 2.5;
                    wavePath += ` Q ${ctrlX} ${(y + nextY) / 2}, ${waveX} ${nextY}`;
                }

                parts.push(`<path d="${wavePath}" fill="none" stroke="#fbbf24" stroke-width="1.5" />`);
                const arrowY = chord.articulation === 'arp_down' ? botY + 6 : topY - 2;
                const arrowChar = chord.articulation === 'arp_down' ? '▼' : '▲';
                parts.push(`<text x="${waveX - 3.5}" y="${arrowY}" fill="#fbbf24" font-size="7">${arrowChar}</text>`);
            }

            // 4. Standard Chord Noteheads & Ledger Lines
            chord.notes.forEach((midi, nIdx) => {
                const { diatonicStep, isSharp } = midiToStaffPos(midi);
                const y = rowY + stepToLocalY(diatonicStep);
                const noteX = xCenter + (nIdx % 2 === 1 ? 4.5 : -3);

                parts.push(renderLedgerLines(diatonicStep, noteX, rowY));

                if (isSharp) {
                    parts.push(`<text x="${noteX - 12}" y="${y + 4}" fill="#fbbf24" font-size="10.5" font-weight="700">♯</text>`);
                }

                parts.push(
                    `<ellipse cx="${noteX}" cy="${y}" rx="4.8" ry="3.5" transform="rotate(-18 ${noteX} ${y})" fill="${isPlaying ? '#00e5ff' : '#e4e4e7'}" />`
                );
            });
        });

        parts.push(`</svg>`);
        this.pentagramContainer.innerHTML = parts.join('');

        // Smoothly scroll vertically to keep the active system row centered
        if (autoScroll && activeIndex >= 0) {
            const activeRow = Math.floor(activeIndex / barsPerRow);
            const targetTop = Math.max(
                0,
                activeRow * systemHeight - this.pentagramContainer.clientHeight / 2 + systemHeight / 2
            );
            this.pentagramContainer.scrollTo({ top: targetTop, behavior: 'smooth' });
        }
    }

    highlightStep(activeIndex) {
        this.lastActiveIndex = activeIndex;
        this.renderPentagram(this.lastRenderedChords, activeIndex, true);
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