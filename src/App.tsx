import { useEffect, useMemo, useRef, useState } from 'react'
import { Accidental, Formatter, Renderer, Stave, StaveNote, Voice } from 'vexflow'
import './App.css'

type Language = 'de' | 'intl'
type Step = 'root' | 'chord'
type AppMode = 'basic' | 'inversions'
type ChordType = 'major' | 'minor' | 'dim' | 'aug' | 'maj7' | 'min7' | 'dom7' | 'dim7' | 'halfDim7' | 'add9' | 'minorAdd9' | 'six' | 'minorSix'
type Inversion = 0 | 1 | 2
type Chord = { root: string; type: ChordType; inversion: Inversion; intervals: number[] }

const roots = ['C', 'Des', 'D', 'Es', 'E', 'F', 'Fis', 'G', 'As', 'A', 'B', 'H']
const labels: Record<ChordType, { de: string; intl: string; intervals: number[] }> = {
  major: { de: 'Dur', intl: 'Major', intervals: [0, 4, 7] }, minor: { de: 'Moll', intl: 'Minor', intervals: [0, 3, 7] }, dim: { de: 'vermindert', intl: 'Diminished', intervals: [0, 3, 6] }, aug: { de: 'übermäßig', intl: 'Augmented', intervals: [0, 4, 8] },
  maj7: { de: 'große Septime', intl: 'Major 7', intervals: [0, 4, 7, 11] }, min7: { de: 'kleine Septime', intl: 'Minor 7', intervals: [0, 3, 7, 10] }, dom7: { de: 'Dominantseptakkord', intl: 'Dominant 7', intervals: [0, 4, 7, 10] }, dim7: { de: 'verminderter Septakkord', intl: 'Diminished 7', intervals: [0, 3, 6, 9] }, halfDim7: { de: 'halbvermindert', intl: 'Half-diminished 7', intervals: [0, 3, 6, 10] },
  add9: { de: 'mit zusätzlicher None', intl: 'add 9', intervals: [0, 4, 7, 14] }, minorAdd9: { de: 'Moll mit None', intl: 'Minor add 9', intervals: [0, 3, 7, 14] }, six: { de: 'mit zusätzlicher Sexte', intl: '6', intervals: [0, 4, 7, 9] }, minorSix: { de: 'Moll mit Sexte', intl: 'Minor 6', intervals: [0, 3, 7, 9] },
}
const germanRootNames: Record<string, string> = { C: 'C', Des: 'Des', D: 'D', Es: 'Es', E: 'E', F: 'F', Fis: 'Fis', G: 'G', As: 'As', A: 'A', B: 'B', H: 'H' }
const internationalRootNames: Record<string, string> = { C: 'C', Des: 'Db', D: 'D', Es: 'Eb', E: 'E', F: 'F', Fis: 'F#', G: 'G', As: 'Ab', A: 'A', B: 'Bb', H: 'B' }
const triadKeys: Record<string, Record<'major' | 'minor', string[]>> = {
  C: { major: ['c/4', 'e/4', 'g/4'], minor: ['c/4', 'eb/4', 'g/4'] }, Des: { major: ['db/4', 'f/4', 'ab/4'], minor: ['db/4', 'fb/4', 'ab/4'] }, D: { major: ['d/4', 'f#/4', 'a/4'], minor: ['d/4', 'f/4', 'a/4'] }, Es: { major: ['eb/4', 'g/4', 'bb/4'], minor: ['eb/4', 'gb/4', 'bb/4'] }, E: { major: ['e/4', 'g#/4', 'b/4'], minor: ['e/4', 'g/4', 'b/4'] },
  F: { major: ['f/4', 'a/4', 'c/5'], minor: ['f/4', 'ab/4', 'c/5'] }, Fis: { major: ['f#/4', 'a#/4', 'c#/5'], minor: ['f#/4', 'a/4', 'c#/5'] }, G: { major: ['g/4', 'b/4', 'd/5'], minor: ['g/4', 'bb/4', 'd/5'] }, As: { major: ['ab/4', 'c/5', 'eb/5'], minor: ['ab/4', 'cb/5', 'eb/5'] }, A: { major: ['a/4', 'c#/5', 'e/5'], minor: ['a/4', 'c/5', 'e/5'] }, B: { major: ['bb/4', 'd/5', 'f/5'], minor: ['bb/4', 'db/5', 'f/5'] }, H: { major: ['b/4', 'd#/5', 'f#/5'], minor: ['b/4', 'd/5', 'f#/5'] },
}

