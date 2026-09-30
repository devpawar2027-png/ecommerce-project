from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Cart, User, Product
from schemas import CartCreate, CartUpdate

router = APIRouter()


# Add Product To Cart
@router.post("/cart", status_code=status.HTTP_201_CREATED)
def add_to_cart(cart: CartCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.id == cart.user_id,
        User.is_deleted == False
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or inactive"
        )

    product = db.query(Product).filter(
        Product.id == cart.product_id,
        Product.is_deleted == False
    ).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found or inactive"
        )

    if product.quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"'{product.name}' is currently out of stock"
        )

    # Check if item already exists in active cart
    existing_cart = db.query(Cart).filter(
        Cart.user_id == cart.user_id,
        Cart.product_id == cart.product_id,
        Cart.is_deleted == False
    ).first()

    if existing_cart:
        new_quantity = existing_cart.quantity + cart.quantity
        if new_quantity > product.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot add more. You have {existing_cart.quantity} in cart and only {product.quantity} available in stock."
            )
        existing_cart.quantity = new_quantity
        db.commit()
        db.refresh(existing_cart)
        return {
            "message": "Cart item quantity updated successfully",
            "cart": existing_cart
        }

    if cart.quantity > product.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Requested quantity ({cart.quantity}) exceeds available stock ({product.quantity})"
        )

    new_cart = Cart(
        user_id=cart.user_id,
        product_id=cart.product_id,
        quantity=cart.quantity,
        is_deleted=False
    )

    db.add(new_cart)
    db.commit()
    db.refresh(new_cart)

    return {
        "message": "Product added to cart successfully",
        "cart": new_cart
    }


# Get All Active Cart Items (optionally filtered by user_id)
@router.get("/cart")
def get_all_cart_items(user_id: int = None, db: Session = Depends(get_db)):
    query = db.query(Cart).filter(
        Cart.is_deleted == False
    )
    if user_id is not None:
        query = query.filter(Cart.user_id == user_id)

    return query.all()


# Get Cart Item By ID
@router.get("/cart/{cart_id}")
def get_cart_by_id(cart_id: int, db: Session = Depends(get_db)):
    cart = db.query(Cart).filter(
        Cart.id == cart_id,
        Cart.is_deleted == False
    ).first()

    if not cart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found"
        )

    return cart


# Update Cart Quantity
@router.put("/cart/{cart_id}")
def update_cart(
    cart_id: int,
    cart_data: CartUpdate,
    db: Session = Depends(get_db)
):
    cart = db.query(Cart).filter(
        Cart.id == cart_id,
        Cart.is_deleted == False
    ).first()

    if not cart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found"
        )

    product = db.query(Product).filter(
        Product.id == cart.product_id,
        Product.is_deleted == False
    ).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated product no longer exists or is inactive"
        )

    if cart_data.quantity > product.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot set quantity to {cart_data.quantity}. Only {product.quantity} items available in stock."
        )

    cart.quantity = cart_data.quantity

    db.commit()
    db.refresh(cart)

    return {
        "message": "Cart updated successfully",
        "cart": cart
    }


# Soft Delete Cart Item
@router.delete("/cart/{cart_id}")
def delete_cart(cart_id: int, db: Session = Depends(get_db)):
    cart = db.query(Cart).filter(
        Cart.id == cart_id,
        Cart.is_deleted == False
    ).first()

    if not cart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found"
        )

    cart.is_deleted = True
    db.commit()

    return {
        "message": "Cart item soft deleted successfully"
    }


# Restore Cart Item
@router.put("/cart/restore/{cart_id}")
def restore_cart(cart_id: int, db: Session = Depends(get_db)):
    cart = db.query(Cart).filter(
        Cart.id == cart_id
    ).first()

    if not cart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found"
        )

    cart.is_deleted = False
    db.commit()

    return {
        "message": "Cart item restored successfully"
    }