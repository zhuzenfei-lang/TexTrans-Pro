import type { TermEntry } from '../types.ts';

// Comprehensive apparel technical terms database
export const APPAREL_DICTIONARY: TermEntry[] = [
  // POM - Point of Measure (部位尺寸与测量点)
  { en: '1/2 CHEST WIDTH', zh: '1/2胸围', category: 'pom', notes: '腋下2.5cm处水平量' },
  { en: 'CHEST WIDTH', zh: '胸围宽', category: 'pom' },
  { en: '1/2 WAIST WIDTH', zh: '1/2腰围', category: 'pom' },
  { en: 'WAIST WIDTH', zh: '腰围宽', category: 'pom' },
  { en: '1/2 HIP WIDTH', zh: '1/2臀围/坐围', category: 'pom' },
  { en: 'HIP WIDTH', zh: '臀围/坐围', category: 'pom' },
  { en: '1/2 BOTTOM SWEEP', zh: '1/2下摆围', category: 'pom' },
  { en: 'BOTTOM OPENING', zh: '下摆开口/脚口', category: 'pom' },
  { en: 'BODY LENGTH FROM HPS', zh: '后领肩点起量身长', category: 'pom', notes: 'High Point Shoulder' },
  { en: 'TOTAL LENGTH FROM HPS', zh: '后领肩点起总身长', category: 'pom' },
  { en: 'CB BODY LENGTH', zh: '后中身长', category: 'pom', notes: 'Center Back' },
  { en: 'CF BODY LENGTH', zh: '前中身长', category: 'pom', notes: 'Center Front' },
  { en: 'ACROSS SHOULDER', zh: '总肩宽/跨肩宽', category: 'pom' },
  { en: 'SHOULDER DROP', zh: '落肩量/肩斜', category: 'pom' },
  { en: 'ACROSS FRONT', zh: '前胸宽', category: 'pom' },
  { en: 'ACROSS BACK', zh: '后背宽', category: 'pom' },
  { en: 'ARMHOLE STRAIGHT', zh: '直夹圈/直量袖窿', category: 'pom' },
  { en: 'ARMHOLE CURVED', zh: '顺弯夹圈/顺弧袖窿', category: 'pom' },
  { en: 'SLEEVE LENGTH FROM CB', zh: '后中量袖长', category: 'pom' },
  { en: 'SLEEVE LENGTH FROM SHOULDER', zh: '肩点量袖长', category: 'pom' },
  { en: 'BICEP WIDTH', zh: '袖肥/袖臂宽', category: 'pom', notes: '夹圈下量' },
  { en: 'ELBOW WIDTH', zh: '肘宽', category: 'pom' },
  { en: 'SLEEVE OPENING', zh: '袖口宽/袖口开口', category: 'pom' },
  { en: 'CUFF OPENING', zh: '袖口开度', category: 'pom' },
  { en: 'CUFF HEIGHT', zh: '袖口罗纹高', category: 'pom' },
  { en: 'BOTTOM RIB HEIGHT', zh: '下摆罗纹高', category: 'pom' },
  { en: 'NECK WIDTH', zh: '领宽', category: 'pom' },
  { en: 'FRONT NECK DROP', zh: '前领深/前领落', category: 'pom' },
  { en: 'BACK NECK DROP', zh: '后领深/后领落', category: 'pom' },
  { en: 'COLLAR HEIGHT', zh: '领高', category: 'pom' },
  { en: 'HOOD HEIGHT', zh: '帽高', category: 'pom' },
  { en: 'HOOD WIDTH', zh: '帽宽', category: 'pom' },
  { en: 'HOOD OPENING', zh: '帽口开度', category: 'pom' },
  { en: 'KANGAROO POCKET WIDTH', zh: '袋鼠兜宽', category: 'pom' },
  { en: 'KANGAROO POCKET HEIGHT', zh: '袋鼠兜高', category: 'pom' },
  { en: 'INSEAM LENGTH', zh: '内长/内浪长', category: 'pom' },
  { en: 'OUTSEAM LENGTH', zh: '外长/侧缝长', category: 'pom' },
  { en: 'FRONT RISE', zh: '前浪/前档', category: 'pom' },
  { en: 'BACK RISE', zh: '后浪/后档', category: 'pom' },
  { en: '1/2 THIGH WIDTH', zh: '1/2大腿围', category: 'pom' },
  { en: '1/2 KNEE WIDTH', zh: '1/2膝围', category: 'pom' },
  { en: '1/2 LEG OPENING', zh: '1/2脚口/裤口宽', category: 'pom' },
  { en: 'WAISTBAND HEIGHT', zh: '腰头高', category: 'pom' },
  { en: 'ZIPPER LENGTH', zh: '拉链长', category: 'pom' },

  // Fabric & Materials (面料与材料)
  { en: 'FRENCH TERRY', zh: '毛圈布/卫衣布', category: 'fabric' },
  { en: 'SINGLE JERSEY', zh: '单面汗布', category: 'fabric' },
  { en: '100% COMBED COTTON', zh: '100%精梳棉', category: 'fabric' },
  { en: 'FLEECE', zh: '摇粒绒/抓绒布', category: 'fabric' },
  { en: '2X2 RIB', zh: '2x2罗纹', category: 'fabric' },
  { en: '1X1 RIB', zh: '1x1罗纹', category: 'fabric' },
  { en: 'INTERLOCK', zh: '双面布', category: 'fabric' },
  { en: 'PIQUE', zh: '珠地网眼布', category: 'fabric' },
  { en: 'DENIM', zh: '牛仔布', category: 'fabric' },
  { en: 'TWILL', zh: '斜纹布', category: 'fabric' },
  { en: 'CANVAS', zh: '帆布', category: 'fabric' },
  { en: 'POPLIN', zh: '府绸', category: 'fabric' },
  { en: 'SHERPA', zh: '羊羔绒', category: 'fabric' },
  { en: 'RIPSTOP', zh: '抗撕裂格子布', category: 'fabric' },
  { en: 'POLYESTER', zh: '聚酯纤维/涤纶', category: 'fabric' },
  { en: 'SPANDEX', zh: '氨纶/弹性纤维', category: 'fabric' },
  { en: 'ELASTANE', zh: '氨纶', category: 'fabric' },
  { en: 'VISCOSE', zh: '粘胶纤维/人棉', category: 'fabric' },
  { en: 'LINEN', zh: '亚麻', category: 'fabric' },
  { en: 'SELF FABRIC', zh: '本布/同身面料', category: 'fabric' },
  { en: 'CONTRAST FABRIC', zh: '撞色/配拼面料', category: 'fabric' },
  { en: 'POCKET LINING', zh: '口袋布/里布', category: 'fabric' },
  { en: 'INTERLINING', zh: '粘合衬/衬布', category: 'fabric' },
  { en: 'DWR FINISH', zh: 'DWR防泼水后整理', category: 'fabric' },
  { en: 'ENZYME WASH', zh: '酵素洗水', category: 'fabric' },
  { en: 'SILICONE WASH', zh: '硅油柔顺洗', category: 'fabric' },
  { en: 'GARMENT DYE', zh: '成衣染色', category: 'fabric' },

  // Sewing, Stitching & Construction (车缝工艺与结构标注)
  { en: '1/4" DTM TOPSTITCH', zh: '1/4英寸同色压明线', category: 'sewing' },
  { en: 'DTM', zh: '定染配身色', category: 'sewing', notes: 'Dye To Match' },
  { en: '4-THREAD OVERLOCK', zh: '四线包缝/拷边', category: 'sewing' },
  { en: '3-THREAD OVERLOCK', zh: '三线包缝', category: 'sewing' },
  { en: 'FLATLOCK STITCHING', zh: '四针六线/平缝拼缝', category: 'sewing' },
  { en: 'COVERSTITCH', zh: '冚针/绷缝', category: 'sewing' },
  { en: 'SINGLE NEEDLE STITCH', zh: '单针平缝', category: 'sewing' },
  { en: 'DOUBLE NEEDLE TOPSTITCH', zh: '双针压明线', category: 'sewing' },
  { en: 'REINFORCED BARTACK', zh: '加固套结/打枣', category: 'sewing' },
  { en: 'BARTACK AT POCKET CORNER', zh: '口袋转角打枣加固', category: 'sewing' },
  { en: 'CLEAN FINISHED OPENING', zh: '净边折光做口', category: 'sewing' },
  { en: 'RAW EDGE', zh: '毛边/原边', category: 'sewing' },
  { en: 'FRENCH SEAM', zh: '法式包缝/来去缝', category: 'sewing' },
  { en: 'HERRINGBONE TAPE', zh: '人字纹织带', category: 'sewing' },
  { en: 'HERRINGBONE TAPE AT INSIDE BACK NECK', zh: '后领内压人字织带加固', category: 'sewing' },
  { en: 'CLEAN FINISH WITH BINDING', zh: '滚条包边净口', category: 'sewing' },
  { en: 'SEAM ALLOWANCE', zh: '缝份/缝头', category: 'sewing' },
  { en: '1CM SEAM ALLOWANCE', zh: '1cm缝份', category: 'sewing' },
  { en: 'BLIND HEM', zh: '暗线挑脚/挑边', category: 'sewing' },
  { en: 'EDGE STITCH', zh: '止口线/落坑线', category: 'sewing' },
  { en: 'CHAIN STITCH', zh: '链式线迹', category: 'sewing' },
  { en: 'CROSS STITCH', zh: '十字针', category: 'sewing' },
  { en: 'GATHERING', zh: '打褶/抽褶', category: 'sewing' },
  { en: 'PLEAT', zh: '压褶/褶裥', category: 'sewing' },
  { en: 'FUSIBLE TAPE AT SHOULDER', zh: '肩缝嵌条防拉伸', category: 'sewing' },

  // Trims & Hardware (辅料与五金配件)
  { en: 'METAL EYELET', zh: '金属汽眼/鸡眼', category: 'trim' },
  { en: 'ROUND DRAWCORD', zh: '圆抽绳/帽绳', category: 'trim' },
  { en: 'FLAT DRAWCORD', zh: '扁平抽绳', category: 'trim' },
  { en: 'METAL AGLET', zh: '金属绳头/金属枪头', category: 'trim' },
  { en: 'DRAWCORD WITH METAL AGLET', zh: '配金属绳头帽绳', category: 'trim' },
  { en: 'YKK #5 VISLON ZIPPER', zh: 'YKK 5号树脂拉链', category: 'trim' },
  { en: 'CONCEALED ZIPPER', zh: '隐形拉链', category: 'trim' },
  { en: 'METAL SNAP BUTTON', zh: '金属四合扣', category: 'trim' },
  { en: 'HORN BUTTON', zh: '牛角扣/树脂钮扣', category: 'trim' },
  { en: 'ELASTIC BAND', zh: '松紧带/橡筋', category: 'trim' },
  { en: 'WOVEN MAIN LABEL', zh: '织唛主标', category: 'trim' },
  { en: 'PRINTED CARE LABEL', zh: '印唛洗水标', category: 'trim' },
  { en: 'HEAT SEAL LABEL', zh: '热转印无感烫唛', category: 'trim' },
  { en: 'SIZE LABEL', zh: '尺码标', category: 'trim' },
  { en: 'HANGTAG', zh: '吊牌', category: 'trim' },
  { en: 'POLYBAG', zh: '胶袋/包装袋', category: 'trim' },
  { en: 'BARCODE STICKER', zh: '条形码贴纸', category: 'trim' },

  // Graphics & Prints (印绣花与图案)
  { en: 'SCREEN PRINT', zh: '丝网印花', category: 'trim' },
  { en: 'PUFF PRINT', zh: '发泡印花', category: 'trim' },
  { en: 'HIGH DENSITY PRINT', zh: '厚板印花', category: 'trim' },
  { en: 'RUBBER PRINT', zh: '胶浆印花', category: 'trim' },
  { en: 'WATERBASE PRINT', zh: '水浆印花', category: 'trim' },
  { en: 'HEAT TRANSFER PRINT', zh: '热转移印花', category: 'trim' },
  { en: 'DIRECT EMBROIDERY', zh: '平绣/直绣', category: 'trim' },
  { en: '3D EMBROIDERY', zh: '立体绣/立线绣', category: 'trim' },
  { en: 'CHEST PRINT PLACEMENT', zh: '胸前印花定位', category: 'trim' },
  { en: 'PRINT PLACEMENT 10CM DOWN FROM HPS', zh: '印花距肩顶10cm处定位', category: 'trim' },

  // Quality, Tolerances & Comments (品质、公差与客评)
  { en: 'TOLERANCE', zh: '公差/容差', category: 'defect' },
  { en: 'GRADE RULE', zh: '放码档差规则', category: 'defect' },
  { en: 'PUCKERING', zh: '起皱/抽褶不平', category: 'defect' },
  { en: 'SKIP STITCH', zh: '跳针', category: 'defect' },
  { en: 'UNEVEN STITCH', zh: '针距不匀', category: 'defect' },
  { en: 'COLOR SHADING', zh: '色差/阴阳色', category: 'defect' },
  { en: 'CROOKED SEAM', zh: '缝线歪斜', category: 'defect' },
  { en: 'RAW THREAD END', zh: '线头未剪净', category: 'defect' },
  { en: 'NEEDLE HOLE', zh: '针眼/破洞', category: 'defect' },
  { en: 'SAMPLE APPROVAL', zh: '样板批复/确认', category: 'defect' },
  { en: 'FIT COMMENTS', zh: '试穿批语/改板意见', category: 'defect' },
  { en: 'SIZE RUN', zh: '全套尺码范围', category: 'defect' }
];

