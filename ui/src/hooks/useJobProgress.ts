import { useEffect, useCallback } from 'react'
import { subscribeToJob } from '../api/jobs'
import { useJobStore } from '../stores'
import type { JobDetail } from '../api/types'

export function useJobProgress(jobId: string | null) {
  const updateJob = useJobStore((s) => s.updateJob)

  useEffect(() => {
    if (!jobId) return

    const unsubscribe = subscribeToJob(
      jobId,
      (data: Partial<JobDetail>) => {
        updateJob(jobId, data)
      },
      (error) => {
        console.error('Job progress error:', error)
      }
    )

    return () => unsubscribe()
  }, [jobId, updateJob])
}

export function useJobProgressCallback() {
  const updateJob = useJobStore((s) => s.updateJob)

  const subscribe = useCallback(
    (jobId: string, onComplete?: (job: Partial<JobDetail>) => void, onError?: (error: Error) => void) => {
      return subscribeToJob(
        jobId,
        (data: Partial<JobDetail>) => {
          updateJob(jobId, data)
          // Call onComplete for any terminal status
          if (['completed', 'failed', 'cancelled'].includes(data.status || '') && onComplete) {
            onComplete(data)
          }
        },
        (error) => {
          console.error('Job progress error:', error)
          onError?.(error)
        }
      )
    },
    [updateJob]
  )

  return subscribe
}
