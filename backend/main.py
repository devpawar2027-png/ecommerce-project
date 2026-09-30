from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from database import engine, Base, get_db
from models import User
from schemas import UpdateUser
from signup import router as signup_router
from login import router as login_router
from category import router as category_router
from subcategory import router as subcategory_router
from brand import router as brand_router
from product import router as product_router
from cart import router as cart_router
from wishlist import router as wishlist_router
from order import router as order_router
from slider import router as slider_router
from faq import router as faq_router
from blog import router as blog_router
from contact import router as contact_router
from about import router as about_router

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Ecommerce API", version="2.0.0")

# Custom validation error handler for friendly client-facing errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        field = err["loc"][-1] if err["loc"] else "body"
        msg = err["msg"]
        errors.append(f"{field}: {msg}")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "; ".join(errors),
            "errors": exc.errors()
        }
    )

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://127.0.0.1:4200"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {
        "message": "Ecommerce API v2.0 with Full Enterprise Validation"
    }

# Routers
app.include_router(signup_router)
app.include_router(login_router)
app.include_router(category_router)
app.include_router(subcategory_router)
app.include_router(brand_router)
app.include_router(product_router)
app.include_router(cart_router)
app.include_router(wishlist_router)
app.include_router(order_router)
app.include_router(slider_router)
app.include_router(faq_router)
app.include_router(blog_router)
app.include_router(contact_router)
app.include_router(about_router)


# User Profile Endpoints with Enterprise Validation
@app.get("/profile/{user_id}")
def get_profile(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found or inactive")
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "gender": user.gender,
        "mobile": user.mobile,
        "address": user.address,
        "profile_photo": user.profile_photo
    }


@app.put("/profile/{user_id}")
def update_profile(user_id: int, user_data: UpdateUser, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found or inactive")

    # If mobile is updated, ensure it's not already used by another user
    if user_data.mobile and user_data.mobile != user.mobile:
        existing_mobile = db.query(User).filter(
            User.mobile == user_data.mobile,
            User.id != user_id,
            User.is_deleted == False
        ).first()
        if existing_mobile:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This mobile number is already registered to another account"
            )
        user.mobile = user_data.mobile

    if user_data.name is not None:
        user.name = user_data.name
    if user_data.address is not None:
        user.address = user_data.address
    if user_data.gender is not None:
        user.gender = user_data.gender
    if user_data.profile_photo is not None:
        user.profile_photo = user_data.profile_photo

    db.commit()
    db.refresh(user)

    return {
        "message": "Profile updated successfully",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "gender": user.gender,
            "mobile": user.mobile,
            "address": user.address,
            "profile_photo": user.profile_photo
        }
    }