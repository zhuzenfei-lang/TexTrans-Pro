import type { TextBlock, ExcelSheetData } from './types.ts';

export interface TechPackSample {
  id: string;
  name: string;
  category: string;
  description: string;
  width: number;
  height: number;
  blocks: TextBlock[];
  cadSvg: string;
}

// Built-in Sample 1: Pullover Hoodie Tech Pack (with vector CAD sketch & callout lines)
export const HOODIE_TECH_PACK_SAMPLE: TechPackSample = {
  id: 'hoodie-techpack',
  name: '450G 重磅连帽卫衣工艺单 (Heavyweight Hoodie Tech Pack)',
  category: 'Hoodies & Sweatshirts',
  description: '含前后款式图、车缝针法标注、袋鼠兜工艺及发泡印花定位',
  width: 792,
  height: 612,
  cadSvg: `
    <!-- Background grid -->
    <defs>
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" stroke-width="0.8"/>
      </pattern>
      <marker id="dot" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4">
        <circle cx="5" cy="5" r="4" fill="#0038b8"/>
      </marker>
    </defs>
    <rect width="792" height="612" fill="#fafafa"/>
    <rect width="792" height="612" fill="url(#grid)"/>

    <!-- Document Header Border -->
    <rect x="24" y="20" width="744" height="60" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2" rx="4"/>
    <line x1="24" y1="80" x2="768" y2="80" stroke="#0038b8" stroke-width="2.5"/>

    <!-- Left CAD Box (Front View) -->
    <rect x="24" y="94" width="460" height="494" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" rx="4"/>
    
    <!-- Right Spec & Details Box -->
    <rect x="496" y="94" width="272" height="494" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" rx="4"/>

    <!-- Garment Vector Drawing: Hoodie Front -->
    <g transform="translate(70, 140) scale(0.65)" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="#f8fafc">
      <!-- Hood -->
      <path d="M 170 120 C 140 60, 180 10, 250 10 C 320 10, 360 60, 330 120 Z" fill="#e2e8f0"/>
      <path d="M 210 120 C 190 70, 220 30, 250 30 C 280 30, 310 70, 290 120 Z" fill="#cbd5e1"/>
      <path d="M 250 10 L 250 120" stroke="#475569" stroke-width="1.4" stroke-dasharray="3,3"/>
      
      <!-- Body outline -->
      <path d="M 170 120 L 100 180 L 120 340 L 160 330 L 180 230 L 180 430 L 320 430 L 320 230 L 340 330 L 380 340 L 400 180 L 330 120 C 310 135, 190 135, 170 120 Z"/>
      
      <!-- Raglan/Shoulder Seams -->
      <path d="M 170 120 L 180 230" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4,2"/>
      <path d="M 330 120 L 320 230" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4,2"/>
      
      <!-- Kangaroo Pocket -->
      <path d="M 200 320 L 300 320 L 310 390 L 190 390 Z" fill="#f1f5f9"/>
      <line x1="200" y1="320" x2="190" y2="390" stroke="#0038b8" stroke-width="1.8"/>
      <line x1="300" y1="320" x2="310" y2="390" stroke="#0038b8" stroke-width="1.8"/>
      <line x1="197" y1="320" x2="203" y2="320" stroke="#dc2626" stroke-width="3"/>
      <line x1="297" y1="320" x2="303" y2="320" stroke="#dc2626" stroke-width="3"/>
      
      <!-- Cuffs & Bottom Rib -->
      <rect x="120" y="340" width="40" height="25" fill="#e2e8f0"/>
      <rect x="340" y="340" width="40" height="25" fill="#e2e8f0"/>
      <rect x="180" y="430" width="140" height="35" fill="#e2e8f0"/>
      
      <!-- Rib lines -->
      <line x1="190" y1="430" x2="190" y2="465" stroke="#94a3b8" stroke-width="1"/>
      <line x1="210" y1="430" x2="210" y2="465" stroke="#94a3b8" stroke-width="1"/>
      <line x1="230" y1="430" x2="230" y2="465" stroke="#94a3b8" stroke-width="1"/>
      <line x1="250" y1="430" x2="250" y2="465" stroke="#94a3b8" stroke-width="1"/>
      <line x1="270" y1="430" x2="270" y2="465" stroke="#94a3b8" stroke-width="1"/>
      <line x1="290" y1="430" x2="290" y2="465" stroke="#94a3b8" stroke-width="1"/>
      <line x1="310" y1="430" x2="310" y2="465" stroke="#94a3b8" stroke-width="1"/>
      
      <!-- Drawcords -->
      <path d="M 230 135 Q 225 180, 220 220" fill="none" stroke="#334155" stroke-width="3"/>
      <rect x="218" y="220" width="4" height="14" fill="#0f172a"/>
      <path d="M 270 135 Q 275 180, 280 220" fill="none" stroke="#334155" stroke-width="3"/>
      <rect x="278" y="220" width="4" height="14" fill="#0f172a"/>

      <!-- Print Placement Target Box -->
      <rect x="215" y="195" width="70" height="40" fill="none" stroke="#2563eb" stroke-width="1.4" stroke-dasharray="3,3"/>
      <text x="250" y="218" font-size="9" fill="#2563eb" text-anchor="middle" font-family="sans-serif">PRINT LOGO</text>
    </g>

    <!-- Leader Callout Lines pointing from text blocks to sketch -->
    <path d="M 180 120 L 210 160" fill="none" stroke="#0038b8" stroke-width="1.2" marker-end="url(#dot)"/>
    <path d="M 390 190 L 320 240" fill="none" stroke="#0038b8" stroke-width="1.2"/>
    <path d="M 400 360 L 270 360" fill="none" stroke="#0038b8" stroke-width="1.2"/>
    <path d="M 120 450 L 165 410" fill="none" stroke="#0038b8" stroke-width="1.2"/>
    <path d="M 370 470 L 300 440" fill="none" stroke="#0038b8" stroke-width="1.2"/>
  `,
  blocks: [
    {
      id: 'h-1',
      text: 'TECH PACK: VINTAGE OVERSIZED PULLOVER HOODIE',
      x0: 36,
      y0: 30,
      x1: 420,
      y1: 46,
      pageNumber: 1,
      category: 'general',
      translation: '款式工艺单：复古宽松重磅套头连帽卫衣'
    },
    {
      id: 'h-2',
      text: 'STYLE NO: HD-2026-FW01 | SEASON: AUTUMN/WINTER | FIT: OVERSIZED BOXY',
      x0: 36,
      y0: 52,
      x1: 520,
      y1: 65,
      pageNumber: 1,
      category: 'general',
      translation: '款号: HD-2026-FW01 | 季度: 秋冬 | 版型: 宽松方正版型'
    },
    {
      id: 'h-3',
      text: 'SELF FABRIC 2-PIECE HOOD WITH 1/4" DTM TOPSTITCH',
      x0: 36,
      y0: 108,
      x1: 340,
      y1: 122,
      pageNumber: 1,
      category: 'callout',
      translation: '自布双片连帽配1/4"同身色压明线'
    },
    {
      id: 'h-4',
      text: 'METAL EYELET & ROUND DRAWCORD WITH METAL AGLET',
      x0: 280,
      y0: 172,
      x1: 476,
      y1: 186,
      pageNumber: 1,
      category: 'trim',
      translation: '金属汽眼出绳口配带金属枪头纯棉圆抽绳'
    },
    {
      id: 'h-5',
      text: 'CHEST PRINT PLACEMENT 10CM DOWN FROM HPS',
      x0: 310,
      y0: 250,
      x1: 480,
      y1: 264,
      pageNumber: 1,
      category: 'callout',
      translation: '胸前图案定位：距后领肩顶10cm处'
    },
    {
      id: 'h-6',
      text: 'KANGAROO POCKET WITH CLEAN FINISHED OPENING',
      x0: 260,
      y0: 345,
      x1: 480,
      y1: 359,
      pageNumber: 1,
      category: 'callout',
      translation: '袋鼠兜净口做边配转角加固'
    },
    {
      id: 'h-7',
      text: 'REINFORCED BARTACK AT POCKET CORNER',
      x0: 36,
      y0: 440,
      x1: 260,
      y1: 454,
      pageNumber: 1,
      category: 'sewing',
      translation: '口袋四角打枣牢固车缝'
    },
    {
      id: 'h-8',
      text: '2X2 RIB AT CUFF AND BOTTOM HEM',
      x0: 270,
      y0: 480,
      x1: 460,
      y1: 494,
      pageNumber: 1,
      category: 'fabric',
      translation: '袖口与下摆采用2x2高弹罗纹'
    },
    {
      id: 'h-9',
      text: '4-THREAD OVERLOCK INTERIOR WITH HERRINGBONE TAPE AT INSIDE BACK NECK',
      x0: 36,
      y0: 535,
      x1: 465,
      y1: 549,
      pageNumber: 1,
      category: 'sewing',
      translation: '内缝四线拷边，后领窝内压人字织带加固净条'
    },
    {
      id: 'h-10',
      text: 'FABRIC & COLOR SPECIFICATIONS',
      x0: 510,
      y0: 108,
      x1: 720,
      y1: 122,
      pageNumber: 1,
      category: 'fabric',
      translation: '面料成分与颜色技术规格'
    },
    {
      id: 'h-11',
      text: 'SHELL: 450GSM 100% COMBED COTTON FRENCH TERRY',
      x0: 510,
      y0: 135,
      x1: 760,
      y1: 148,
      pageNumber: 1,
      category: 'fabric',
      translation: '大身面料: 450克重 100%精梳棉大毛圈布'
    },
    {
      id: 'h-12',
      text: 'RIB: 420GSM 95% COTTON 5% SPANDEX 2X2 RIB',
      x0: 510,
      y0: 165,
      x1: 755,
      y1: 178,
      pageNumber: 1,
      category: 'fabric',
      translation: '罗纹面料: 420克重 95%棉 5%氨纶 2x2罗纹'
    },
    {
      id: 'h-13',
      text: 'WASH: SILICONE WASH FOR SOFT HANDFEEL',
      x0: 510,
      y0: 195,
      x1: 750,
      y1: 208,
      pageNumber: 1,
      category: 'fabric',
      translation: '洗水工艺: 硅油柔顺洗处理，手感厚实细腻'
    },
    {
      id: 'h-14',
      text: 'LABELS & TRIMS PLACEMENT',
      x0: 510,
      y0: 240,
      x1: 710,
      y1: 253,
      pageNumber: 1,
      category: 'trim',
      translation: '商标辅料车缝位置与包装要求'
    },
    {
      id: 'h-15',
      text: 'MAIN LABEL: WOVEN MAIN LABEL CENTERED AT INSIDE BACK NECK',
      x0: 510,
      y0: 265,
      x1: 760,
      y1: 279,
      pageNumber: 1,
      category: 'trim',
      translation: '主标: 织唛主标居中车缝于后领窝人字带下方'
    },
    {
      id: 'h-16',
      text: 'CARE LABEL: PRINTED CARE LABEL 10CM UP FROM LEFT HEM',
      x0: 510,
      y0: 300,
      x1: 760,
      y1: 314,
      pageNumber: 1,
      category: 'trim',
      translation: '洗标: 印唛洗涤标距内侧左侧缝下摆10cm处'
    },
    {
      id: 'h-17',
      text: 'KEY MEASUREMENT SUMMARY (SIZE M)',
      x0: 510,
      y0: 350,
      x1: 740,
      y1: 364,
      pageNumber: 1,
      category: 'pom',
      translation: '核心尺寸参数对照表 (M码)'
    },
    {
      id: 'h-18',
      text: 'A. 1/2 CHEST WIDTH',
      x0: 510,
      y0: 380,
      x1: 640,
      y1: 393,
      pageNumber: 1,
      category: 'pom',
      translation: 'A. 1/2胸围 (62.0CM)'
    },
    {
      id: 'h-19',
      text: 'B. BODY LENGTH FROM HPS',
      x0: 510,
      y0: 410,
      x1: 660,
      y1: 423,
      pageNumber: 1,
      category: 'pom',
      translation: 'B. 后领肩点起身长 (72.0CM)'
    },
    {
      id: 'h-20',
      text: 'C. ACROSS SHOULDER',
      x0: 510,
      y0: 440,
      x1: 640,
      y1: 453,
      pageNumber: 1,
      category: 'pom',
      translation: 'C. 总肩宽 (58.0CM)'
    },
    {
      id: 'h-21',
      text: 'D. SLEEVE LENGTH FROM CB',
      x0: 510,
      y0: 470,
      x1: 660,
      y1: 483,
      pageNumber: 1,
      category: 'pom',
      translation: 'D. 后中量袖长 (88.0CM)'
    },
    {
      id: 'h-22',
      text: 'TOLERANCE: +/- 0.5CM FOR CRITICAL MEASUREMENTS',
      x0: 510,
      y0: 515,
      x1: 765,
      y1: 528,
      pageNumber: 1,
      category: 'defect',
      translation: '公差标准: 关键尺寸控制在 +/- 0.5cm 以内'
    }
  ]
};

