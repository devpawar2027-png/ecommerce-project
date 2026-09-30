from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Product, Brand
from schemas import ProductCreate, ProductUpdate

router = APIRouter()


# Create Product
@router.post("/product", status_code=status.HTTP_201_CREATED)
def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db)
):
    # Verify parent Brand exists and is not deleted
    parent_brand = db.query(Brand).filter(
        Brand.id == product.brand_id,
        Brand.is_deleted == False
    ).first()

    if not parent_brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand does not exist or has been deleted."
        )

    new_product = Product(
        brand_id=product.brand_id,
        name=product.name,
        price=product.price,
        quantity=product.quantity,
        details=product.details,
        image_url=product.image_url,
        is_deleted=False
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)

    return {
        "message": "Product created successfully",
        "product": new_product
    }


# Get All Products (optionally filtered by brand_id)
@router.get("/product")
def get_products(brand_id: int = None, db: Session = Depends(get_db)):
    query = db.query(Product).filter(
        Product.is_deleted == False
    )
    if brand_id is not None:
        query = query.filter(Product.brand_id == brand_id)

    return query.all()


# Get Product By ID
@router.get("/product/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    if product_id <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid product ID.")

    product = db.query(Product).filter(
        Product.id == product_id,
        Product.is_deleted == False
    ).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found."
        )

    return product


# Update Product
@router.put("/product/{product_id}")
def update_product(
    product_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db)
):
    if product_id <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid product ID.")

    product = db.query(Product).filter(
        Product.id == product_id,
        Product.is_deleted == False
    ).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found."
        )

    # Verify brand existence if brand changed
    if data.brand_id is not None and data.brand_id != product.brand_id:
        parent_brand = db.query(Brand).filter(
            Brand.id == data.brand_id,
            Brand.is_deleted == False
        ).first()
        if not parent_brand:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selected brand does not exist."
            )
        product.brand_id = data.brand_id

    if data.name is not None:
        product.name = data.name

    if data.details is not None:
        product.details = data.details

    if data.price is not None:
        if data.price <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product price must be greater than zero."
            )
        product.price = data.price

    if data.quantity is not None:
        if data.quantity < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product quantity cannot be negative."
            )
        product.quantity = data.quantity

    if data.image_url is not None:
        product.image_url = data.image_url

    db.commit()
    db.refresh(product)

    return {
        "message": "Product updated successfully",
        "product": product
    }


# Soft Delete Product
@router.delete("/product/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    if product_id <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid product ID.")

    product = db.query(Product).filter(
        Product.id == product_id,
        Product.is_deleted == False
    ).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found."
        )

    product.is_deleted = True
    db.commit()

    return {
        "message": f"Product with ID {product_id} soft deleted successfully"
    }


# Restore Product
@router.put("/product/restore/{product_id}")
def restore_product(product_id: int, db: Session = Depends(get_db)):
    if product_id <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid product ID.")

    product = db.query(Product).filter(
        Product.id == product_id
    ).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found."
        )

    product.is_deleted = False
    db.commit()

    return {
        "message": f"Product with ID {product_id} restored successfully"
    }