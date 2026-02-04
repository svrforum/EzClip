import { Link } from 'react-router-dom'
import { Card } from '../components/common'
import styles from './HomePage.module.css'

export default function HomePage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>EzClip에 오신 것을 환영합니다</h1>
        <p className={styles.subtitle}>
          간편한 셀프 호스팅 이미지 & 비디오 편집기
        </p>
      </header>

      <section className={styles.features}>
        <Link to="/image" className={styles.featureLink}>
          <Card className={styles.featureCard} hoverable>
            <div className={styles.featureIcon}>
              <ImageIcon />
            </div>
            <h2 className={styles.featureTitle}>이미지 편집</h2>
            <p className={styles.featureDescription}>
              포맷 변환, 크기 조절, 자르기, 필터 적용, AI 배경 제거까지
              다양한 이미지 편집 기능을 제공합니다.
            </p>
            <ul className={styles.featureList}>
              <li>포맷 변환 (PNG, JPG, WebP, AVIF)</li>
              <li>크기 조절 & 자르기</li>
              <li>필터: 흑백, 세피아, 블러, 선명화</li>
              <li>AI 배경 제거 (누끼따기)</li>
              <li>회전 & 반전</li>
            </ul>
          </Card>
        </Link>

        <Link to="/video" className={styles.featureLink}>
          <Card className={styles.featureCard} hoverable>
            <div className={styles.featureIcon}>
              <VideoIcon />
            </div>
            <h2 className={styles.featureTitle}>비디오 편집</h2>
            <p className={styles.featureDescription}>
              FFmpeg 기반의 강력한 비디오 처리 기능으로
              변환, 압축, GIF 생성 등을 지원합니다.
            </p>
            <ul className={styles.featureList}>
              <li>포맷 변환 (MP4, WebM, AVI, MOV)</li>
              <li>비디오 → GIF 변환 (최적화 지원)</li>
              <li>구간 자르기 (트리밍)</li>
              <li>해상도 변경 (4K ~ 360p)</li>
              <li>오디오 추출 & 제거</li>
            </ul>
          </Card>
        </Link>
      </section>

      <section className={styles.info}>
        <Card className={styles.infoCard}>
          <h3 className={styles.infoTitle}>사용 방법</h3>
          <div className={styles.steps}>
            <div className={styles.step}>
              <span className={styles.stepNumber}>1</span>
              <span className={styles.stepText}>파일 업로드</span>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>2</span>
              <span className={styles.stepText}>작업 선택</span>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>3</span>
              <span className={styles.stepText}>결과 다운로드</span>
            </div>
          </div>
        </Card>
      </section>
    </div>
  )
}

function ImageIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function VideoIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  )
}
