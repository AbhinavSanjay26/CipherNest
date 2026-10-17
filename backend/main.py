import os
import hashlib
import uuid
from pathlib import Path
from urllib.parse import quote

from fastapi import (
    FastAPI,
    UploadFile,
    File,
    Form,
    Depends,
    HTTPException,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import User, VaultFile, ActivityLog
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from crypto_utils import encrypt_file, decrypt_file


# ---------------------------------
# Configuration
# ---------------------------------

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = Path(os.getenv("DATA_DIR", str(BASE_DIR)))
VAULT_DIR = DATA_DIR / "vault_storage"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

VAULT_DIR.mkdir(exist_ok=True)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Secure File Vault API",
    description="Encrypted file storage with authentication",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        *(
            [os.getenv("FRONTEND_URL")]
            if os.getenv("FRONTEND_URL")
            else []
        ),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------
# Request schemas
# ---------------------------------

class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=12, max_length=128)


# ---------------------------------
# Basic endpoints
# ---------------------------------

@app.get("/")
def home():
    return {
        "message": "Welcome to Secure File Vault",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


# ---------------------------------
# User registration
# ---------------------------------

@app.post("/auth/register", status_code=201)
def register(
    request: RegisterRequest,
    db: Session = Depends(get_db),
):
    username = request.username.strip().lower()
    email = request.email.strip().lower()

    if len(username) < 3:
        raise HTTPException(
            status_code=400,
            detail="Username must contain at least 3 characters.",
        )

    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(
            status_code=400,
            detail="Enter a valid email address.",
        )

    existing_user = db.query(User).filter(
        (User.username == username) | (User.email == email)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Username or email is already registered.",
        )

    user = User(
        username=username,
        email=email,
        password_hash=hash_password(request.password),
    )

    db.add(user)

    try:
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Could not register user. Username or email may already exist.",
        )

    return {
        "message": "Registration successful.",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
        },
    }


# ---------------------------------
# User login
# ---------------------------------

@app.post("/auth/login")
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    login_name = form.username.strip().lower()

    user = db.query(User).filter(
        (User.username == login_name) | (User.email == login_name)
    ).first()

    if user is None or not verify_password(
        form.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(user.id)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
        },
    }


# ---------------------------------
# Current user profile
# ---------------------------------

@app.get("/auth/me")
def get_profile(
    current_user: User = Depends(get_current_user),
):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
    }


# ---------------------------------
# Upload and encrypt a file
# ---------------------------------

@app.post("/files/upload")
async def upload_file(
    file: UploadFile = File(...),
    password: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not password:
        raise HTTPException(
            status_code=400,
            detail="Encryption password is required.",
        )

    original_name = Path(file.filename or "upload.bin").name
    file_id = str(uuid.uuid4())
    storage_path = VAULT_DIR / f"{file_id}.sfv"

    file_data = await file.read(MAX_FILE_SIZE + 1)
    await file.close()

    if not file_data:
        raise HTTPException(
            status_code=400,
            detail="Empty files are not supported.",
        )

    if len(file_data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Maximum file size is 10 MB.",
        )

    try:
        encrypted_data = encrypt_file(file_data, password)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Could not encrypt the file.",
        )

    record = VaultFile(
        id=file_id,
        owner_id=current_user.id,
        filename=original_name,
        size=len(file_data),
        sha256=hashlib.sha256(file_data).hexdigest(),
    )

    try:
        with storage_path.open("xb") as stored_file:
            stored_file.write(encrypted_data)

        db.add(record)
        log_activity(
            db,
            current_user.id,
            "UPLOAD",
            f"Uploaded file: {original_name}",
        )
        db.commit()

    except Exception:
        db.rollback()
        storage_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=500,
            detail="Could not save the encrypted file.",
        )

    return {
        "id": file_id,
        "filename": original_name,
        "size": len(file_data),
        "encrypted": True,
        "message": "File encrypted and stored successfully.",
    }


# ---------------------------------
# List files belonging to the user
# ---------------------------------

