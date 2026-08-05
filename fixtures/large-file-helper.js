import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export const createLargeFile = (sizeInMB, filename = 'large-file.pdf') => {
  const filePath = path.join(os.tmpdir(), filename)
  const sizeInBytes = sizeInMB * 1024 * 1024

  // Create a buffer of the target size filled with zero bytes
  const buffer = Buffer.alloc(sizeInBytes)

  // Give it a valid PDF header so content-type detection doesn't reject it outright
  const pdfHeader = Buffer.from('%PDF-1.4\n%\x00\x00\x00\x00\n')
  pdfHeader.copy(buffer, 0)

  fs.writeFileSync(filePath, buffer)
  return filePath
}

export const cleanupLargeFile = (filePath) => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}
