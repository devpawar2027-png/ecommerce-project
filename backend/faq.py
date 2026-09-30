from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import FAQ
from schemas import FAQCreate

router = APIRouter()


# Create FAQ
@router.post("/faq")
def create_faq(faq: FAQCreate, db: Session = Depends(get_db)):

    new_faq = FAQ(
        question=faq.question,
        answer=faq.answer
    )

    db.add(new_faq)
    db.commit()
    db.refresh(new_faq)

    return {
        "message": "FAQ created successfully",
        "faq": new_faq
    }


# Get All FAQs
@router.get("/faq")
def get_faqs(db: Session = Depends(get_db)):

    faqs = db.query(FAQ).filter(
        FAQ.is_deleted == False
    ).all()

    return faqs


# Get FAQ By ID
@router.get("/faq/{faq_id}")
def get_faq(faq_id: int, db: Session = Depends(get_db)):

    faq = db.query(FAQ).filter(
        FAQ.id == faq_id,
        FAQ.is_deleted == False
    ).first()

    if not faq:
        raise HTTPException(
            status_code=404,
            detail="FAQ not found"
        )

    return faq


# Update FAQ
@router.put("/faq/{faq_id}")
def update_faq(
    faq_id: int,
    data: dict,
    db: Session = Depends(get_db)
):

    faq = db.query(FAQ).filter(
        FAQ.id == faq_id,
        FAQ.is_deleted == False
    ).first()

    if not faq:
        raise HTTPException(
            status_code=404,
            detail="FAQ not found"
        )

    faq.question = data.get("question", faq.question)
    faq.answer = data.get("answer", faq.answer)

    db.commit()
    db.refresh(faq)

    return {
        "message": "FAQ updated successfully",
        "faq": faq
    }


# Soft Delete FAQ
@router.delete("/faq/{faq_id}")
def delete_faq(faq_id: int, db: Session = Depends(get_db)):

    faq = db.query(FAQ).filter(
        FAQ.id == faq_id,
        FAQ.is_deleted == False
    ).first()

    if not faq:
        raise HTTPException(
            status_code=404,
            detail="FAQ not found"
        )

    faq.is_deleted = True

    db.commit()

    return {
        "message": f"FAQ with ID {faq_id} soft deleted successfully"
    }


# Restore FAQ
@router.put("/faq/restore/{faq_id}")
def restore_faq(faq_id: int, db: Session = Depends(get_db)):

    faq = db.query(FAQ).filter(
        FAQ.id == faq_id
    ).first()

    if not faq:
        raise HTTPException(
            status_code=404,
            detail="FAQ not found"
        )

    faq.is_deleted = False

    db.commit()

    return {
        "message": f"FAQ with ID {faq_id} restored successfully"
    }