import Papa from 'papaparse'

export interface ParsedCSV {
  fileName: string
  headers: string[]
  data: Record<string, unknown>[]
  suggestedColumns: string[]
}

/**
 * Ensure all headers in an array are unique by appending counts to duplicates
 * Example: ["Hours", "Hours", "Name"] => ["Hours", "Hours (2)", "Name"]
 */
export function ensureUniqueHeaders(headers: string[]): string[] {
  const headerCounts = new Map<string, number>()
  const uniqueHeaders: string[] = []

  for (const header of headers) {
    if (headerCounts.has(header)) {
      const count = headerCounts.get(header)! + 1
      headerCounts.set(header, count)
      uniqueHeaders.push(`${header} (${count})`)
    } else {
      headerCounts.set(header, 1)
      uniqueHeaders.push(header)
    }
  }

  return uniqueHeaders
}

/**
 * Parse a CSV file and return headers, data, and suggested decimal hour columns
 */
export function parseCSVFile(file: File): Promise<ParsedCSV> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const originalHeaders = results.meta.fields || []
        const uniqueHeaders = ensureUniqueHeaders(originalHeaders)
        const rawData = results.data as Record<string, unknown>[]

        // Remap data with unique headers
        const data = rawData.map((row) => {
          const newRow: Record<string, unknown> = {}
          originalHeaders.forEach((originalHeader, index) => {
            const uniqueHeader = uniqueHeaders[index]
            if (uniqueHeader) {
              newRow[uniqueHeader] = row[originalHeader]
            }
          })
          return newRow
        })

        const suggestedColumns = detectDecimalHourColumns(uniqueHeaders, data)

        resolve({
          fileName: file.name,
          headers: uniqueHeaders,
          data,
          suggestedColumns,
        })
      },
      error: (error) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`))
      },
    })
  })
}

/**
 * Detect which columns likely contain decimal hours
 * Heuristics:
 * 1. Column name contains keywords like "hours", "time", "duration", "hrs"
 * 2. Contains numeric values
 * 3. Values are reasonable for hours (e.g., 0-24 or 0-168 for weekly)
 */
export function detectDecimalHourColumns(
  headers: string[],
  data: Record<string, unknown>[],
): string[] {
  const suggestions: string[] = []

  const timeKeywords = [
    'hour',
    'hrs',
    'time',
    'duration',
    'worked',
    'logged',
    'actual',
    'planned',
    'scheduled',
    'billable',
    'non-billable',
    'productive',
    'non-productive',
    'hours',
  ]

  for (const header of headers) {
    const headerLower = header.toLowerCase()

    // Check if header contains time-related keywords
    const hasTimeKeyword = timeKeywords.some((keyword) => headerLower.includes(keyword))

    // Analyze the data in this column
    const columnValues = data.map((row) => row[header]).filter((val) => val != null)

    if (columnValues.length === 0) continue

    // Check if values are numeric
    const numericValues = columnValues.filter((val) => typeof val === 'number')
    const numericRatio = numericValues.length / columnValues.length

    // Must be at least 80% numeric
    if (numericRatio < 0.8) continue

    // Check if values are in a reasonable range for hours
    const values = numericValues as number[]

    // Use reduce to avoid stack overflow with large datasets
    const max = values.reduce((a, b) => Math.max(a, b), -Infinity)
    const min = values.reduce((a, b) => Math.min(a, b), Infinity)

    // Decimal hours typically range from reasonable work hours
    // Allow up to 1000 hours and down to -1000 hours (for credits/adjustments)
    const isReasonableRange = min >= -1000 && max <= 1000

    // If header has time keyword OR values look like hours, suggest it
    if (hasTimeKeyword && isReasonableRange) {
      suggestions.push(header)
    } else if (!hasTimeKeyword && isReasonableRange && numericRatio === 1) {
      // If all values are numeric and in range, but no keyword, still suggest with lower priority
      suggestions.push(header)
    }
  }

  return suggestions
}

/**
 * Convert decimal hours to hh:mm format
 * Handles negative values correctly (e.g., -7.5 → -07:30)
 */
export function decimalToTime(decimal: number): string {
  const isNegative = decimal < 0
  const absDecimal = Math.abs(decimal)
  const hours = Math.floor(absDecimal)
  const minutes = Math.round((absDecimal - hours) * 60)
  const sign = isNegative ? '-' : ''
  return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

/**
 * Convert CSV data with specified columns from decimal to hh:mm format
 * @param keepOriginal - If true, creates new columns with "_hhmm" suffix instead of replacing
 */
export function convertCSVColumns(
  data: Record<string, unknown>[],
  columnsToConvert: string[],
  keepOriginal = false,
): { data: Record<string, unknown>[]; newHeaders: string[] } {
  const newHeaders: string[] = []

  const convertedData = data.map((row) => {
    const newRow = { ...row }
    for (const column of columnsToConvert) {
      if (typeof newRow[column] === 'number') {
        const convertedValue = decimalToTime(newRow[column] as number)

        if (keepOriginal) {
          // Create new column with _hhmm suffix
          const newColumnName = `${column}_hhmm`
          newRow[newColumnName] = convertedValue

          // Track new headers (only once per column)
          if (!newHeaders.includes(newColumnName)) {
            newHeaders.push(newColumnName)
          }
        } else {
          // Replace original column
          newRow[column] = convertedValue
        }
      }
    }
    return newRow
  })

  return { data: convertedData, newHeaders }
}

/**
 * Convert data back to CSV string
 * @param additionalHeaders - Optional array of new headers to add (for keepOriginal mode)
 */
export function convertToCSV(
  data: Record<string, unknown>[],
  headers: string[],
  additionalHeaders: string[] = [],
): string {
  const allHeaders = additionalHeaders.length > 0 ? [...headers, ...additionalHeaders] : headers
  return Papa.unparse({ fields: allHeaders, data })
}
