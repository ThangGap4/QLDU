from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload, undefer

from ..config import MAX_IMAGE_BYTES, MAX_IMAGES_PER_LISTING, PROPERTY_TYPES, PROVINCES, TRANSACTION_TYPES
from ..database import get_db
from ..models import Image, Listing, User
from ..security import get_current_user, get_optional_user
from ..serializers import listing_out

router = APIRouter(prefix="/api", tags=["listings"])

PUBLIC_STATUSES = ("approved", "deposited")
SORTS = {
    "newest": Listing.created_at.desc(),
    "price_asc": Listing.price.asc(),
    "price_desc": Listing.price.desc(),
}


def _sniff_image_type(data: bytes) -> str | None:
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


async def _read_images(files: list[UploadFile]) -> list[Image]:
    images = []
    for f in files:
        if not f or not f.filename:
            continue
        data = await f.read(MAX_IMAGE_BYTES + 1)
        if len(data) > MAX_IMAGE_BYTES:
            raise HTTPException(400, f"Ảnh '{f.filename}' vượt quá 5MB")
        content_type = _sniff_image_type(data)
        if content_type is None:
            raise HTTPException(400, f"Ảnh '{f.filename}' không đúng định dạng JPEG/PNG/WEBP")
        images.append(Image(content_type=content_type, data=data))
    return images


def _validate_fields(property_type: str, transaction_type: str, price: int, area: float) -> None:
    if property_type not in PROPERTY_TYPES:
        raise HTTPException(400, "Loại bất động sản không hợp lệ")
    if transaction_type not in TRANSACTION_TYPES:
        raise HTTPException(400, "Loại giao dịch không hợp lệ")
    if price <= 0:
        raise HTTPException(400, "Giá phải lớn hơn 0")
    if area <= 0:
        raise HTTPException(400, "Diện tích phải lớn hơn 0")


def _get_listing(db: Session, listing_id: int) -> Listing:
    listing = db.scalar(
        select(Listing)
        .options(selectinload(Listing.images), selectinload(Listing.owner))
        .where(Listing.id == listing_id)
    )
    if listing is None:
        raise HTTPException(404, "Không tìm thấy tin đăng")
    return listing


@router.get("/meta")
def meta():
    return {"property_types": PROPERTY_TYPES, "transaction_types": TRANSACTION_TYPES, "provinces": PROVINCES}


