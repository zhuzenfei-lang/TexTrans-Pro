import * as XLSX from 'xlsx';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
} from 'docx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { BuyerEmailResponse } from '../types.ts';

/**
 * 1. Export to Excel (.xlsx)
 */
export function exportCommentsToExcel(data: BuyerEmailResponse, baseName = '服装评语分析与应对方案') {
  const wb = XLSX.utils.book_new();

  // Sheet 1: 要点剖析与技术应对方案
  const breakdownRows = (data.keyPointsBreakdown || []).map((kp, idx) => ({
    '序号': idx + 1,
    '涉及部位/项目': kp.item,
    '客人原始意见': kp.originalIssue,
    '严重级别': kp.severity === 'high' ? '高风险' : kp.severity === 'medium' ? '中度注意' : '细节优化',
    '责任部门': kp.department,
    '工艺应对方案': kp.technicalSolution,
    '满足客户期望措施': kp.buyerSatisfactionPlan,
  }));

  const visualRows = (data.visualObservations || []).map((vo, idx) => ({
    '项目': `【附图视觉解析 ${idx + 1}】`,
    '内容': vo,
  }));

  const sheet1Data = [
    { '项目': '样衣批复状态', '内容': data.analysisSummary?.approvalStatus || '有条件批复' },
    { '项目': '客户态度与紧迫度', '内容': data.analysisSummary?.sentiment || '严谨' },
    { '项目': '交期时间节点', '内容': data.analysisSummary?.timeline || '本周' },
    { '项目': '核心矛盾与关键点', '内容': data.analysisSummary?.coreConflict || '' },
    { '项目': '客人核心期望', '内容': data.analysisSummary?.buyerExpectation || '' },
    ...visualRows,
    { '项目': '', '内容': '' }, // separator
    ...breakdownRows.map(r => ({ '项目': `${r['序号']}. ${r['涉及部位/项目']} [${r['责任部门']}]`, '内容': `【问题】${r['客人原始意见']} | 【工艺方案】${r['工艺应对方案']} | 【客户对策】${r['满足客户期望措施']}` }))
  ];


  const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
  ws1['!cols'] = [{ wch: 32 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(wb, ws1, '要点剖析与应对方案');

  // Sheet 2: 车间版房落地整改清单
  const actionRows = (data.actionItems || []).map((item, idx) => ({
    '序号': idx + 1,
    '整改要点与执行指令': item,
    '执行状态': '待复核',
    '复核责任人': '',
    '备注': ''
  }));
  const ws2 = XLSX.utils.json_to_sheet(actionRows);
  ws2['!cols'] = [{ wch: 8 }, { wch: 60 }, { wch: 14 }, { wch: 14 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws2, '车间版房整改清单');

  // Sheet 3: 评语全文技术精译
  const ws3 = XLSX.utils.json_to_sheet([
    { '栏目': '客供英文评语原文', '内容': data.originalText },
    { '栏目': '服装技术中文精译', '内容': data.chineseTranslation },
  ]);
  ws3['!cols'] = [{ wch: 20 }, { wch: 100 }];
  XLSX.utils.book_append_sheet(wb, ws3, '评语双语精译');

  // Sheet 4: 英文回复邮件草案
  const ws4 = XLSX.utils.json_to_sheet([
    { '字段': '邮件主题 (Subject)', '内容': data.replyEmailDraft.subject },
    { '字段': 'BLUF核心摘要', '内容': data.replyEmailDraft.blufSummary },
    { '字段': '完整邮件正文 (Body)', '内容': data.replyEmailDraft.body },
  ]);
  ws4['!cols'] = [{ wch: 22 }, { wch: 100 }];
  XLSX.utils.book_append_sheet(wb, ws4, '外贸英文回复');

  // Write and trigger download
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${baseName}_${dateStr}.xlsx`);
}

/**
 * 2. Export to Word (.docx)
 */
export async function exportCommentsToWord(data: BuyerEmailResponse, baseName = '服装评语分析与应对方案') {
  const dateStr = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  // Table rows for key points
  const breakdownTableRows = [
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: '部位/项目', bold: true, color: '1E3A8A' })] })],
          width: { size: 20, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: '客人发现问题', bold: true, color: '1E3A8A' })] })],
          width: { size: 25, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: '部门', bold: true, color: '1E3A8A' })] })],
          width: { size: 12, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: '工艺技术应对方案', bold: true, color: '1E3A8A' })] })],
          width: { size: 43, type: WidthType.PERCENTAGE },
        }),
      ],
    }),
    ...(data.keyPointsBreakdown || []).map(
      (kp) =>
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: kp.item, bold: true })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: kp.originalIssue })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: kp.department })] })],
            }),
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: `【技术方案】${kp.technicalSolution}` })] }),
                new Paragraph({ children: [new TextRun({ text: `【客户对策】${kp.buyerSatisfactionPlan}`, italics: true, color: '2563EB' })] }),
              ],
            }),
          ],
        })
    ),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Title
          new Paragraph({
            text: '服装外贸买家评语翻译、要点分析与技术应对方案报告',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `生成日期：${dateStr}  |  TexTrans Pro 外贸服装技术工作台`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
          }),

          // Section 1: Overview
          new Paragraph({
            text: '一、 客户意向与核心要点分析 (Buyer Intent & Key Points)',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '• 样衣批复状态：', bold: true }),
              new TextRun({ text: data.analysisSummary?.approvalStatus || '有条件批复' }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '• 紧迫度与节点：', bold: true }),
              new TextRun({ text: data.analysisSummary?.timeline || '本周五截件' }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '• 核心矛盾分析：', bold: true }),
              new TextRun({ text: data.analysisSummary?.coreConflict || '' }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '• 客人核心期望：', bold: true }),
              new TextRun({ text: data.analysisSummary?.buyerExpectation || '' }),
            ],
            spacing: { after: 120 },
          }),
          ...(data.visualObservations || []).map(
            (vo, idx) =>
              new Paragraph({
                children: [
                  new TextRun({ text: `• 附图视觉解析 [${idx + 1}]：`, bold: true, color: '2563EB' }),
                  new TextRun({ text: vo }),
                ],
                spacing: { after: 60 },
              })
          ),
          new Paragraph({ text: '', spacing: { after: 120 } }),


          // Section 2: Key Points Table
          new Paragraph({
            text: '二、 要点剖析与车间工艺对策表 (Technical Resolution Matrix)',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 120 },
          }),
          new Table({
            rows: breakdownTableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),

          // Section 3: Action Checklist
          new Paragraph({
            text: '三、 车间与版房落地整改清单 (Factory QC & Pattern Checklist)',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 120 },
          }),
          ...(data.actionItems || []).map(
            (act, idx) =>
              new Paragraph({
                children: [
                  new TextRun({ text: `[  ]  ${idx + 1}. `, bold: true }),
                  new TextRun({ text: act }),
                ],
                spacing: { after: 60 },
              })
          ),

          // Section 4: Chinese Translation
          new Paragraph({
            text: '四、 客供评语服装技术精译 (Bilingual Technical Translation)',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 120 },
          }),
          new Paragraph({
            text: data.chineseTranslation,
            spacing: { after: 200 },
          }),

          // Section 5: Reply Draft
          new Paragraph({
            text: '五、 地道商务英文回复草案 (Professional English Reply)',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Subject: ', bold: true, color: '1E3A8A' }),
              new TextRun({ text: data.replyEmailDraft.subject, bold: true }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'BLUF 核心：', bold: true, color: '059669' }),
              new TextRun({ text: data.replyEmailDraft.blufSummary }),
            ],
            spacing: { after: 120 },
          }),
          new Paragraph({
            text: data.replyEmailDraft.body,
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}_${new Date().toISOString().slice(0, 10)}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 3. Export to PDF (.pdf) via html2canvas & jsPDF
 */
export async function exportCommentsToPdf(elementId: string, baseName = '服装评语分析与应对方案') {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element #${elementId} not found for PDF export`);
  }

  // Clone or capture element
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const ratio = pdfWidth / canvasWidth;
  const totalImgHeightInPdf = canvasHeight * ratio;

  let heightLeft = totalImgHeightInPdf;
  let position = 0;

  // Add first page
  pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, totalImgHeightInPdf);
  heightLeft -= pdfHeight;

  // Multi-page loop
  while (heightLeft > 0) {
    position = heightLeft - totalImgHeightInPdf;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, totalImgHeightInPdf);
    heightLeft -= pdfHeight;
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  pdf.save(`${baseName}_${dateStr}.pdf`);
}