// Built-in Sample 2: Measurement Spec Sheet (Excel Data & Table)
export const MEASUREMENT_SPEC_SAMPLE: ExcelSheetData = {
  name: 'POM Spec Sheet (尺寸规格表)',
  headers: ['Code', 'Point of Measure (POM)', 'POM 中文对照', 'Tol (+/-)', 'XS', 'S', 'M', 'L', 'XL', '2XL'],
  rows: [
    {
      Code: 'A',
      'Point of Measure (POM)': '1/2 CHEST WIDTH',
      'POM 中文对照': '1/2胸围 (腋下2.5cm平量)',
      'Tol (+/-)': '0.5',
      XS: 56.0,
      S: 59.0,
      M: 62.0,
      L: 65.0,
      XL: 68.0,
      '2XL': 71.0
    },
    {
      Code: 'B',
      'Point of Measure (POM)': 'TOTAL LENGTH FROM HPS',
      'POM 中文对照': '后领肩点起总身长',
      'Tol (+/-)': '1.0',
      XS: 68.0,
      S: 70.0,
      M: 72.0,
      L: 74.0,
      XL: 76.0,
      '2XL': 78.0
    },
    {
      Code: 'C',
      'Point of Measure (POM)': 'ACROSS SHOULDER',
      'POM 中文对照': '跨肩宽/总肩宽',
      'Tol (+/-)': '0.5',
      XS: 54.0,
      S: 56.0,
      M: 58.0,
      L: 60.0,
      XL: 62.0,
      '2XL': 64.0
    },
    {
      Code: 'D',
      'Point of Measure (POM)': '1/2 BOTTOM SWEEP (RELAXED)',
      'POM 中文对照': '1/2下摆围 (自然平量)',
      'Tol (+/-)': '0.5',
      XS: 48.0,
      S: 51.0,
      M: 54.0,
      L: 57.0,
      XL: 60.0,
      '2XL': 63.0
    },
    {
      Code: 'E',
      'Point of Measure (POM)': 'ARMHOLE STRAIGHT',
      'POM 中文对照': '直量夹圈/袖窿',
      'Tol (+/-)': '0.5',
      XS: 24.5,
      S: 25.5,
      M: 26.5,
      L: 27.5,
      XL: 28.5,
      '2XL': 29.5
    },
    {
      Code: 'F',
      'Point of Measure (POM)': 'BICEP WIDTH',
      'POM 中文对照': '袖肥 (夹圈下2.5cm量)',
      'Tol (+/-)': '0.3',
      XS: 21.0,
      S: 22.0,
      M: 23.0,
      L: 24.0,
      XL: 25.0,
      '2XL': 26.0
    },
    {
      Code: 'G',
      'Point of Measure (POM)': 'SLEEVE LENGTH FROM CB',
      'POM 中文对照': '后中量总袖长',
      'Tol (+/-)': '0.8',
      XS: 84.0,
      S: 86.0,
      M: 88.0,
      L: 90.0,
      XL: 92.0,
      '2XL': 94.0
    },
    {
      Code: 'H',
      'Point of Measure (POM)': 'CUFF OPENING (RELAXED)',
      'POM 中文对照': '袖口宽 (罗纹平量)',
      'Tol (+/-)': '0.3',
      XS: 9.0,
      S: 9.5,
      M: 10.0,
      L: 10.5,
      XL: 11.0,
      '2XL': 11.5
    },
    {
      Code: 'I',
      'Point of Measure (POM)': 'HOOD HEIGHT',
      'POM 中文对照': '帽高 (沿帽中缝量)',
      'Tol (+/-)': '0.5',
      XS: 37.0,
      S: 37.5,
      M: 38.0,
      L: 38.5,
      XL: 39.0,
      '2XL': 39.5
    },
    {
      Code: 'J',
      'Point of Measure (POM)': 'KANGAROO POCKET HEIGHT',
      'POM 中文对照': '袋鼠口袋垂直高',
      'Tol (+/-)': '0.5',
      XS: 23.0,
      S: 24.0,
      M: 25.0,
      L: 26.0,
      XL: 27.0,
      '2XL': 28.0
    }
  ]
};

