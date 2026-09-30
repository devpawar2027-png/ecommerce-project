from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Slider
from schemas import SliderCreate

router = APIRouter()


# Create Slider
@router.post("/slider")
def create_slider(slider: SliderCreate, db: Session = Depends(get_db)):

    new_slider = Slider(
        title=slider.title,
        image=slider.image
    )

    db.add(new_slider)
    db.commit()
    db.refresh(new_slider)

    return {
        "message": "Slider created successfully",
        "slider": new_slider
    }


# Get All Sliders
@router.get("/slider")
def get_sliders(db: Session = Depends(get_db)):

    sliders = db.query(Slider).filter(
        Slider.is_deleted == False
    ).all()

    return sliders


# Get Slider By ID
@router.get("/slider/{slider_id}")
def get_slider(slider_id: int, db: Session = Depends(get_db)):

    slider = db.query(Slider).filter(
        Slider.id == slider_id,
        Slider.is_deleted == False
    ).first()

    if not slider:
        raise HTTPException(
            status_code=404,
            detail="Slider not found"
        )

    return slider


# Update Slider
@router.put("/slider/{slider_id}")
def update_slider(
    slider_id: int,
    data: dict,
    db: Session = Depends(get_db)
):

    slider = db.query(Slider).filter(
        Slider.id == slider_id,
        Slider.is_deleted == False
    ).first()

    if not slider:
        raise HTTPException(
            status_code=404,
            detail="Slider not found"
        )

    slider.title = data.get("title", slider.title)
    slider.image = data.get("image", slider.image)

    db.commit()
    db.refresh(slider)

    return {
        "message": "Slider updated successfully",
        "slider": slider
    }


# Soft Delete Slider
@router.delete("/slider/{slider_id}")
def delete_slider(slider_id: int, db: Session = Depends(get_db)):

    slider = db.query(Slider).filter(
        Slider.id == slider_id,
        Slider.is_deleted == False
    ).first()

    if not slider:
        raise HTTPException(
            status_code=404,
            detail="Slider not found"
        )

    slider.is_deleted = True

    db.commit()

    return {
        "message": f"Slider with ID {slider_id} soft deleted successfully"
    }


# Restore Slider
@router.put("/slider/restore/{slider_id}")
def restore_slider(slider_id: int, db: Session = Depends(get_db)):

    slider = db.query(Slider).filter(
        Slider.id == slider_id
    ).first()

    if not slider:
        raise HTTPException(
            status_code=404,
            detail="Slider not found"
        )

    slider.is_deleted = False

    db.commit()

    return {
        "message": f"Slider with ID {slider_id} restored successfully"
    }