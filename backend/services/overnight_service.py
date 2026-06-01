"""
Yahoo Finance WebSocket을 통해 Blue Ocean ATS overnight 가격을 실시간 수신.

세션: 8 PM ~ 4 AM ET (일~목). marketHours field == 8.
WebSocket: wss://streamer.finance.yahoo.com/  (base64 Protobuf)
"""

import asyncio
import base64
import json
import logging
import struct
from datetime import datetime, timezone
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

WS_URL = "wss://streamer.finance.yahoo.com/"
RECONNECT_DELAY = 5  # seconds

# in-memory cache: symbol -> {price, change_pct, updated_at}
_cache: Dict[str, dict] = {}


def get_overnight_price(symbol: str) -> Optional[dict]:
    """캐시에서 overnight 가격 조회. 없으면 None."""
    return _cache.get(symbol.upper())


def _parse_protobuf(data: bytes) -> dict:
    """Yahoo Finance 스트리머 Protobuf 메시지를 필드 딕셔너리로 파싱."""
    fields: dict = {}
    i = 0
    while i < len(data):
        try:
            b = data[i]
            field_num = b >> 3
            wire_type = b & 0x7
            i += 1
            if wire_type == 0:  # varint
                val = 0
                shift = 0
                while i < len(data):
                    b2 = data[i]; i += 1
                    val |= (b2 & 0x7F) << shift
                    shift += 7
                    if not (b2 & 0x80):
                        break
                fields[field_num] = val
            elif wire_type == 2:  # length-delimited (string)
                if i >= len(data):
                    break
                length = data[i]; i += 1
                val = data[i:i + length]; i += length
                try:
                    fields[field_num] = val.decode("utf-8")
                except Exception:
                    fields[field_num] = val.hex()
            elif wire_type == 5:  # 32-bit float
                if i + 4 > len(data):
                    break
                fields[field_num] = struct.unpack_from("<f", data, i)[0]
                i += 4
            else:
                break
        except Exception:
            break
    return fields


async def _run_websocket(symbols: List[str]) -> None:
    """WebSocket 연결 유지 루프. 끊기면 RECONNECT_DELAY 후 재연결."""
    try:
        import websockets
    except ImportError:
        logger.error("websockets 패키지 없음 — overnight 서비스 비활성화")
        return

    while True:
        try:
            async with websockets.connect(WS_URL) as ws:
                await ws.send(json.dumps({"subscribe": symbols}))
                logger.info(f"overnight WebSocket 연결됨, 구독: {symbols}")
                async for message in ws:
                    try:
                        raw = base64.b64decode(message)
                        fields = _parse_protobuf(raw)
                        symbol: str = fields.get(1, "")
                        price: float = fields.get(2, 0.0)
                        market_hours: int = fields.get(6, 0)
                        change_pct: float = fields.get(12, 0.0)
                        if symbol and price and market_hours == 8:
                            _cache[symbol.upper()] = {
                                "price": round(float(price), 4),
                                "change_pct": round(float(change_pct), 3),
                                "updated_at": datetime.now(timezone.utc).isoformat(),
                            }
                    except Exception as e:
                        logger.debug(f"overnight msg parse error: {e}")
        except Exception as e:
            logger.warning(f"overnight WebSocket 끊김: {e} — {RECONNECT_DELAY}초 후 재연결")
        await asyncio.sleep(RECONNECT_DELAY)


def start_overnight_service(symbols: List[str]) -> None:
    """FastAPI lifespan에서 호출 — 전용 데몬 스레드에서 WebSocket 실행.

    uvicorn 이벤트루프는 동기 yfinance 호출로 수 초씩 블로킹되므로,
    asyncio.create_task()로 등록하면 WebSocket 핸드셰이크가 타임아웃된다.
    별도 스레드에서 asyncio.run()으로 독립 이벤트루프를 생성해 실행한다.
    """
    import threading

    def _thread_main():
        asyncio.run(_run_websocket(symbols))

    t = threading.Thread(target=_thread_main, daemon=True, name="overnight-ws")
    t.start()
    logger.info("overnight 서비스 시작됨 (전용 스레드)")
