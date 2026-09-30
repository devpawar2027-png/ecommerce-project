import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Category, SubCategory
from schemas import CategoryCreate, CategoryUpdate

router = APIRouter()


def slugify(text: str) -> str:
    text = (text or "").lower().strip()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')


# Create Category
@router.post("/category", status_code=status.HTTP_201_CREATED)
def create_category(category: CategoryCreate, db: Session = Depends(get_db)):
    # Check duplicate category name
    existing = db.query(Category).filter(
        func.lower(Category.name) == category.name.lower(),
        Category.is_deleted == False
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Category with name '{category.name}' already exists."
        )

    slug = category.slug.strip() if category.slug else slugify(category.name)

    new_category = Category(
        name=category.name,
        slug=slug,
        image_url=category.image_url,
        is_deleted=False
    )

    db.add(new_category)
    db.commit()
    db.refresh(new_category)

    return new_category


# Get All Categories
@router.get("/category")
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).filter(
        Category.is_deleted == False
    ).all()

    return categories


# Get Category By ID
@router.get("/category/{category_id}")
def get_category(category_id: int, db: Session = Depends(get_db)):
    if category_id <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category ID.")

    category = db.query(Category).filter(
        Category.id == category_id,
        Category.is_deleted == False
    ).first()

    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")

    return category


# Update Category
@router.put("/category/{category_id}")
def update_category(category_id: int, data: CategoryUpdate, db: Session = Depends(get_db)):
    if category_id <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category ID.")

    category = db.query(Category).filter(
        Category.id == category_id,
        Category.is_deleted == False
    ).first()

    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")

    if data.name is not None:
        # Check duplicate name with other categories
        dup = db.query(Category).filter(
            func.lower(Category.name) == data.name.lower(),
            Category.id != category_id,
            Category.is_deleted == False
        ).first()
        if dup:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Another category with name '{data.name}' already exists."
            )
        category.name = data.name

    if data.slug is not None:
        category.slug = data.slug.strip()
    elif data.name is not None and not category.slug:
        category.slug = slugify(data.name)

    if data.image_url is not None:
        category.image_url = data.image_url

    db.commit()
    db.refresh(category)

    return {"message": "Category updated successfully", "category": category}


# Soft Delete Category
@router.delete("/category/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db)):
    if category_id <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category ID.")

    category = db.query(Category).filter(
        Category.id == category_id,
        Category.is_deleted == False
    ).first()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found."
        )

    # Dependency Validation: prevent deletion if active subcategories are linked
    linked_subs = db.query(SubCategory).filter(
        SubCategory.category_id == category_id,
        SubCategory.is_deleted == False
    ).first()

    if linked_subs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category: active subcategories are linked to it. Delete or reassign them first."
        )

    category.is_deleted = True
    db.commit()

    return {
        "message": f"Category with ID {category_id} soft deleted successfully"
    }


# Restore Category
@router.put("/category/restore/{category_id}")
def restore_category(category_id: int, db: Session = Depends(get_db)):
    if category_id <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category ID.")

    category = db.query(Category).filter(
        Category.id == category_id
    ).first()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found."
        )

    category.is_deleted = False
    db.commit()

    return {
        "message": f"Category with ID {category_id} restored successfully"
    }