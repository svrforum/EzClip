# EzClip

이미지 및 비디오 편집을 위한 웹 기반 미디어 처리 도구

## 주요 기능

### 이미지 처리
- 포맷 변환 (PNG, JPG, WEBP, GIF)
- 크기 조정 (리사이즈)
- 자르기 (크롭)
- 회전
- 배경 제거 (rembg)
- 품질 조정

### 비디오 처리
- 포맷 변환 (MP4, WEBM, MOV, AVI)
- 해상도 변경
- 자르기 (트리밍)
- GIF 변환
- 프레임 추출
- 코덱 설정 (H.264, H.265, VP9)

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| Backend | Python, FastAPI |
| Frontend | React, TypeScript, Zustand |
| Processing | FFmpeg, Pillow, rembg |
| Queue | Redis, asyncio |
| Infra | Docker, Nginx |

## 실행 방법

### Docker Compose (권장)

```bash
# 실행
docker compose up -d

# 로그 확인
docker compose logs -f

# 중지
docker compose down
```

접속: http://localhost:3090

### 개발 환경

**Backend**
```bash
cd api
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend**
```bash
cd ui
npm install
npm run dev
```

## 프로젝트 구조

```
EzClip/
├── api/                    # FastAPI 백엔드
│   ├── routers/            # API 라우터
│   │   ├── image.py        # 이미지 처리 API
│   │   ├── video.py        # 비디오 처리 API
│   │   ├── upload.py       # 파일 업로드 API
│   │   ├── jobs.py         # 작업 관리 API
│   │   └── batch.py        # 일괄 처리 API
│   ├── services/           # 비즈니스 로직
│   │   ├── image_service.py
│   │   ├── video_service.py
│   │   ├── file_service.py
│   │   ├── queue_service.py
│   │   └── rembg_service.py
│   ├── models/             # Pydantic 스키마
│   ├── processors/         # FFmpeg 프로세서
│   └── main.py             # FastAPI 앱
├── ui/                     # React 프론트엔드
│   └── src/
│       ├── components/     # UI 컴포넌트
│       ├── pages/          # 페이지
│       ├── hooks/          # 커스텀 훅
│       ├── stores/         # Zustand 스토어
│       └── api/            # API 클라이언트
├── data/                   # 데이터 디렉토리
│   ├── uploads/            # 업로드 파일
│   ├── processed/          # 처리된 파일
│   └── temp/               # 임시 파일
└── docker-compose.yml
```

## API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/upload` | 파일 업로드 |
| POST | `/api/image/convert` | 이미지 변환 |
| POST | `/api/image/resize` | 이미지 리사이즈 |
| POST | `/api/image/crop` | 이미지 크롭 |
| POST | `/api/image/remove-background` | 배경 제거 |
| POST | `/api/video/convert` | 비디오 변환 |
| POST | `/api/video/trim` | 비디오 트리밍 |
| POST | `/api/video/extract-frames` | 프레임 추출 |
| GET | `/api/jobs/{id}` | 작업 상태 조회 |
| GET | `/api/jobs/{id}/progress` | 작업 진행률 (SSE) |
| GET | `/api/health` | 헬스 체크 |

## 환경 변수

`.env.example`을 참고하여 `.env` 파일을 생성하세요.

```env
# API
API_HOST=0.0.0.0
API_PORT=8000

# Redis
REDIS_URL=redis://redis:6379

# Storage
UPLOAD_DIR=/app/data/uploads
PROCESSED_DIR=/app/data/processed
TEMP_DIR=/app/data/temp

# Limits
MAX_UPLOAD_SIZE=104857600  # 100MB
```

## 라이선스

MIT License
