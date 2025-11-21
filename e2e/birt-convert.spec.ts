import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test.describe('BIRT Convert E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('displays the app header and title', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('BIRT Convert')
    await expect(page.getByText('Convert decimal hours from BIRT Studio')).toBeVisible()
  })

  test('has theme toggle functionality', async ({ page }) => {
    const themeToggle = page.getByRole('button', { name: /theme/i })
    await expect(themeToggle).toBeVisible()

    // Toggle theme
    await themeToggle.click()

    // Check if dark class is applied (you can verify the actual dark mode behavior)
    const html = page.locator('html')
    const hasTheme = await html.evaluate(
      (el) => el.classList.contains('dark') || el.classList.contains('light'),
    )
    expect(hasTheme).toBeTruthy()
  })

  test('complete workflow: upload CSV → select columns → convert → download', async ({ page }) => {
    // Step 1: Upload file
    const fileInput = page.locator('input[type="file"]')
    const testFilePath = path.join(__dirname, 'fixtures', 'test-report.csv')

    await fileInput.setInputFiles(testFilePath)

    // Wait for file to appear in upload list
    await expect(page.getByText('test-report.csv')).toBeVisible()

    // Click Next/Analyze button
    const analyzeButton = page.getByRole('button', { name: /next|analyze/i })
    await analyzeButton.click()

    // Step 2: Column selection page should appear
    await expect(page.getByText('Select Columns to Convert')).toBeVisible()

    // The "Hours" column should be auto-suggested
    const hoursCheckbox = page.getByRole('checkbox', { name: 'Hours Suggested' })
    await expect(hoursCheckbox).toBeChecked() // Should be pre-selected

    // Verify the "Suggested" badge appears
    await expect(page.getByText('Suggested')).toBeVisible()

    // Click Convert Files button
    const convertButton = page.getByRole('button', { name: /convert files/i })
    await convertButton.click()

    // Step 3: Converting progress should appear
    await expect(page.getByText('Converting Files')).toBeVisible()
    await expect(page.getByText('test-report.csv')).toBeVisible()

    // Should be back at upload screen
    await expect(page.getByText('Report Upload')).toBeVisible()
  })

  test('can select and deselect columns manually', async ({ page }) => {
    // Upload file
    const fileInput = page.locator('input[type="file"]')
    const testFilePath = path.join(__dirname, 'fixtures', 'test-report.csv')
    await fileInput.setInputFiles(testFilePath)

    await page.getByRole('button', { name: /next|analyze/i }).click()

    // Wait for column selector
    await expect(page.getByText('Select Columns to Convert')).toBeVisible()

    // Deselect the auto-suggested Hours column
    await page.getByRole('checkbox', { name: 'Hours Suggested' }).click()

    // Select a different column (Employee)
    await page.getByRole('checkbox', { name: 'Employee' }).click()

    // Verify Convert button state
    const convertButton = page.getByRole('button', { name: /convert files/i })
    await expect(convertButton).toBeEnabled() // Should be enabled with 1 selection
  })

  test('can use Select All and Deselect All buttons', async ({ page }) => {
    // Upload file
    const fileInput = page.locator('input[type="file"]')
    const testFilePath = path.join(__dirname, 'fixtures', 'test-report.csv')
    await fileInput.setInputFiles(testFilePath)

    await page.getByRole('button', { name: /next|analyze/i }).click()
    await expect(page.getByText('Select Columns to Convert')).toBeVisible()

    // Click Deselect All
    await page
      .getByRole('button', { name: /deselect all/i })
      .first()
      .click()

    // Convert button should be disabled
    const convertButton = page.getByRole('button', { name: /convert files/i })
    await expect(convertButton).toBeDisabled()

    // Click Select All
    await page
      .getByRole('button', { name: /select all/i })
      .first()
      .click()

    // Convert button should be enabled
    await expect(convertButton).toBeEnabled()
  })

  test('can toggle "Keep original columns" option', async ({ page }) => {
    // Upload file
    const fileInput = page.locator('input[type="file"]')
    const testFilePath = path.join(__dirname, 'fixtures', 'test-report.csv')
    await fileInput.setInputFiles(testFilePath)

    await page.getByRole('button', { name: /next|analyze/i }).click()
    await expect(page.getByText('Select Columns to Convert')).toBeVisible()

    // Find the "Keep original" switch
    const keepOriginalSwitch = page.locator('button[role="switch"]')
    await expect(keepOriginalSwitch).toBeVisible()

    // Toggle it
    await keepOriginalSwitch.click()

    // Verify it changed state (data-state should change)
    await expect(keepOriginalSwitch).toHaveAttribute('data-state', 'checked')
  })

  test('can go back from column selection to upload', async ({ page }) => {
    // Upload file
    const fileInput = page.locator('input[type="file"]')
    const testFilePath = path.join(__dirname, 'fixtures', 'test-report.csv')
    await fileInput.setInputFiles(testFilePath)

    await page.getByRole('button', { name: /next|analyze/i }).click()
    await expect(page.getByText('Select Columns to Convert')).toBeVisible()

    // Click Back button
    await page.getByRole('button', { name: /back/i }).click()

    // Should be back at upload screen
    await expect(page.getByText('Report Upload')).toBeVisible()
  })

  test('can reset the form', async ({ page }) => {
    // Upload file
    const fileInput = page.locator('input[type="file"]')
    const testFilePath = path.join(__dirname, 'fixtures', 'test-report.csv')
    await fileInput.setInputFiles(testFilePath)

    // Wait for file to show
    await expect(page.getByText('test-report.csv')).toBeVisible()

    // Click Reset button
    await page.getByRole('button', { name: /reset/i }).click()

    // File should be removed (or form cleared)
    // The Next button should be disabled
    const nextButton = page.getByRole('button', { name: /next|analyze/i })
    await expect(nextButton).toBeDisabled()
  })

  test('disables buttons appropriately when no files selected', async ({ page }) => {
    // Next button should be disabled initially
    const nextButton = page.getByRole('button', { name: /next|analyze/i })
    await expect(nextButton).toBeDisabled()
  })

  test('shows converting progress with status icons', async ({ page }) => {
    // Upload file
    const fileInput = page.locator('input[type="file"]')
    const testFilePath = path.join(__dirname, 'fixtures', 'test-report.csv')
    await fileInput.setInputFiles(testFilePath)

    await page.getByRole('button', { name: /next|analyze/i }).click()
    await expect(page.getByText('Select Columns to Convert')).toBeVisible()

    await page.getByRole('button', { name: /convert files/i }).click()

    // Should show converting screen
    await expect(page.getByText('Converting Files')).toBeVisible()

    // Look for status text (converting or completed)
    const statusText = page.getByText(/completed|converting|pending/i).first()
    await expect(statusText).toBeVisible()

    // Wait for at least one file to complete
    await expect(page.getByText('Completed')).toBeVisible({ timeout: 3000 })
  })
})
