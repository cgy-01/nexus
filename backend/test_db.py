import asyncio
from src.infra.database import AsyncSessionLocal
from src.domain.models.message import Message
from sqlalchemy import select, func, text

async def main():
    async with AsyncSessionLocal() as db:
        print("Executing query...")
        try:
            tz_offset = text("interval '8 hours'")
            q = select(func.date(Message.created_at + tz_offset))
            res = await db.execute(q)
            print(res.fetchall())
        except Exception as e:
            print(f"Error: {e}")

asyncio.run(main())
