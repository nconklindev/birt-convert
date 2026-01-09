import * as XLSX from 'xlsx'
import { detectDecimalHourColumns, ensureUniqueHeaders } from './csvParser'
import type { ParsedCSV } from './csvParser'

interface SheetData {
  headers: string[]
  data: Record<string, unknown>[]
  headerRowIndex: number
}

/**
 * Check if the first few rows contain report header markers
 * Report headers contain "Time Period", "Executed on", and "Query" in rows 0-5
 */
function hasReportHeader(rows: unknown[][]): boolean {
  const markers = ['Time Period', 'Executed on', 'Query']
  const searchRows = rows.slice(0, 6)

  const foundMarkers = new Set<string>()

  for (const row of searchRows) {
    if (!Array.isArray(row)) continue
    for (const cell of row) {
      if (typeof cell === 'string') {
        for (const marker of markers) {
          if (cell.includes(marker)) {
            foundMarkers.add(marker)
          }
        }
      }
    }
  }

  return foundMarkers.size >= 2 // At least 2 of 3 markers
}

/**
 * Find the column header row after a report header
 * Looks for the first row with many non-empty cells after the report metadata
 */
function findColumnHeaderRow(rows: unknown[][]): number {
  // Start searching from row 3 (report headers are typically in rows 0-2)
  for (let i = 3; i < Math.min(rows.length, 15); i++) {
    const row = rows[i]
    if (!Array.isArray(row)) continue

    const nonEmptyCells = row.filter((cell) => cell != null && cell !== '').length
    const stringCells = row.filter((cell) => typeof cell === 'string').length

    // Column header row should have many cells, mostly strings
    if (nonEmptyCells >= 5 && stringCells / nonEmptyCells >= 0.6) {
      return i
    }
  }

  return 6 // Default fallback
}

/**
 * Detect the header row in a sheet by analyzing row patterns
 * Returns the index of the row that appears to be the header
 */
function detectHeaderRow(rows: unknown[][]): number {
  if (rows.length === 0) return 0

  // Check if file has a report header (contains "Time Period", "Executed on", "Query")
  if (hasReportHeader(rows)) {
    return findColumnHeaderRow(rows)
  }

  // No report header - column headers should be on row 0
  return 0
}

/**
 * Get columns that are merged on a specific row
 * Returns a Set of column indices that are part of a merge but NOT the first cell
 */
function getMergedColumns(worksheet: XLSX.WorkSheet, headerRowIndex: number): Set<number> {
  const mergedCols = new Set<number>()
  const merges = worksheet['!merges'] || []

  for (const merge of merges) {
    // Check if this merge includes the header row
    if (merge.s.r <= headerRowIndex && merge.e.r >= headerRowIndex) {
      // Add all columns in the merge EXCEPT the first one (which has the actual value)
      for (let col = merge.s.c + 1; col <= merge.e.c; col++) {
        mergedCols.add(col)
      }
    }
  }

  return mergedCols
}

/**
 * Check if worksheet has columns with missing data (likely uncached formula columns)
 * Returns the names of columns that appear to be missing data
 */
function findMissingDataColumns(worksheet: XLSX.WorkSheet, headerRowIndex: number): string[] {
  const cellKeys = Object.keys(worksheet).filter((k) => !k.startsWith('!'))

  // Count cells per column
  const columnCounts: Record<string, number> = {}
  for (const key of cellKeys) {
    const col = key.replace(/[0-9]/g, '')
    columnCounts[col] = (columnCounts[col] || 0) + 1
  }

  // Find the max cell count (expected number of rows including header)
  const maxCount = Math.max(...Object.values(columnCounts))

  // Find columns that only have the header (1 cell) while others have data
  const missingColumns: string[] = []
  if (maxCount > 1) {
    for (const col of Object.keys(columnCounts)) {
      if (columnCounts[col] === 1) {
        // This column only has the header - find the header name
        const headerCell = worksheet[`${col}${headerRowIndex + 1}`] as XLSX.CellObject | undefined
        if (headerCell && headerCell.v) {
          missingColumns.push(String(headerCell.v))
        } else {
          missingColumns.push(`Column ${col}`)
        }
      }
    }
  }

  return missingColumns
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

  // Convert sheet to array of arrays (raw: true preserves numbers as numbers)
  const rawData: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
    raw: true,
  })

  // Detect header row
  const headerRowIndex = detectHeaderRow(rawData)
  const headerRow = rawData[headerRowIndex]

  // Get merged columns to exclude
  const mergedColumns = getMergedColumns(worksheet, headerRowIndex)

  // Extract headers (skip merged columns)
  const rawHeaders: string[] = []
  const headerMap: Map<number, string> = new Map()
  const validColumnIndices: number[] = []

  if (Array.isArray(headerRow)) {
    headerRow.forEach((cell, index) => {
      // Skip columns that are part of a merge (not the first cell)
      if (mergedColumns.has(index)) return

      // Skip columns with no header (empty/blank columns)
      if (cell == null || cell === '') return

      const headerName = String(cell).trim()
      rawHeaders.push(headerName)
      validColumnIndices.push(index)
    })
  }

  // Ensure uniqueness by appending count if duplicate
  const headers = ensureUniqueHeaders(rawHeaders)

  // Check for columns with missing data (likely uncached formula columns from BIRT exports)
  const missingColumns = findMissingDataColumns(worksheet, headerRowIndex)
  if (missingColumns.length > 0) {
    throw new Error(
      `The following columns have no data: ${missingColumns.join(', ')}. ` +
        'This usually happens when Excel formulas are not cached. ' +
        'Please open the file in Excel, press Ctrl+S to save (which caches formula results), then re-upload.',
    )
  }

  // Map original column indices to unique header names
  validColumnIndices.forEach((originalIndex, headerIndex) => {
    const headerName = headers[headerIndex]
    if (headerName) {
      headerMap.set(originalIndex, headerName)
    }
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
        reject(
          new Error(
            `Failed to parse XLSX: ${error instanceof Error ? error.message : 'Unknown error'}`,
          ),
        )
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
