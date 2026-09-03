/**
 * Incentric Booth — Lead recorder (Google Apps Script)
 *
 * 1. Buka Google Sheets kamu, bikin satu spread sheet baru (misal "Incentric Leads").
 * 2. Menu: Extensions > Apps Script.
 * 3. Hapus isi default, tempel seluruh file ini, lalu Save.
 * 4. Deploy > New deployment > Klik gear (Web app):
 *      - Execute as            : Me
 *      - Who has access        : Anyone
 *    Deploy, salin URL ".../exec".
 * 5. Paste URL itu ke index.html -> const SHEET_URL = '.../exec';
 *
 * Setiap POST ke URL ini akan append 1 baris ke sheet "Leads".
 */

var SHEET_NAME = 'Leads';
var HEADERS = ['Timestamp', 'Name', 'WhatsApp', 'Company', 'Need', 'Product', 'Tier', 'Raw Note'];

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  // Pastikan header ada di baris pertama.
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doPost(e) {
  try {
    var b = JSON.parse(e.postData.contents);
    getSheet().appendRow([
      new Date(),
      String(b.name || ''),
      String(b.whatsapp || ''),
      String(b.company || ''),
      String(b.need || ''),
      String(b.product || ''),
      String(b.tier || ''),
      String(b.raw_note || ''),
    ]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json_({ ok: true, message: 'Booth lead recorder is live. POST to record.' });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
