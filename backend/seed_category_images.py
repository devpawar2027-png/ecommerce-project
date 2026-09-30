"""
Migration and seeder script for Category images and slugs.
Adds 'slug' and 'image_url' columns to 'categories' table if not present,
and updates all 25 categories with curated high-resolution e-commerce images.
"""
from sqlalchemy import text, inspect
from database import engine, SessionLocal
from models import Category

CATEGORY_DATA = [
    {
        "id": 1,
        "name": "Electronics",
        "slug": "electronics",
        "image_url": "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=600&q=80"
    },
    {
        "id": 2,
        "name": "Mobile",
        "slug": "mobile",
        "image_url": "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=600&q=80"
    },
    {
        "id": 3,
        "name": "Laptop",
        "slug": "laptop",
        "image_url": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80"
    },
    {
        "id": 4,
        "name": "Gaming",
        "slug": "gaming",
        "image_url": "https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?auto=format&fit=crop&w=600&q=80"
    },
    {
        "id": 5,
        "name": "Watches",
        "slug": "watches",
        "image_url": "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=600&q=80"
    },
    {
        "id": 6,
        "name": "Footwear",
        "slug": "footwear",
        "image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80"
    },
    {
        "id": 7,
        "name": "Fashion",
        "slug": "fashion",
        "image_url": "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=600&q=80"
    },
    {
        "id": 8,
        "name": "Fitness",
        "slug": "fitness",
        "image_url": "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=600&q=80"
    },
    {
        "id": 9,
        "name": "Kitchen",
        "slug": "kitchen",
        "image_url": "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80"
    },
    {
        "id": 10,
        "name": "Home & Living",
        "slug": "home-living",
        "image_url": "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=600&q=80"
    },
    {
        "id": 11,
        "name": "Furniture",
        "slug": "furniture",
        "image_url": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80"
    },
    {
        "id": 12,
        "name": "Beauty",
        "slug": "beauty",
        "image_url": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80"
    },
    {
        "id": 13,
        "name": "Health",
        "slug": "health",
        "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80"
    },
    {
        "id": 14,
        "name": "Sports",
        "slug": "sports",
        "image_url": "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=600&q=80"
    },
    {
        "id": 15,
        "name": "Automotive",
        "slug": "automotive",
        "image_url": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80"
    },
    {
        "id": 16,
        "name": "Pet Supplies",
        "slug": "pet-supplies",
        "image_url": "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=600&q=80"
    },
    {
        "id": 17,
        "name": "Baby Care",
        "slug": "baby-care",
        "image_url": "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=600&q=80"
    },
    {
        "id": 18,
        "name": "Travel",
        "slug": "travel",
        "image_url": "https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?auto=format&fit=crop&w=600&q=80"
    },
    {
        "id": 19,
        "name": "Jewellery",
        "slug": "jewellery",
        "image_url": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80"
    },
    {
        "id": 20,
        "name": "Accessories",
        "slug": "accessories",
        "image_url": "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=600&q=80"
    },
    {
        "id": 21,
        "name": "Office Supplies",
        "slug": "office-supplies",
        "image_url": "https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?auto=format&fit=crop&w=600&q=80"
    },
    {
        "id": 22,
        "name": "Music",
        "slug": "music",
        "image_url": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80"
    },
    {
        "id": 23,
        "name": "Books",
        "slug": "books",
        "image_url": "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80"
    },
    {
        "id": 24,
        "name": "Grocery",
        "slug": "grocery",
        "image_url": "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80"
    },
    {
        "id": 25,
        "name": "Toys",
        "slug": "toys",
        "image_url": "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=600&q=80"
    },
]

def migrate_and_seed():
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('categories')]
    
    with engine.connect() as conn:
        if 'slug' not in columns:
            print("Adding 'slug' column to categories table...")
            conn.execute(text("ALTER TABLE categories ADD COLUMN slug VARCHAR(100) NULL;"))
            conn.commit()
            print("Added 'slug' column successfully.")

        if 'image_url' not in columns:
            print("Adding 'image_url' column to categories table...")
            conn.execute(text("ALTER TABLE categories ADD COLUMN image_url TEXT NULL;"))
            conn.commit()
            print("Added 'image_url' column successfully.")

    db = SessionLocal()
    try:
        updated_count = 0
        for item in CATEGORY_DATA:
            cat = db.query(Category).filter(Category.id == item["id"]).first()
            if cat:
                cat.name = item["name"]
                cat.slug = item["slug"]
                cat.image_url = item["image_url"]
                cat.is_deleted = False
                updated_count += 1
            else:
                new_cat = Category(
                    id=item["id"],
                    name=item["name"],
                    slug=item["slug"],
                    image_url=item["image_url"],
                    is_deleted=False
                )
                db.add(new_cat)
                updated_count += 1
        db.commit()
        print(f"Successfully migrated and seeded {updated_count} categories!")
    finally:
        db.close()

if __name__ == "__main__":
    migrate_and_seed()
