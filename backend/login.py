from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import User
from schemas import LoginUser

router = APIRouter()


# Login
@router.post("/login")
def login(user: LoginUser, db: Session = Depends(get_db)):
    # Check if account exists
    existing_user = db.query(User).filter(
        func.lower(User.email) == user.email.lower()
    ).first()

    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # Block deleted / deactivated accounts
    if existing_user.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact support."
        )

    if existing_user.password != user.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    return {
        "message": "Login successful",
        "user": {
            "id": existing_user.id,
            "name": existing_user.name,
            "address": existing_user.address,
            "mobile": existing_user.mobile,
            "gender": existing_user.gender,
            "email": existing_user.email,
            "profile_photo": existing_user.profile_photo,
        }
    }


# Get All Active Users
@router.get("/login")
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).filter(
        User.is_deleted == False
    ).all()

    return [
        {
            "id": user.id,
            "name": user.name,
            "address": user.address,
            "mobile": user.mobile,
            "gender": user.gender,
            "email": user.email,
            "profile_photo": user.profile_photo,
        }
        for user in users
    ]


# Get User By ID
@router.get("/login/{user_id}")
def get_user_by_id(user_id: int, db: Session = Depends(get_db)):
    if user_id <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID.")

    user = db.query(User).filter(
        User.id == user_id,
        User.is_deleted == False
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    return {
        "id": user.id,
        "name": user.name,
        "address": user.address,
        "mobile": user.mobile,
        "gender": user.gender,
        "email": user.email,
        "profile_photo": user.profile_photo,
    }