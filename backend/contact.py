from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Contact
from schemas import ContactCreate

router = APIRouter()


# Create Contact
@router.post("/contact", status_code=status.HTTP_201_CREATED)
def create_contact(contact: ContactCreate, db: Session = Depends(get_db)):
    new_contact = Contact(
        name=contact.name,
        email=contact.email,
        subject=contact.subject,
        message=contact.message,
        is_deleted=False
    )

    db.add(new_contact)
    db.commit()
    db.refresh(new_contact)

    return {
        "message": "Contact message submitted successfully",
        "contact": new_contact
    }


# Get All Contacts
@router.get("/contact")
def get_contacts(db: Session = Depends(get_db)):
    contacts = db.query(Contact).filter(
        Contact.is_deleted == False
    ).all()

    return contacts


# Get Contact By ID
@router.get("/contact/{contact_id}")
def get_contact(contact_id: int, db: Session = Depends(get_db)):
    contact = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.is_deleted == False
    ).first()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact message not found"
        )

    return contact


# Update Contact
@router.put("/contact/{contact_id}")
def update_contact(contact_id: int, data: ContactCreate, db: Session = Depends(get_db)):
    contact = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.is_deleted == False
    ).first()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact message not found"
        )

    contact.name = data.name
    contact.email = data.email
    contact.subject = data.subject
    contact.message = data.message

    db.commit()
    db.refresh(contact)

    return {
        "message": "Contact message updated successfully",
        "contact": contact
    }


# Soft Delete Contact
@router.delete("/contact/{contact_id}")
def delete_contact(contact_id: int, db: Session = Depends(get_db)):
    contact = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.is_deleted == False
    ).first()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact message not found"
        )

    contact.is_deleted = True
    db.commit()

    return {
        "message": f"Contact with ID {contact_id} soft deleted successfully"
    }


# Restore Contact
@router.put("/contact/restore/{contact_id}")
def restore_contact(contact_id: int, db: Session = Depends(get_db)):
    contact = db.query(Contact).filter(
        Contact.id == contact_id
    ).first()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact message not found"
        )

    contact.is_deleted = False
    db.commit()

    return {
        "message": f"Contact with ID {contact_id} restored successfully"
    }