from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import SubCategory, Category, Brand
from schemas import SubCategoryCreate, SubCategoryUpdate

router = APIRouter()


# Create Subcategory
@router.post("/subcategory", status_code=status.HTTP_201_CREATED)
def create_subcategory(
    subcategory: SubCategoryCreate,
    db: Session = Depends(get_db)
):
    # Verify parent Category exists
    parent_category = db.query(Category).filter(
        Category.id == subcategory.category_id,
        Category.is_deleted == False
    ).first()

    if not parent_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent category does not exist or has been deleted."
        )

    # Check duplicate subcategory name within this category
    existing = db.query(SubCategory).filter(
        SubCategory.category_id == subcategory.category_id,
        func.lower(SubCategory.name) == subcategory.name.lower(),
        SubCategory.is_deleted == False
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Subcategory '{subcategory.name}' already exists in this category."
        )

    new_subcategory = SubCategory(
        category_id=subcategory.category_id,
        name=subcategory.name,
        is_deleted=False
    )

    db.add(new_subcategory)
    db.commit()
    db.refresh(new_subcategory)

    return {
        "message": "Subcategory created successfully",
        "subcategory": {
            "id": new_subcategory.id,
            "category_id": new_subcategory.category_id,
            "name": new_subcategory.name
        }
    }


# Get All Subcategories
@router.get("/subcategory")
def get_subcategories(category_id: int = None, db: Session = Depends(get_db)):
    query = db.query(SubCategory).filter(
        SubCategory.is_deleted == False
    )
    if category_id is not None:
        query = query.filter(SubCategory.category_id == category_id)

    return query.all()


# Get Subcategory By ID
@router.get("/subcategory/{subcategory_id}")
def get_subcategory(subcategory_id: int, db: Session = Depends(get_db)):
    if subcategory_id <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid subcategory ID.")

    subcategory = db.query(SubCategory).filter(
        SubCategory.id == subcategory_id,
        SubCategory.is_deleted == False
    ).first()

    if not subcategory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SubCategory not found."
        )

    return subcategory


# Update Subcategory
@router.put("/subcategory/{subcategory_id}")
def update_subcategory(
    subcategory_id: int,
    data: SubCategoryUpdate,
    db: Session = Depends(get_db)
):
    if subcategory_id <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid subcategory ID.")

    subcategory = db.query(SubCategory).filter(
        SubCategory.id == subcategory_id,
        SubCategory.is_deleted == False
    ).first()

    if not subcategory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subcategory not found."
        )

    target_category_id = data.category_id or subcategory.category_id

    # If category changed, verify new parent exists
    if data.category_id is not None and data.category_id != subcategory.category_id:
        parent_category = db.query(Category).filter(
            Category.id == data.category_id,
            Category.is_deleted == False
        ).first()
        if not parent_category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target parent category does not exist."
            )
        subcategory.category_id = data.category_id

    # If name changed, verify uniqueness within target category
    target_name = data.name or subcategory.name
    if data.name is not None:
        dup = db.query(SubCategory).filter(
            SubCategory.category_id == target_category_id,
            func.lower(SubCategory.name) == target_name.lower(),
            SubCategory.id != subcategory_id,
            SubCategory.is_deleted == False
        ).first()
        if dup:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Another subcategory with name '{target_name}' already exists in this category."
            )
        subcategory.name = data.name

    db.commit()
    db.refresh(subcategory)

    return {
        "message": "Subcategory updated successfully",
        "subcategory": {
            "id": subcategory.id,
            "category_id": subcategory.category_id,
            "name": subcategory.name
        }
    }


# Soft Delete SubCategory
@router.delete("/subcategory/{subcategory_id}")
def delete_subcategory(subcategory_id: int, db: Session = Depends(get_db)):
    if subcategory_id <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid subcategory ID.")

    subcategory = db.query(SubCategory).filter(
        SubCategory.id == subcategory_id,
        SubCategory.is_deleted == False
    ).first()

    if not subcategory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SubCategory not found."
        )

    # Dependency Validation: check if active brands are linked
    linked_brands = db.query(Brand).filter(
        Brand.subcategory_id == subcategory_id,
        Brand.is_deleted == False
    ).first()

    if linked_brands:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete subcategory: active brands are linked to it. Delete or reassign them first."
        )

    subcategory.is_deleted = True
    db.commit()

    return {
        "message": f"SubCategory with ID {subcategory_id} soft deleted successfully"
    }


# Restore SubCategory
@router.put("/subcategory/restore/{subcategory_id}")
def restore_subcategory(subcategory_id: int, db: Session = Depends(get_db)):
    if subcategory_id <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid subcategory ID.")

    subcategory = db.query(SubCategory).filter(
        SubCategory.id == subcategory_id
    ).first()

    if not subcategory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SubCategory not found."
        )

    subcategory.is_deleted = False
    db.commit()

    return {
        "message": f"SubCategory with ID {subcategory_id} restored successfully"
    }