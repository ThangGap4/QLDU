import io
import os
import random
import unicodedata
from datetime import date, timedelta

from PIL import Image as PILImage, ImageDraw, ImageFont
from sqlalchemy import select

from app.database import Base, SessionLocal, engine
from app.main import ensure_admin
from app.models import Image, Listing, Transaction, User
from app.security import hash_password

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
    "/Library/Fonts/Arial Unicode.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
]

PALETTE = [
    ((37, 99, 235), (14, 165, 233)),
    ((5, 150, 105), (52, 211, 153)),
    ((217, 119, 6), (251, 191, 36)),
    ((190, 18, 60), (251, 113, 133)),
    ((109, 40, 217), (167, 139, 250)),
    ((15, 118, 110), (45, 212, 191)),
]

SAMPLES = [
    ("Căn hộ 2PN Vinhomes Central Park view sông", "Căn hộ", "Bán", 5_200_000_000, 79, "TP.HCM", "Bình Thạnh", "208 Nguyễn Hữu Cảnh, P.22",
     "Căn hộ tầng 18, nội thất đầy đủ, ban công hướng Đông Nam nhìn sông Sài Gòn. Sổ hồng chính chủ, hỗ trợ vay ngân hàng 70%."),
    ("Nhà phố 1 trệt 2 lầu hẻm xe hơi Gò Vấp", "Nhà phố", "Bán", 6_800_000_000, 64, "TP.HCM", "Gò Vấp", "Hẻm 45 Phan Văn Trị, P.7",
     "Nhà mới xây 2023, 4 phòng ngủ, 3 WC, hẻm 6m xe hơi vào tận nhà. Gần chợ, trường học, siêu thị Emart."),
    ("Phòng trọ mới xây gần ĐH Bách Khoa, có gác", "Phòng trọ", "Cho thuê", 3_500_000, 22, "TP.HCM", "Quận 10", "12/3 Lý Thường Kiệt, P.14",
     "Phòng sạch sẽ, có gác lửng, máy lạnh, máy nước nóng. Giờ giấc tự do, khóa vân tay, bãi xe rộng."),
    ("Căn hộ Masteri Thảo Điền 3PN full nội thất cho thuê", "Căn hộ", "Cho thuê", 25_000_000, 95, "TP.HCM", "Thủ Đức", "159 Xa lộ Hà Nội, P. Thảo Điền",
     "Căn góc 3 phòng ngủ, view hồ bơi, nội thất cao cấp. Kết nối trực tiếp ga Metro số 1 Thảo Điền."),
    ("Nhà phố mặt ngõ Cầu Giấy, ô tô đỗ cửa", "Nhà phố", "Bán", 9_500_000_000, 48, "Hà Nội", "Cầu Giấy", "Ngõ 165 Xuân Thủy",
     "Nhà 5 tầng, thang máy, ngõ thông ô tô tránh nhau. Phù hợp vừa ở vừa kinh doanh online, văn phòng nhỏ."),
    ("Chung cư Times City 2PN tòa Park Hill", "Căn hộ", "Bán", 4_300_000_000, 82, "Hà Nội", "Hai Bà Trưng", "458 Minh Khai, P. Vĩnh Tuy",
     "Căn hộ 2 phòng ngủ 2 vệ sinh, nội thất cơ bản, tiện ích nội khu đầy đủ: trường học, bệnh viện Vinmec, TTTM."),
    ("Biệt thự song lập Ecopark 200m2 khu Đảo", "Biệt thự", "Bán", 21_000_000_000, 200, "Hà Nội", "Long Biên", "Khu đô thị Ecopark, Văn Giang",
     "Biệt thự song lập 3 tầng, sân vườn rộng, view hồ thiên nga. Pháp lý sổ đỏ lâu dài, bàn giao thô hoàn thiện mặt ngoài."),
    ("Phòng trọ khép kín gần ĐH Quốc gia Hà Nội", "Phòng trọ", "Cho thuê", 2_800_000, 18, "Hà Nội", "Cầu Giấy", "Ngõ 68 Hồ Tùng Mậu",
     "Phòng khép kín, có điều hòa, nóng lạnh, giường tủ. Điện nước giá dân, an ninh tốt, gần trạm xe buýt."),
    ("Đất nền ven biển Nguyễn Tất Thành, sổ đỏ riêng", "Đất nền", "Bán", 3_900_000_000, 100, "Đà Nẵng", "Liên Chiểu", "Đường Nguyễn Tất Thành, P. Hòa Hiệp Nam",
     "Lô đất 5x20m cách biển 300m, đường 7m5 vỉa hè 4m. Sổ đỏ riêng từng lô, xây dựng tự do."),
    ("Căn hộ cao cấp view biển Mỹ Khê cho thuê", "Căn hộ", "Cho thuê", 15_000_000, 70, "Đà Nẵng", "Sơn Trà", "Võ Nguyên Giáp, P. Phước Mỹ",
     "Căn hộ 2 phòng ngủ, ban công nhìn trực diện biển Mỹ Khê, hồ bơi vô cực, gym. Cho thuê dài hạn hoặc ngắn hạn."),
    ("Đất nền KDC Mỹ Phước 3 gần KCN, thổ cư 100%", "Đất nền", "Bán", 1_650_000_000, 150, "Bình Dương", "Bến Cát", "KDC Mỹ Phước 3, P. Thới Hòa",
     "Lô đất 150m2 thổ cư 100%, đường nhựa 16m, gần KCN Mỹ Phước, trường học, chợ. Phù hợp xây trọ hoặc nhà ở."),
    ("Nhà phố thương mại Thủ Dầu Một 1 trệt 3 lầu", "Nhà phố", "Cho thuê", 30_000_000, 100, "Bình Dương", "Thủ Dầu Một", "Đại lộ Bình Dương, P. Phú Hòa",
     "Mặt tiền đại lộ, phù hợp làm showroom, văn phòng, ngân hàng. Diện tích sàn 400m2, có thang máy, chỗ đậu xe."),
]