@app.get("/files")
def list_files(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    records = (
        db.query(VaultFile)
        .filter(VaultFile.owner_id == current_user.id)
        .order_by(VaultFile.created_at.desc())
        .all()
    )

    return [
        {
            "id": record.id,
            "filename": record.filename,
            "size": record.size,
            "sha256": record.sha256,
            "encrypted": True,
            "created_at": record.created_at,
        }
        for record in records
    ]


# ---------------------------------
# Download and decrypt a file
# ---------------------------------

@app.post("/files/{file_id}/download")
def download_file(
    file_id: str,
    password: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(VaultFile)
        .filter(
            VaultFile.id == file_id,
            VaultFile.owner_id == current_user.id,
        )
        .first()
    )

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="File not found.",
        )

    storage_path = VAULT_DIR / f"{record.id}.sfv"

    try:
        encrypted_data = storage_path.read_bytes()
        decrypted_data = decrypt_file(encrypted_data, password)

    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="Stored file not found.",
        )

    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Incorrect password or invalid encrypted file.",
        )

    except OSError:
        raise HTTPException(
            status_code=500,
            detail="Could not read the stored file.",
        )

    actual_hash = hashlib.sha256(decrypted_data).hexdigest()

    if actual_hash != record.sha256:
        raise HTTPException(
            status_code=400,
            detail="File integrity verification failed.",
        )

    log_activity(
        db,
        current_user.id,
        "DOWNLOAD",
        f"Downloaded file: {record.filename}",
    )
    db.commit()
    safe_filename = quote(record.filename, safe="")

    return Response(
        content=decrypted_data,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": (
                f"attachment; filename*=UTF-8''{safe_filename}"
            ),
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


def log_activity(db: Session, user_id: int, action: str, details: str = ""):
    """Record a user action in the activity log."""
    entry = ActivityLog(
        user_id=user_id,
        action=action,
        details=details[:255],
    )
    db.add(entry)
    db.flush()


# ---------------------------------
# Delete an encrypted file
# ---------------------------------

@app.delete("/files/{file_id}")
def delete_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(VaultFile)
        .filter(
            VaultFile.id == file_id,
            VaultFile.owner_id == current_user.id,
        )
        .first()
    )

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="File not found.",
        )

    storage_path = VAULT_DIR / f"{record.id}.sfv"
    backup_path = VAULT_DIR / f"{record.id}.sfv.deleting"

    if not storage_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Stored file not found.",
        )

    try:
        # Temporarily move the encrypted file instead of permanently
        # deleting it before the database transaction succeeds.
        storage_path.replace(backup_path)

        filename = record.filename
        db.delete(record)

        log_activity(
            db,
            current_user.id,
            "DELETE",
            f"Deleted file: {filename}",
        )

        db.commit()

    except Exception:
        db.rollback()

        # Restore the encrypted file if the database transaction fails.
        try:
            if backup_path.exists():
                backup_path.replace(storage_path)
        except OSError:
            # Preserve the original exception; manual recovery may be needed.
            pass

        raise HTTPException(
            status_code=500,
            detail="Could not delete the file. Check storage if recovery is needed.",
        )

    # The database transaction succeeded; now permanently remove the
    # temporary file. If this fails, report the cleanup issue explicitly.
    try:
        backup_path.unlink()
    except OSError:
        raise HTTPException(
            status_code=500,
            detail="The database record was deleted, but temporary file cleanup failed.",
        )

    return {
        "message": "File deleted successfully.",
        "id": file_id,
    }
# ---------------------------------
# View recent activity logs
# ---------------------------------

@app.get("/activity")
def get_activity(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logs = (
        db.query(ActivityLog)
        .filter(ActivityLog.user_id == current_user.id)
        .order_by(ActivityLog.created_at.desc())
        .limit(100)
        .all()
    )

    return [
        {
            "id": log.id,
            "action": log.action,
            "details": log.details,
            "created_at": log.created_at,
        }
        for log in logs
    ]
