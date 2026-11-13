import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  WidthType,
  PageBreak,
} from 'docx';

export interface ExamExportData {
  title?: string;
  school?: string;
  subject?: string;
  gradeLevel?: string;
  curriculum?: string;
  timeLimit?: number;
  academicYear?: string;
  summary?: string;
  multipleChoice?: Array<{
    number?: number;
    question: string;
    options: string[];
    correctAnswer?: string;
    explanation?: string;
    score?: number;
    bloomLevel?: string;
  }>;
  matching?: Array<{
    number?: number;
    instruction?: string;
    columnA: string[];
    columnB: string[];
    pairs: Array<{ itemA: string; correctItemB: string }>;
    explanation?: string;
    score?: number;
  }>;
  trueFalse?: Array<{
    number?: number;
    statement: string;
    correctAnswer: boolean | string;
    explanation?: string;
    score?: number;
  }>;
  shortAnswer?: Array<{
    number?: number;
    question: string;
    correctAnswer: string;
    explanation?: string;
    score?: number;
  }>;
  descriptive?: Array<{
    number?: number;
    question: string;
    correctAnswer?: string;
    explanation?: string;
    scoringCriteria?: string[];
    score?: number;
  }>;
  essay?: Array<{
    number?: number;
    question: string;
    modelAnswer?: string;
    rubric?: Array<{
      criterion: string;
      score4: string;
      score3: string;
      score2: string;
      score1: string;
    }>;
    score?: number;
  }>;
}

