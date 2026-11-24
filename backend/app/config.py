import os


def _database_url() -> str:
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        return "sqlite:///./dev.db"
    if url.startswith("postgres://"):
        url = "postgresql+psycopg2://" + url[len("postgres://"):]
    elif url.startswith("postgresql://"):
        url = "postgresql+psycopg2://" + url[len("postgresql://"):]
    return url


DATABASE_URL = _database_url()
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-me")
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = int(os.getenv("TOKEN_EXPIRE_HOURS", "168"))
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@bds.local").strip().lower()
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_IMAGES_PER_LISTING = 5

PROPERTY_TYPES = ["Căn hộ", "Nhà phố", "Đất nền", "Biệt thự", "Phòng trọ"]
TRANSACTION_TYPES = ["Bán", "Cho thuê"]
PROVINCES = [
    "TP.HCM", "Hà Nội", "Đà Nẵng", "Bình Dương", "Đồng Nai", "Hải Phòng",
    "Cần Thơ", "Khánh Hòa", "Bà Rịa - Vũng Tàu", "Quảng Ninh", "Long An", "Khác",
]
