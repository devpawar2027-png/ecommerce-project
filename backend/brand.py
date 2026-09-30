from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Brand, SubCategory, Product
from schemas import BrandCreate, BrandUpdate

router = APIRouter()


# Create Brand
@router.post("/brand", status_code=status.HTTP_201_CREATED)
def create_brand(
    brand: BrandCreate,
    db: Session = Depends(get_db)
):
    # Verify parent SubCategory exists
    parent_sub = db.query(SubCategory).filter(
        SubCategory.id == brand.subcategory_id,
        SubCategory.is_deleted == False
    ).first()

    if not parent_sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent subcategory does not exist or has been deleted."
        )

    # Check duplicate brand within this subcategory
    existing = db.query(Brand).filter(
        Brand.subcategory_id == brand.subcategory_id,
        func.lower(Brand.name) == brand.name.lower(),
        Brand.is_deleted == False
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Brand '{brand.name}' already exists in this subcategory."
        )

    new_brand = Brand(
        subcategory_id=brand.subcategory_id,
        name=brand.name,
        is_deleted=False
    )

    db.add(new_brand)
    db.commit()
    db.refresh(new_brand)

    return {
        "message": "Brand created successfully",
        "brand": new_brand
    }


# Get All Brands
@router.get("/brand")
def get_brands(subcategory_id: int = None, db: Session = Depends(get_db)):
    query = db.query(Brand).filter(
        Brand.is_deleted == False
    )
    if subcategory_id is not None:
        query = query.filter(Brand.subcategory_id == subcategory_id)

    return query.all()


# Get Brand By ID
@router.get("/brand/{brand_id}")
def get_brand(
    brand_id: int,
    db: Session = Depends(get_db)
):
    if brand_id <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid brand ID.")

    brand = db.query(Brand).filter(
        Brand.id == brand_id,
        Brand.is_deleted == False
    ).first()

    if not brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand not found."
        )

    return brand


# Update Brand
@router.put("/brand/{brand_id}")
def update_brand(
    brand_id: int,
    data: BrandUpdate,
    db: Session = Depends(get_db)
):
    if brand_id <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid brand ID.")

    brand = db.query(Brand).filter(
        Brand.id == brand_id,
        Brand.is_deleted == False
    ).first()

    if not brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand not found."
        )

    target_sub_id = data.subcategory_id or brand.subcategory_id

    # If subcategory changed, verify new parent exists
    if data.subcategory_id is not None and data.subcategory_id != brand.subcategory_id:
        parent_sub = db.query(SubCategory).filter(
            SubCategory.id == data.subcategory_id,
            SubCategory.is_deleted == False
        ).first()
        if not parent_sub:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target parent subcategory does not exist."
            )
        brand.subcategory_id = data.subcategory_id

    # If name changed, verify uniqueness within subcategory
    target_name = data.name or brand.name
    if data.name is not None:
        dup = db.query(Brand).filter(
            Brand.subcategory_id == target_sub_id,
            func.lower(Brand.name) == target_name.lower(),
            Brand.id != brand_id,
            Brand.is_deleted == False
        ).first()
        if dup:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Another brand with name '{target_name}' already exists in this subcategory."
            )
        brand.name = data.name

    db.commit()
    db.refresh(brand)

    return {
        "message": "Brand updated successfully",
        "brand": brand
    }


# Soft Delete Brand
@router.delete("/brand/{brand_id}")
def delete_brand(
    brand_id: int,
    db: Session = Depends(get_db)
):
    if brand_id <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid brand ID.")

    brand = db.query(Brand).filter(
        Brand.id == brand_id,
        Brand.is_deleted == False
    ).first()

    if not brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand not found."
        )

    # Dependency Validation: check if active products are linked
    linked_products = db.query(Product).filter(
        Product.brand_id == brand_id,
        Product.is_deleted == False
    ).first()

    if linked_products:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete brand: active products are linked to it. Delete or reassign them first."
        )

    brand.is_deleted = True
    db.commit()

    return {
        "message": f"Brand with ID {brand_id} soft deleted successfully"
    }


# Restore Brand
@router.put("/brand/restore/{brand_id}")
def restore_brand(
    brand_id: int,
    db: Session = Depends(get_db)
):
    if brand_id <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid brand ID.")

    brand = db.query(Brand).filter(
        Brand.id == brand_id
    ).first()

    if not brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand not found."
        )

    brand.is_deleted = False
    db.commit()

    return {
        "message": f"Brand with ID {brand_id} restored successfully"
    }