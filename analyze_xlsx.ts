import * as XLSX from '@e965/xlsx';
import * as fs from 'fs';

const filePath = '/mnt/user-uploads/PACKING_LIST-2026.09.10-TGBU4543906_1.xlsx';

try {
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (rawData.length === 0) return;

    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(rawData.length, 20); i++) {
        const row = rawData[i];
        if (row && row.some(cell => /ctn|kg|cbm|goods|name/i.test(String(cell)))) {
            headerRowIndex = i;
            break;
        }
    }

    const headers = rawData[headerRowIndex].map(h => String(h || '').trim().replace(/\n/g, ' '));
    const rows = rawData.slice(headerRowIndex + 1).filter(row => row && row.some(cell => cell !== null && cell !== '' && cell !== undefined));
    const rowCount = rows.length;

    console.log(`--- Sheet: ${sheetName} ---`);
    console.log(`Headers: ${JSON.stringify(headers)}`);
    console.log(`Row Boundaries: ${headerRowIndex + 1} to ${headerRowIndex + 1 + rowCount}`);
    console.log(`Total Data Rows: ${rowCount}`);

    let missingCount = 0;
    const duplicateMap = new Map<string, number>();
    const customerCounts = new Map<string, number>();
    
    const weightIdx = headers.findIndex(h => /kg|weight|kgs/i.test(h));
    const qtyIdx = headers.findIndex(h => /ctn|qty|quantity|pcs/i.test(h));
    const volumeIdx = headers.findIndex(h => /cbm|volume|meas/i.test(h));
    const customerIdx = headers.findIndex(h => /customer|name|consignee/i.test(h));

    let totalWeight = 0;
    let totalQty = 0;
    let totalVolume = 0;

    rows.forEach((row) => {
      const rowStr = JSON.stringify(row);
      duplicateMap.set(rowStr, (duplicateMap.get(rowStr) || 0) + 1);

      headers.forEach((_, i) => {
          const cell = row[i];
          if (cell === null || cell === undefined || String(cell).trim() === '') missingCount++;
      });

      if (weightIdx !== -1) {
        const val = parseFloat(String(row[weightIdx] || '').replace(/[^\d.-]/g, ''));
        if (!isNaN(val)) totalWeight += val;
      }
      if (qtyIdx !== -1) {
        const val = parseInt(String(row[qtyIdx] || '').replace(/[^\d]/g, ''), 10);
        if (!isNaN(val)) totalQty += val;
      }
      if (volumeIdx !== -1) {
        const val = parseFloat(String(row[volumeIdx] || '').replace(/[^\d.-]/g, ''));
        if (!isNaN(val)) totalVolume += val;
      }
      
      if (customerIdx !== -1) {
        const customer = String(row[customerIdx] || 'Unknown').trim();
        if (customer && customer !== 'Unknown' && !/total/i.test(customer)) {
            customerCounts.set(customer, (customerCounts.get(customer) || 0) + 1);
        }
      }
    });

    const duplicateRowsCount = Array.from(duplicateMap.values()).filter(v => v > 1).length;

    console.log(`Computed Totals:`);
    if (qtyIdx !== -1) console.log(`  - Total CTN (Quantity): ${totalQty}`);
    if (weightIdx !== -1) console.log(`  - Total KG (Weight): ${totalWeight.toFixed(2)}`);
    if (volumeIdx !== -1) console.log(`  - Total CBM (Volume): ${totalVolume.toFixed(3)}`);
    
    console.log(`Data Quality:`);
    console.log(`  - Missing/Empty Cells in Data Range: ${missingCount}`);
    console.log(`  - Duplicate Row Sets: ${duplicateRowsCount}`);
    
    console.log(`Unique-Customer Grouping Counts:`);
    console.log(`  - Total Unique Customers identified: ${customerCounts.size}`);
    
    const sortedCustomers = Array.from(customerCounts.entries()).sort((a, b) => b[1] - a[1]);
    console.log(`  - Customer Record Distribution (Top 5):`);
    sortedCustomers.slice(0, 5).forEach(([cust, count], i) => {
        const masked = cust.length > 3 ? `${cust.substring(0, 2)}...${cust.slice(-2)}` : '***';
        console.log(`    ${i+1}. ${masked}: ${count} records`);
    });

    console.log(`Suggested Robust Column Mapping:`);
    headers.forEach((h, i) => {
        if (!h) return;
        let mapping = 'Attribute/Metadata';
        const hs = h.toLowerCase();
        if (/ctn|qty|quantity|pcs/i.test(hs)) mapping = 'Quantity (Integer)';
        else if (/kg|weight|kgs/i.test(hs)) mapping = 'Weight (KG - Decimal)';
        else if (/cbm|volume/i.test(hs)) mapping = 'Volume (CBM - Decimal)';
        else if (/goods|item|product|description/i.test(hs)) mapping = 'Product Description';
        else if (/customer|name|consignee/i.test(hs)) mapping = 'Customer Name (PII - Masked)';
        else if (/tel|phone|mobile/i.test(hs)) mapping = 'Contact Number (PII - Masked)';
        else if (/no\.|receipt|ref/i.test(hs)) mapping = 'Reference Number / ID';
        else if (/date/i.test(hs)) mapping = 'Transaction Date';
        else if (/note/i.test(hs)) mapping = 'General Notes';
        
        console.log(`  - "${h}" -> ${mapping}`);
    });
  });
} catch (err) {
  console.error("Error:", err.message);
}