function rootName(root: string, language: Language) { return language === 'de' ? germanRootNames[root] : internationalRootNames[root] }
function chordName(chord: Chord, language: Language) {
  const suffix: Record<ChordType, string> = language === 'de' ? { major: '', minor: '', dim: '°', aug: '+', maj7: 'maj7', min7: 'm7', dom7: '7', dim7: '°7', halfDim7: 'ø7', add9: 'add9', minorAdd9: 'madd9', six: '6', minorSix: 'm6' } : { major: '', minor: 'm', dim: 'dim', aug: 'aug', maj7: 'maj7', min7: 'm7', dom7: '7', dim7: 'dim7', halfDim7: 'm7b5', add9: 'add9', minorAdd9: 'madd9', six: '6', minorSix: 'm6' }
  const displayRoot = language === 'de' && chord.type === 'minor' ? rootName(chord.root, language).toLowerCase() : rootName(chord.root, language)
  const name = `${displayRoot}${suffix[chord.type]}`
  if (chord.inversion === 0) return name
  const bassKey = chordKeys(chord)[0].split('/')[0]
  const bassNames: Record<string, { de: string; intl: string }> = { c: { de: 'C', intl: 'C' }, d: { de: 'D', intl: 'D' }, e: { de: 'E', intl: 'E' }, f: { de: 'F', intl: 'F' }, g: { de: 'G', intl: 'G' }, a: { de: 'A', intl: 'A' }, b: { de: 'H', intl: 'B' }, db: { de: 'Des', intl: 'Db' }, eb: { de: 'Es', intl: 'Eb' }, fb: { de: 'Fes', intl: 'Fb' }, gb: { de: 'Ges', intl: 'Gb' }, ab: { de: 'As', intl: 'Ab' }, bb: { de: 'B', intl: 'Bb' }, cb: { de: 'Ces', intl: 'Cb' }, 'c#': { de: 'Cis', intl: 'C#' }, 'f#': { de: 'Fis', intl: 'F#' }, 'g#': { de: 'Gis', intl: 'G#' }, 'a#': { de: 'Ais', intl: 'A#' }, 'd#': { de: 'Dis', intl: 'D#' } }
  const inversionName = chord.inversion === 1 ? '1. Umkehrung (Sextakkord)' : '2. Umkehrung (Quartsextakkord)'
  return `${name}/${bassNames[bassKey][language]} · ${inversionName}`
}
function inversionLabel(chord: Chord, inversion: Inversion, language: Language) { const rootNameValue = rootName(chord.root, language); const root = language === 'de' && chord.type === 'minor' ? rootNameValue.toLowerCase() : language === 'intl' && chord.type === 'minor' ? `${rootNameValue}m` : rootNameValue; const labels = ['Grundstellung', '1. Umkehrung (Sextakkord)', '2. Umkehrung (Quartsextakkord)']; return `${root} - ${labels[inversion]}` }
function basicChordAt(index: number): Chord { const root = roots[Math.floor(index / 2) % roots.length]; const type: ChordType = index % 2 === 0 ? 'major' : 'minor'; return { root, type, inversion: 0, intervals: labels[type].intervals } }
function shuffledIndices() { const indices = Array.from({ length: 24 }, (_, index) => index); for (let index = indices.length - 1; index > 0; index -= 1) { const swapIndex = Math.floor(Math.random() * (index + 1)); [indices[index], indices[swapIndex]] = [indices[swapIndex], indices[index]] } return indices }
function chooseInversion(inversions: Inversion[], previous?: Inversion) { const choices = inversions.filter((inversion) => inversion !== previous); const available = choices.length > 0 ? choices : inversions; return available[Math.floor(Math.random() * available.length)] }
function chordKeys(chord: Chord) {
  const base = triadKeys[chord.root][chord.type === 'minor' ? 'minor' : 'major']
  const rotated = [...base.slice(chord.inversion), ...base.slice(0, chord.inversion)]
  return rotated.map((key, index) => index >= base.length - chord.inversion ? `${key.split('/')[0]}/${Number(key.split('/')[1]) + 1}` : key)
}

