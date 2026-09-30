import re
import html
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


def sanitize_text(value: str | None) -> str:
    if value is None:
        return ""
    # Strip HTML tags
    clean = re.sub(r"<[^>]*?>", "", str(value))
    # Unescape any HTML entities then re-strip
    clean = html.unescape(clean)
    clean = re.sub(r"<[^>]*?>", "", clean)
    return clean.strip()


def validate_image_payload(image_data: str | None) -> str | None:
    if not image_data:
        return None
    data_str = image_data.strip()
    if data_str.startswith("http://") or data_str.startswith("https://") or data_str.startswith("/"):
        return data_str

    if data_str.startswith("data:image/"):
        match = re.match(r"^data:image\/(jpeg|jpg|png|webp);base64,", data_str, re.IGNORECASE)
        if not match:
            raise ValueError("Only JPG, PNG, and WEBP image formats are supported.")
        base64_part = data_str.split(",", 1)[1] if "," in data_str else ""
        size_bytes = len(base64_part) * 3 / 4
        if size_bytes > 5 * 1024 * 1024:
            raise ValueError("Image file size exceeds the 5MB maximum limit.")
        return data_str

    # Allow standard relative path or name
    if any(data_str.lower().endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp"]):
        return data_str

    return data_str


# Customer Signup
class SignupUser(BaseModel):
    name: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)
    gender: str = Field(...)
    mobile: str = Field(...)
    address: str = Field(..., min_length=5, max_length=255)
    profile_photo: str | None = None

    @field_validator("name", "address")
    @classmethod
    def sanitize_strings(cls, v: str) -> str:
        cleaned = sanitize_text(v)
        if not cleaned:
            raise ValueError("Field cannot be empty or only spaces.")
        return cleaned

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: EmailStr) -> str:
        return str(v).strip().lower()

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        clean_num = re.sub(r"\D", "", v.strip())
        if not re.match(r"^[0-9]{10}$", clean_num):
            raise ValueError("Mobile number must be exactly 10 digits.")
        return clean_num

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: str) -> str:
        valid_genders = ["Male", "Female", "Other"]
        matched = next((g for g in valid_genders if g.lower() == v.strip().lower()), None)
        if not matched:
            raise ValueError("Gender must be Male, Female, or Other.")
        return matched

    @field_validator("profile_photo")
    @classmethod
    def check_photo(cls, v: str | None) -> str | None:
        return validate_image_payload(v)

    @model_validator(mode="after")
    def verify_passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self


# Customer Login
class LoginUser(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: EmailStr) -> str:
        return str(v).strip().lower()


# Profile Update
class UpdateUser(BaseModel):
    name: str = Field(..., min_length=3, max_length=50)
    gender: str = Field(...)
    mobile: str = Field(...)
    address: str = Field(..., min_length=5, max_length=255)
    profile_photo: str | None = None
    email: EmailStr | None = None
    password: str | None = None
    confirm_password: str | None = None

    @field_validator("name", "address")
    @classmethod
    def sanitize_strings(cls, v: str) -> str:
        cleaned = sanitize_text(v)
        if not cleaned:
            raise ValueError("Field cannot be empty or only spaces.")
        return cleaned

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        clean_num = re.sub(r"\D", "", v.strip())
        if not re.match(r"^[0-9]{10}$", clean_num):
            raise ValueError("Mobile number must be exactly 10 digits.")
        return clean_num

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: str) -> str:
        valid_genders = ["Male", "Female", "Other"]
        matched = next((g for g in valid_genders if g.lower() == v.strip().lower()), None)
        if not matched:
            raise ValueError("Gender must be Male, Female, or Other.")
        return matched

    @field_validator("profile_photo")
    @classmethod
    def check_photo(cls, v: str | None) -> str | None:
        return validate_image_payload(v)

    @model_validator(mode="after")
    def check_password_update(self):
        if self.password:
            if len(self.password) < 8:
                raise ValueError("New password must be at least 8 characters.")
            if self.password != self.confirm_password:
                raise ValueError("Passwords do not match.")
        return self


# Category
class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    slug: str | None = None
    image_url: str | None = None

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        cleaned = sanitize_text(v)
        if len(cleaned) < 2:
            raise ValueError("Category name must be at least 2 characters.")
        return cleaned

    @field_validator("image_url")
    @classmethod
    def check_image(cls, v: str | None) -> str | None:
        return validate_image_payload(v)


class CategoryUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    image_url: str | None = None

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str | None) -> str | None:
        if v is None:
            return None
        cleaned = sanitize_text(v)
        if len(cleaned) < 2:
            raise ValueError("Category name must be at least 2 characters.")
        return cleaned

    @field_validator("image_url")
    @classmethod
    def check_image(cls, v: str | None) -> str | None:
        return validate_image_payload(v)


# SubCategory
class SubCategoryCreate(BaseModel):
    category_id: int = Field(..., gt=0)
    name: str = Field(..., min_length=2, max_length=100)

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        cleaned = sanitize_text(v)
        if len(cleaned) < 2:
            raise ValueError("Subcategory name must be at least 2 characters.")
        return cleaned


