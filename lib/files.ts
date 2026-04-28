// Extract plain text from various file types client-side
export async function extractText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase()

  if (ext === 'txt' || ext === 'md' || ext === 'csv' || ext === 'json' || ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx' || ext === 'py' || ext === 'rs' || ext === 'go' || ext === 'css' || ext === 'html') {
    return await file.text()
  }

  if (ext === 'pdf') {
    // For PDFs, read as base64 and note the limitation
    return `[PDF file: ${file.name} — PDF text extraction not supported in browser. Please copy-paste the text content instead.]`
  }

  if (ext === 'docx') {
    try {
      const mammoth = await import('mammoth')
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer })
      return result.value
    } catch {
      return `[DOCX file: ${file.name} — could not extract text]`
    }
  }

  // Fallback: try reading as text
  try {
    return await file.text()
  } catch {
    return `[File: ${file.name} — unsupported format]`
  }
}

export function formatFileContext(fileName: string, content: string): string {
  return `<file name="${fileName}">\n${content}\n</file>`
}

export const SUPPORTED_EXTENSIONS = [
  'txt', 'md', 'csv', 'json',
  'ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go', 'css', 'html',
  'docx'
]

export const MAX_FILE_SIZE_MB = 5
