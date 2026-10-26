"""VaultSecurity: PBKDF2-HMAC-SHA256 key derivation + Fernet authenticated encryption.

Design
------
* The operational key is derived from a master seed with PBKDF2-HMAC-SHA256
  (600,000 iterations by default, the OWASP 2023 floor for this KDF) and a
  deployment salt. The derived 32 bytes are the Fernet key (AES-128-CBC for
  confidentiality, HMAC-SHA256 for integrity, timestamped tokens).
* ``MultiFernet`` keeps previous seeds decryptable during rotation while every
  new token is sealed with the current key.
* No seed configured -> a random ephemeral seed is generated for this process.
  Tokens then cannot be unsealed after restart, which fails closed. Production
  mode refuses to start without an explicit seed.
* Errors never echo key material or plaintext.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from dataclasses import dataclass

from cryptography.fernet import Fernet, InvalidToken, MultiFernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

DEFAULT_ITERATIONS = 600_000
MIN_ITERATIONS = 100_000
MIN_SEED_CHARS = 16
DOMAIN_SALT = b"ciphermesh/vault/v1"


class VaultError(Exception):
    """Raised for malformed, tampered, expired or foreign vault tokens."""


@dataclass(frozen=True)
class VaultDescriptor:
    kdf: str
    iterations: int
    cipher: str
    key_id: str
    ephemeral: bool
    rotation_keys: int


def _derive_key(seed: bytes, salt: bytes, iterations: int) -> bytes:
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=iterations)
    return base64.urlsafe_b64encode(kdf.derive(seed))


class VaultSecurity:
    KDF_NAME = "PBKDF2-HMAC-SHA256"
    CIPHER_NAME = "Fernet (AES-128-CBC + HMAC-SHA256)"

    def __init__(self, master_seed: str | bytes | None = None, salt: str | bytes | None = None,
                 iterations: int = DEFAULT_ITERATIONS, previous_seeds: tuple[str | bytes, ...] = (),
                 ttl_seconds: int | None = None, require_seed: bool = False):
        if iterations < MIN_ITERATIONS:
            raise ValueError(f"PBKDF2 iterations must be >= {MIN_ITERATIONS}")
        self.ephemeral = master_seed is None
        if self.ephemeral:
            if require_seed:
                raise ValueError("CIPHERMESH_VAULT_SEED is required in production")
            master_seed = secrets.token_urlsafe(48)
        seed = master_seed.encode("utf-8") if isinstance(master_seed, str) else master_seed
        if len(seed) < MIN_SEED_CHARS:
            raise ValueError(f"vault master seed must be at least {MIN_SEED_CHARS} characters")
        salt_bytes = salt.encode("utf-8") if isinstance(salt, str) else (salt or b"")
        self._salt = DOMAIN_SALT + b"|" + salt_bytes
        self.iterations = iterations
        self.ttl_seconds = ttl_seconds
        primary = _derive_key(seed, self._salt, iterations)
        older_seeds = [s.encode("utf-8") if isinstance(s, str) else s for s in previous_seeds]
        if any(len(s) < MIN_SEED_CHARS for s in older_seeds):
            raise ValueError(f"previous vault seeds must be at least {MIN_SEED_CHARS} characters")
        older = [_derive_key(s, self._salt, iterations) for s in older_seeds]
        self._fernet = MultiFernet([Fernet(primary), *(Fernet(k) for k in older)])
        self.key_id = "k1-" + hashlib.sha256(primary).hexdigest()[:4]
        self._fingerprint_key = hmac.new(primary, b"ciphermesh/fingerprint/v1", hashlib.sha256).digest()
        self._rotation_keys = len(older)

    def seal_state(self, cleartext: str) -> str:
        """Encrypt diagnostic metadata into an opaque, authenticated, timestamped token."""
        if not isinstance(cleartext, str):
            raise TypeError("seal_state expects str")
        return self._fernet.encrypt(cleartext.encode("utf-8")).decode("ascii")

    def unseal_state(self, cipher_token: str) -> str:
        """Verify integrity (and TTL when configured) and restore the sealed cleartext."""
        if not isinstance(cipher_token, str) or not cipher_token:
            raise VaultError("vault token must be a non-empty string")
        try:
            raw = self._fernet.decrypt(cipher_token.encode("ascii"), ttl=self.ttl_seconds)
        except (InvalidToken, UnicodeEncodeError, ValueError) as exc:
            raise VaultError("invalid, tampered, expired or foreign vault token") from exc
        return raw.decode("utf-8")

    def reseal(self, cipher_token: str) -> str:
        """Re-encrypt an older-key token under the current primary key (rotation)."""
        try:
            return self._fernet.rotate(cipher_token.encode("ascii")).decode("ascii")
        except (InvalidToken, UnicodeEncodeError, ValueError) as exc:
            raise VaultError("cannot rotate an invalid vault token") from exc

    def fingerprint(self, text: str) -> str:
        """Keyed HMAC-SHA256 of text: correlates requests without allowing offline guess confirmation."""
        return hmac.new(self._fingerprint_key, text.encode("utf-8"), hashlib.sha256).hexdigest()

    def describe(self) -> VaultDescriptor:
        return VaultDescriptor(kdf=self.KDF_NAME, iterations=self.iterations, cipher=self.CIPHER_NAME,
                               key_id=self.key_id, ephemeral=self.ephemeral, rotation_keys=self._rotation_keys)

    @staticmethod
    def preview(token: str) -> str:
        return f"{token[:10]}…{token[-6:]}" if len(token) > 20 else "…"