class SubCategoryUpdate(BaseModel):
    category_id: int | None = Field(None, gt=0)
    name: str | None = None

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str | None) -> str | None:
        if v is None:
            return None
        cleaned = sanitize_text(v)
        if len(cleaned) < 2:
            raise ValueError("Subcategory name must be at least 2 characters.")
        return cleaned


# Brand
class BrandCreate(BaseModel):
    subcategory_id: int = Field(..., gt=0)
    name: str = Field(..., min_length=2, max_length=100)

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        cleaned = sanitize_text(v)
        if len(cleaned) < 2:
            raise ValueError("Brand name must be at least 2 characters.")
        return cleaned


class BrandUpdate(BaseModel):
    subcategory_id: int | None = Field(None, gt=0)
    name: str | None = None

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str | None) -> str | None:
        if v is None:
            return None
        cleaned = sanitize_text(v)
        if len(cleaned) < 2:
            raise ValueError("Brand name must be at least 2 characters.")
        return cleaned


# Product
class ProductCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=200)
    price: float = Field(..., gt=0)
    quantity: int = Field(..., gt=0)
    details: str = Field(..., min_length=20, max_length=2000)
    brand_id: int = Field(..., gt=0)
    image_url: str | None = None

    @field_validator("name", "details")
    @classmethod
    def clean_text(cls, v: str) -> str:
        cleaned = sanitize_text(v)
        return cleaned

    @field_validator("image_url")
    @classmethod
    def check_image(cls, v: str | None) -> str | None:
        return validate_image_payload(v)


class ProductUpdate(BaseModel):
    name: str | None = None
    price: float | None = Field(None, gt=0)
    quantity: int | None = Field(None, ge=0)
    details: str | None = None
    brand_id: int | None = Field(None, gt=0)
    image_url: str | None = None

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str | None) -> str | None:
        if v is None:
            return None
        cleaned = sanitize_text(v)
        if len(cleaned) < 3:
            raise ValueError("Product name must be at least 3 characters.")
        return cleaned

    @field_validator("details")
    @classmethod
    def clean_details(cls, v: str | None) -> str | None:
        if v is None:
            return None
        cleaned = sanitize_text(v)
        if len(cleaned) < 20:
            raise ValueError("Product details must be at least 20 characters.")
        return cleaned

    @field_validator("image_url")
    @classmethod
    def check_image(cls, v: str | None) -> str | None:
        return validate_image_payload(v)


# Cart
class CartCreate(BaseModel):
    user_id: int = Field(..., gt=0)
    product_id: int = Field(..., gt=0)
    quantity: int = Field(..., gt=0)


class CartUpdate(BaseModel):
    quantity: int = Field(..., gt=0)


# Wishlist
class WishlistCreate(BaseModel):
    user_id: int = Field(..., gt=0)
    product_id: int = Field(..., gt=0)


# Order
class OrderCreate(BaseModel):
    user_id: int = Field(..., gt=0)
    product_id: int = Field(..., gt=0)
    quantity: int = Field(..., gt=0)


class OrderStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        valid_statuses = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"]
        matched = next((s for s in valid_statuses if s.lower() == v.strip().lower()), None)
        if not matched:
            raise ValueError(f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
        return matched


# Slider
class SliderCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    image: str
    description: str | None = None
    link: str | None = None

    @field_validator("title")
    @classmethod
    def clean_title(cls, v: str) -> str:
        return sanitize_text(v)

    @field_validator("image")
    @classmethod
    def check_image(cls, v: str) -> str:
        validated = validate_image_payload(v)
        if not validated:
            raise ValueError("Slider image is required.")
        return validated


# FAQ
class FAQCreate(BaseModel):
    question: str = Field(..., min_length=5, max_length=500)
    answer: str = Field(..., min_length=5, max_length=2000)

    @field_validator("question", "answer")
    @classmethod
    def clean_text(cls, v: str) -> str:
        cleaned = sanitize_text(v)
        if len(cleaned) < 5:
            raise ValueError("Field must contain at least 5 characters.")
        return cleaned


# Blog
class BlogCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=10, max_length=5000)
    thumbnail: str | None = None
    seo_slug: str | None = None

    @field_validator("title", "description")
    @classmethod
    def clean_text(cls, v: str) -> str:
        return sanitize_text(v)

    @field_validator("thumbnail")
    @classmethod
    def check_thumbnail(cls, v: str | None) -> str | None:
        return validate_image_payload(v)


# Contact Us
class ContactCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    subject: str = Field(..., min_length=3, max_length=200)
    message: str = Field(..., min_length=10, max_length=2000)

    @field_validator("name", "subject", "message")
    @classmethod
    def clean_text(cls, v: str) -> str:
        cleaned = sanitize_text(v)
        return cleaned

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: EmailStr) -> str:
        return str(v).strip().lower()


# About Page
class AboutCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=10, max_length=5000)

    @field_validator("title", "description")
    @classmethod
    def clean_text(cls, v: str) -> str:
        return sanitize_text(v)