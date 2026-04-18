/**
 * Creates test PDF files for tool verification.
 * Run with: node test/create_test.cjs
 */
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function createTestPDF(name, numPages, addImages = false) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  for (let i = 1; i <= numPages; i++) {
    const page = doc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();

    // Background color band
    page.drawRectangle({
      x: 0, y: height - 80, width, height: 80,
      color: rgb(0.2, 0.4, 0.8),
    });

    // Title
    page.drawText(`Test PDF — Page ${i} of ${numPages}`, {
      x: 50, y: height - 55,
      size: 22, font: boldFont, color: rgb(1, 1, 1),
    });

    // Content paragraphs
    const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';
    const lines = lorem.match(/.{1,80}/g);
    lines.forEach((line, idx) => {
      page.drawText(line.trim(), {
        x: 50, y: height - 130 - idx * 22,
        size: 12, font, color: rgb(0.1, 0.1, 0.1),
      });
    });

    // Page number footer
    page.drawText(`— ${i} —`, {
      x: width / 2 - 15, y: 30,
      size: 12, font, color: rgb(0.5, 0.5, 0.5),
    });

    // Add some colored rectangles to simulate images (for compression testing)
    if (addImages) {
      for (let r = 0; r < 5; r++) {
        page.drawRectangle({
          x: 50 + r * 100, y: 200, width: 80, height: 120,
          color: rgb(Math.random(), Math.random(), Math.random()),
        });
      }
    }
  }

  const bytes = await doc.save();
  const outDir = path.join(__dirname);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, name);
  fs.writeFileSync(outPath, bytes);
  console.log(`Created: ${outPath} (${(bytes.length / 1024).toFixed(1)} KB)`);
  return outPath;
}

async function main() {
  // Test PDFs for various tools
  await createTestPDF('test-3page.pdf', 3, true);
  await createTestPDF('test-5page.pdf', 5, true);
  await createTestPDF('test-merge-a.pdf', 2, false);
  await createTestPDF('test-merge-b.pdf', 2, false);
  console.log('\nAll test PDFs created!');
}

main().catch(console.error);