function Staff({ chord }: { chord: Chord }) {
  const staffRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!staffRef.current) return
    const staffElement = staffRef.current
    const renderStaff = () => {
      try {
        const width = Math.max(staffElement.clientWidth, 300)
        staffElement.replaceChildren()
        const renderer = new Renderer(staffElement, Renderer.Backends.SVG)
        renderer.resize(width, 210)
        const context = renderer.getContext()
        const staveWidth = Math.min(width * 0.88, 520)
        const staveLeft = (width - staveWidth) / 2
        const stave = new Stave(staveLeft, 45, staveWidth)
        stave.addClef('treble').setContext(context).draw()
        stave.setNoteStartX(staveLeft + 95)
        const note = new StaveNote({ keys: chordKeys(chord), duration: 'w' })
        chordKeys(chord).forEach((key, index) => {
          const accidental = key.match(/^[a-g](b|#)/)?.[1]
          if (accidental) note.addModifier(new Accidental(accidental), index)
        })
        const voice = new Voice({ numBeats: 4, beatValue: 4 })
        voice.addTickables([note])
        new Formatter().joinVoices([voice]).format([voice], Math.max(staveWidth - 130, 120))
        voice.draw(context, stave)
      } catch (error) { console.error('VexFlow konnte den Akkord nicht zeichnen.', error) }
    }
    renderStaff()
    const observer = new ResizeObserver(renderStaff)
    observer.observe(staffElement)
    return () => observer.disconnect()
  }, [chord])
  return <div ref={staffRef} className="staff" role="img" aria-label="Akkord im Violinschlüssel" />
}

