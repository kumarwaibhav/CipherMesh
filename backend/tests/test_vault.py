import pytest

from app.core.security import VaultError, VaultSecurity

SEED = "unit-test-master-seed-0123456789"


def make(**kw):
    return VaultSecurity(master_seed=kw.pop("seed", SEED), salt=kw.pop("salt", "s"), iterations=100_000, **kw)


def test_seal_unseal_roundtrip_and_opacity():
    vault = make()
    secret = '{"findings":[{"category":"aws_access_key"}],"request_id":"req-1"}'
    token = vault.seal_state(secret)
    assert token != secret and "aws_access_key" not in token and token.startswith("gAAAAA")
    assert vault.unseal_state(token) == secret


def test_tokens_are_randomized():
    vault = make()
    assert vault.seal_state("same") != vault.seal_state("same")


def test_tamper_is_detected():
    vault = make()
    token = vault.seal_state("payload")
    tampered = token[:-6] + ("A" if token[-6] != "A" else "B") + token[-5:]
    with pytest.raises(VaultError):
        vault.unseal_state(tampered)


def test_different_seed_or_salt_cannot_unseal():
    token = make().seal_state("x")
    with pytest.raises(VaultError):
        make(seed="another-master-seed-9876543210").unseal_state(token)
    with pytest.raises(VaultError):
        make(salt="other").unseal_state(token)


def test_same_seed_and_salt_are_deterministic_across_instances():
    token = make().seal_state("portable")
    assert make().unseal_state(token) == "portable"


def test_rotation_keeps_old_tokens_readable_and_reseals():
    old = make(seed="old-master-seed-0000000000")
    token = old.seal_state("legacy")
    rotated = make(previous_seeds=("old-master-seed-0000000000",))
    assert rotated.unseal_state(token) == "legacy"
    fresh = rotated.reseal(token)
    assert make().unseal_state(fresh) == "legacy"


def test_ttl_expiry(monkeypatch):
    vault = make(ttl_seconds=1)
    token = vault.seal_state("short-lived")
    import time as _time
    real = _time.time
    monkeypatch.setattr("time.time", lambda: real() + 120)
    with pytest.raises(VaultError):
        vault.unseal_state(token)


@pytest.mark.parametrize("bad", ["", "not-a-token", "gAAAAAgarbage", "ü"])
def test_malformed_tokens_raise_vault_error(bad):
    with pytest.raises(VaultError):
        make().unseal_state(bad)


def test_guards():
    with pytest.raises(ValueError):
        VaultSecurity(master_seed="short", iterations=100_000)
    with pytest.raises(ValueError):
        VaultSecurity(master_seed=SEED, iterations=1_000)
    with pytest.raises(ValueError):
        VaultSecurity(master_seed=None, require_seed=True, iterations=100_000)
    with pytest.raises(TypeError):
        make().seal_state(b"bytes")  # type: ignore[arg-type]


def test_ephemeral_mode_and_descriptor():
    vault = VaultSecurity(iterations=100_000)
    d = vault.describe()
    assert vault.ephemeral and d.kdf == "PBKDF2-HMAC-SHA256" and d.iterations == 100_000
    assert d.key_id.startswith("k1-") and "Fernet" in d.cipher


def test_default_iterations_meet_owasp_floor():
    from app.core.security import DEFAULT_ITERATIONS
    assert DEFAULT_ITERATIONS >= 600_000


def test_fingerprint_is_keyed_and_stable():
    a = VaultSecurity(master_seed="fingerprint-seed-0123456789", salt="s", iterations=100_000)
    b = VaultSecurity(master_seed="another-seed-0123456789xx", salt="s", iterations=100_000)
    assert a.fingerprint("hello") == a.fingerprint("hello") != b.fingerprint("hello")
    assert len(a.fingerprint("hello")) == 64


def test_short_previous_seed_rejected():
    with pytest.raises(ValueError):
        VaultSecurity(master_seed="fingerprint-seed-0123456789", iterations=100_000, previous_seeds=("short",))


def test_production_requires_salt(monkeypatch):
    from app.agents.services import Services
    from app.core.config import Settings
    monkeypatch.setenv("CIPHERMESH_ENV", "production")
    monkeypatch.setenv("CIPHERMESH_VAULT_SEED", "production-seed-0123456789abcdef")
    monkeypatch.delenv("CIPHERMESH_VAULT_SALT", raising=False)
    with pytest.raises(ValueError, match="SALT"):
        Services(settings=Settings())
