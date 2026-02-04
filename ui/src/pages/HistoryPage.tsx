import { useEffect, useState } from 'react'
import { Card, Button } from '../components/common'
import { JobItem } from '../components/jobs'
import { listJobs, getDownloadUrl } from '../api/jobs'
import type { JobDetail } from '../api/types'
import styles from './HistoryPage.module.css'

export default function HistoryPage() {
  const [jobs, setJobs] = useState<JobDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  async function loadJobs(pageNum: number, append = false) {
    try {
      setLoading(true)
      const response = await listJobs(pageNum, 20)

      if (append) {
        setJobs((prev) => [...prev, ...response.jobs])
      } else {
        setJobs(response.jobs)
      }

      setHasMore(response.jobs.length === 20)
    } catch (error) {
      console.error('Failed to load jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadJobs(1)
  }, [])

  function handleLoadMore() {
    const nextPage = page + 1
    setPage(nextPage)
    loadJobs(nextPage, true)
  }

  function handleDownload(jobId: string) {
    window.open(getDownloadUrl(jobId), '_blank')
  }

  const completedJobs = jobs.filter((j) => j.status === 'completed')
  const failedJobs = jobs.filter((j) => j.status === 'failed')
  const otherJobs = jobs.filter(
    (j) => j.status !== 'completed' && j.status !== 'failed'
  )

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>처리 이력</h1>
        <p className={styles.subtitle}>
          최근 작업 내역을 확인하세요
        </p>
      </header>

      <div className={styles.content}>
        {otherJobs.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              진행 중 ({otherJobs.length})
            </h2>
            <div className={styles.jobGrid}>
              {otherJobs.map((job) => (
                <JobItem key={job.job_id} job={job} />
              ))}
            </div>
          </section>
        )}

        {completedJobs.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              완료됨 ({completedJobs.length})
            </h2>
            <div className={styles.jobGrid}>
              {completedJobs.map((job) => (
                <Card key={job.job_id} className={styles.jobCard}>
                  <JobItem
                    job={job}
                    onDownload={() => handleDownload(job.job_id)}
                  />
                </Card>
              ))}
            </div>
          </section>
        )}

        {failedJobs.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              실패 ({failedJobs.length})
            </h2>
            <div className={styles.jobGrid}>
              {failedJobs.map((job) => (
                <Card key={job.job_id} className={styles.jobCard}>
                  <JobItem job={job} />
                </Card>
              ))}
            </div>
          </section>
        )}

        {jobs.length === 0 && !loading && (
          <Card className={styles.empty}>
            <p>처리 이력이 없습니다</p>
            <p className={styles.emptyHint}>
              이미지나 비디오를 편집하면 여기에 기록됩니다
            </p>
          </Card>
        )}

        {hasMore && jobs.length > 0 && (
          <div className={styles.loadMore}>
            <Button
              variant="secondary"
              onClick={handleLoadMore}
              loading={loading}
            >
              더 보기
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
