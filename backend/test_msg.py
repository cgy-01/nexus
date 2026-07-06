import asyncio
from src.infra.database import AsyncSessionLocal
from src.domain.models.message import Message
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        print("Testing message query...")
        try:
            q = select(Message).limit(1)
            res = await db.execute(q)
            print(res.scalars().all())
        except Exception as e:
            print(f"Error: {e}")

asyncio.run(main())
