# 모먼트 커피 키오스크

FastAPI로 만든 카페 셀프 주문 예제입니다. 메뉴, 온도, 수량, 매장/포장 및 결제 수단을 선택할 수 있습니다. 결제는 모의 처리이며 실제 카드 결제나 청구는 일어나지 않습니다.

## Windows에서 실행하기

Python 3.10 이상을 설치한 뒤 이 폴더에서 PowerShell을 열고 실행하세요.

```powershell
py -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python -m uvicorn app:app --reload
```

브라우저에서 http://127.0.0.1:8000 에 접속합니다. API 문서는 http://127.0.0.1:8000/docs 에서 볼 수 있습니다. 기본 설정은 이 폴더의 `orders.db` SQLite 파일에 주문을 저장합니다.

## MongoDB 연결

`.env.example`을 `.env`로 복사하고 `MONGODB_URI`의 `<db_password>`를 데이터베이스 사용자의 실제 비밀번호로 바꾸세요. 비밀번호의 `@`, `:`, `/`, `#`, `%` 같은 특수문자는 URL 인코딩해야 합니다. MongoDB Atlas에서 앱이 실행되는 곳의 IP 접근을 허용하고 사용자에게 쓰기 권한을 부여하세요. 앱을 다시 시작하면 `cafe_kiosk` 데이터베이스의 `orders` 컬렉션에 새 주문을 저장합니다. `MONGODB_DATABASE`로 데이터베이스 이름을 바꿀 수 있습니다. 기존 SQLite 주문은 자동으로 이전되지 않습니다. MongoDB 연결에 실패하면 주문 저장도 실패합니다. `.env`와 접속 문자열은 공개 저장소에 올리지 마세요.

## Render 배포

이 프로젝트를 Git 저장소에 올린 후 Render에서 `render.yaml`을 사용해 Blueprint로 배포할 수 있습니다. Render 환경 변수에 `MONGODB_URI`를 설정하고 MongoDB에서 Render의 접속을 허용하세요. 시작 명령은 Render가 제공하는 `PORT`를 사용합니다. MongoDB를 설정하지 않으면 SQLite를 사용하지만 Render의 기본 파일 시스템은 영구 저장소가 아니므로 재배포나 재시작 시 주문이 사라질 수 있습니다.

## API

- `GET /api/menu`: 메뉴 목록
- `POST /api/orders`: 주문 생성 및 모의 결제. 가격과 합계는 서버의 메뉴를 기준으로 계산합니다.
- `GET /api/health`: 서버 상태 확인
