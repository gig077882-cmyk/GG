# GB

Клон Telegram-звонков с аудио/видео и чатом через WebRTC.

## Возможности

- Аудио и видео через WebRTC (P2P)
- Шумоподавление на базе RNNoise (WASM)
- Чат и передача файлов в комнате (до 500 MB)
- Демонстрация экрана
- Мобильный интерфейс
- Комнаты с ID и ключом доступа

## Быстрый старт

```bash
npm install
npm start
```

Сервер запустится на `http://localhost:3000`.

## Использование

1. Откройте `http://localhost:3000` в браузере.
2. Создайте или присоединитесь к комнате.
3. Поделитесь ссылкой для приглашения участников.
4. Управляйте звуком, камерой и демонстрацией.

## Структура проекта

```
ffff/
├── server.js              # точка входа сервера
├── package.json             # зависимости
├── .env                     # переменные окружения
├── src/server/              # модули сервера
│   ├── config.js
│   ├── constants.js
│   ├── rooms.js
│   ├── participants.js
│   ├── persistence.js
│   ├── ice.js
│   ├── routes.js
│   ├── signaling.js
│   └── index.js
├── public/                  # фронтенд
│   ├── index.html
│   ├── mobile.html
│   ├── landing.html
│   ├── styles.css
│   ├── mobile.css
│   └── js/                    # ES-модули фронтенда
│       ├── main.js            # инициализация
│       ├── core.js            # связка событий, вход в комнату, глобальная оркестрация
│       ├── state.js           # глобальное состояние и константы
│       ├── dom.js             # ссылки на DOM-элементы
│       ├── api.js             # REST API
│       ├── ws.js              # WebSocket-отправка
│       ├── webrtc.js          # RTCPeerConnection, сигналинг, offer/answer
│       ├── audio.js           # AudioContext, шумоподавление, громкость
│       ├── video.js           # камера, демонстрация экрана, превью камеры
│       ├── demo.js            # реестр источников и окно демонстрации
│       ├── logger.js          # консольный лог
│       ├── mobile.js          # мобильные табы и клавиатура
│       ├── commands.js        # автодополнение команд
│       ├── chat.js            # UI чата и отправка файлов
│       ├── participants.js    # список участников
│       ├── theme.js           # аватары и цвета
│       ├── storage.js         # localStorage
│       └── utils.js           # утилиты
└── data/                    # база данных SQLite
    └── telemost.db
```

## Конфигурация

Создайте файл `.env`:

```env
# Порт сервера
PORT=3000

# Путь к базе данных SQLite
DB_PATH=./data/telemost.db

# TURN-сервер (опционально)
TURN_URLS=turn:your-turn-host:3478
TURN_USER=your-username
TURN_PASS=your-password
```

## API

### REST

- `GET /api/create?name=roomName` — создать комнату
- `GET /api/resolve?name=roomName` — найти комнату по имени
- `GET /api/ice` — получить ICE-серверы
- `POST /api/upload` — загрузить файл
- `GET /api/file/:roomId/:fileId` — скачать файл

### WebSocket (клиент → сервер)

- `join` — подключение к комнате
- `signal` — WebRTC-сигнал
- `name` — смена имени
- `mute` — отключение микрофона
- `chat` — сообщение в чат
- `file` — файл в чат

### WebSocket (сервер → клиент)

- `welcome` — подтверждение подключения
- `participant-joined` — новый участник
- `participant-left` — уход участника
- `participant-updated` — изменение участника
- `signal` — WebRTC-сигнал

## Технологии

- **Backend:** Node.js, Express, WebSocket
- **Frontend:** Vanilla JS, WebRTC, Web Audio API
- **Шумоподавление:** RNNoise (WASM)

## Требования

- Node.js >= 18.0.0
- Современный браузер с поддержкой WebRTC

## Лицензия

MIT
