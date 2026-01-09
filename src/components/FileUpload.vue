<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDropZone } from '@vueuse/core'
import { Icon } from '@iconify/vue'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface UploadFile {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'complete' | 'error'
  error?: string
}

const emit = defineEmits<{
  filesSelected: [files: File[]]
  fileRemoved: [fileId: string]
}>()

const files = ref<UploadFile[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const dropZoneRef = ref<HTMLDivElement | null>(null)
const liveMessage = ref('')

const hasFiles = computed(() => files.value.length > 0)
const isUploading = computed(() => files.value.some((f) => f.status === 'uploading'))

// Use VueUse's useDropZone
const { isOverDropZone } = useDropZone(dropZoneRef, {
  onDrop: (droppedFiles) => {
    if (droppedFiles) {
      addFiles(droppedFiles)
    }
  },
})

function generateId() {
  return Math.random().toString(36).substring(2, 15)
}

function addFiles(newFiles: FileList | File[]) {
  const fileArray = Array.from(newFiles)
  const uploadFiles = fileArray.map((file) => ({
    id: generateId(),
    file,
    progress: 0,
    status: 'pending' as const,
  }))

  files.value.push(...uploadFiles)
  emit('filesSelected', fileArray)

  // Announce to screen readers
  const fileCount = uploadFiles.length
  liveMessage.value = `${fileCount} file${fileCount !== 1 ? 's' : ''} added`

  // Simulate upload progress - use the ID to update the right file
  uploadFiles.forEach((uploadFile) => {
    simulateUpload(uploadFile.id)
  })
}

function simulateUpload(fileId: string) {
  const fileIndex = files.value.findIndex((f) => f.id === fileId)
  if (fileIndex === -1) return

  const file = files.value[fileIndex]
  if (!file) return

  // Update status to uploading
  file.status = 'uploading'

  const interval = setInterval(() => {
    const currentFileIndex = files.value.findIndex((f) => f.id === fileId)
    if (currentFileIndex === -1) {
      clearInterval(interval)
      return
    }

    const currentFile = files.value[currentFileIndex]
    if (!currentFile) {
      clearInterval(interval)
      return
    }

    if (currentFile.progress >= 100) {
      clearInterval(interval)
      currentFile.status = 'complete'
      currentFile.progress = 100
      return
    }

    // Update progress directly to trigger reactivity
    currentFile.progress = Math.min(100, currentFile.progress + Math.random() * 15)
  }, 200)
}

function removeFile(fileId: string) {
  const index = files.value.findIndex((f) => f.id === fileId)
  if (index !== -1) {
    const fileName = files.value[index]?.file.name
    files.value.splice(index, 1)
    emit('fileRemoved', fileId)

    // Announce to screen readers
    liveMessage.value = `${fileName} removed`
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    addFiles(target.files)
  }
  // Reset input so same file can be selected again
  if (target) target.value = ''
}

function openFileDialog() {
  fileInput.value?.click()
}

function clearAll() {
  const count = files.value.length
  files.value = []

  // Announce to screen readers
  if (count > 0) {
    liveMessage.value = `All ${count} file${count !== 1 ? 's' : ''} removed`
  }
}

// Expose methods and state so parent can interact with the component
defineExpose({
  clearAll,
  isUploading,
})
</script>

<template>
  <div class="space-y-4">
    <!-- Live region for screen reader announcements -->
    <div aria-live="polite" aria-atomic="true" class="sr-only">
      {{ liveMessage }}
    </div>

    <!-- Drop Zone -->
    <div
      ref="dropZoneRef"
      role="button"
      tabindex="0"
      aria-label="Drop files here or click to browse. Accepts CSV and XLSX files."
      class="relative border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer"
      :class="
        isOverDropZone
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-accent/50'
      "
      @click="openFileDialog"
      @keydown.enter="openFileDialog"
      @keydown.space.prevent="openFileDialog"
    >
      <input
        ref="fileInput"
        type="file"
        multiple
        aria-hidden="true"
        tabindex="-1"
        class="hidden"
        @change="handleFileSelect"
        accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      />

      <div class="flex flex-col items-center justify-center text-center space-y-3 group">
        <div
          class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
          aria-hidden="true"
        >
          <Icon icon="lucide:upload-cloud" class="w-8 h-8 text-primary" />
        </div>

        <div>
          <p class="text-lg font-semibold text-foreground">Drop files here or click to browse</p>
          <p class="text-sm text-muted-foreground mt-1">CSV and XLSX files only</p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          type="button"
          class="group-hover:cursor-pointer"
          @click.stop="openFileDialog"
        >
          <Icon icon="lucide:folder-open" class="w-4 h-4 mr-2" aria-hidden="true" />
          Select Files
        </Button>
      </div>
    </div>

    <!-- File List -->
    <div v-if="hasFiles" class="space-y-3">
      <div class="flex items-center justify-between">
        <h1 class="text-sm font-semibold text-foreground">Files ({{ files.length }})</h1>
        <Button variant="ghost" size="sm" @click="clearAll" type="button"> Clear all </Button>
      </div>

      <div class="space-y-2">
        <Card v-for="uploadFile in files" :key="uploadFile.id" class="overflow-hidden">
          <CardContent class="p-4">
            <div class="flex items-start gap-3">
              <!-- File Icon -->
              <div
                class="w-10 h-10 rounded bg-primary/10 flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                <Icon icon="lucide:file" class="w-5 h-5 text-primary" />
              </div>

              <!-- File Info -->
              <div class="flex-1 min-w-0 space-y-2">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-foreground truncate">
                      {{ uploadFile.file.name }}
                    </p>
                    <p class="text-xs text-muted-foreground">
                      {{ formatFileSize(uploadFile.file.size) }}
                    </p>
                  </div>

                  <!-- Status Badge -->
                  <Badge
                    :variant="
                      uploadFile.status === 'complete'
                        ? 'default'
                        : uploadFile.status === 'error'
                          ? 'destructive'
                          : 'secondary'
                    "
                    class="shrink-0"
                  >
                    <Icon
                      v-if="uploadFile.status === 'complete'"
                      icon="lucide:check"
                      class="w-3 h-3 mr-1"
                    />
                    <Icon
                      v-else-if="uploadFile.status === 'error'"
                      icon="lucide:x"
                      class="w-3 h-3 mr-1"
                    />
                    <Icon
                      v-else-if="uploadFile.status === 'uploading'"
                      icon="lucide:loader-2"
                      class="w-3 h-3 mr-1 animate-spin"
                    />
                    {{ uploadFile.status }}
                  </Badge>

                  <!-- Remove Button -->
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8 shrink-0"
                    :aria-label="`Remove ${uploadFile.file.name}`"
                    @click="removeFile(uploadFile.id)"
                    type="button"
                  >
                    <Icon icon="lucide:x" class="w-4 h-4" aria-hidden="true" />
                  </Button>
                </div>

                <!-- Progress Bar -->
                <Progress
                  v-if="uploadFile.status === 'uploading' || uploadFile.status === 'complete'"
                  :model-value="uploadFile.progress"
                  :aria-label="`Upload progress for ${uploadFile.file.name}: ${Math.round(uploadFile.progress)}%`"
                  class="h-1.5"
                />

                <!-- Error Message -->
                <p
                  v-if="uploadFile.status === 'error' && uploadFile.error"
                  class="text-xs text-destructive"
                >
                  {{ uploadFile.error }}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