export async function exportExamToDocx(exam: ExamExportData, filename?: string): Promise<void> {
  const subject = exam.subject || 'Mata Pelajaran';
  const gradeLevel = exam.gradeLevel || 'Kelas / Jenjang';
  const rawTitle = exam.title || `UJIAN ${subject.toUpperCase()} ${gradeLevel.toUpperCase()}`;
  const examTitle = rawTitle.toUpperCase();

  const docParagraphs: any[] = [];

  // ==========================================
  // 1. FORMAT HEADER GAMBAR 2 (TANPA KOP SURAT)
  // ==========================================
  docParagraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60 },
      children: [
        new TextRun({
          text: examTitle,
          bold: true,
          size: 26, // 13pt
          font: 'Times New Roman',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `Mata Pelajaran: ${subject} | Kelas: ${gradeLevel}`,
          font: 'Times New Roman',
          size: 21, // 10.5pt
        }),
      ],
    })
  );

  let questionIndex = 1;

  // ==========================================
  // 2. PILIHAN GANDA (CUKUP SAMPAI D: A, B, C, D)
  // ==========================================
  if (exam.multipleChoice && exam.multipleChoice.length > 0) {
    exam.multipleChoice.forEach((q, idx) => {
      docParagraphs.push(
        new Paragraph({
          spacing: { before: 120, after: 40 },
          children: [
            new TextRun({
              text: `${questionIndex}. `,
              bold: true,
              font: 'Times New Roman',
              size: 22,
            }),
            new TextRun({
              text: q.question,
              font: 'Times New Roman',
              size: 22,
            }),
          ],
        })
      );

      // Render options up to D only (slice(0, 4))
      const cleanOptions = (q.options || []).slice(0, 4);
      cleanOptions.forEach((opt, oIdx) => {
        const letter = ['A', 'B', 'C', 'D'][oIdx];
        // Ensure standard letter prefix
        const optText = opt.match(/^[A-D]\.\s*/i) ? opt : `${letter}. ${opt}`;

        docParagraphs.push(
          new Paragraph({
            indent: { left: 400 },
            spacing: { after: 30 },
            children: [
              new TextRun({
                text: optText,
                font: 'Times New Roman',
                size: 21,
              }),
            ],
          })
        );
      });

      questionIndex++;
    });
  }

  // ==========================================
  // 3. SOAL BENAR / SALAH (TABEL FORMAT GAMBAR 3)
  // Kolom: No | Pertanyaan | Benar | Salah
  // ==========================================
  if (exam.trueFalse && exam.trueFalse.length > 0) {
    docParagraphs.push(
      new Paragraph({
        spacing: { before: 240, after: 100 },
        children: [
          new TextRun({
            text: 'Soal Benar / Salah:',
            bold: true,
            font: 'Times New Roman',
            size: 22,
          }),
        ],
      })
    );

    const tfRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 8, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'No', bold: true, font: 'Times New Roman' })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 68, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC' },
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Pertanyaan', bold: true, font: 'Times New Roman' })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 12, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Benar', bold: true, font: 'Times New Roman' })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 12, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Salah', bold: true, font: 'Times New Roman' })],
              }),
            ],
          }),
        ],
      }),
    ];

    exam.trueFalse.forEach((tf) => {
      tfRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: `${questionIndex}`, font: 'Times New Roman' })],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: tf.statement, font: 'Times New Roman' })],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: '', font: 'Times New Roman' })],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: '', font: 'Times New Roman' })],
                }),
              ],
            }),
          ],
        })
      );
      questionIndex++;
    });

    docParagraphs.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tfRows,
      })
    );
  }

  // ==========================================
  // 4. SOAL MENJODOHKAN (JIKA ADA)
  // ==========================================
  if (exam.matching && exam.matching.length > 0) {
    docParagraphs.push(
      new Paragraph({
        spacing: { before: 240, after: 100 },
        children: [
          new TextRun({
            text: 'Soal Menjodohkan:',
            bold: true,
            font: 'Times New Roman',
            size: 22,
          }),
        ],
      })
    );

    exam.matching.forEach((m, mIdx) => {
      docParagraphs.push(
        new Paragraph({
          spacing: { before: 100, after: 80 },
          children: [
            new TextRun({
              text: `${questionIndex}. `,
              bold: true,
              font: 'Times New Roman',
              size: 22,
            }),
            new TextRun({
              text: m.instruction || 'Pasangkan pernyataan pada Kolom A dengan jawaban pada Kolom B:',
              font: 'Times New Roman',
              size: 22,
            }),
          ],
        })
      );

      const maxLen = Math.max(m.columnA.length, m.columnB.length);
      const rows: TableRow[] = [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              shading: { fill: 'F8FAFC' },
              children: [new Paragraph({ children: [new TextRun({ text: 'KOLOM A', bold: true, font: 'Times New Roman' })] })],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              shading: { fill: 'F8FAFC' },
              children: [new Paragraph({ children: [new TextRun({ text: 'KOLOM B', bold: true, font: 'Times New Roman' })] })],
            }),
          ],
        }),
      ];

      for (let i = 0; i < maxLen; i++) {
        rows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: m.columnA[i] || '', font: 'Times New Roman' })],
                  }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: m.columnB[i] || '', font: 'Times New Roman' })],
                  }),
                ],
              }),
            ],
          })
        );
      }

      docParagraphs.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows,
        })
      );

      questionIndex++;
    });
  }

  // ==========================================
  // 5. ISIAN SINGKAT (JIKA ADA)
  // ==========================================
  if (exam.shortAnswer && exam.shortAnswer.length > 0) {
    docParagraphs.push(
      new Paragraph({
        spacing: { before: 240, after: 100 },
        children: [
          new TextRun({
            text: 'Soal Jawaban Singkat:',
            bold: true,
            font: 'Times New Roman',
            size: 22,
          }),
        ],
      })
    );

    exam.shortAnswer.forEach((sa) => {
      docParagraphs.push(
        new Paragraph({
          spacing: { before: 100, after: 60 },
          children: [
            new TextRun({
              text: `${questionIndex}. `,
              bold: true,
              font: 'Times New Roman',
              size: 22,
            }),
            new TextRun({
              text: sa.question,
              font: 'Times New Roman',
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          indent: { left: 400 },
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: 'Jawaban: ............................................................................................................',
              font: 'Times New Roman',
              size: 20,
              color: '666666',
            }),
          ],
        })
      );
      questionIndex++;
    });
  }

  // ==========================================
  // 6. URAIAN / ESAI (JIKA ADA)
  // ==========================================
  if ((exam.descriptive && exam.descriptive.length > 0) || (exam.essay && exam.essay.length > 0)) {
    docParagraphs.push(
      new Paragraph({
        spacing: { before: 240, after: 100 },
        children: [
          new TextRun({
            text: 'Soal Uraian / Esai:',
            bold: true,
            font: 'Times New Roman',
            size: 22,
          }),
        ],
      })
    );

    exam.descriptive?.forEach((d) => {
      docParagraphs.push(
        new Paragraph({
          spacing: { before: 100, after: 120 },
          children: [
            new TextRun({
              text: `${questionIndex}. `,
              bold: true,
              font: 'Times New Roman',
              size: 22,
            }),
            new TextRun({
              text: d.question,
              font: 'Times New Roman',
              size: 22,
            }),
          ],
        })
      );
      questionIndex++;
    });

    exam.essay?.forEach((e) => {
      docParagraphs.push(
        new Paragraph({
          spacing: { before: 100, after: 120 },
          children: [
            new TextRun({
              text: `${questionIndex}. `,
              bold: true,
              font: 'Times New Roman',
              size: 22,
            }),
            new TextRun({
              text: e.question,
              font: 'Times New Roman',
              size: 22,
            }),
          ],
        })
      );
      questionIndex++;
    });
  }

  // ==========================================
  // 7. KUNCI JAWABAN & PEMBAHASAN (HALAMAN BARU)
  // ==========================================
  docParagraphs.push(
    new Paragraph({
      children: [new PageBreak()],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 180 },
      children: [
        new TextRun({
          text: `KUNCI JAWABAN & PEMBAHASAN: ${examTitle}`,
          bold: true,
          size: 24,
          font: 'Times New Roman',
        }),
      ],
    })
  );

  let keyIdx = 1;

  // Kunci PG
  if (exam.multipleChoice && exam.multipleChoice.length > 0) {
    docParagraphs.push(
      new Paragraph({
        spacing: { before: 140, after: 60 },
        children: [
          new TextRun({
            text: 'A. Kunci Pilihan Ganda:',
            bold: true,
            font: 'Times New Roman',
            size: 22,
          }),
        ],
      })
    );

    exam.multipleChoice.forEach((q) => {
      docParagraphs.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: `${keyIdx}. `, bold: true, font: 'Times New Roman' }),
            new TextRun({ text: `Kunci: [ ${q.correctAnswer || 'A'} ] `, bold: true, color: '006600', font: 'Times New Roman' }),
            new TextRun({ text: `— ${q.explanation || ''}`, font: 'Times New Roman' }),
          ],
        })
      );
      keyIdx++;
    });
  }

  // Kunci Benar/Salah (Tabel Kunci Sesuai Format Gambar 3)
  if (exam.trueFalse && exam.trueFalse.length > 0) {
    docParagraphs.push(
      new Paragraph({
        spacing: { before: 160, after: 80 },
        children: [
          new TextRun({
            text: 'B. Kunci Soal Benar / Salah:',
            bold: true,
            font: 'Times New Roman',
            size: 22,
          }),
        ],
      })
    );

    const tfKeyRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 8, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC' },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', bold: true, font: 'Times New Roman' })] })],
          }),
          new TableCell({
            width: { size: 54, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Pertanyaan', bold: true, font: 'Times New Roman' })] })],
          }),
          new TableCell({
            width: { size: 10, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC' },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Benar', bold: true, font: 'Times New Roman' })] })],
          }),
          new TableCell({
            width: { size: 10, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC' },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Salah', bold: true, font: 'Times New Roman' })] })],
          }),
          new TableCell({
            width: { size: 18, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Pembahasan', bold: true, font: 'Times New Roman' })] })],
          }),
        ],
      }),
    ];

    exam.trueFalse.forEach((tf) => {
      const isTrue = tf.correctAnswer === true || String(tf.correctAnswer).toLowerCase() === 'benar' || String(tf.correctAnswer).toLowerCase() === 'true';
      tfKeyRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${keyIdx}`, font: 'Times New Roman' })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: tf.statement, font: 'Times New Roman' })] })],
            }),
            new TableCell({
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: isTrue ? '✓' : '', bold: true, color: '006600', font: 'Times New Roman' })] })],
            }),
            new TableCell({
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: !isTrue ? '✓' : '', bold: true, color: 'CC0000', font: 'Times New Roman' })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: tf.explanation || '-', font: 'Times New Roman' })] })],
            }),
          ],
        })
      );
      keyIdx++;
    });

    docParagraphs.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tfKeyRows,
      })
    );
  }

  // Kunci Menjodohkan
  if (exam.matching && exam.matching.length > 0) {
    docParagraphs.push(
      new Paragraph({
        spacing: { before: 160, after: 60 },
        children: [
          new TextRun({
            text: 'C. Kunci Soal Menjodohkan:',
            bold: true,
            font: 'Times New Roman',
            size: 22,
          }),
        ],
      })
    );

    exam.matching.forEach((m) => {
      docParagraphs.push(
        new Paragraph({
          spacing: { after: 30 },
          children: [
            new TextRun({ text: `Soal #${keyIdx}: `, bold: true, font: 'Times New Roman' }),
            new TextRun({
              text: (m.pairs || []).map((p) => `[${p.itemA} ➔ ${p.correctItemB}]`).join(' | '),
              font: 'Times New Roman',
            }),
          ],
        })
      );
      keyIdx++;
    });
  }

  // Kunci Isian
  if (exam.shortAnswer && exam.shortAnswer.length > 0) {
    docParagraphs.push(
      new Paragraph({
        spacing: { before: 160, after: 60 },
        children: [
          new TextRun({
            text: 'D. Kunci Jawaban Singkat:',
            bold: true,
            font: 'Times New Roman',
            size: 22,
          }),
        ],
      })
    );

    exam.shortAnswer.forEach((sa) => {
      docParagraphs.push(
        new Paragraph({
          spacing: { after: 30 },
          children: [
            new TextRun({ text: `${keyIdx}. `, bold: true, font: 'Times New Roman' }),
            new TextRun({ text: `Jawaban: ${sa.correctAnswer} `, bold: true, color: '006600', font: 'Times New Roman' }),
            new TextRun({ text: sa.explanation ? `(${sa.explanation})` : '', font: 'Times New Roman' }),
          ],
        })
      );
      keyIdx++;
    });
  }

  // Create Docx Document with 1-inch margins
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: docParagraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanFilename = (filename || `${examTitle}_${subject}`).replace(/[^a-zA-Z0-9_\-]/g, '_') + '.docx';

  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = cleanFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}
