# Telemost

���-���������� ��� ����������� � �����/����� � �����.

## �����������

- 🎥 ����������� ����� WebRTC (P2P)
- 🎤 ����� � ��������� ��������������� (RNNoise)
- 💬 ��� � �������� � ��������� ������ (�� 500MB)
- 🎨 ������������ ���� (����, ����� ��������)
- 📱 ��������� ������
- 🔐 ������� � ID � ������ �������

## ������� �����

```bash
# ��������� ������������
npm install

# ������ �������
npm start
```

������ ���������� �� `http://localhost:3000`

## �������������

1. �������� `http://localhost:3000` � ��������
2. ������� �������� �������������
3. �������� ������� ��� ������������ � ������������
4. ���������� ������� � �����������

## ��������� �������

```
fff/
├── server.js              # ������ ������������ (Express + WebSocket)
├── package.json           # �����������
├── .env                   # ������������
│
├── public/                # ���-����
│   ├── index.html         # �������� ��������
│   ├── mobile.html        # ��������� ������
│   ├── landing.html       # �������/�������
│   ├── app.js             # ���������� ������
│   └── styles.css         # �����
│
└── data/                  # ���� ������ (SQLite)
    └── telemost.db
```

## ������������

### ���������� ���������

�������� ���� `.env`:

```env
# ���� �������
PORT=3000

# ���� � ���� ������ (SQLite)
DB_PATH=./data/telemost.db

# TURN ������ (�����������)
TURN_URLS=turn:your-turn-host:3478
TURN_USER=your-username
TURN_PASS=your-password
```

## API

### REST API

- `GET /api/create?name=roomName` � ������� �������
- `GET /api/resolve?name=roomName` � ����� ������� �� �����
- `GET /api/ice` � �������� ICE �������
- `POST /api/upload` � ��������� ����
- `GET /api/file/:roomId/:fileId` � ������� ����

### WebSocket �������

**������ → ������:**
- `join` � ������������ � �������
- `signal` � WebRTC ������
- `name` � �������� ���
- `mute` � ������ ���������
- `chat` � ��������� � ���
- `file` � ���� � ���

**������ → ������:**
- `welcome` � ������������� �����������
- `participant-joined` � ����� ��������
- `participant-left` � �������� ����
- `participant-updated` � ���������� ���������
- `signal` � WebRTC ������

## ����������

- **Backend:** Node.js, Express, WebSocket
- **Frontend:** Vanilla JS, WebRTC, Web Audio API
- **�����:** RNNoise (WASM)

## ����������

- Node.js >= 18.0.0
- ����������� ������� � ���������� WebRTC

## ��������

MIT
