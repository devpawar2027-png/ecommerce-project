import sys
from sqlalchemy import text
from database import engine, SessionLocal
from models import Category, SubCategory, Brand, Product

def seed_database():
    session = SessionLocal()
    try:
        print("1. Clearing existing data...")
        # Clear child tables first to respect foreign key constraints
        session.execute(text("DELETE FROM orders;"))
        session.execute(text("DELETE FROM cart;"))
        session.execute(text("DELETE FROM wishlist;"))
        session.execute(text("DELETE FROM product;"))
        session.execute(text("DELETE FROM brands;"))
        session.execute(text("DELETE FROM subcategories;"))
        session.execute(text("DELETE FROM categories;"))

        # Reset auto increments
        session.execute(text("ALTER TABLE categories AUTO_INCREMENT = 1;"))
        session.execute(text("ALTER TABLE subcategories AUTO_INCREMENT = 1;"))
        session.execute(text("ALTER TABLE brands AUTO_INCREMENT = 1;"))
        session.execute(text("ALTER TABLE product AUTO_INCREMENT = 1;"))
        session.commit()
        print("Existing data cleared successfully.")

        # =========================================================================
        # 25 Categories, 25 Subcategories, 25 Brands, 25 Products
        # =========================================================================
        items = [
            {
                "category": "Electronics",
                "subcategory": "Headphones & Audio",
                "brand": "Sony",
                "product_name": "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
                "price": 29990.0,
                "quantity": 25,
                "details": "Industry-leading noise cancellation with two processors and eight microphones, exceptional sound quality with ultra-clear call quality.",
                "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=80",
            },
            {
                "category": "Mobile",
                "subcategory": "Smartphones",
                "brand": "Apple",
                "product_name": "iPhone 16 Pro Max 256GB Desert Titanium",
                "price": 144900.0,
                "quantity": 18,
                "details": "Titanium design with larger 6.9-inch Super Retina XDR display, Camera Control button, and A18 Pro Bionic chip.",
                "image_url": "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1000&q=80",
            },
            {
                "category": "Laptop",
                "subcategory": "Ultrabooks",
                "brand": "Dell",
                "product_name": "Dell XPS 13 OLED Laptop (Intel Core Ultra 7, 32GB, 1TB SSD)",
                "price": 154990.0,
                "quantity": 12,
                "details": "Precision-crafted aluminum chassis, stunning 3K OLED InfinityEdge touch display, and all-day battery life.",
                "image_url": "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=1000&q=80",
            },
            {
                "category": "Gaming",
                "subcategory": "Gaming Consoles",
                "brand": "PlayStation",
                "product_name": "Sony PlayStation 5 Slim Console 1TB Disc Edition",
                "price": 54990.0,
                "quantity": 20,
                "details": "Experience lightning-fast loading with an ultra-high speed SSD, deeper immersion with haptic feedback, and 4K gaming.",
                "image_url": "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1000&q=80",
            },
            {
                "category": "Watches",
                "subcategory": "Smartwatches",
                "brand": "Samsung",
                "product_name": "Samsung Galaxy Watch Ultra 47mm LTE Titanium",
                "price": 59999.0,
                "quantity": 15,
                "details": "Rugged cushion titanium design, Dual-frequency GPS, 10ATM water resistance, and advanced AI health tracking.",
                "image_url": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80",
            },
            {
                "category": "Footwear",
                "subcategory": "Running Shoes",
                "brand": "Nike",
                "product_name": "Nike Air Max 270 React Running Sneakers",
                "price": 11995.0,
                "quantity": 35,
                "details": "Boasts Nike's biggest heel Air unit yet for a super-soft ride that feels as impossible as it looks. Breathable mesh upper.",
                "image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=80",
            },
            {
                "category": "Fashion",
                "subcategory": "Men's Jackets",
                "brand": "Levi's",
                "product_name": "Levi's Classic Sherpa Trucker Denim Jacket",
                "price": 5499.0,
                "quantity": 40,
                "details": "Authentic vintage style trucker jacket lined with cozy sherpa insulation for warmth and timeless fashion.",
                "image_url": "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=1000&q=80",
            },
            {
                "category": "Fitness",
                "subcategory": "Home Gym Equipment",
                "brand": "Bowflex",
                "product_name": "Bowflex SelectTech 552 Adjustable Dumbbells Pair",
                "price": 32990.0,
                "quantity": 10,
                "details": "Replaces 15 sets of weights, adjusts from 5 to 52.5 lbs with a simple dial turn for quiet, versatile home workouts.",
                "image_url": "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=1000&q=80",
            },
            {
                "category": "Kitchen",
                "subcategory": "Coffee Machines",
                "brand": "De'Longhi",
                "product_name": "De'Longhi Dedica Deluxe Espresso Machine",
                "price": 21990.0,
                "quantity": 14,
                "details": "Compact 15-bar professional pump espresso and cappuccino maker with manual milk frother and stainless steel finish.",
                "image_url": "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=1000&q=80",
            },
            {
                "category": "Home & Living",
                "subcategory": "Lighting & Lamps",
                "brand": "Philips",
                "product_name": "Philips Hue Smart Ambiance Table Lamp",
                "price": 7999.0,
                "quantity": 30,
                "details": "16 million colors, instant wireless Bluetooth control, compatible with Alexa and Google Assistant.",
                "image_url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1000&q=80",
            },
            {
                "category": "Furniture",
                "subcategory": "Ergonomic Chairs",
                "brand": "Herman Miller",
                "product_name": "Herman Miller Aeron Ergonomic Office Chair",
                "price": 89999.0,
                "quantity": 8,
                "details": "Renowned ergonomic design with breathable Pellicle mesh, adjustable PostureFit SL sacral support, and forward tilt.",
                "image_url": "https://images.unsplash.com/photo-1580481077111-53697e3f8485?auto=format&fit=crop&w=1000&q=80",
            },
            {
                "category": "Beauty",
                "subcategory": "Skincare Serums",
                "brand": "Estee Lauder",
                "product_name": "Advanced Night Repair Synchronized Multi-Recovery Complex 50ml",
                "price": 8900.0,
                "quantity": 50,
                "details": "Deep and fast-penetrating face serum that significantly reduces multiple signs of aging for radiant, youthful skin.",
                "image_url": "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1000&q=80",
            },
            {
                "category": "Health",
                "subcategory": "Oral Care",
                "brand": "Oral-B",
                "product_name": "Oral-B iO Series 9 Electric Toothbrush",
                "price": 16999.0,
                "quantity": 22,
                "details": "Revolutionary magnetic iO technology with 3D teeth tracking and interactive color display for professional clean.",
                "image_url": "https://images.unsplash.com/photo-1559591937-e10538965551?auto=format&fit=crop&w=1000&q=80",
            },
            {
                "category": "Sports",
                "subcategory": "Tennis Racquets",
                "brand": "Wilson",
                "product_name": "Wilson Pro Staff 97 v14 Performance Tennis Racket",
                "price": 19999.0,
                "quantity": 16,
                "details": "Classic precision feel engineered with Braid 45 technology and paradigm bending frame flexibility.",
                "image_url": "https://images.unsplash.com/photo-1617083934555-563d76378e9f?auto=format&fit=crop&w=1000&q=80",
            },
            {
                "category": "Automotive",
                "subcategory": "Dash Cameras",
                "brand": "70mai",
                "product_name": "70mai 4K A810 Smart Dash Cam with Sony Starvis 2 Sensor",
                "price": 14499.0,
                "quantity": 25,
                "details": "Ultra HD 4K front recording with HDR night vision, built-in GPS, ADAS driver assist, and 24H parking monitoring.",
                "image_url": "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80",
            },
            {
                "category": "Pet Supplies",
                "subcategory": "Dog Food & Nutrition",
                "brand": "Royal Canin",
                "product_name": "Royal Canin Maxi Adult Dry Dog Food 15kg",
                "price": 7299.0,
                "quantity": 45,
                "details": "Tailored high-digestibility nutrition with EPA & DHA to support large breed adult dogs, bone health, and shiny coat.",
                "image_url": "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=1000&q=80",
            },
            {
                "category": "Baby Care",
                "subcategory": "Strollers & Prams",
                "brand": "Chicco",
                "product_name": "Chicco Bravo Trio Travel System All-in-One Stroller",
                "price": 28990.0,
                "quantity": 11,
                "details": "Quick one-hand smart fold design, removable stroller seat, and KeyFit 30 infant car seat with multi-position recline.",
                "image_url": "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1000&q=80",
            },
            {
                "category": "Travel",
                "subcategory": "Luggage & Trolleys",
                "brand": "Samsonite",
                "product_name": "Samsonite Freeform Hardside Expandable Spinner 28-Inch",
                "price": 17499.0,
                "quantity": 20,
                "details": "Ultra-light, ultra-strong polypropylene shell, recessed TSA lock, and dual spinner wheels for effortless 360 gliding.",
                "image_url": "https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?auto=format&fit=crop&w=1000&q=80",
            },
            {
                "category": "Jewellery",
                "subcategory": "Gold Necklaces",
                "brand": "Tanishq",
                "product_name": "Tanishq 18K Yellow Gold Diamond Solitaire Pendant Necklace",
                "price": 42999.0,
                "quantity": 15,
                "details": "Certified SI2 clarity conflict-free diamond delicately set in hallmarked 18-karat yellow gold rope chain.",
                "image_url": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=80",
            },
            {
                "category": "Accessories",
                "subcategory": "Sunglasses",
                "brand": "Ray-Ban",
                "product_name": "Ray-Ban Classic Aviator Polarized Sunglasses RB3025",
                "price": 9890.0,
                "quantity": 35,
                "details": "Iconic teardrop frame with polarized crystal green G-15 lenses offering 100% UV protection and glare elimination.",
                "image_url": "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=1000&q=80",
            },
            {
                "category": "Office Supplies",
                "subcategory": "Writing & Pens",
                "brand": "Montblanc",
                "product_name": "Montblanc Meisterstuck Classique Gold-Coated Fountain Pen",
                "price": 52000.0,
                "quantity": 10,
                "details": "Handcrafted Au585 / 14K gold nib with rhodium-coated inlay, deep black precious resin, and gold-plated clip.",
                "image_url": "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=1000&q=80",
            },
            {
                "category": "Music",
                "subcategory": "Acoustic Guitars",
                "brand": "Yamaha",
                "product_name": "Yamaha F310 Natural Full-Size Acoustic Guitar",
                "price": 9490.0,
                "quantity": 24,
                "details": "Spruce top with rosewood fingerboard, delivering sweet resonant tone, comfortable action, and legendary durability.",
                "image_url": "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=1000&q=80",
            },
            {
                "category": "Books",
                "subcategory": "Self-Help & Business",
                "brand": "Penguin",
                "product_name": "Atomic Habits: An Easy & Proven Way to Build Good Habits",
                "price": 699.0,
                "quantity": 80,
                "details": "Hardcover international bestseller by James Clear on habit formation, decision making, and continuous improvement.",
                "image_url": "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=1000&q=80",
            },
            {
                "category": "Grocery",
                "subcategory": "Gourmet Coffee Beans",
                "brand": "Blue Tokai",
                "product_name": "Blue Tokai Vienna Roast Dark Arabica Whole Beans 500g",
                "price": 620.0,
                "quantity": 60,
                "details": "100% specialty grade Arabica freshly roasted with rich notes of dark chocolate, cocoa nibs, and roasted almond.",
                "image_url": "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=1000&q=80",
            },
            {
                "category": "Toys",
                "subcategory": "Building & Construction",
                "brand": "LEGO",
                "product_name": "LEGO Icons Porsche 911 Turbo and Targa Collectible Set 10295",
                "price": 15999.0,
                "quantity": 18,
                "details": "1,458 pieces building kit with working steering, gearshift, emergency brake, tilting seats, and iconic spoiler.",
                "image_url": "https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?auto=format&fit=crop&w=1000&q=80",
            },
        ]

        print(f"2. Seeding {len(items)} complete hierarchy chains...")

        CATEGORY_META = {
            "Electronics": ("electronics", "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=600&q=80"),
            "Mobile": ("mobile", "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=600&q=80"),
            "Laptop": ("laptop", "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80"),
            "Gaming": ("gaming", "https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?auto=format&fit=crop&w=600&q=80"),
            "Watches": ("watches", "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=600&q=80"),
            "Footwear": ("footwear", "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80"),
            "Fashion": ("fashion", "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=600&q=80"),
            "Fitness": ("fitness", "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=600&q=80"),
            "Kitchen": ("kitchen", "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80"),
            "Home & Living": ("home-living", "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=600&q=80"),
            "Furniture": ("furniture", "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80"),
            "Beauty": ("beauty", "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80"),
            "Health": ("health", "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80"),
            "Sports": ("sports", "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=600&q=80"),
            "Automotive": ("automotive", "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80"),
            "Pet Supplies": ("pet-supplies", "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=600&q=80"),
            "Baby Care": ("baby-care", "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=600&q=80"),
            "Travel": ("travel", "https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?auto=format&fit=crop&w=600&q=80"),
            "Jewellery": ("jewellery", "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80"),
            "Accessories": ("accessories", "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=600&q=80"),
            "Office Supplies": ("office-supplies", "https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?auto=format&fit=crop&w=600&q=80"),
            "Music": ("music", "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80"),
            "Books": ("books", "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80"),
            "Grocery": ("grocery", "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80"),
            "Toys": ("toys", "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=600&q=80"),
        }

        for idx, row in enumerate(items, start=1):
            # 1. Create Category
            cat_name = row["category"]
            c_slug, c_img = CATEGORY_META.get(cat_name, (cat_name.lower().replace(" ", "-"), ""))
            cat = Category(
                name=cat_name,
                slug=c_slug,
                image_url=c_img,
                is_deleted=False
            )
            session.add(cat)
            session.flush()

            # 2. Create SubCategory linked to Category
            sub = SubCategory(category_id=cat.id, name=row["subcategory"], is_deleted=False)
            session.add(sub)
            session.flush()

            # 3. Create Brand linked to SubCategory
            brd = Brand(subcategory_id=sub.id, name=row["brand"], is_deleted=False)
            session.add(brd)
            session.flush()

            # 4. Create Product linked to Brand with high-res Image URL
            prod = Product(
                brand_id=brd.id,
                name=row["product_name"],
                price=row["price"],
                quantity=row["quantity"],
                details=row["details"],
                image_url=row["image_url"],
                is_deleted=False,
            )
            session.add(prod)
            session.flush()

            print(f"[{idx}/25] Created: {cat.name} -> {sub.name} -> {brd.name} -> {prod.name}")

        session.commit()
        print("SUCCESS: 25 Categories, 25 SubCategories, 25 Brands, and 25 Products seeded successfully!")

    except Exception as e:
        session.rollback()
        print("ERROR during seeding:", e)
        sys.exit(1)
    finally:
        session.close()

if __name__ == "__main__":
    seed_database()
