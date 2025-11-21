<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import FileUpload from './FileUpload.vue'
import ColumnSelector from './ColumnSelector.vue'
import { parseCSVFile, convertCSVColumns, convertToCSV } from '@/lib/csvParser'
import { parseXLSXFile, convertToXLSX } from '@/lib/xlsxParser'
import type { ParsedCSV } from '@/lib/csvParser'
import JSZip from 'jszip'

type Step = 'upload' | 'select-columns' | 'converting'

interface ConversionProgress {
  fileName: string
  status: 'pending' | 'converting' | 'complete'
}

const currentStep = ref<Step>('upload')
const uploadedFiles = ref<File[]>([])
const parsedFiles = ref<ParsedCSV[]>([])
const isProcessing = ref(false)
const fileUploadRef = ref<InstanceType<typeof FileUpload> | null>(null)
const conversionProgress = ref<ConversionProgress[]>([])
const currentConvertingFile = ref('')
const errorMessage = ref('')
const liveMessage = ref('')

function handleFilesSelected(files: File[]) {
  uploadedFiles.value = files
}

function handleFileRemoved(fileId: string) {
  console.log('File removed:', fileId)
}

// Helper to add small delay for UI updates
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function handleAnalyze() {
  if (uploadedFiles.value.length === 0) {
    errorMessage.value = 'Please upload at least one file'
    return
  }

  isProcessing.value = true
  errorMessage.value = ''

  try {
    // Parse all CSV and XLSX files
    const parsePromises = uploadedFiles.value.map((file) => {
      const fileName = file.name.toLowerCase()
      if (fileName.endsWith('.csv')) {
        return parseCSVFile(file)
      } else if (fileName.endsWith('.xlsx')) {
        return parseXLSXFile(file)
      } else {
        return Promise.reject(new Error(`Unsupported file type: ${file.name}`))
      }
    })

    parsedFiles.value = await Promise.all(parsePromises)

    // Move to column selection step
    currentStep.value = 'select-columns'
    liveMessage.value = 'Column selection step'
  } catch (error) {
    console.error('Error parsing files:', error)
    errorMessage.value = `Error parsing files: ${error instanceof Error ? error.message : 'Unknown error'}`
  } finally {
    isProcessing.value = false
  }
}

async function handleConvert(selectedColumns: Map<string, string[]>, keepOriginal: boolean) {
  // Initialize conversion progress
  conversionProgress.value = parsedFiles.value
    .filter((file) => (selectedColumns.get(file.fileName)?.length || 0) > 0)
    .map((file) => ({
      fileName: file.fileName,
      status: 'pending' as const,
    }))

  // Show converting step
  currentStep.value = 'converting'
  isProcessing.value = true
  errorMessage.value = ''
  liveMessage.value = 'Converting files'

  // Wait for Vue to render the converting UI
  await nextTick()

  try {
    const zip = new JSZip()

    // Convert each file sequentially with progress updates
    for (const parsedFile of parsedFiles.value) {
      const columnsToConvert = selectedColumns.get(parsedFile.fileName) || []

      if (columnsToConvert.length === 0) continue

      // Update progress: mark as converting
      currentConvertingFile.value = parsedFile.fileName
      const progressItem = conversionProgress.value.find((p) => p.fileName === parsedFile.fileName)
      if (progressItem) {
        progressItem.status = 'converting'
        liveMessage.value = `Converting ${parsedFile.fileName}`
      }

      // Small delay to show the converting state
      await delay(300)

      // Convert the data
      const { data: convertedData, newHeaders } = convertCSVColumns(
        parsedFile.data,
        columnsToConvert,
        keepOriginal,
      )

      // Detect original file type and add to zip accordingly
      const fileName = parsedFile.fileName.toLowerCase()
      const convertedFileName = parsedFile.fileName.replace(/\.(csv|xlsx)$/i, '_converted.$1')

      if (fileName.endsWith('.xlsx')) {
        // Export as XLSX
        const blob = convertToXLSX(convertedData, parsedFile.headers, newHeaders)
        zip.file(convertedFileName, blob)
      } else {
        // Export as CSV
        const csvString = convertToCSV(convertedData, parsedFile.headers, newHeaders)
        zip.file(convertedFileName, csvString)
      }

      // Update progress: mark as complete
      if (progressItem) {
        progressItem.status = 'complete'
        liveMessage.value = `${parsedFile.fileName} converted successfully`
      }

      // Small delay to show the complete state before next file
      await delay(200)
    }

    // Generate and download zip file
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    downloadBlob(zipBlob, `converted_files_${timestamp}.zip`)

    liveMessage.value = `All files converted successfully. Download started.`

    // Reset and go back to upload
    resetForm()
  } catch (error) {
    console.error('Error converting files:', error)
    errorMessage.value = `Error converting files: ${error instanceof Error ? error.message : 'Unknown error'}`
    liveMessage.value = errorMessage.value
  } finally {
    isProcessing.value = false
  }
}

