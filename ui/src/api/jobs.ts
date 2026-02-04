import type { JobDetail, JobListResponse, JobResponse } from './types'

const API_BASE = '/api'

export async function listJobs(page: number = 1, pageSize: number = 20): Promise<JobListResponse> {
  const res = await fetch(`${API_BASE}/jobs?page=${page}&page_size=${pageSize}`)

  if (!res.ok) {
    throw new Error('Failed to fetch jobs')
  }

  return res.json()
}

export async function getJob(jobId: string): Promise<JobDetail> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`)

  if (!res.ok) {
    throw new Error('Job not found')
  }

  return res.json()
}

export async function cancelJob(jobId: string): Promise<JobResponse> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to cancel job' }))
    throw new Error(error.detail || 'Failed to cancel job')
  }

  return res.json()
}

export function getDownloadUrl(jobId: string): string {
  return `${API_BASE}/jobs/${jobId}/download`
}

export async function useResultAsInput(jobId: string): Promise<{
  file_id: string
  filename: string
  size: number
  content_type: string
}> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/use-result`, {
    method: 'POST',
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to use result' }))
    throw new Error(error.detail || 'Failed to use result')
  }

  return res.json()
}

export function subscribeToJob(
  jobId: string,
  onUpdate: (data: Partial<JobDetail>) => void,
  _onError?: (error: Error) => void
): () => void {
  let closed = false
  let pollInterval: ReturnType<typeof setInterval> | null = null

  const eventSource = new EventSource(`${API_BASE}/jobs/${jobId}/progress`)

  // Fallback polling in case SSE doesn't work properly
  const startPolling = () => {
    if (pollInterval) return
    pollInterval = setInterval(async () => {
      if (closed) {
        if (pollInterval) clearInterval(pollInterval)
        return
      }
      try {
        const job = await getJob(jobId)
        onUpdate(job)
        if (['completed', 'failed', 'cancelled'].includes(job.status)) {
          cleanup()
        }
      } catch (e) {
        console.error('Polling error:', e)
      }
    }, 1000)
  }

  const cleanup = () => {
    closed = true
    eventSource.close()
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      onUpdate(data)

      if (['completed', 'failed', 'cancelled'].includes(data.status)) {
        cleanup()
      }
    } catch (e) {
      console.error('Failed to parse SSE data:', e)
    }
  }

  eventSource.onerror = () => {
    // SSE failed, fall back to polling
    console.warn('SSE connection error, falling back to polling')
    eventSource.close()
    startPolling()
  }

  // Start polling after 2 seconds if SSE hasn't delivered a terminal status
  setTimeout(() => {
    if (!closed) {
      startPolling()
    }
  }, 2000)

  return cleanup
}
