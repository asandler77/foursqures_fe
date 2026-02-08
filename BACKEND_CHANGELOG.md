# Backend API Change — Slide Payload

## Что изменилось

Клиент теперь **всегда** отправляет в `POST /games/{game_id}/move` при действии `slide`
**два индекса**:

```json
{
  "action": "slide",
  "fromSquareIndex": 3,
  "toHoleSquareIndex": 4,
  "playerToken": "tok_xxx"
}
```

### Значения
- `fromSquareIndex` — квадрат, который двигается в пустое место
- `toHoleSquareIndex` — текущее пустое место (holeSquareIndex) **до** хода

### Серверная проверка
1. `toHoleSquareIndex == state.holeSquareIndex`
2. `fromSquareIndex` соседний (up/down/left/right)
3. swap квадратов
4. `holeSquareIndex = fromSquareIndex`

