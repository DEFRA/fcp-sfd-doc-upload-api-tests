import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export const createLargeFile = (
  sizeInMB,
  filename = `large-file-${sizeInMB}mb-${Date.now()}.pdf`
) => {
  const filePath = path.join(os.tmpdir(), filename)
  const realPdf = fs.readFileSync('fixtures/files/test-document.pdf')
  const sizeInBytes = sizeInMB * 1024 * 1024

  const buffer = Buffer.alloc(sizeInBytes)
  realPdf.copy(buffer, 0)
  buffer.fill(0x20, realPdf.length)

  fs.writeFileSync(filePath, buffer)
  return filePath
}

export const cleanupLargeFile = (filePath) => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}