function App() {
  const [screen, setScreen] = useState<'home' | 'training'>('home')
  const [mode, setMode] = useState<AppMode>('basic')
  const [language, setLanguage] = useState<Language>('de')
  const [step, setStep] = useState<Step>('root')
  const [chord, setChord] = useState<Chord>(() => basicChordAt(0))
  const basicBag = useRef<number[]>([])
  const inversionBag = useRef<number[]>([])
  const previousInversion = useRef<Inversion | undefined>(undefined)
  const [selectedInversions, setSelectedInversions] = useState<Inversion[]>([0, 1, 2])
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [score, setScore] = useState({ correct: 0, wrong: 0 })
  const [showSettings, setShowSettings] = useState(false)
  const transitionTimer = useRef<number | null>(null)
  const audioContext = useRef<AudioContext | null>(null)

  const rootOptions = roots.map((root) => rootName(root, language))
  const chordOptions = useMemo(() => {
    if (mode === 'basic') return roots.flatMap((root) => (['major', 'minor'] as ChordType[]).map((type) => chordName({ root, type, inversion: 0, intervals: labels[type].intervals }, language)))
    if (mode === 'inversions') return (['major', 'minor'] as ChordType[]).flatMap((type) => [0, 1, 2].map((inversion) => inversionLabel({ ...chord, type, intervals: labels[type].intervals }, inversion as Inversion, language)))
    const options = new Set<string>([chordName(chord, language)])
    roots.forEach((root, index) => { if (options.size < 10) options.add(chordName({ ...chord, root: roots[(roots.indexOf(root) + index + 1) % roots.length] }, language)) })
    return [...options]
  }, [chord, language, mode])

  function answer(value: string) { const correctAnswer = mode === 'inversions' && step === 'root' ? rootName(chord.root, language) : mode === 'inversions' ? inversionLabel(chord, chord.inversion, language) : chordName(chord, language); const correct = value === correctAnswer; setFeedback(correct ? 'correct' : 'wrong'); setScore((current) => ({ correct: current.correct + Number(correct), wrong: current.wrong + Number(!correct) })); if (transitionTimer.current) window.clearTimeout(transitionTimer.current); transitionTimer.current = window.setTimeout(nextStep, correct ? 500 : 2000) }
  function nextBasicChord() { if (basicBag.current.length === 0) { basicBag.current = shuffledIndices(); const currentIndex = roots.indexOf(chord.root) * 2 + (chord.type === 'minor' ? 1 : 0); if (basicBag.current[0] === currentIndex) [basicBag.current[0], basicBag.current[1]] = [basicBag.current[1], basicBag.current[0]] } setChord(basicChordAt(basicBag.current.shift() ?? 0)); setFeedback(null) }
  function nextInversionChord() { if (inversionBag.current.length === 0) { inversionBag.current = shuffledIndices(); const currentIndex = roots.indexOf(chord.root) * 2 + (chord.type === 'minor' ? 1 : 0); if (inversionBag.current[0] === currentIndex) [inversionBag.current[0], inversionBag.current[1]] = [inversionBag.current[1], inversionBag.current[0]] } const next = basicChordAt(inversionBag.current.shift() ?? 0); const inversion = chooseInversion(selectedInversions, previousInversion.current); previousInversion.current = inversion; setChord({ ...next, inversion }); setFeedback(null) }
  function nextStep() { if (mode === 'basic') { nextBasicChord() } else if (step === 'root') { setStep('chord'); setFeedback(null) } else { nextInversionChord(); setStep('root') } }
  function toggleInversion(inversion: Inversion) { setSelectedInversions((current) => { if (current.includes(inversion) && current.length === 1) return current; return current.includes(inversion) ? current.filter((item) => item !== inversion) : [...current, inversion] }) }
  function getAudioContext() { if (!audioContext.current) audioContext.current = new AudioContext(); return audioContext.current }
  function toggleSound() { const audio = getAudioContext(); if (!soundEnabled) void audio.resume(); setSoundEnabled((enabled) => !enabled) }
  async function playChord() { if (!soundEnabled) return; const audio = getAudioContext(); await audio.resume(); const now = audio.currentTime; chord.intervals.forEach((interval, index) => { const oscillator = audio.createOscillator(); const gain = audio.createGain(); oscillator.type = 'sine'; oscillator.frequency.value = 261.63 * Math.pow(2, (interval + chord.inversion * 12) / 12); gain.gain.setValueAtTime(0.12, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2); oscillator.connect(gain).connect(audio.destination); oscillator.start(now + index * 0.04); oscillator.stop(now + 1.2) }) }
  const header = (back = false) => <header className="topbar"><div className="brand">{back && <button className="back-button" onClick={() => setScreen('home')} aria-label="Zur Startseite">←</button>}<span className="brand-mark">♫</span><span>akkorde<span className="brand-accent">.</span></span></div><div className="top-actions"><div className="language-switch" role="group" aria-label="Notation"><button className={language === 'de' ? 'active' : ''} onClick={() => setLanguage('de')}>Deutsch</button><button className={language === 'intl' ? 'active' : ''} onClick={() => setLanguage('intl')}>International</button></div>{back && <button className="icon-button" onClick={() => setShowSettings(!showSettings)} aria-label="Einstellungen">☷</button>}</div></header>

  if (screen === 'home') return <main className="app-shell">{header()}<section className="home-content"><div className="eyebrow"><span className="live-dot" /> AKKORDTRAINER</div><h1>Was möchtest du<br /><em>üben?</em></h1><p className="home-intro">Wähle eine Übung und trainiere Dur- und Mollakkorde in Grundstellung oder Umkehrungen.</p><div className="app-cards"><button className="app-card" onClick={() => { setMode('basic'); basicBag.current = []; setChord(basicChordAt(0)); setStep('chord'); setScore({ correct: 0, wrong: 0 }); setScreen('training') }}><span className="card-number">01</span><span className="card-symbol">C</span><span className="card-copy"><strong>Welcher Akkord ist das?</strong><small>Dur und Moll in Grundstellung</small></span><span className="card-arrow">→</span></button><button className="app-card" onClick={() => { setMode('inversions'); inversionBag.current = []; setChord({ ...basicChordAt(Math.floor(Math.random() * 24)), inversion: selectedInversions[0] }); setStep('root'); setScore({ correct: 0, wrong: 0 }); setScreen('training') }}><span className="card-number">02</span><span className="card-symbol">C <br /><i>/ E</i></span><span className="card-copy"><strong>Welcher Akkord ist das?</strong><small>Dur und Moll mit Umkehrungen</small></span><span className="card-arrow">→</span></button></div></section><footer><span>2 ANWENDUNGEN</span><span className="footer-note">Weitere Akkordarten folgen später.</span></footer></main>

  const isRootStep = mode === 'inversions' && step === 'root'
  return <main className="app-shell">{header(true)}<section className="content-grid"><div className="main-column"><div className="eyebrow"><span className="live-dot" /> {mode === 'basic' ? 'GRUNDSTELLUNG' : 'UMKEHRUNGEN'} <span className="eyebrow-line" /></div><div className="title-row"><div><h1>Welcher Akkord<br /><em>ist das?</em></h1><p className="intro">{mode === 'basic' ? 'Klicke den passenden Dur- oder Mollakkord an.' : 'Erkenne erst den Grundton, dann die Qualität und Lage.'}</p></div><div className="score-card"><span>DEINE ÜBUNG</span><strong>{score.correct}<i> / </i>{score.correct + score.wrong}</strong><small>richtig beantwortet</small></div></div>{mode === 'inversions' && <div className="progress-row"><span className={step === 'root' ? 'current' : 'done'}>01 <b>Grundton</b></span><span className={step === 'chord' ? 'current' : ''}>02 <b>Akkord</b></span><div className="progress-track"><i style={{ width: step === 'root' ? '50%' : '100%' }} /></div></div>}<div className="practice-panel"><div className="panel-label">VIOLINSCHLÜSSEL <span>{mode === 'basic' ? 'AKKORD ERKENNEN' : isRootStep ? 'SCHRITT 1 VON 2' : 'SCHRITT 2 VON 2'}</span></div><Staff chord={chord} /><div className="listen-row"><button className={`listen-button ${soundEnabled ? 'enabled' : ''}`} onClick={playChord} aria-label="Akkord abspielen">▶</button><span>{soundEnabled ? 'Akkord anhören' : 'Klang ist ausgeschaltet'}</span><button className="sound-toggle" onClick={toggleSound} aria-label="Klang ein- oder ausschalten"><span className={soundEnabled ? 'toggle-on' : ''} /></button></div></div><div className="answer-area"><div className="question-label">{isRootStep ? 'WÄHLE DEN GRUNDTON' : 'WÄHLE DEN VOLLSTÄNDIGEN AKKORD'}</div><div className={`answer-grid ${isRootStep ? '' : 'chord-grid'}`}>{(isRootStep ? rootOptions : chordOptions).map((option) => <button key={option} className={`answer-button ${feedback && ((isRootStep && option === rootName(chord.root, language)) || (!isRootStep && option === chordName(chord, language))) ? 'answer-correct' : ''}`} onClick={() => answer(option)} disabled={Boolean(feedback)}>{option}</button>)}</div>{feedback && <div className={`feedback ${feedback}`}><span>{feedback === 'correct' ? '✓' : '!'}</span><div><strong>{feedback === 'correct' ? 'Richtig!' : 'Das war nicht richtig.'}</strong><small>{isRootStep ? `Der Grundton ist ${rootName(chord.root, language)}.` : `Die Lösung lautet ${chordName(chord, language)}.`}</small></div><button onClick={nextStep}>{isRootStep ? 'Zum Akkord →' : 'Nächste Aufgabe →'}</button></div>}</div></div>{showSettings && mode === 'inversions' && <aside className="settings-panel"><div className="settings-heading"><span>TRAINING</span><button onClick={() => setShowSettings(false)} aria-label="Einstellungen schließen">×</button></div><h2>Deine Auswahl</h2><p className="settings-copy">Dur und Moll mit den gewählten Umkehrungen.</p><div className="setting-section"><label>Umkehrungen</label>{(['Grundstellung', '1. Umkehrung', '2. Umkehrung'] as const).map((name, index) => <label className="check-row" key={name}><input type="checkbox" checked={selectedInversions.includes(index as Inversion)} onChange={() => toggleInversion(index as Inversion)} /><span>{name}</span></label>)}</div><button className="reset-button" onClick={() => setSelectedInversions([0, 1, 2])}>Alle Umkehrungen</button></aside>}</section><footer><span>SESSION SCORE</span><span><b>{score.correct}</b> richtig <b>{score.wrong}</b> falsch</span><span className="footer-note">Fortschritt wird nur für diese Übung gezählt.</span></footer></main>
}

export default App
