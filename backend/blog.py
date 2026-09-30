from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Blog
from schemas import BlogCreate

router = APIRouter()

# Create Blog
@router.post("/blog")
def create_blog(blog: BlogCreate, db: Session = Depends(get_db)):

    new_blog = Blog(
        title=blog.title,
        description=blog.description
    )

    db.add(new_blog)
    db.commit()
    db.refresh(new_blog)

    return {
        "message": "Blog created successfully",
        "blog": new_blog
    }

# Get All Blogs
@router.get("/blog")
def get_blogs(db: Session = Depends(get_db)):

    blogs = db.query(Blog).filter(
        Blog.is_deleted == False
    ).all()

    return blogs

# Get Blog By ID
@router.get("/blog/{blog_id}")
def get_blog(blog_id: int, db: Session = Depends(get_db)):

    blog = db.query(Blog).filter(
        Blog.id == blog_id,
        Blog.is_deleted == False
    ).first()

    if not blog:
        raise HTTPException(
            status_code=404,
            detail="Blog not found"
        )

    return blog

# Update Blog
@router.put("/blog/{blog_id}")
def update_blog(blog_id: int, data: dict, db: Session = Depends(get_db)):

    blog = db.query(Blog).filter(
        Blog.id == blog_id,
        Blog.is_deleted == False
    ).first()

    if not blog:
        raise HTTPException(
            status_code=404,
            detail="Blog not found"
        )

    blog.title = data.get("title", blog.title)
    blog.description = data.get("description", blog.description)

    db.commit()
    db.refresh(blog)

    return {
        "message": "Blog updated successfully",
        "blog": blog
    }

# Soft Delete Blog
@router.delete("/blog/{blog_id}")
def delete_blog(blog_id: int, db: Session = Depends(get_db)):

    blog = db.query(Blog).filter(
        Blog.id == blog_id,
        Blog.is_deleted == False
    ).first()

    if not blog:
        raise HTTPException(
            status_code=404,
            detail="Blog not found"
        )

    blog.is_deleted = True

    db.commit()

    return {
        "message": f"Blog with ID {blog_id} soft deleted successfully"
    }

# Restore Blog
@router.put("/blog/restore/{blog_id}")
def restore_blog(blog_id: int, db: Session = Depends(get_db)):

    blog = db.query(Blog).filter(
        Blog.id == blog_id
    ).first()

    if not blog:
        raise HTTPException(
            status_code=404,
            detail="Blog not found"
        )

    blog.is_deleted = False

    db.commit()

    return {
        "message": f"Blog with ID {blog_id} restored successfully"
    }