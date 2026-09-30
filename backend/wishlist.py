from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Wishlist, User, Product
from schemas import WishlistCreate

router = APIRouter()


# Create Wishlist Item
@router.post("/wishlist", status_code=status.HTTP_201_CREATED)
def create_wishlist(
    wishlist: WishlistCreate,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.id == wishlist.user_id,
        User.is_deleted == False
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or inactive"
        )

    product = db.query(Product).filter(
        Product.id == wishlist.product_id,
        Product.is_deleted == False
    ).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found or inactive"
        )

    # Check if item is already in wishlist
    existing = db.query(Wishlist).filter(
        Wishlist.user_id == wishlist.user_id,
        Wishlist.product_id == wishlist.product_id
    ).first()

    if existing:
        if not existing.is_deleted:
            return {
                "message": "Product is already in your wishlist",
                "wishlist": existing
            }
        else:
            # Re-activate previously soft-deleted item
            existing.is_deleted = False
            db.commit()
            db.refresh(existing)
            return {
                "message": "Product re-added to wishlist",
                "wishlist": existing
            }

    new_wishlist = Wishlist(
        user_id=wishlist.user_id,
        product_id=wishlist.product_id,
        is_deleted=False
    )

    db.add(new_wishlist)
    db.commit()
    db.refresh(new_wishlist)

    return {
        "message": "Product added to wishlist successfully",
        "wishlist": new_wishlist
    }


# Get All Wishlist Items (optionally filtered by user_id)
@router.get("/wishlist")
def get_wishlist(
    user_id: int = None,
    db: Session = Depends(get_db)
):
    query = db.query(Wishlist).filter(
        Wishlist.is_deleted == False
    )
    if user_id is not None:
        query = query.filter(Wishlist.user_id == user_id)

    return query.all()


# Get Wishlist Item By ID
@router.get("/wishlist/{wishlist_id}")
def get_wishlist_by_id(
    wishlist_id: int,
    db: Session = Depends(get_db)
):
    wishlist = db.query(Wishlist).filter(
        Wishlist.id == wishlist_id,
        Wishlist.is_deleted == False
    ).first()

    if not wishlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wishlist item not found"
        )

    return wishlist


# Soft Delete Wishlist Item
@router.delete("/wishlist/{wishlist_id}")
def delete_wishlist(
    wishlist_id: int,
    db: Session = Depends(get_db)
):
    wishlist = db.query(Wishlist).filter(
        Wishlist.id == wishlist_id,
        Wishlist.is_deleted == False
    ).first()

    if not wishlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wishlist item not found"
        )

    wishlist.is_deleted = True
    db.commit()

    return {
        "message": f"Wishlist item deleted successfully"
    }


# Restore Wishlist Item
@router.put("/wishlist/restore/{wishlist_id}")
def restore_wishlist(
    wishlist_id: int,
    db: Session = Depends(get_db)
):
    wishlist = db.query(Wishlist).filter(
        Wishlist.id == wishlist_id
    ).first()

    if not wishlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wishlist item not found"
        )

    wishlist.is_deleted = False
    db.commit()

    return {
        "message": f"Wishlist item restored successfully"
    }