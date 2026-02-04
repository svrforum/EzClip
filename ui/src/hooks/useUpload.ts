import { useCallback } from 'react'
import { uploadFile } from '../api/upload'
import { useUploadStore, useToastStore } from '../stores'

export function useUpload() {
  const { addUpload, updateUpload, setCurrentFile } = useUploadStore()
  const { showSuccess, showError } = useToastStore()

  const upload = useCallback(
    async (file: File) => {
      const id = addUpload(file)

      try {
        updateUpload(id, { status: 'uploading', progress: 0 })

        const result = await uploadFile(file)

        updateUpload(id, {
          status: 'completed',
          progress: 100,
          result,
        })

        setCurrentFile(result)
        showSuccess(`"${file.name}" uploaded successfully`)

        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed'
        updateUpload(id, {
          status: 'error',
          error: message,
        })
        showError(message)
        throw error
      }
    },
    [addUpload, updateUpload, setCurrentFile, showSuccess, showError]
  )

  return { upload }
}
