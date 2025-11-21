<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import SimpleCheckbox from './SimpleCheckbox.vue'

export interface ParsedFile {
  fileName: string
  headers: string[]
  data: Record<string, unknown>[]
  suggestedColumns: string[]
}

interface Props {
  files: ParsedFile[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  convert: [selectedColumns: Map<string, string[]>, keepOriginal: boolean]
  back: []
}>()

// Map of fileName -> array of selected column names
const selectedColumns = ref<Record<string, string[]>>({})

// Option to keep original decimal columns
const keepOriginalColumns = ref(false)

// Initialize selected columns with suggested columns
props.files.forEach((file) => {
  selectedColumns.value[file.fileName] = [...file.suggestedColumns]
})

const hasAnySelection = computed(() => {
  return Object.values(selectedColumns.value).some((columns) => columns.length > 0)
})

function setColumnChecked(fileName: string, columnName: string, checked: boolean) {
  const fileColumns = selectedColumns.value[fileName]
  if (!fileColumns) return

  if (checked) {
    // Add if not already present
    if (!fileColumns.includes(columnName)) {
      selectedColumns.value[fileName] = [...fileColumns, columnName]
    }
  } else {
    // Remove if present
    selectedColumns.value[fileName] = fileColumns.filter((col) => col !== columnName)
  }
}

function isColumnSelected(fileName: string, columnName: string): boolean {
  return selectedColumns.value[fileName]?.includes(columnName) ?? false
}

function getColumnModel(fileName: string, columnName: string) {
  return computed({
    get: () => isColumnSelected(fileName, columnName),
    set: (value: boolean) => setColumnChecked(fileName, columnName, value),
  })
}

function handleConvert() {
  // Convert object to Map for emit
  const result = new Map<string, string[]>()
  Object.entries(selectedColumns.value).forEach(([fileName, columns]) => {
    result.set(fileName, columns)
  })
  emit('convert', result, keepOriginalColumns.value)
}

function selectAll(fileName: string) {
  const file = props.files.find((f) => f.fileName === fileName)
  if (!file) return
  selectedColumns.value[fileName] = [...file.headers]
}

function deselectAll(fileName: string) {
  selectedColumns.value[fileName] = []
}

function getSelectedCount(fileName: string): number {
  return selectedColumns.value[fileName]?.length ?? 0
}
</script>

<template>
  <Card class="w-full max-w-4xl mx-auto">
    <CardHeader>
      <CardTitle class="text-2xl">Select Columns to Convert</CardTitle>
      <CardDescription>
        Choose which columns contain decimal hours that should be converted to hh:mm format
      </CardDescription>
    </CardHeader>

    <CardContent class="space-y-6">
      <!-- Keep Original Columns Toggle -->
      <div
        class="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30"
      >
        <div class="flex-1">
          <Label for="keep-original" class="text-sm font-semibold cursor-pointer">
            Keep original decimal columns
          </Label>
          <p class="text-xs text-muted-foreground mt-1">
            Add new columns with hh:mm format instead of replacing the original values
          </p>
        </div>
        <Switch id="keep-original" v-model="keepOriginalColumns" aria-label="" />
      </div>

      <div v-for="file in files" :key="file.fileName" class="space-y-4">
        <!-- File Header -->
        <div class="flex items-center justify-between pb-3 border-b">
          <div class="flex items-center gap-3">
            <Icon icon="lucide:file-text" class="w-5 h-5 text-primary" />
            <div>
              <h3 class="font-semibold text-foreground">{{ file.fileName }}</h3>
              <p class="text-sm text-muted-foreground">
                {{ getSelectedCount(file.fileName) }} of {{ file.headers.length }} columns selected
              </p>
            </div>
          </div>
          <div class="flex gap-2">
            <Button variant="ghost" size="sm" type="button" @click="selectAll(file.fileName)">
              Select All
            </Button>
            <Button variant="ghost" size="sm" type="button" @click="deselectAll(file.fileName)">
              Deselect All
            </Button>
          </div>
        </div>

        <!-- Column List -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            v-for="header in file.headers"
            :key="header"
            class="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
          >
            <SimpleCheckbox
              :id="`${file.fileName}-${header}`"
              v-model="getColumnModel(file.fileName, header).value"
            />
            <Label
              :for="`${file.fileName}-${header}`"
              class="flex-1 cursor-pointer select-none flex items-center gap-2"
            >
              <span class="text-sm font-medium">{{ header }}</span>
              <Badge
                v-if="file.suggestedColumns.includes(header)"
                variant="secondary"
                class="text-xs"
              >
                Suggested
              </Badge>
            </Label>
          </div>
        </div>
      </div>

      <div
        v-if="!hasAnySelection"
        class="flex items-center gap-2 p-4 rounded-lg bg-muted/50 border border-border"
      >
        <Icon icon="lucide:info" class="w-5 h-5 text-muted-foreground shrink-0" />
        <p class="text-sm text-muted-foreground">Please select at least one column to convert</p>
      </div>
    </CardContent>

    <CardFooter class="flex justify-between gap-3 border-t pt-6">
      <Button
        type="button"
        class="font-medium cursor-pointer"
        variant="outline"
        @click="$emit('back')"
      >
        <Icon icon="lucide:arrow-left" class="w-4 h-4 mr-2" />
        Back
      </Button>

      <Button
        type="button"
        :disabled="!hasAnySelection"
        @click="handleConvert"
        class="min-w-[140px] font-medium cursor-pointer"
      >
        <Icon icon="lucide:refresh-cw" class="w-4 h-4 mr-2" />
        Convert Files
      </Button>
    </CardFooter>
  </Card>
</template>
