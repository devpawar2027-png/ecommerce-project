from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Order, User, Product, Cart
from schemas import OrderCreate

router = APIRouter()


# Create Order with atomic stock reduction
@router.post("/order", status_code=status.HTTP_201_CREATED)
def create_order(order: OrderCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.id == order.user_id,
        User.is_deleted == False
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or inactive"
        )

    product = db.query(Product).filter(
        Product.id == order.product_id,
        Product.is_deleted == False
    ).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found or inactive"
        )

    if product.quantity < order.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient stock for '{product.name}'. Requested: {order.quantity}, Available: {product.quantity}"
        )

    # Atomic stock reduction
    product.quantity -= order.quantity
    total_price = round(float(product.price) * order.quantity, 2)

    new_order = Order(
        user_id=order.user_id,
        product_id=order.product_id,
        quantity=order.quantity,
        total_price=total_price,
        is_deleted=False
    )

    db.add(new_order)

    # If this product was in active cart, update or remove it
    cart_item = db.query(Cart).filter(
        Cart.user_id == order.user_id,
        Cart.product_id == order.product_id,
        Cart.is_deleted == False
    ).first()
    if cart_item:
        if cart_item.quantity <= order.quantity:
            cart_item.is_deleted = True
        else:
            cart_item.quantity -= order.quantity

    db.commit()
    db.refresh(new_order)

    return {
        "message": "Order created successfully",
        "order": new_order
    }


# Get All Orders (optionally filtered by user_id)
@router.get("/order")
def get_orders(user_id: int = None, db: Session = Depends(get_db)):
    query = db.query(Order).filter(
        Order.is_deleted == False
    )
    if user_id is not None:
        query = query.filter(Order.user_id == user_id)

    return query.all()


# Get Order By ID
@router.get("/order/{order_id}")
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.is_deleted == False
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    return order


# Update Order Quantity / Info
@router.put("/order/{order_id}")
def update_order(order_id: int, data: dict, db: Session = Depends(get_db)):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.is_deleted == False
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    product = db.query(Product).filter(
        Product.id == order.product_id,
        Product.is_deleted == False
    ).first()

    new_quantity = data.get("quantity")
    if new_quantity is not None:
        new_quantity = int(new_quantity)
        if new_quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order quantity must be at least 1"
            )
        
        diff = new_quantity - order.quantity
        if diff > 0 and product:
            if product.quantity < diff:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot increase order by {diff}. Available stock: {product.quantity}"
                )
            product.quantity -= diff
        elif diff < 0 and product:
            product.quantity += abs(diff)

        order.quantity = new_quantity
        if product:
            order.total_price = round(float(product.price) * order.quantity, 2)

    db.commit()
    db.refresh(order)

    return {
        "message": "Order updated successfully",
        "order": order
    }


# Soft Delete / Cancel Order (restoring product stock)
@router.delete("/order/{order_id}")
def delete_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.is_deleted == False
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Restock product upon order deletion/cancellation
    product = db.query(Product).filter(Product.id == order.product_id).first()
    if product:
        product.quantity += order.quantity

    order.is_deleted = True
    db.commit()

    return {
        "message": f"Order #{order_id} cancelled and soft-deleted successfully"
    }


# Restore Order (re-deducting stock if available)
@router.put("/order/restore/{order_id}")
def restore_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(
        Order.id == order_id
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    if not order.is_deleted:
        return {"message": "Order is already active", "order": order}

    product = db.query(Product).filter(
        Product.id == order.product_id,
        Product.is_deleted == False
    ).first()

    if product:
        if product.quantity < order.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot restore order. Insufficient stock (Available: {product.quantity}, Required: {order.quantity})"
            )
        product.quantity -= order.quantity

    order.is_deleted = False
    db.commit()

    return {
        "message": f"Order #{order_id} restored successfully"
    }