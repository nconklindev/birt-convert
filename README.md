# BIRT Convert

A web app for converting decimal hours in BIRT Studio CSV and XLSX reports to `hh:mm` format. If you've ever exported time tracking data from BIRT and needed it in hour:minute format instead of decimals, this does that.

## What it does

Takes files like this:

```
Employee,Date,Hours,Task
John Doe,2024-01-15,7.5,Development
Jane Smith,2024-01-15,3.25,Code Review
```

And converts them to:

```
Employee,Date,Hours,Task
John Doe,2024-01-15,7:30,Development
Jane Smith,2024-01-15,3:15,Code Review
```

You can choose which columns to convert, and optionally keep the original decimal columns alongside the converted ones.

## Features

- Drag-and-drop file upload or click to browse
- Works with CSV and XLSX files
- Auto-detects likely time columns (anything with "hour" in the name)
- Batch processing for multiple files
- Downloads results as a zip file
- Fully keyboard accessible
- Dark mode support

## Getting Started

```sh
npm install
npm run dev
```

Open http://localhost:5173 and you're good to go.

## Development

Built with Vue 3, TypeScript, and Vite. Uses shadcn-vue components and Tailwind CSS.

**Recommended IDE Setup:**
- VS Code with the Vue (Official) extension
- Install Vue.js devtools for your browser

**Available Commands:**

```sh
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test:e2e     # Run Playwright tests
npm run lint         # Lint code
```

## Testing

End-to-end tests use Playwright. First time setup:

```sh
npx playwright install
npm run test:e2e
```

## Accessibility

This app follows WCAG 2.1 guidelines:
- Full keyboard navigation support
- Screen reader compatible with ARIA labels and live regions
- Skip navigation link
- Accessible error messages and status updates
- All interactive elements have proper focus states

## How it works

1. Upload your CSV/XLSX files
2. App analyzes headers and suggests columns that look like time data
3. Select which columns you want to convert
4. Choose whether to keep original columns or replace them
5. Download the converted files as a zip

The conversion is simple: decimal hours get split into hours and minutes. `7.5` becomes `7:30`, `3.25` becomes `3:15`, etc.

## Browser Support

Works in all modern browsers. Tested in Chrome, Firefox, Safari, and Edge.

## License

MIT