// Built-in Sample 3: BOM Sheet (Bill of Materials & Construction)
export const BOM_SPEC_SAMPLE: ExcelSheetData = {
  name: 'BOM & Trims List (辅料及车缝制单)',
  headers: ['Item No', 'Component', 'Material Description', '中文物料对照', 'Placement / Position', 'Color / Finish', 'Consumption'],
  rows: [
    {
      'Item No': '01',
      Component: 'Shell Fabric',
      'Material Description': '100% Combed Cotton French Terry 450GSM',
      '中文物料对照': '100%精梳棉大毛圈卫衣布 450克',
      'Placement / Position': 'Body, Sleeves, Hood Outer & Inner',
      'Color / Finish': 'Washed Vintage Charcoal Black (DTM)',
      Consumption: '1.65 M/PC'
    },
    {
      'Item No': '02',
      Component: 'Rib Fabric',
      'Material Description': '95% Cotton 5% Spandex 2x2 Rib 420GSM',
      '中文物料对照': '95%棉 5%氨纶 2x2罗纹 420克',
      'Placement / Position': 'Cuffs & Bottom Hem Band',
      'Color / Finish': 'DTM to match shell fabric',
      Consumption: '0.28 M/PC'
    },
    {
      'Item No': '03',
      Component: 'Drawcord',
      'Material Description': '100% Braided Cotton Round Drawcord Dia 8mm',
      '中文物料对照': '100%纯棉编织圆抽绳 直径8mm',
      'Placement / Position': 'Hood Opening Channel',
      'Color / Finish': 'Off-White Natural Cotton',
      Consumption: '120 CM/PC'
    },
    {
      'Item No': '04',
      Component: 'Aglets',
      'Material Description': 'Solid Brass Metal Cord Ends with Laser Logo',
      '中文物料对照': '黄铜金属绳头 (激光刻印LOGO)',
      'Placement / Position': 'Both ends of drawcord',
      'Color / Finish': 'Matte Antique Black (Gunmetal)',
      Consumption: '2 PCS/PC'
    },
    {
      'Item No': '05',
      Component: 'Eyelets',
      'Material Description': 'No. 20 Metal Eyelets with Washer Backing',
      '中文物料对照': '20号金属汽眼 (带防脱垫圈)',
      'Placement / Position': 'Hood front drawcord exits (L&R)',
      'Color / Finish': 'Matte Gunmetal to match aglets',
      Consumption: '2 PCS/PC'
    },
    {
      'Item No': '06',
      Component: 'Neck Tape',
      'Material Description': '100% Cotton Herringbone Twill Tape 12mm',
      '中文物料对照': '100%全棉人字纹织带 宽12mm',
      'Placement / Position': 'Inside Back Neck Seam Covering',
      'Color / Finish': 'DTM Shell Fabric',
      Consumption: '28 CM/PC'
    },
    {
      'Item No': '07',
      Component: 'Sewing Thread',
      'Material Description': 'Core Spun Poly-Poly Thread 40/2 & 60/3',
      '中文物料对照': '高强包芯涤纶缝纫线 40/2及60/3',
      'Placement / Position': 'All seams & overlock stitches',
      'Color / Finish': 'Exact DTM Shell',
      Consumption: '320 M/PC'
    }
  ]
};
