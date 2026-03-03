const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

async function main() {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.TimesRoman);
    const boldFont = await doc.embedFont(StandardFonts.TimesRomanBold);
    const page = doc.addPage([612, 792]);

    page.drawText('Assignment 1: Introduction to Computer Science', {
        x: 72, y: 720, size: 18, font: boldFont, color: rgb(0, 0, 0),
    });
    page.drawText('Student Name: John Doe', {
        x: 72, y: 680, size: 14, font, color: rgb(0, 0, 0),
    });
    page.drawText('Date: March 3, 2026', {
        x: 72, y: 656, size: 14, font, color: rgb(0, 0, 0),
    });
    page.drawText('Question 1: Explain the concept of recursion in programming.', {
        x: 72, y: 610, size: 12, font, color: rgb(0, 0, 0),
    });
    page.drawText('Answer: Recursion is a technique where a function calls itself to solve', {
        x: 72, y: 580, size: 12, font, color: rgb(0, 0, 0),
    });
    page.drawText('smaller subproblems. It requires a base case to prevent infinite loops.', {
        x: 72, y: 564, size: 12, font, color: rgb(0, 0, 0),
    });

    const bytes = await doc.save();
    require('fs').writeFileSync('test_assignment.pdf', bytes);
    console.log('Created test_assignment.pdf');
}

main();
