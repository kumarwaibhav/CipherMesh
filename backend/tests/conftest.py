import os

os.environ.setdefault("CIPHERMESH_VAULT_ITERATIONS", "100000")
os.environ.setdefault("CIPHERMESH_LATENCY_SCALE", "0")
os.environ.setdefault("CIPHERMESH_AUDIT_PATH", ":memory:")

import pytest  # noqa: E402

from app.agents import services as services_module  # noqa: E402
from app.agents.graph import build_graph, orchestrator_graph  # noqa: E402
from app.agents.services import Services  # noqa: E402
from app.core import config  # noqa: E402
from app.core.security import VaultSecurity  # noqa: E402

TEST_SEED = "unit-test-master-seed-0123456789"


@pytest.fixture
def services():
    return Services(vault=VaultSecurity(master_seed=TEST_SEED, salt="test", iterations=100_000))


@pytest.fixture
def graph(services):
    return build_graph(services)


@pytest.fixture
def client(monkeypatch):
    from fastapi.testclient import TestClient
    monkeypatch.setenv("CIPHERMESH_VAULT_SEED", TEST_SEED)
    config.get_settings.cache_clear()
    services_module.get_services.cache_clear()
    orchestrator_graph.reset()
    from app.main import create_app
    with TestClient(create_app()) as test_client:
        yield test_client
    config.get_settings.cache_clear()
    services_module.get_services.cache_clear()
    orchestrator_graph.reset()
    from app.api import deps
    deps._limiter = None