def _font(size: int):
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            return ImageFont.truetype(path, size), True
    return ImageFont.load_default(size=size), False


def _ascii(text: str) -> str:
    text = text.replace("Đ", "D").replace("đ", "d")
    return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")


def make_placeholder(title: str, subtitle: str, index: int, variant: int) -> bytes:
    width, height = 800, 560
    start, end = PALETTE[(index + variant) % len(PALETTE)]
    img = PILImage.new("RGB", (width, height))
    draw = ImageDraw.Draw(img)
    for y in range(height):
        t = y / height
        color = tuple(int(start[i] + (end[i] - start[i]) * t) for i in range(3))
        draw.line([(0, y), (width, y)], fill=color)
    draw.polygon([(250, 300), (400, 180), (550, 300)], fill=(255, 255, 255))
    draw.rectangle([280, 300, 520, 430], fill=(255, 255, 255))
    draw.rectangle([375, 350, 425, 430], fill=start)
    big, unicode_ok = _font(40)
    small, _ = _font(26)
    if not unicode_ok:
        title, subtitle = _ascii(title), _ascii(subtitle)
    draw.text((width / 2, 90), title, font=big, fill=(255, 255, 255), anchor="mm")
    draw.text((width / 2, 490), subtitle, font=small, fill=(255, 255, 255), anchor="mm")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=82)
    return buf.getvalue()


def get_or_create_user(db, email: str, full_name: str, phone: str, password: str) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(email=email, full_name=full_name, phone=phone, password_hash=hash_password(password), role="user")
        db.add(user)
        db.flush()
    return user


def main() -> None:
    Base.metadata.create_all(bind=engine)
    ensure_admin()
    random.seed(42)
    with SessionLocal() as db:
        seller = get_or_create_user(db, "seller@bds.local", "Nguyễn Văn An", "0901234567", "seller123")
        buyer = get_or_create_user(db, "buyer@bds.local", "Trần Thị Bình", "0912345678", "buyer123")
        if db.scalar(select(Listing).where(Listing.owner_id == seller.id)) is not None:
            print("Dữ liệu mẫu đã tồn tại, bỏ qua.")
            db.commit()
            return
        listings = []
        for i, (title, ptype, ttype, price, area, province, district, address, desc) in enumerate(SAMPLES):
            listing = Listing(
                owner_id=seller.id,
                title=title,
                property_type=ptype,
                transaction_type=ttype,
                price=price,
                area=area,
                province=province,
                district=district,
                address=address,
                description=desc,
                contact_phone=seller.phone,
                status="approved",
            )
            listing.images = [
                Image(content_type="image/jpeg", data=make_placeholder(ptype, f"{district}, {province}", i, v))
                for v in range(random.randint(2, 3))
            ]
            db.add(listing)
            listings.append(listing)
        db.flush()
        today = date.today()
        db.add_all([
            Transaction(listing_id=listings[0].id, buyer_id=buyer.id, type="contact", phone=buyer.phone,
                        message="Tôi muốn xem nhà vào cuối tuần, anh/chị sắp xếp giúp nhé.",
                        viewing_date=today + timedelta(days=3), status="pending"),
            Transaction(listing_id=listings[4].id, buyer_id=buyer.id, type="contact", phone=buyer.phone,
                        message="Nhà còn không ạ? Giá có thương lượng không?",
                        viewing_date=today + timedelta(days=5), status="accepted"),
            Transaction(listing_id=listings[8].id, buyer_id=buyer.id, type="deposit", phone=buyer.phone,
                        message="Tôi đặt cọc giữ lô đất này.", deposit_amount=100_000_000, status="accepted"),
            Transaction(listing_id=listings[2].id, buyer_id=buyer.id, type="deposit", phone=buyer.phone,
                        message="Đặt cọc 1 tháng tiền phòng.", deposit_amount=3_500_000, status="pending"),
        ])
        listings[8].status = "deposited"
        db.commit()
        print(f"Đã tạo {len(listings)} tin đăng mẫu, 2 người dùng mẫu và 4 giao dịch.")


if __name__ == "__main__":
    main()
