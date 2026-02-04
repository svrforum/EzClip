import styles from './ProgressBar.module.css'

interface ProgressBarProps {
  progress: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'success' | 'error'
}

export default function ProgressBar({
  progress,
  showLabel = false,
  size = 'md',
  color = 'primary',
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress))

  return (
    <div className={`${styles.container} ${styles[size]}`}>
      <div className={styles.track}>
        <div
          className={`${styles.fill} ${styles[color]}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showLabel && (
        <span className={styles.label}>{Math.round(clampedProgress)}%</span>
      )}
    </div>
  )
}
