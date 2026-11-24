from datetime import datetime, timezone

from .models import Listing, Transaction, User


def _dt(value: datetime | None) -> datetime | None:
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def user_out(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "role": user.role,
        "created_at": _dt(user.created_at),
    }


def listing_out(listing: Listing, detail: bool = False) -> dict:
    image_ids = [img.id for img in listing.images]
    data = {
        "id": listing.id,
        "title": listing.title,
        "property_type": listing.property_type,
        "transaction_type": listing.transaction_type,
        "price": listing.price,
        "area": listing.area,
        "province": listing.province,
        "district": listing.district,
        "address": listing.address,
        "status": listing.status,
        "reject_reason": listing.reject_reason,
        "created_at": _dt(listing.created_at),
        "updated_at": _dt(listing.updated_at),
        "image_ids": image_ids,
        "thumbnail_id": image_ids[0] if image_ids else None,
        "owner_id": listing.owner_id,
        "owner_name": listing.owner.full_name if listing.owner else None,
    }
    if detail:
        data["description"] = listing.description
        data["contact_phone"] = listing.contact_phone
        data["owner"] = {
            "id": listing.owner.id,
            "full_name": listing.owner.full_name,
            "email": listing.owner.email,
            "phone": listing.owner.phone,
        }
    return data


def transaction_out(tx: Transaction) -> dict:
    listing = tx.listing
    return {
        "id": tx.id,
        "listing_id": tx.listing_id,
        "listing_title": listing.title if listing else None,
        "listing_status": listing.status if listing else None,
        "listing_price": listing.price if listing else None,
        "listing_transaction_type": listing.transaction_type if listing else None,
        "owner_id": listing.owner_id if listing else None,
        "owner_name": listing.owner.full_name if listing else None,
        "owner_phone": listing.contact_phone if listing else None,
        "buyer_id": tx.buyer_id,
        "buyer_name": tx.buyer.full_name if tx.buyer else None,
        "buyer_email": tx.buyer.email if tx.buyer else None,
        "type": tx.type,
        "message": tx.message,
        "phone": tx.phone,
        "viewing_date": tx.viewing_date,
        "deposit_amount": tx.deposit_amount,
        "status": tx.status,
        "created_at": _dt(tx.created_at),
        "updated_at": _dt(tx.updated_at),
    }