// Common Garment Abbreviations map
export const GARMENT_ABBREVIATIONS: Record<string, string> = {
  'HPS': 'High Point Shoulder (后领肩顶最高点)',
  'CB': 'Center Back (后中)',
  'CF': 'Center Front (前中)',
  'SS': 'Side Seam (侧缝)',
  'POM': 'Point of Measure (测量部位)',
  'DTM': 'Dye To Match (定染同色/配身色)',
  'WB': 'Waistband (腰头)',
  'AH': 'Armhole (夹圈/袖窿)',
  'BK': 'Back (后身)',
  'FR': 'Front (前身)',
  'SLV': 'Sleeve (袖子)',
  'TOL': 'Tolerance (公差)',
  'SPEC': 'Specification (尺寸规格表)',
  'BOM': 'Bill of Materials (材料用料清单)',
  'G/W': 'Garment Wash (成衣水洗)',
  'S/A': 'Seam Allowance (缝头缝份)',
  'DN': 'Double Needle (双针)',
  'SN': 'Single Needle (单针)',
  'FL': 'Flatlock (四针六线/平缝)'
};

// Keywords indicating key apparel points of measure or garment construction descriptions
export const APPAREL_DESCRIPTION_KEYWORDS = [
  'CHEST', 'WAIST', 'HIP', 'LENGTH', 'HPS', 'SHOULDER', 'ARMHOLE', 'SLEEVE',
  'BICEP', 'ELBOW', 'CUFF', 'NECK', 'COLLAR', 'HOOD', 'SWEEP', 'BOTTOM',
  'HEM', 'INSEAM', 'OUTSEAM', 'RISE', 'THIGH', 'KNEE', 'OPENING', 'POCKET',
  'WAISTBAND', 'ZIPPER', 'FLY', 'STRAP', 'YOKE', 'PLACKET', 'SEAM', 'STITCH',
  'FRONT', 'BACK', 'DROP', 'ACROSS', 'WIDTH', 'HEIGHT', 'DEPTH', 'SPREAD',
  'CROTCH', 'LEG', 'GUSSET', 'BAND', 'DRAWCORD', 'RIB', 'VENT', 'SLIT',
  'FLAP', 'PATCH', 'WELT', 'PLEAT', 'DART', 'OVERLOCK', 'BARTACK',
  'FLATLOCK', 'COVERSTITCH', 'FABRIC', 'MATERIAL', 'LABEL', 'WASH',
  'FIT', 'STYLE', 'DESCRIPTION', 'DETAIL', 'SPEC', 'POINT', 'MEASURE',
  'SLEEVELESS', 'TURTLENECK', 'RAGLAN', 'SET-IN', 'BODY', 'SLOPE', 'INSERT'
];

