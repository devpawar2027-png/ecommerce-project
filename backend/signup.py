from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import User
from schemas import SignupUser, UpdateUser

router = APIRouter()


# Create User (Signup)
@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(user: SignupUser, db: Session = Depends(get_db)):
    # Case-insensitive email uniqueness check
    existing_user = db.query(User).filter(
        func.lower(User.email) == user.email.lower(),
        User.is_deleted == False
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists."
        )

    # Mobile uniqueness check
    existing_mobile = db.query(User).filter(
        User.mobile == user.mobile,
        User.is_deleted == False
    ).first()

    if existing_mobile:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this mobile number already exists."
        )

    if user.password != user.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match."
        )

    new_user = User(
        name=user.name,
        email=user.email,
        password=user.password,
        gender=user.gender,
        mobile=user.mobile,
        address=user.address,
        profile_photo=user.profile_photo,
        is_deleted=False
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User registered successfully",
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "mobile": new_user.mobile,
            "gender": new_user.gender,
            "address": new_user.address,
            "profile_photo": new_user.profile_photo,
        }
    }


# Get All Active Users
@router.get("/signup")
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).filter(
        User.is_deleted == False
    ).all()

    return users


# Get User By ID
@router.get("/signup/{user_id}")
def get_user_by_id(user_id: int, db: Session = Depends(get_db)):
    if user_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID provided."
        )

    user = db.query(User).filter(
        User.id == user_id,
        User.is_deleted == False
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or account is deactivated."
        )

    return user


# Update Profile
@router.put("/signup/{user_id}")
def update_user(
    user_id: int,
    user_data: UpdateUser,
    db: Session = Depends(get_db)
):
    if user_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID."
        )

    user = db.query(User).filter(
        User.id == user_id,
        User.is_deleted == False
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    # Check email duplicate if updated
    if user_data.email and user_data.email.lower() != user.email.lower():
        dup = db.query(User).filter(
            func.lower(User.email) == user_data.email.lower(),
            User.id != user_id,
            User.is_deleted == False
        ).first()
        if dup:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email address is already in use by another account."
            )
        user.email = user_data.email

    # Check mobile duplicate if updated
    if user_data.mobile and user_data.mobile != user.mobile:
        dup_mob = db.query(User).filter(
            User.mobile == user_data.mobile,
            User.id != user_id,
            User.is_deleted == False
        ).first()
        if dup_mob:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Mobile number is already registered with another account."
            )
        user.mobile = user_data.mobile

    user.name = user_data.name
    user.gender = user_data.gender
    user.address = user_data.address
    if user_data.profile_photo is not None:
        user.profile_photo = user_data.profile_photo
    if user_data.password:
        user.password = user_data.password

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


# Soft Delete User
@router.delete("/signup/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    if user_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID."
        )

    user = db.query(User).filter(
        User.id == user_id,
        User.is_deleted == False
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    user.is_deleted = True
    db.commit()

    return {
        "message": "User soft deleted successfully"
    }


# Restore User
@router.put("/signup/restore/{user_id}")
def restore_user(user_id: int, db: Session = Depends(get_db)):
    if user_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID."
        )

    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    user.is_deleted = False
    db.commit()

    return {
        "message": "User restored successfully"
    }