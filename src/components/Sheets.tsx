import { useMemo, useState } from 'react';
import { Sheet } from './Sheet';
import { RIWAYAT, TAFASIR, recitersFor, riwayaById } from '../data/riwayat';
import { SURAHS } from '../data/surahs';
import { normalize } from '../quran/arabic';
import { arNum, ayahLabel } from '../exam/exam';
import { clearHistory, loadHistory, weakSpots, type RangeChoice, type Settings } from '../store';
import { VOICES } from '../live/voices';

type Close = { onClose: () => void };

export function RiwayaSheet({ current, onPick, onClose }: Close & { current: string; onPick: (id: string) => void }) {
  return (
    <Sheet title="الرواية" onClose={onClose}>
      <p className="muted">يُحمَّل نص كل رواية من مصاحف مجمع الملك فهد مرة واحدة، ثم يعمل دون اتصال.</p>
      <div className="list">
        {RIWAYAT.map((r) => (
          <button key={r.id} className={'row' + (r.id === current ? ' on' : '')} onClick={() => onPick(r.id)}>
            <span className="row-title">{r.name}</span>
            <span className="row-sub">{r.reciters.length ? `التسميع، و${arNum(r.reciters.length)} قراء مسجَّلون` : 'التسميع، والتلاوة المسموعة برواية حفص'}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

export function rangeLabel(r: RangeChoice): string {
  if (r.kind === 'free') return 'من أي موضع';
  if (r.kind === 'juz') return `الجزء ${arNum(r.n)}`;
  const s = SURAHS[r.s - 1];
  const whole = r.a1 === 1 && r.a2 >= s.ayahs;
  return whole ? `سورة ${s.name}` : `سورة ${s.name} · ${arNum(r.a1)}–${arNum(r.a2)}`;
}

export function RangeSheet({ current, onPick, onClose }: Close & { current: RangeChoice; onPick: (r: RangeChoice) => void }) {
  const [tab, setTab] = useState<RangeChoice['kind']>(current.kind);
  const [q, setQ] = useState('');
  const [s, setS] = useState(current.kind === 'surah' ? current.s : 67);
  const meta = SURAHS[s - 1];
  const [a1, setA1] = useState(current.kind === 'surah' ? current.a1 : 1);
  const [a2, setA2] = useState(current.kind === 'surah' ? current.a2 : meta.ayahs);

  const filtered = useMemo(() => {
    const nq = normalize(q);
    return SURAHS.filter((x) => !q || String(x.n) === q.trim() || normalize(x.name).includes(nq) || x.en.toLowerCase().includes(q.toLowerCase()));
  }, [q]);

  const chooseSurah = (n: number) => {
    setS(n);
    setA1(1);
    setA2(SURAHS[n - 1].ayahs);
  };

  return (
    <Sheet title="ماذا ستقرأ؟" onClose={onClose}>
      <div className="seg" role="tablist">
        {(
          [
            ['surah', 'سورة'],
            ['juz', 'جزء'],
            ['free', 'من أي موضع'],
          ] as const
        ).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'surah' && (
        <>
          <input className="field" placeholder="ابحث عن سورة…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="surah-grid">
            {filtered.map((x) => (
              <button key={x.n} className={'surah' + (x.n === s ? ' on' : '')} onClick={() => chooseSurah(x.n)}>
                <span className="num">{arNum(x.n)}</span>
                <span>{x.name}</span>
              </button>
            ))}
          </div>
          <div className="ayah-range">
            <label>
              من الآية
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={meta.ayahs}
                value={a1}
                onChange={(e) => setA1(Math.max(1, Math.min(meta.ayahs, Number(e.target.value) || 1)))}
              />
            </label>
            <label>
              إلى الآية
              <input
                type="number"
                inputMode="numeric"
                min={a1}
                max={meta.ayahs}
                value={a2}
                onChange={(e) => setA2(Math.max(1, Math.min(meta.ayahs, Number(e.target.value) || meta.ayahs)))}
              />
            </label>
          </div>
          <button className="primary" onClick={() => onPick({ kind: 'surah', s, a1: Math.min(a1, a2), a2: Math.max(a1, a2) })}>
            سورة {meta.name} · {arNum(Math.min(a1, a2))}–{arNum(Math.max(a1, a2))}
          </button>
        </>
      )}

      {tab === 'juz' && (
        <div className="juz-grid">
          {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
            <button key={n} className={current.kind === 'juz' && current.n === n ? 'on' : ''} onClick={() => onPick({ kind: 'juz', n })}>
              {arNum(n)}
            </button>
          ))}
        </div>
      )}

      {tab === 'free' && (
        <>
          <p>
            اقرأ من أي موضع في المصحف، وسيجد التطبيق مكانك بعد كلمات قليلة. إن كانت الكلمات تتكرر في أكثر من موضع (المتشابهات)، ينتظر حتى
            يتميّز الموضع.
          </p>
          <button className="primary" onClick={() => onPick({ kind: 'free' })}>
            ابدأ من أي موضع
          </button>
        </>
      )}
    </Sheet>
  );
}

function KeySection({ apiKey, setApiKey }: { apiKey: string; setApiKey: (k: string) => void }) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const save = () => {
    const k = draft.trim();
    if (!/^[A-Za-z0-9_-]{30,}$/.test(k)) {
      setError('هذا لا يشبه مفتاح Gemini. انسخه كاملاً من Google AI Studio.');
      return;
    }
    setError('');
    setApiKey(k);
    setDraft('');
  };
  if (apiKey)
    return (
      <div className="key-saved">
        <span>
          المفتاح محفوظ على هذا الجهاز: <bdi>…{apiKey.slice(-4)}</bdi>
        </span>
        <button className="ghost danger" onClick={() => setApiKey('')}>
          حذف المفتاح
        </button>
      </div>
    );
  return (
    <div className="key-form">
      <ol className="guide small">
        <li>
          افتح{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
            صفحة المفاتيح في Google AI Studio
          </a>{' '}
          وادخل بحساب Google.
        </li>
        <li>اضغط «Create API key» ثم انسخ المفتاح. المفتاح مجاني.</li>
        <li>الصقه هنا واحفظه.</li>
      </ol>
      <div className="key-field">
        <input
          className="field mono"
          type="password"
          autoComplete="off"
          spellCheck={false}
          dir="ltr"
          placeholder="AIza…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          className="ghost"
          onClick={async () => {
            try {
              setDraft((await navigator.clipboard.readText()).trim());
            } catch {
              setError('تعذّر اللصق تلقائياً، الصق المفتاح يدوياً.');
            }
          }}
        >
          لصق
        </button>
      </div>
      {error && <p className="key-error">{error}</p>}
      <button className="primary" onClick={save} disabled={!draft.trim()}>
        حفظ
      </button>
    </div>
  );
}

export function SettingsSheet({
  settings,
  update,
  typing,
  setTyping,
  apiKey,
  setApiKey,
  onClose,
}: Close & {
  settings: Settings;
  update: (p: Partial<Settings>) => void;
  typing: boolean;
  setTyping: (v: boolean) => void;
  apiKey: string;
  setApiKey: (k: string) => void;
}) {
  const riwaya = riwayaById(settings.riwaya);
  const { reciters, sameRiwaya } = recitersFor(riwaya);
  return (
    <Sheet title="الإعدادات" onClose={onClose}>
      <section className="live-box">
        <h3>الشيخ الحي (Gemini Live)</h3>
        <p className="muted">
          بمفتاحك يصبح الشيخ محاوراً بصوته: يسمعك ويكلّمك ويختبرك ويجيب عن أسئلتك، ويحكم بنص المصحف الذي يعطيه إياه التطبيق.
        </p>
        <KeySection apiKey={apiKey} setApiKey={setApiKey} />
        {apiKey && (
          <>
            <div className="seg small">
              <button className={settings.engine === 'live' ? 'on' : ''} onClick={() => update({ engine: 'live' })}>
                الشيخ الحي
              </button>
              <button className={settings.engine === 'local' ? 'on' : ''} onClick={() => update({ engine: 'local' })}>
                بلا مفتاح (التعرف المحلي)
              </button>
            </div>
            <label className="setting">
              <span>صوت الشيخ</span>
              <select className="field" value={settings.liveVoice} onChange={(e) => update({ liveVoice: e.target.value })}>
                {VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <small className="muted caveat">
          يبقى المفتاح في متصفحك ولا يُرسَل إلا إلى Google. في الخطة المجانية قد يطّلع مراجعون من Google على ما يصلها (صوتك ونصّه)
          لتحسين منتجاتها، ويشترط Google أن يكون صاحب المفتاح قد بلغ ١٨ سنة.
        </small>
      </section>
      <div className="setting">
        <span>النص أثناء القراءة</span>
        <div className="seg small">
          <button className={!settings.showText ? 'on' : ''} onClick={() => update({ showText: false })}>
            مخفي (حفظ)
          </button>
          <button className={settings.showText ? 'on' : ''} onClick={() => update({ showText: true })}>
            ظاهر (مراجعة)
          </button>
        </div>
      </div>

      <div className="setting">
        <span>دقة التسميع</span>
        <div className="seg small">
          {(
            [
              ['lenient', 'متساهل'],
              ['normal', 'وسط'],
              ['strict', 'دقيق'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} className={settings.strictness === k ? 'on' : ''} onClick={() => update({ strictness: k })}>
              {l}
            </button>
          ))}
        </div>
        <small className="muted">المتساهل يغفر أخطاء التعرف على الكلام، والدقيق لا يقبل إلا الكلمة بحروفها.</small>
      </div>

      <label className="setting">
        <span>الفتح بعد سكوت {arNum(settings.fathDelay)} ثوانٍ</span>
        <input type="range" min={3} max={12} step={1} value={settings.fathDelay} onChange={(e) => update({ fathDelay: Number(e.target.value) })} />
      </label>

      <label className="setting check">
        <input type="checkbox" checked={settings.voice} onChange={(e) => update({ voice: e.target.checked })} />
        <span>صوت الشيخ («أعِد» والفتح منطوقان)، وإلا فنغمة خفيفة</span>
      </label>

      <label className="setting">
        <span>القارئ في «أسمعني»{sameRiwaya ? '' : ' (برواية حفص)'}</span>
        <select className="field" value={settings.reciter || reciters[0].id} onChange={(e) => update({ reciter: e.target.value })}>
          {reciters.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>

      <label className="setting">
        <span>التفسير</span>
        <select className="field" value={settings.tafsir} onChange={(e) => update({ tafsir: e.target.value })}>
          {TAFASIR.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      <label className="setting check">
        <input type="checkbox" checked={typing} onChange={(e) => setTyping(e.target.checked)} />
        <span>وضع الكتابة: اكتب ما تقرأ بدل الصوت (للتجربة أو إن لم يدعم المتصفح التعرف على الكلام)</span>
      </label>
    </Sheet>
  );
}

const fmtDate = (t: number) =>
  new Date(t).toLocaleString('ar-MA', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function HistorySheet({ riwaya, onReview, onClose }: Close & { riwaya: string; onReview: (s: number, a: number) => void }) {
  const [history, setHistory] = useState(loadHistory);
  const spots = weakSpots(history, riwaya);
  return (
    <Sheet title="سجلّ الحفظ" onClose={onClose}>
      {spots.length > 0 && (
        <>
          <h3>مواضع تحتاج مراجعة</h3>
          <div className="list">
            {spots.map((p) => (
              <button key={`${p.s}:${p.a}`} className="row" onClick={() => onReview(p.s, p.a)}>
                <span className="row-title">{ayahLabel(p.s, p.a)}</span>
                <span className="row-sub">
                  {arNum(p.n)} {p.n === 1 ? 'تعثّر' : 'تعثّرات'} · راجعها
                </span>
              </button>
            ))}
          </div>
        </>
      )}
      <h3>الجلسات</h3>
      {history.length === 0 && <p className="muted">لا جلسات بعد. تُحفظ جلساتك على هذا الجهاز فقط.</p>}
      <div className="list">
        {history.slice(0, 60).map((r) => (
          <div key={r.id} className="row static">
            <span className="row-title">
              {r.mode === 'prayer' ? 'صلاة · ' : r.mode === 'exam' ? 'اختبار · ' : ''}
              {r.label}
            </span>
            <span className="row-sub">
              {fmtDate(r.started)} · {riwayaById(r.riwaya).short} · {arNum(r.words)} كلمة ·{' '}
              {r.exam
                ? `${arNum(r.exam.right)}/${arNum(r.exam.asked)} صحيحة`
                : `${arNum(r.slips.filter((x) => x.kind !== 'fath').length)} خطأ · ${arNum(r.slips.filter((x) => x.kind === 'fath').length)} فتح`}
            </span>
          </div>
        ))}
      </div>
      {history.length > 0 && (
        <button
          className="ghost danger"
          onClick={() => {
            if (confirm('حذف كل السجل من هذا الجهاز؟')) {
              clearHistory();
              setHistory([]);
            }
          }}
        >
          حذف السجل
        </button>
      )}
    </Sheet>
  );
}

export function TafsirSheet({ title, text, source, onClose }: Close & { title: string; text: string | null; source: string }) {
  return (
    <Sheet title={title} onClose={onClose}>
      {text === null ? <p className="muted">جارٍ التحميل…</p> : <p className="tafsir">{text}</p>}
      <small className="muted">المصدر: {source}</small>
    </Sheet>
  );
}

export function HelpSheet({ onClose }: Close) {
  return (
    <Sheet title="كيف أستعمله؟" onClose={onClose}>
      <ol className="guide">
        <li>
          اختر <b>الرواية</b> (ورش افتراضياً) وما ستقرأ: <b>سورة</b> أو <b>جزء</b> أو <b>من أي موضع</b>.
        </li>
        <li>
          اضغط <b>الدائرة</b> واسمح بالميكروفون، ثم اقرأ من حفظك. يسكت الشيخ ما دمت مصيباً، وتظهر الكلمات كلما قرأتها.
        </li>
        <li>
          إذا أخطأت قال لك <b>«أعِد»</b> بصوت خافت: أعد الكلمة أو الآية وتابع.
        </li>
        <li>
          إذا سكتَّ بضع ثوانٍ أو قلت <b>«افتح»</b>، فتح عليك بالكلمات التالية إلى أقرب وقف.
        </li>
      </ol>
      <h3>كلمات تقولها</h3>
      <ul className="commands">
        <li>
          <b>سأقرأ سورة الملك</b> ينقلك إلى السورة
        </li>
        <li>
          <b>افتح</b> الكلمات التالية
        </li>
        <li>
          <b>اختبرني</b> أسئلة من المقطع المختار
        </li>
        <li>
          <b>أسمعني</b> تلاوة مسجلة من موضعك، و<b>حسبك</b> لإيقافها
        </li>
        <li>
          <b>ما معنى الآية؟</b> التفسير الميسر أو الجلالين
        </li>
        <li>
          <b>الله أكبر</b> وضع الصلاة (شاشة مظلمة، فتح بعد ٣٫٥ ثوانٍ)، و<b>السلام عليكم</b> لإنهائه
        </li>
      </ul>
      <h3>الشيخ الحي</h3>
      <p>
        إذا أدخلت مفتاح Gemini (مجاني) في الإعدادات صار الشيخ يحاورك بصوته: تقول له ما ستقرأ، فيأخذ نص المصحف من التطبيق ويسمعك،
        ويسكت ما دمت مصيباً، ويقول «أعِد» عند الخطأ، ويفتح عليك بالكلمات المطبوعة، ويختبرك ويجيب عن أسئلتك. ما تقرؤه وما يقرؤه من
        القرآن يُعرض بخط المصحف كما هو في روايتك.
      </p>
      <h3>ملاحظات</h3>
      <p className="muted">
        بلا مفتاح، يعتمد التسميع على خدمة التعرف على الكلام في المتصفح (Chrome أو Edge أو Safari). في Chrome يُرسَل الصوت إلى خوادم Google
        لتحويله إلى نص، ولا يحفظه التطبيق. السجل والإعدادات تبقى على جهازك. التعرف على الكلام يميل إلى رواية حفص، لذا يقبل التطبيق
        لفظ حفص في مواضع الفرش، ولا يحكم على الأصول (الإمالة، التسهيل…).
      </p>
      <p className="muted">ثبّته على الشاشة الرئيسية من قائمة المتصفح ليعمل كتطبيق.</p>
    </Sheet>
  );
}
