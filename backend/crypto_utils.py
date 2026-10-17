
import os

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt


# File format:
# Magic header (4 bytes) + salt (16 bytes) + nonce (12 bytes)
# + encrypted content and authentication tag (16 bytes).

MAGIC = b"SFV1"
SALT_SIZE = 16
NONCE_SIZE = 12
KEY_SIZE = 32


def derive_key(password: str, salt: bytes) -> bytes:
    """Derive a 256-bit encryption key from a password."""
    if not password:
        raise ValueError("Password cannot be empty.")

    kdf = Scrypt(
        salt=salt,
        length=KEY_SIZE,
        n=2**14,
        r=8,
        p=1,
    )

    return kdf.derive(password.encode("utf-8"))


def encrypt_file(file_data: bytes, password: str) -> bytes:
    """Encrypt file bytes using AES-256-GCM."""
    salt = os.urandom(SALT_SIZE)
    nonce = os.urandom(NONCE_SIZE)

    key = derive_key(password, salt)
    aesgcm = AESGCM(key)

    ciphertext = aesgcm.encrypt(nonce, file_data, MAGIC)

    return MAGIC + salt + nonce + ciphertext


def decrypt_file(encrypted_data: bytes, password: str) -> bytes:
    """Decrypt a file and authenticate its contents."""
    minimum_size = len(MAGIC) + SALT_SIZE + NONCE_SIZE + 16

    if len(encrypted_data) < minimum_size:
        raise ValueError("Invalid or incomplete encrypted file.")

    if encrypted_data[:len(MAGIC)] != MAGIC:
        raise ValueError("Invalid encrypted file format.")

    offset = len(MAGIC)

    salt = encrypted_data[offset:offset + SALT_SIZE]
    offset += SALT_SIZE

    nonce = encrypted_data[offset:offset + NONCE_SIZE]
    offset += NONCE_SIZE

    ciphertext = encrypted_data[offset:]

    key = derive_key(password, salt)
    aesgcm = AESGCM(key)

    try:
        return aesgcm.decrypt(nonce, ciphertext, MAGIC)
    except InvalidTag:
        raise ValueError(
            "Decryption failed: incorrect password or file tampering."
        ) from None
