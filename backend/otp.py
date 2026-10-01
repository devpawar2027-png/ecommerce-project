from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import SendOtpRequest, VerifyOtpRequest, LoginOtpRequest
from otp_service import get_otp_provider

router = APIRouter()


# Send OTP (for OTP Login, Signup Verification, or Resend)
@router.post("/send-otp")
def send_otp(req: SendOtpRequest, db: Session = Depends(get_db)):
    mobile = req.mobile.strip()

    if req.purpose == "login":
        # Check if user exists and is active
        user = db.query(User).filter(
            User.mobile == mobile
        ).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account found with this mobile number. Please sign up first."
            )

        if user.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been deactivated. Please contact support."
            )

    provider = get_otp_provider()
    otp_code = provider.generate_otp(mobile)
    sent = provider.send_otp(mobile, otp_code)

    if not sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send OTP. Please try again later."
        )

    return {
        "message": f"OTP sent successfully to +91 {mobile}",
        "mobile": mobile,
        "dev_otp": otp_code,  # Sent for dev/testing convenience
    }


# Verify OTP (Post-Signup Verification)
@router.post("/verify-otp")
def verify_otp(req: VerifyOtpRequest, db: Session = Depends(get_db)):
    mobile = req.mobile.strip()
    otp_code = req.otp.strip()

    provider = get_otp_provider()
    is_valid = provider.verify_otp(mobile, otp_code)

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP. Please try again."
        )

    user = db.query(User).filter(
        User.mobile == mobile,
        User.is_deleted == False
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )

    user.is_mobile_verified = True
    db.commit()
    db.refresh(user)

    return {
        "message": "Mobile number verified successfully.",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "mobile": user.mobile,
            "gender": user.gender,
            "address": user.address,
            "profile_photo": user.profile_photo,
            "is_mobile_verified": user.is_mobile_verified,
        }
    }


# Login with Mobile + OTP
@router.post("/login-otp")
def login_with_otp(req: LoginOtpRequest, db: Session = Depends(get_db)):
    mobile = req.mobile.strip()
    otp_code = req.otp.strip()

    user = db.query(User).filter(
        User.mobile == mobile
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this mobile number. Please check your number or sign up."
        )

    if user.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact support."
        )

    provider = get_otp_provider()
    is_valid = provider.verify_otp(mobile, otp_code)

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP. Please try again."
        )

    # If mobile was not marked verified yet, mark it verified now
    if not user.is_mobile_verified:
        user.is_mobile_verified = True
        db.commit()
        db.refresh(user)

    return {
        "message": "Login successful",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "mobile": user.mobile,
            "gender": user.gender,
            "address": user.address,
            "profile_photo": user.profile_photo,
            "is_mobile_verified": user.is_mobile_verified,
        }
    }
