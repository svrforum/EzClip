import { create } from 'zustand'
import type { UploadResponse } from '../api/types'

export interface UploadItem {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
  result?: UploadResponse
}

interface UploadState {
  uploads: UploadItem[]
  currentFile: UploadResponse | null

  // Actions
  addUpload: (file: File) => string
  updateUpload: (id: string, updates: Partial<UploadItem>) => void
  removeUpload: (id: string) => void
  clearCompleted: () => void
  setCurrentFile: (file: UploadResponse | null) => void

  // Getters
  getUploadingCount: () => number
  getPendingCount: () => number
}

function generateId(): string {
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const useUploadStore = create<UploadState>((set, get) => ({
  uploads: [],
  currentFile: null,

  addUpload: (file) => {
    const id = generateId()
    set((state) => ({
      uploads: [
        ...state.uploads,
        {
          id,
          file,
          progress: 0,
          status: 'pending',
        },
      ],
    }))
    return id
  },

  updateUpload: (id, updates) =>
    set((state) => ({
      uploads: state.uploads.map((u) =>
        u.id === id ? { ...u, ...updates } : u
      ),
    })),

  removeUpload: (id) =>
    set((state) => ({
      uploads: state.uploads.filter((u) => u.id !== id),
    })),

  clearCompleted: () =>
    set((state) => ({
      uploads: state.uploads.filter((u) => u.status !== 'completed'),
    })),

  setCurrentFile: (currentFile) => set({ currentFile }),

  getUploadingCount: () => {
    const { uploads } = get()
    return uploads.filter((u) => u.status === 'uploading').length
  },

  getPendingCount: () => {
    const { uploads } = get()
    return uploads.filter((u) => u.status === 'pending').length
  },
}))
