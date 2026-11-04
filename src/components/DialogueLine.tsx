import { useMemo } from 'react';
import type { Mushaf } from '../quran/mushaf';
import { quranize } from '../quran/quranize';
import { arNum } from '../exam/exam';

/**
 * Une réplique de la conversation : les passages du Coran y sont affichés tels
 * qu'imprimés dans le mushaf de la riwaya (voyelles, rasm, numéros de versets).
 */
export function DialogueLine({ text, mushaf, hint }: { text: string; mushaf: Mushaf | null; hint?: number }) {
  const pieces = useMemo(() => (mushaf ? quranize(text, mushaf, { hint }) : [{ kind: 'text' as const, text }]), [text, mushaf, hint]);
  return (
    <>
      {pieces.map((p, i) =>
        p.kind === 'text' ? (
          <span key={i}>{p.text} </span>
        ) : (
          <span key={i} className="q">
            {p.words.map((w) => (
              <span key={w.g}>
                {w.text}{' '}
                {w.last && <span className="ayah-no">﴿{arNum(w.a)}﴾ </span>}
              </span>
            ))}
          </span>
        ),
      )}
    </>
  );
}
