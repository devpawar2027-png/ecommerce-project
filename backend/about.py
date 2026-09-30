from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import About
from schemas import AboutCreate

router = APIRouter()


# Create About
@router.post("/about")
def create_about(about: AboutCreate, db: Session = Depends(get_db)):

    new_about = About(
        title=about.title,
        description=about.description
    )

    db.add(new_about)
    db.commit()
    db.refresh(new_about)

    return {
        "message": "About created successfully",
        "about": new_about
    }


# Get All About
@router.get("/about")
def get_abouts(db: Session = Depends(get_db)):

    abouts = db.query(About).filter(
        About.is_deleted == False
    ).all()

    return abouts


# Get About By ID
@router.get("/about/{about_id}")
def get_about(about_id: int, db: Session = Depends(get_db)):

    about = db.query(About).filter(
        About.id == about_id,
        About.is_deleted == False
    ).first()

    if not about:
        raise HTTPException(
            status_code=404,
            detail="About not found"
        )

    return about


# Update About
@router.put("/about/{about_id}")
def update_about(
    about_id: int,
    data: dict,
    db: Session = Depends(get_db)
):

    about = db.query(About).filter(
        About.id == about_id,
        About.is_deleted == False
    ).first()

    if not about:
        raise HTTPException(
            status_code=404,
            detail="About not found"
        )

    about.title = data.get("title", about.title)
    about.description = data.get(
        "description",
        about.description
    )

    db.commit()
    db.refresh(about)

    return {
        "message": "About updated successfully",
        "about": about
    }


# Soft Delete About
@router.delete("/about/{about_id}")
def delete_about(
    about_id: int,
    db: Session = Depends(get_db)
):

    about = db.query(About).filter(
        About.id == about_id,
        About.is_deleted == False
    ).first()

    if not about:
        raise HTTPException(
            status_code=404,
            detail="About not found"
        )

    about.is_deleted = True

    db.commit()

    return {
        "message": f"About with ID {about_id} soft deleted successfully"
    }


# Restore About
@router.put("/about/restore/{about_id}")
def restore_about(
    about_id: int,
    db: Session = Depends(get_db)
):

    about = db.query(About).filter(
        About.id == about_id
    ).first()

    if not about:
        raise HTTPException(
            status_code=404,
            detail="About not found"
        )

    about.is_deleted = False

    db.commit()

    return {
        "message": f"About with ID {about_id} restored successfully"
    }