/**
 * Filter out measurement numbers, sample measurements, tolerances, sizes, codes and coordinates
 * so that all numbers and tolerances are displayed in original text without translation overlay,
 * while garment points of measure (POM descriptions) are strictly translated into Chinese.
 */
export function isPureMetricOrNumeric(text: string): boolean {
  const clean = text.trim();
  if (!clean) return true;
  const upper = clean.toUpperCase();

  // CRITICAL: If the phrase contains any garment anatomical or construction description words,
  // it is a POM / Spec Description (e.g. "1/2 CHEST WIDTH", "1/4\" DTM TOPSTITCH", "BODY LENGTH FROM HPS"),
  // and MUST NOT be treated as a pure number! It must be translated.
  if (APPAREL_DESCRIPTION_KEYWORDS.some(kw => upper.includes(kw))) {
    return false;
  }

  // 1. Pure tolerance tokens and inspection table headers (e.g. '+/- 0.5', '+/- 0,5', '+0.5/-0.5', '±0.5', '±0,5', 'Diff.', 'IST', 'SOLL', 'TOL', '[Werte]')
  if (/^(\+\/-|\±|\+\s*\/\s*-|[+-]\s*\/?[+-]?)\s*(\d+([.,]\d+)?|\d+\/\d+)?\s*(cm|mm|in|"|'|inch)?$/i.test(clean)) return true;
  if (/^\+\s*\d+([.,]\d+)?\s*\/\s*-\s*\d+([.,]\d+)?\s*(cm|mm|in|"|')?$/i.test(clean)) return true; // +0.5 / -0.5, +0,5 / -0,5
  if (/^(TOL|TOL\.|TOLERANCE|公差|DIFF|DIFF\.|DELTA|DEV|DEVIATION|ACTUAL|ACT|IST|SOLL|BASE|GRADE|GRADING|WERTE|\[WERTE\]|\(WERTE\))(\s*\([+-/]+\))?$/i.test(clean)) return true;

  // 2. Pure digits, decimals (both dot and comma, e.g. '61.5' or '61,5'), fractions, mixed numbers, ranges
  // e.g. '54', '54.0', '56,5', '61,5', '-0,5', '+1,0', '1/2', '3/8', '1 1/2', '2 1/4', '54-56', '54~56', '54/56'
  if (/^[+-]?\s*(\d+([.,]\d+)?|\d+\/\d+|\d+\s+\d+\/\d+)(\s*[-~至/]\s*(\d+([.,]\d+)?|\d+\/\d+|\d+\s+\d+\/\d+))?\s*(cm|mm|inch|in|"|'|gsm|%|oz)?$/i.test(clean)) return true;

  // 3. Multi-number lines in spec charts (e.g. '47,5 47,0 -0,5 49,0 47,5 -1,5' or '48.0  50.0  52.0' or '63,0 63,0 0,0')
  if (/^([+-]?\d+([.,]\d+)?(\/\d+)?\s*)+$/.test(clean)) return true;

  // 4. Pure size tokens (e.g. 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL', 'OS', 'ONE SIZE', 'STD')
  if (/^(XXS|XS|S|M|L|XL|XXL|2XL|3XL|4XL|5XL|6XL|7XL|0X|1X|2X|3X|4X|OS|O\/S|ONE\s*SIZE|FREE\s*SIZE|STD|STANDARD)$/i.test(clean)) return true;
  if (/^(SIZE|SZ|尺码)?\s*[:：]?\s*(XXS|XS|S|M|L|XL|XXL|2XL|3XL|4XL|5XL|6XL|OS|\d{1,2})$/i.test(clean)) return true;

  // 5. Spec table indexes, item numbers, codes (e.g. 'A1', 'B', 'C1', 'D3', 'I1', 'I2', 'O3', 'O1', 'Y1', 'L1', 'L', 'POM-01', 'P01', '-')
  if (/^(POM[-_\s#]*\d+|P[-_]?\d+|[A-Z]{1,3}\d{0,3}\.?|\d+\.?|NO\.?|CODE|ITEM|REF\.?|-+|--)$/i.test(clean)) return true;

  // 6. Dates and sheet metadata (e.g. '2024-05-12', 'PAGE 1 OF 3', 'REV 1', '0002369', '301019')
  if (/^(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})$/.test(clean)) return true;
  if (/^(PAGE\s*\d+(\s*OF\s*\d+)?|REV(?:ISION)?\s*[\w.-]+)$/i.test(clean)) return true;
  if (/^\d{4,8}$/.test(clean)) return true; // Style code numbers like 0002369 or 301019

  return false;
}

/**
 * Common tech pack header tokens
 */
const TECH_PACK_HEADERS: Array<[RegExp, string]> = [
  [/STYLE\s*(?:NO|NUMBER)?\s*[:：]/i, '款号: '],
  [/SEASON\s*[:：]/i, '季度: '],
  [/SPRING\s*(\d{4})?/i, '春季$1 '],
  [/SUMMER\s*(\d{4})?/i, '夏季$1 '],
  [/AUTUMN\s*(\d{4})?/i, '秋季$1 '],
  [/FALL\s*(\d{4})?/i, '秋季$1 '],
  [/WINTER\s*(\d{4})?/i, '冬季$1 '],
  [/FABRIC\s*[:：]/i, '面料: '],
  [/SHELL\s*[:：]/i, '大身面料: '],
  [/LINING\s*[:：]/i, '里料: '],
  [/RIB\s*[:：]/i, '罗纹: '],
  [/FIT\s*[:：]/i, '版型: '],
  [/COLOR(?:WAY)?\s*[:：]/i, '颜色/配色: '],
  [/SAMPLE\s*SIZE\s*[:：]/i, '样衣尺码: '],
  [/DATE\s*[:：]/i, '日期: '],
  [/VENDOR\s*[:：]/i, '供应商: '],
  [/FACTORY\s*[:：]/i, '工厂: '],
  [/DIVISION\s*[:：]/i, '产品线/部门: '],
  [/TOLERANCE\s*[:：]/i, '公差: '],
  [/COMMENTS?\s*[:：]/i, '工艺批注: '],
  [/APPROVAL\s*[:：]/i, '核准状态: '],
  [/REVISION\s*[:：]/i, '修订版本: ']
];

/**
 * Smart lookup in apparel dictionary with multi-token decomposition
 */
export function lookupApparelTerm(englishText: string): string | null {
  const trimmed = englishText.trim();
  if (!trimmed) return null;
  const normalized = trimmed.toUpperCase().replace(/\s+/g, ' ');

  // 1. Direct exact dictionary match
  const exact = APPAREL_DICTIONARY.find(item => item.en.toUpperCase() === normalized);
  if (exact) return exact.zh;

  // 2. Common phrase heuristic rules
  if (/^(\d+\/\d+)\s+CHEST\s+WIDTH/i.test(normalized)) return '1/2胸围';
  if (/^(\d+\/\d+)\s+WAIST\s+WIDTH/i.test(normalized)) return '1/2腰围';
  if (/^(\d+\/\d+)\s+HIP/i.test(normalized)) return '1/2臀围';
  if (/^(\d+\/\d+)\s+BOTTOM/i.test(normalized)) return '1/2下摆围';
  if (/^(\d+\/\d+)\s+THIGH/i.test(normalized)) return '1/2大腿围';
  if (/^(\d+\/\d+)\s+KNEE/i.test(normalized)) return '1/2膝围';
  if (/^(\d+\/\d+)\s+LEG\s+OPENING/i.test(normalized)) return '1/2脚口宽';
  if (/BODY\s+LENGTH.*HPS/i.test(normalized)) return '后领肩点起身长';
  if (/TOTAL\s+LENGTH.*HPS/i.test(normalized)) return '后领肩点起总身长';
  if (/CB\s*(?:BODY)?\s*LENGTH/i.test(normalized)) return '后中身长';
  if (/CF\s*(?:BODY)?\s*LENGTH/i.test(normalized)) return '前中身长';

  // 3. Multi-token sequential replacement across composite strings
  let compositeResult = trimmed;
  let hasReplaced = false;

  // Replace header prefixes
  for (const [pattern, repl] of TECH_PACK_HEADERS) {
    if (pattern.test(compositeResult)) {
      compositeResult = compositeResult.replace(pattern, repl);
      hasReplaced = true;
    }
  }

  // Sort dictionary by length descending so longer phrases match first
  const sortedDict = [...APPAREL_DICTIONARY].sort((a, b) => b.en.length - a.en.length);
  for (const item of sortedDict) {
    if (item.en.length >= 4) {
      const reg = new RegExp(`\\b${item.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (reg.test(compositeResult)) {
        compositeResult = compositeResult.replace(reg, item.zh);
        hasReplaced = true;
      }
    }
  }

  if (hasReplaced && compositeResult !== trimmed) {
    return compositeResult;
  }

  return null;
}

