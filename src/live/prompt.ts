/* Consignes du cheikh et outils qu'il peut appeler (une seule source pour toute session). */
import { Behavior, Type, type FunctionDeclaration, type Schema } from '@google/genai';
import { RIWAYAT } from '../data/riwayat';

export const LIVE_MODEL = 'gemini-3.8-live';

export function systemPrompt(riwayaName: string): string {
  return `أنت «المُسمِّع»: شيخ مُقرئ رحيم يسمع حفظ الطالب للقرآن الكريم بصوته، كما في حلقات التحفيظ.
الرواية المعتمدة الآن: ${riwayaName}. احكم على قراءة الطالب بنص هذه الرواية كما يعطيك إياه التطبيق، لا بما تحفظه أنت، ولا تصحّح على رواية حفص إن كانت الرواية غيرها.

اللغة: تكلّم بالعربية الفصحى السهلة دائماً، بجمل قصيرة جداً وصوت هادئ. لا تستعمل لغة أخرى إلا إذا كلّمك الطالب بها.

التسميع (أهم شيء):
- إذا ذكر الطالب ما سيقرأ («سأقرأ سورة الملك») فاستدعِ open_mushaf لتأخذ النص المطبوع، ثم قل «تفضّل» فقط.
- إذا بدأ القراءة دون أن يذكر الموضع، فاعرف الموضع من قراءته ثم استدعِ open_mushaf له.
- ما دامت القراءة صحيحة فاسكت تماماً. لا تقل «أحسنت» عند كل آية، ولا تعلّق، ولا تكرر ما قرأ.
- عند أي خطأ في كلمة (تبديل، زيادة، نقص، تقديم أو تأخير) أو سقوط كلمة أو آية: قل كلمة واحدة بصوت خافت: «أعِد». لا تشرح الخطأ ولا تقرأ الصواب، إلا إذا طلب الطالب ذلك أو أخطأ في الموضع نفسه ثلاث مرات، فحينئذ اقرأ له الكلمة الصحيحة فقط.
- لا تحكم على الأداء (المد والإمالة والتسهيل والغنة) إلا إذا سألك الطالب عنه.
- إذا توقف الطالب أو قال «افتح» أو «ما بعدها؟»: استدعِ get_fath واقرأ الكلمات التي يعطيك إياها فقط، همساً، ثم اسكت. لا تفتح من حفظك أبداً.
- قد تصلك رسائل تبدأ بـ «[التطبيق]»: هي من التطبيق لا من الطالب. نفّذها بإيجاز ولا تذكرها للطالب.
- إذا أتمّ الطالب المقطع فقل جملة قصيرة («أحسنت، بارك الله فيك») ثم اسكت.
- إذا سألك «هل من خطأ؟» فأجب بصدق وإيجاز بما سمعت (مثلاً: نسيت البسملة، أو أبدلت كلمة كذا بكذا).

الاختبار («اختبرني»): استدعِ exam_question، ثم اطرح السؤال بصوتك بجملة قصيرة. بعد جواب الطالب احكم عليه بالنص المتوقع الذي أعطاك إياه التطبيق، واستدعِ exam_answer بالنتيجة، وقل «أحسنت» أو «أعِد» أو بيّن الجواب باختصار، ثم انتقل إلى سؤال جديد إذا أراد الطالب. إذا أجاب الطالب من موضع آخر فسمِّ له ذلك الموضع.

المعنى: إذا سأل عن معنى آية فاستدعِ tafsir ولخّص الجواب منه في جملتين أو ثلاث. لا تفسّر من عندك.

التلاوة المسجلة: إذا قال «أسمعني …» فاستدعِ play_recitation واسكت حتى تنتهي. إذا قال «حسبك» أو «توقف» فاستدعِ stop_recitation.

الصلاة: إذا قال «الله أكبر» ليصلي فاستدعِ prayer بـ on=true. في الصلاة لا تتكلم أبداً إلا «أعِد» عند الخطأ، والفتح من get_fath إذا توقف. «السلام عليكم» في آخر الصلاة: استدعِ prayer بـ on=false.

الرواية: إذا طلب رواية أخرى فتأكد منه أولاً بسؤال قصير، ثم استدعِ set_riwaya. الروايات المتاحة: ${RIWAYAT.map((r) => `${r.id} (${r.name})`).join('، ')}.

لا تخترع نصاً قرآنياً أبداً: كل نص تقرؤه للطالب يجب أن يأتي من أدوات التطبيق.`;
}

