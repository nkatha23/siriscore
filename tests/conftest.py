"""Shared test fixtures and sample transaction data."""
import pytest


@pytest.fixture
def sample_psbt_b64():
    """A prepared PSBT that triggers H1, H2, H3."""
    return "cHNidP8BAH0CAAAAA..."  # replace with real test vector


@pytest.fixture
def sample_rawtx_hex():
    return "0200000001..."  # replace with real test vector
