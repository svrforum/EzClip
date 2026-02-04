import { create } from 'zustand'
import type { JobDetail } from '../api/types'

interface JobState {
  jobs: JobDetail[]
  isLoading: boolean
  error: string | null

  // Actions
  addJob: (job: JobDetail) => void
  updateJob: (jobId: string, updates: Partial<JobDetail>) => void
  removeJob: (jobId: string) => void
  setJobs: (jobs: JobDetail[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Getters
  getActiveJobs: () => JobDetail[]
  getCompletedJobs: () => JobDetail[]
  getPendingCount: () => number
  getProcessingCount: () => number
}

export const useJobStore = create<JobState>((set, get) => ({
  jobs: [],
  isLoading: false,
  error: null,

  addJob: (job) =>
    set((state) => ({
      jobs: [job, ...state.jobs].slice(0, 100), // Keep last 100
    })),

  updateJob: (jobId, updates) =>
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.job_id === jobId ? { ...j, ...updates } : j
      ),
    })),

  removeJob: (jobId) =>
    set((state) => ({
      jobs: state.jobs.filter((j) => j.job_id !== jobId),
    })),

  setJobs: (jobs) => set({ jobs }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  getActiveJobs: () => {
    const { jobs } = get()
    return jobs.filter(
      (j) => j.status === 'pending' || j.status === 'processing'
    )
  },

  getCompletedJobs: () => {
    const { jobs } = get()
    return jobs.filter(
      (j) => j.status === 'completed' || j.status === 'failed'
    )
  },

  getPendingCount: () => {
    const { jobs } = get()
    return jobs.filter((j) => j.status === 'pending').length
  },

  getProcessingCount: () => {
    const { jobs } = get()
    return jobs.filter((j) => j.status === 'processing').length
  },
}))