function downloadBlob(blob: Blob, fileName: string) {
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', fileName)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function handleBack() {
  currentStep.value = 'upload'
  parsedFiles.value = []
  liveMessage.value = 'Back to upload step'
}

function resetForm() {
  currentStep.value = 'upload'
  uploadedFiles.value = []
  parsedFiles.value = []
  errorMessage.value = ''
  fileUploadRef.value?.clearAll()
  liveMessage.value = 'Form reset. Upload step'
}
</script>

<template>
  <!-- Live region for screen reader announcements -->
  <div aria-live="polite" aria-atomic="true" class="sr-only">
    {{ liveMessage }}
  </div>

  <!-- Error message display -->
  <div
    v-if="errorMessage"
    role="alert"
    class="mb-4 p-4 rounded-lg bg-destructive/10 border border-destructive text-destructive"
  >
    <p class="font-medium">{{ errorMessage }}</p>
  </div>

  <!-- Step 1: File Upload -->
  <Card v-if="currentStep === 'upload'" class="w-full max-w-3xl mx-auto">
    <CardHeader>
      <CardTitle class="text-2xl">Report Upload</CardTitle>
      <CardDescription>Upload your CSV or XLSX files for decimal hour conversion</CardDescription>
    </CardHeader>

    <form @submit.prevent="handleAnalyze">
      <CardContent class="space-y-6">
        <div class="space-y-2">
          <Label for="file-upload">
            Files
            <span class="text-destructive">*</span>
          </Label>
          <FileUpload
            id="file-upload"
            ref="fileUploadRef"
            @files-selected="handleFilesSelected"
            @file-removed="handleFileRemoved"
          />
        </div>
      </CardContent>

      <CardFooter class="flex justify-between gap-3 border-t pt-6">
        <Button
          type="button"
          class="cursor-pointer font-medium"
          variant="outline"
          @click="resetForm"
          :disabled="isProcessing"
        >
          <Icon icon="lucide:rotate-ccw" class="w-4 h-4 mr-2" aria-hidden="true" />
          Reset
        </Button>

        <Button
          type="submit"
          :disabled="isProcessing || uploadedFiles.length === 0"
          class="min-w-[120px] font-medium cursor-pointer"
        >
          <Icon v-if="isProcessing" icon="lucide:loader-2" class="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
          <Icon v-else icon="lucide:arrow-right" class="w-4 h-4 mr-2" aria-hidden="true" />
          {{ isProcessing ? 'Analyzing...' : 'Next' }}
        </Button>
      </CardFooter>
    </form>
  </Card>

  <!-- Step 2: Column Selection -->
  <ColumnSelector
    v-else-if="currentStep === 'select-columns'"
    :files="parsedFiles"
    @convert="handleConvert"
    @back="handleBack"
  />

  <!-- Step 3: Converting Progress -->
  <Card v-else-if="currentStep === 'converting'" class="w-full max-w-3xl mx-auto">
    <CardHeader>
      <CardTitle class="text-2xl">Converting Files</CardTitle>
      <CardDescription>
        Converting {{ conversionProgress.length }} file{{
          conversionProgress.length !== 1 ? 's' : ''
        }}
        to hh:mm format...
      </CardDescription>
    </CardHeader>

    <CardContent class="space-y-4">
      <div v-for="item in conversionProgress" :key="item.fileName" class="space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <Icon
              v-if="item.status === 'complete'"
              icon="lucide:check-circle"
              class="w-5 h-5 text-green-500"
              aria-hidden="true"
            />
            <Icon
              v-else-if="item.status === 'converting'"
              icon="lucide:loader-2"
              class="w-5 h-5 text-primary animate-spin"
              aria-hidden="true"
            />
            <Icon v-else icon="lucide:circle" class="w-5 h-5 text-muted-foreground" aria-hidden="true" />

            <div>
              <p class="text-sm font-medium">{{ item.fileName }}</p>
              <p class="text-xs text-muted-foreground" role="status" aria-live="polite">
                {{
                  item.status === 'complete'
                    ? 'Completed'
                    : item.status === 'converting'
                      ? 'Converting...'
                      : 'Pending'
                }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="pt-4 text-center">
        <p class="text-sm text-muted-foreground">
          {{ conversionProgress.filter((p) => p.status === 'complete').length }} of
          {{ conversionProgress.length }} files converted
        </p>
      </div>
    </CardContent>
  </Card>
</template>