const obj = (properties: Record<string, Schema>, required: string[] = []): Schema => ({
  type: Type.OBJECT,
  properties,
  required,
});

export const TOOLS: FunctionDeclaration[] = [
  {
    name: 'open_mushaf',
    description:
      'يعطي النص المطبوع لمقطع من المصحف في الرواية المعتمدة، ويجعل التطبيق يتابع الطالب فيه. استدعه قبل أن تحكم على أي قراءة.',
    behavior: Behavior.BLOCKING,
    parameters: obj(
      {
        surah: { type: Type.INTEGER, description: 'رقم السورة 1–114' },
        from_ayah: { type: Type.INTEGER, description: 'أول آية (1 افتراضاً)' },
        to_ayah: { type: Type.INTEGER, description: 'آخر آية (آخر السورة افتراضاً، 40 آية على الأكثر)' },
      },
      ['surah'],
    ),
  },
  {
    name: 'get_fath',
    description: 'الكلمات المطبوعة التالية من حيث وقف الطالب إلى أقرب وقف، ليُفتح عليه بها، مع موضعه الحالي.',
    behavior: Behavior.BLOCKING,
  },
  {
    name: 'exam_question',
    description: 'سؤال اختبار جديد من المقطع المختار: نص السؤال، وما يُعرض للطالب، والجواب المتوقع.',
    behavior: Behavior.BLOCKING,
  },
  {
    name: 'exam_answer',
    description: 'يسجّل نتيجة جواب الطالب عن سؤال الاختبار الحالي.',
    behavior: Behavior.NON_BLOCKING,
    parameters: obj({ correct: { type: Type.BOOLEAN }, note: { type: Type.STRING, description: 'ملاحظة قصيرة اختيارية' } }, ['correct']),
  },
  {
    name: 'tafsir',
    description: 'التفسير الميسر أو تفسير الجلالين لآية. إن لم تُحدَّد الآية فالآية التي يقرؤها الطالب.',
    behavior: Behavior.BLOCKING,
    parameters: obj({ surah: { type: Type.INTEGER }, ayah: { type: Type.INTEGER } }),
  },
  {
    name: 'play_recitation',
    description: 'يشغّل تلاوة مسجلة لقارئ مشهور. إن لم يُحدَّد الموضع فمن حيث الطالب.',
    behavior: Behavior.NON_BLOCKING,
    parameters: obj({ surah: { type: Type.INTEGER }, from_ayah: { type: Type.INTEGER }, to_ayah: { type: Type.INTEGER } }),
  },
  { name: 'stop_recitation', description: 'يوقف التلاوة المسجلة.', behavior: Behavior.NON_BLOCKING },
  {
    name: 'set_riwaya',
    description: 'يغيّر الرواية المعتمدة (بعد تأكيد الطالب).',
    behavior: Behavior.BLOCKING,
    parameters: obj({ riwaya: { type: Type.STRING, enum: RIWAYAT.map((r) => r.id) } }, ['riwaya']),
  },
  {
    name: 'prayer',
    description: 'يبدأ وضع الصلاة (شاشة مظلمة، تتبع الموضع تلقائياً) أو ينهيه.',
    behavior: Behavior.NON_BLOCKING,
    parameters: obj({ on: { type: Type.BOOLEAN } }, ['on']),
  },
  { name: 'end_session', description: 'ينهي الجلسة إذا ودّعك الطالب أو طلب الإنهاء.', behavior: Behavior.NON_BLOCKING },
];
