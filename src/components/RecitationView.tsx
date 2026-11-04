import type { Mushaf, QAyah } from '../quran/mushaf';
import type { Tracker } from '../quran/tracker';
import { SURAHS } from '../data/surahs';
import { arNum } from '../exam/exam';

interface Props {
  mushaf: Mushaf;
  tracker: Tracker;
  /** Position provisoire d'après la transcription en cours. */
  previewPos: number;
  showText: boolean;
  fontClass: string;
}

function AyahLine({ ayah, mushaf, tracker, previewPos, showText, faded }: Omit<Props, 'fontClass'> & { ayah: QAyah; faded?: boolean }) {
  const ws = mushaf.words.slice(ayah.first, ayah.first + ayah.count);
  const complete = tracker.pos >= ayah.first + ayah.count;
  return (
    <p className={'ayah' + (faded ? ' faded' : '')}>
      {ws.map((w) => {
        let cls: string;
        if (w.g < tracker.pos) cls = tracker.state.get(w.g) ?? 'ok';
        else if (w.g < previewPos) cls = 'pending';
        else if (tracker.state.get(w.g) === 'fath') cls = 'fath';
        else if (showText) cls = 'future';
        else return null;
        return (
          <span key={w.g} className={'w ' + cls}>
            {w.text}{' '}
          </span>
        );
      })}
      {!complete && !showText && previewPos <= ayah.first + ayah.count && <span className="caret" aria-hidden />}
      {(complete || showText) && <span className="ayah-no">﴿{arNum(ayah.a)}﴾</span>}
    </p>
  );
}

export function RecitationView({ mushaf, tracker, previewPos, showText, fontClass }: Props) {
  const pos = Math.min(tracker.pos, tracker.end - 1);
  const ayah = mushaf.ayahOfWord(pos);
  const done = tracker.done;
  // Juste après la fin d'un verset, on garde le verset terminé à l'écran.
  const atStart = tracker.pos === ayah.first && tracker.pos > tracker.start;
  const prev = atStart ? mushaf.ayahOfWord(ayah.first - 1) : undefined;
  const shown = done ? [mushaf.ayahOfWord(tracker.end - 1)] : prev ? [prev, ayah] : [ayah];
  const meta = SURAHS[shown[shown.length - 1].s - 1];
  const common = { mushaf, tracker, previewPos, showText };

  return (
    <div className={'recitation ' + fontClass} aria-live="polite">
      <div className="where">
        سورة {meta.name} · الآية {arNum(shown[shown.length - 1].a)}
      </div>
      {shown.map((a, i) => (
        <AyahLine key={a.first} ayah={a} {...common} faded={shown.length > 1 && i === 0} />
      ))}
    </div>
  );
}
