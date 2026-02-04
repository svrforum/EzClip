import { useEffect, useState } from 'react'
import { useJobStore } from '../../stores'
import { listJobs, cancelJob, getDownloadUrl } from '../../api/jobs'
import JobItem from './JobItem'
import styles from './JobPanel.module.css'

export default function JobPanel() {
  const { jobs, setJobs, setLoading, isLoading } = useJobStore()
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    loadJobs()
    const interval = setInterval(loadJobs, 5000)
    return () => clearInterval(interval)
  }, [])

  async function loadJobs() {
    try {
      setLoading(true)
      const response = await listJobs(1, 50)
      setJobs(response.jobs)
    } catch (error) {
      console.error('Failed to load jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel(jobId: string) {
    try {
      await cancelJob(jobId)
      loadJobs()
    } catch (error) {
      console.error('Failed to cancel job:', error)
    }
  }

  function handleDownload(jobId: string) {
    window.open(getDownloadUrl(jobId), '_blank')
  }

  const activeJobs = jobs.filter(
    (j) => j.status === 'pending' || j.status === 'processing'
  )
  const recentJobs = jobs.filter(
    (j) => j.status === 'completed' || j.status === 'failed'
  ).slice(0, 10)

  return (
    <aside className={`${styles.panel} ${isOpen ? styles.open : ''}`}>
      <button
        className={styles.toggle}
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? '패널 숨기기' : '패널 보기'}
      >
        <ToggleIcon isOpen={isOpen} />
        {activeJobs.length > 0 && (
          <span className={styles.badge}>{activeJobs.length}</span>
        )}
      </button>

      <div className={styles.content}>
        <div className={styles.header}>
          <h2 className={styles.title}>작업 목록</h2>
          <button className={styles.refresh} onClick={loadJobs} disabled={isLoading}>
            <RefreshIcon />
          </button>
        </div>

        {activeJobs.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>진행 중 ({activeJobs.length})</h3>
            <div className={styles.jobList}>
              {activeJobs.map((job) => (
                <JobItem
                  key={job.job_id}
                  job={job}
                  onCancel={() => handleCancel(job.job_id)}
                />
              ))}
            </div>
          </section>
        )}

        {recentJobs.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>최근 작업</h3>
            <div className={styles.jobList}>
              {recentJobs.map((job) => (
                <JobItem
                  key={job.job_id}
                  job={job}
                  onDownload={
                    job.status === 'completed'
                      ? () => handleDownload(job.job_id)
                      : undefined
                  }
                />
              ))}
            </div>
          </section>
        )}

        {jobs.length === 0 && (
          <div className={styles.empty}>
            <p>작업 내역이 없습니다</p>
            <p className={styles.emptyHint}>
              이미지나 비디오를 처리하면 여기에 표시됩니다
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}

function ToggleIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(180deg)' }}
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  )
}
