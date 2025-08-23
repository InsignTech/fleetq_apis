import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

/**
 * Generate a PDF with table-style formatting.
 *
 * @param {Object} options
 * @param {Array} options.data - Array of objects to print in PDF
 * @param {Array} options.headers - Array of headers [{ key, label, width }]
 * @param {String} options.title - PDF title
 * @param {String} options.folderName - Folder name to store PDFs
 * @param {Object} req - Express request (to generate URL)
 *
 * @returns {Promise<string>} - Returns the generated file URL
 */
export const generatePDF = ({ data, headers, title, folderName, req }) => {
  return new Promise((resolve, reject) => {
    try {
      // 1️⃣ Create PDF storage folder
      const pdfDir = path.join(process.cwd(), "public", folderName);
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }

      // 2️⃣ Generate unique filename & path
      const fileName = `${title.replace(/\s+/g, "_")}_${Date.now()}.pdf`;
      const filePath = path.join(pdfDir, fileName);

      // 3️⃣ Create a new PDF document
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // 🎨 Styling
      const headerBgColor = "#1E88E5";
      const headerTextColor = "#FFFFFF";
      const borderColor = "#CCCCCC";

      // 4️⃣ Title
      doc.fontSize(20).fillColor("#333333").text(title, { align: "center" });
      doc.moveDown(1);

      // 5️⃣ Draw Table Header Background
      const tableTop = doc.y + 5;
      const startX = 50;
      const tableWidth = headers.reduce((acc, h) => acc + h.width, 0);
      const rowHeight = 25;

      doc.rect(startX, tableTop, tableWidth, rowHeight).fill(headerBgColor);

      // 6️⃣ Header Labels
      doc.fillColor(headerTextColor).fontSize(12);
      let headerX = startX + 10;
      headers.forEach((h) => {
        doc.text(h.label, headerX, tableTop + 7, { width: h.width - 10 });
        headerX += h.width;
      });

      // 7️⃣ Draw border below header
      doc.moveTo(startX, tableTop + rowHeight)
        .lineTo(startX + tableWidth, tableTop + rowHeight)
        .strokeColor(borderColor)
        .stroke();

      // 8️⃣ Table Rows
      let y = tableTop + rowHeight + 5;
      doc.fontSize(11).fillColor("#000000");

      data.forEach((row, index) => {
        if (index % 2 === 0) {
          doc.rect(startX, y - 5, tableWidth, rowHeight)
            .fill("#F8F9FA")
            .fillColor("#000000");
        }

        let colX = startX + 10;
        headers.forEach((h) => {
          doc.text(row[h.key] || "", colX, y, { width: h.width - 10 });
          colX += h.width;
        });

        doc.fillColor("#000000");
        y += rowHeight;
      });

      // 9️⃣ Footer
      doc.moveDown(2);
      doc.fontSize(10).fillColor("#555555").text(
        `Generated on: ${new Date().toLocaleString()}`,
        { align: "right" }
      );

      // ✅ Finalize PDF
      doc.end();

      //  🔟 Wait until file write completes
      writeStream.on("finish", () => {
        const fileUrl = `${req.protocol}://${req.get("host")}/${folderName}/${fileName}`;
        resolve(fileUrl);
      });

      writeStream.on("error", (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
};
