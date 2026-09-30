from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, Text
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    email = Column(String(255), unique=True)
    password = Column(String(255))
    gender = Column(String(20))
    mobile = Column(String(20))
    address = Column(String(255))

    profile_photo = Column(Text, nullable=True)

    is_deleted = Column(Boolean, default=False)
    
class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    slug = Column(String(100), nullable=True)
    image_url = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False)
    
class SubCategory(Base):
    __tablename__ = "subcategories"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"))
    name = Column(String(100))
    is_deleted = Column(Boolean, default=False)
    
class Brand(Base):
    __tablename__ = "brands"

    id = Column(Integer, primary_key=True, index=True)
    subcategory_id = Column(Integer, ForeignKey("subcategories.id"))
    name = Column(String(100))
    is_deleted = Column(Boolean, default=False)
    
class Product(Base):
    __tablename__ = "product"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255))
    price = Column(Float)
    quantity = Column(Integer)
    details = Column(String(500))
    brand_id = Column(Integer, ForeignKey("brands.id"))
    image_url = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False)
    
class Cart(Base):
    __tablename__ = "cart"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    product_id = Column(Integer, ForeignKey("product.id"))
    quantity = Column(Integer)
    is_deleted = Column(Boolean, default=False)
    
class Wishlist(Base):
    __tablename__ = "wishlist"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    product_id = Column(Integer, ForeignKey("product.id"))
    is_deleted = Column(Boolean, default=False)
    
class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    product_id = Column(Integer, ForeignKey("product.id"))
    quantity = Column(Integer)
    total_price = Column(Float)
    is_deleted = Column(Boolean, default=False)
    
class Slider(Base):
    __tablename__ = "sliders"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255))
    image = Column(String(255))
    is_deleted = Column(Boolean, default=False)
    
class FAQ(Base):
    __tablename__ = "faq"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(String(500))
    answer = Column(String(1000))
    is_deleted = Column(Boolean, default=False)
    
class Blog(Base):
    __tablename__ = "blogs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255))
    description = Column(String(2000))
    is_deleted = Column(Boolean, default=False)
    
class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255))
    email = Column(String(255))
    subject = Column(String(255))
    message = Column(String(2000))
    is_deleted = Column(Boolean, default=False)
    
class About(Base):
    __tablename__ = "about"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255))
    description = Column(String(3000))
    is_deleted = Column(Boolean, default=False)