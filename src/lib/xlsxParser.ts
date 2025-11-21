import * as XLSX from 'xlsx'
import { detectDecimalHourColumns, ensureUniqueHeaders } from './csvParser'
import type { ParsedCSV } from './csvParser'

interface SheetData {
  headers: string[]
  data: Record<string, unknown>[]
  headerRowIndex: number
}

/**
 * Detect the header row in a sheet by analyzing row patterns
 * Returns the index of the row that appears to be the header
 */
function detectHeaderRow(rows: unknown[][]): number {
  if (rows.length === 0) return 0

  // Look for the first row that:
  // 1. Has multiple non-empty cells (at least 3)
  // 2. Is followed by at least 2 rows with similar structure
  // 3. Contains mostly string values (typical for headers)

  for (let i = 0; i < Math.min(rows.length - 2, 20); i++) {
    const row = rows[i]
    if (!Array.isArray(row)) continue

    // Check if this row has enough non-empty cells
    const nonEmptyCells = row.filter((cell) => cell != null && cell !== '').length
    if (nonEmptyCells < 3) continue

    // Check if mostly strings (header characteristic)
    const stringCells = row.filter((cell) => typeof cell === 'string').length
    const stringRatio = stringCells / nonEmptyCells

    if (stringRatio < 0.6) continue // At least 60% strings

    // Check if the next 2 rows have similar column count (data rows)
    const nextRow1 = rows[i + 1]
    const nextRow2 = rows[i + 2]

    if (!Array.isArray(nextRow1) || !Array.isArray(nextRow2)) continue

    const nextRow1Count = nextRow1.filter((cell) => cell != null && cell !== '').length
    const nextRow2Count = nextRow2.filter((cell) => cell != null && cell !== '').length

    // If next rows have similar column counts, this is likely the header
    const avgNextCount = (nextRow1Count + nextRow2Count) / 2
    if (Math.abs(avgNextCount - nonEmptyCells) <= 2) {
      return i
    }
  }

  // Fallback: first row with most non-empty cells
  let maxNonEmpty = 0
  let maxIndex = 0
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i]
    if (!Array.isArray(row)) continue
    const nonEmpty = row.filter((cell) => cell != null && cell !== '').length
    if (nonEmpty > maxNonEmpty) {
      maxNonEmpty = nonEmpty
      maxIndex = i
    }
  }

  return maxIndex
}

/**
 * Parse an XLSX file with smart header detection
 */
function parseXLSXSheet(workbook: XLSX.WorkBook): SheetData {
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    throw new Error('No sheets found in workbook')
  }
  const worksheet = workbook.Sheets[firstSheetName]
  if (!worksheet) {
    throw new Error(`Sheet "${firstSheetName}" not found in workbook`)
  }

  // Convert sheet to array of arrays
  const rawData: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
    raw: false,
  })

  // Detect header row
  const headerRowIndex = detectHeaderRow(rawData)
  const headerRow = rawData[headerRowIndex]

  // Extract headers (clean up empty columns)
  const rawHeaders: string[] = []
  const headerMap: Map<number, string> = new Map()

  if (Array.isArray(headerRow)) {
    headerRow.forEach((cell, index) => {
      const headerName = cell != null && cell !== '' ? String(cell).trim() : `Column${index + 1}`
      rawHeaders.push(headerName)
    })
  }

  // Ensure uniqueness by appending count if duplicate
  const headers = ensureUniqueHeaders(rawHeaders)

  // Map indices to unique header names
  headers.forEach((header, index) => {
    headerMap.set(index, header)
  })

  // Parse data rows (skip header and any rows before it)
  const dataRows = rawData.slice(headerRowIndex + 1)
  const data: Record<string, unknown>[] = []

  for (const row of dataRows) {
    if (!Array.isArray(row)) continue

    // Skip empty rows
    const hasData = row.some((cell) => cell != null && cell !== '')
    if (!hasData) continue

    const rowData: Record<string, unknown> = {}
    row.forEach((cell, index) => {
      const headerName = headerMap.get(index)
      if (headerName) {
        // Try to parse as number if it looks like one
        if (typeof cell === 'string' && !isNaN(Number(cell)) && cell.trim() !== '') {
          rowData[headerName] = Number(cell)
        } else {
          rowData[headerName] = cell
        }
      }
    })

    data.push(rowData)
  }

  return { headers, data, headerRowIndex }
}

/**
 * Parse an XLSX file and return headers, data, and suggested decimal hour columns
 */
export function parseXLSXFile(file: File): Promise<ParsedCSV> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) {
          reject(new Error('Failed to read file'))
          return
        }

        const workbook = XLSX.read(data, { type: 'array' })
        const { headers, data: parsedData } = parseXLSXSheet(workbook)

        const suggestedColumns = detectDecimalHourColumns(headers, parsedData)

        resolve({
          fileName: file.name,
          headers,
          data: parsedData,
          suggestedColumns,
        })
      } catch (error) {
        reject(new Error(`Failed to parse XLSX: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsArrayBuffer(file)
  })
}

/**
 * Convert data to XLSX file blob
 * @param additionalHeaders - Optional array of new headers to add (for keepOriginal mode)
 */
export function convertToXLSX(
  data: Record<string, unknown>[],
  headers: string[],
  additionalHeaders: string[] = [],
): Blob {
  const allHeaders = additionalHeaders.length > 0 ? [...headers, ...additionalHeaders] : headers

  // Create worksheet from data
  const worksheet = XLSX.utils.json_to_sheet(data, { header: allHeaders })

  // Create workbook
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Converted Data')

  // Generate XLSX file
  const xlsxData = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })

  return new Blob([xlsxData], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}