@router.get("/listings")
def list_listings(
    keyword: str | None = None,
    property_type: str | None = None,
    transaction_type: str | None = None,
    province: str | None = None,
    price_min: int | None = Query(default=None, ge=0),
    price_max: int | None = Query(default=None, ge=0),
    area_min: float | None = Query(default=None, ge=0),
    area_max: float | None = Query(default=None, ge=0),
    sort: str = "newest",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=9, ge=1, le=50),
    db: Session = Depends(get_db),
):
    conditions = [Listing.status.in_(PUBLIC_STATUSES)]
    if keyword and keyword.strip():
        kw = f"%{keyword.strip()}%"
        conditions.append(
            or_(Listing.title.ilike(kw), Listing.description.ilike(kw),
                Listing.address.ilike(kw), Listing.district.ilike(kw))
        )
    if property_type:
        conditions.append(Listing.property_type == property_type)
    if transaction_type:
        conditions.append(Listing.transaction_type == transaction_type)
    if province:
        conditions.append(Listing.province == province)
    if price_min is not None:
        conditions.append(Listing.price >= price_min)
    if price_max is not None:
        conditions.append(Listing.price <= price_max)
    if area_min is not None:
        conditions.append(Listing.area >= area_min)
    if area_max is not None:
        conditions.append(Listing.area <= area_max)

    total = db.scalar(select(func.count(Listing.id)).where(*conditions)) or 0
    rows = db.scalars(
        select(Listing)
        .options(selectinload(Listing.images), selectinload(Listing.owner))
        .where(*conditions)
        .order_by(SORTS.get(sort, SORTS["newest"]), Listing.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return {
        "items": [listing_out(item) for item in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, (total + page_size - 1) // page_size),
    }


@router.get("/listings/mine")
def my_listings(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Listing)
        .options(selectinload(Listing.images), selectinload(Listing.owner))
        .where(Listing.owner_id == user.id)
        .order_by(Listing.created_at.desc())
    ).all()
    return [listing_out(item, detail=True) for item in rows]


@router.get("/listings/{listing_id}")
def get_listing(listing_id: int, user: User | None = Depends(get_optional_user), db: Session = Depends(get_db)):
    listing = _get_listing(db, listing_id)
    is_privileged = user is not None and (user.id == listing.owner_id or user.role == "admin")
    if listing.status not in PUBLIC_STATUSES and not is_privileged:
        raise HTTPException(404, "Không tìm thấy tin đăng")
    return listing_out(listing, detail=True)


@router.post("/listings", status_code=201)
async def create_listing(
    title: str = Form(..., min_length=5, max_length=255),
    property_type: str = Form(...),
    transaction_type: str = Form(...),
    price: int = Form(...),
    area: float = Form(...),
    province: str = Form(..., min_length=1),
    district: str = Form(..., min_length=1),
    address: str = Form(..., min_length=1),
    description: str = Form(""),
    contact_phone: str = Form(..., min_length=8, max_length=30),
    images: list[UploadFile] = File(default=[]),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _validate_fields(property_type, transaction_type, price, area)
    new_images = await _read_images(images)
    if len(new_images) > MAX_IMAGES_PER_LISTING:
        raise HTTPException(400, f"Tối đa {MAX_IMAGES_PER_LISTING} ảnh mỗi tin")
    listing = Listing(
        owner_id=user.id,
        title=title.strip(),
        property_type=property_type,
        transaction_type=transaction_type,
        price=price,
        area=area,
        province=province.strip(),
        district=district.strip(),
        address=address.strip(),
        description=description.strip(),
        contact_phone=contact_phone.strip(),
        status="pending",
    )
    listing.images = new_images
    db.add(listing)
    db.commit()
    return listing_out(_get_listing(db, listing.id), detail=True)


@router.put("/listings/{listing_id}")
async def update_listing(
    listing_id: int,
    title: str = Form(..., min_length=5, max_length=255),
    property_type: str = Form(...),
    transaction_type: str = Form(...),
    price: int = Form(...),
    area: float = Form(...),
    province: str = Form(..., min_length=1),
    district: str = Form(..., min_length=1),
    address: str = Form(..., min_length=1),
    description: str = Form(""),
    contact_phone: str = Form(..., min_length=8, max_length=30),
    remove_image_ids: str = Form(""),
    images: list[UploadFile] = File(default=[]),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    listing = _get_listing(db, listing_id)
    if listing.owner_id != user.id:
        raise HTTPException(403, "Bạn không có quyền sửa tin này")
    if listing.status == "deposited":
        raise HTTPException(400, "Tin đã được đặt cọc, không thể sửa")
    _validate_fields(property_type, transaction_type, price, area)
    remove_ids = {int(x) for x in remove_image_ids.split(",") if x.strip().isdigit()}
    kept = [img for img in listing.images if img.id not in remove_ids]
    new_images = await _read_images(images)
    if len(kept) + len(new_images) > MAX_IMAGES_PER_LISTING:
        raise HTTPException(400, f"Tối đa {MAX_IMAGES_PER_LISTING} ảnh mỗi tin")
    listing.images = kept + new_images
    listing.title = title.strip()
    listing.property_type = property_type
    listing.transaction_type = transaction_type
    listing.price = price
    listing.area = area
    listing.province = province.strip()
    listing.district = district.strip()
    listing.address = address.strip()
    listing.description = description.strip()
    listing.contact_phone = contact_phone.strip()
    listing.status = "pending"
    listing.reject_reason = None
    db.commit()
    return listing_out(_get_listing(db, listing.id), detail=True)


@router.delete("/listings/{listing_id}", status_code=204)
def delete_listing(listing_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    listing = _get_listing(db, listing_id)
    if listing.owner_id != user.id and user.role != "admin":
        raise HTTPException(403, "Bạn không có quyền xóa tin này")
    db.delete(listing)
    db.commit()
    return Response(status_code=204)


@router.get("/images/{image_id}")
def get_image(image_id: int, db: Session = Depends(get_db)):
    image = db.scalar(select(Image).options(undefer(Image.data)).where(Image.id == image_id))
    if image is None:
        raise HTTPException(404, "Không tìm thấy ảnh")
    return Response(
        content=image.data,
        media_type=image.content_type,
        headers={"Cache-Control": "public, max-age=86400"},
    )
