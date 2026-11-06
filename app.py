import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

load_dotenv()
BASE = Path(__file__).resolve().parent
app = FastAPI(title="모먼트 카페 키오스크")
app.mount("/static", StaticFiles(directory=BASE / "static"), name="static")

MENU = [
    {"id": "americano", "name": "아메리카노", "english": "Americano", "category": "coffee", "price": 4500, "description": "깊고 깔끔한 에스프레소", "icon": "☕", "color": "coffee"},
    {"id": "latte", "name": "카페 라떼", "english": "Café Latte", "category": "coffee", "price": 5000, "description": "부드러운 우유와 에스프레소", "icon": "🥛", "color": "latte"},
    {"id": "vanilla", "name": "바닐라 라떼", "english": "Vanilla Latte", "category": "coffee", "price": 5500, "description": "달콤한 바닐라의 기분 좋은 향", "icon": "☕", "color": "vanilla"},
    {"id": "matcha", "name": "말차 라떼", "english": "Matcha Latte", "category": "drink", "price": 5800, "description": "쌉싸름하고 진한 제주 말차", "icon": "🍵", "color": "matcha"},
    {"id": "chocolate_latte", "name": "초코 라떼", "english": "Chocolate Latte", "category": "drink", "price": 5500, "description": "진한 초콜릿과 부드러운 우유", "icon": "🍫", "color": "latte"},
    {"id": "tea", "name": "얼그레이 티", "english": "Earl Grey Tea", "category": "drink", "price": 4800, "description": "향긋한 베르가못 블렌딩 티", "icon": "🫖", "color": "tea"},
    {"id": "ade", "name": "자몽 에이드", "english": "Grapefruit Ade", "category": "drink", "price": 6000, "description": "상큼한 자몽과 톡 쏘는 탄산", "icon": "🍊", "color": "ade"},
    {"id": "croissant", "name": "버터 크루아상", "english": "Butter Croissant", "category": "dessert", "price": 4200, "description": "겹겹이 바삭한 버터의 풍미", "icon": "🥐", "color": "pastry"},
    {"id": "cake", "name": "치즈 케이크", "english": "Cheesecake", "category": "dessert", "price": 6500, "description": "진하고 부드러운 치즈 케이크", "icon": "🍰", "color": "cake"},
    {"id": "egg_tart", "name": "에그타르트", "english": "Egg Tart", "category": "dessert", "price": 4500, "description": "바삭한 타르트와 부드러운 커스터드", "icon": "🥧", "color": "pastry"},
]

class OrderItem(BaseModel):
    product_id: str
    quantity: int = Field(ge=1, le=99)
    temperature: Literal["HOT", "ICE", "NONE"] = "NONE"

class OrderRequest(BaseModel):
    items: list[OrderItem] = Field(min_length=1, max_length=50)
    order_type: Literal["매장", "포장"]
    payment_method: Literal["카드", "간편결제"]

def save_order(order):
    uri = os.getenv("MONGODB_URI", "").strip()
    if uri:
        from pymongo import MongoClient
        with MongoClient(uri, serverSelectionTimeoutMS=5000) as client:
            client[os.getenv("MONGODB_DATABASE", "cafe_kiosk")]["orders"].insert_one(order.copy())
    else:
        import json
        with sqlite3.connect(BASE / "orders.db") as db:
            db.execute("CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, data TEXT NOT NULL)")
            db.execute("INSERT INTO orders VALUES (?, ?)", (order["id"], json.dumps(order, ensure_ascii=False)))

@app.get("/")
def index():
    return FileResponse(BASE / "static" / "index.html")

@app.get("/api/menu")
def menu():
    return MENU

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.post("/api/orders", status_code=201)
def create_order(request: OrderRequest):
    products = {item["id"]: item for item in MENU}
    items = []
    for item in request.items:
        product = products.get(item.product_id)
        if not product:
            raise HTTPException(status_code=400, detail="존재하지 않는 메뉴입니다.")
        if (product["category"] == "dessert") != (item.temperature == "NONE"):
            raise HTTPException(status_code=400, detail="메뉴의 온도 옵션을 확인해 주세요.")
        items.append({"product_id": product["id"], "name": product["name"], "price": product["price"], "quantity": item.quantity, "temperature": item.temperature})
    order = {"id": uuid.uuid4().hex, "order_number": uuid.uuid4().hex[:6].upper(), "created_at": datetime.now(timezone.utc).isoformat(), "items": items, "total": sum(i["price"] * i["quantity"] for i in items), "order_type": request.order_type, "payment_method": request.payment_method, "payment_status": "simulated"}
    try:
        save_order(order)
    except Exception:
        raise HTTPException(status_code=503, detail="주문을 저장할 수 없습니다. 잠시 후 다시 시도해 주세요.")
    return order
