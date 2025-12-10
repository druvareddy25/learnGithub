from fastapi.testclient import TestClient
import pytest

from src.app import app


@pytest.fixture
def client():
    return TestClient(app)


def test_get_activities(client):
    res = client.get('/activities')
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    # expect at least one known activity
    assert 'Chess Club' in data
    chess = data['Chess Club']
    assert 'description' in chess
    assert 'schedule' in chess
    assert 'availability' in chess
    assert 'participants' in chess


def test_signup_and_remove_participant(client):
    activity = 'Chess Club'
    test_email = 'test.user@example.com'

    # ensure not already present
    res = client.get('/activities')
    assert res.status_code == 200
    data = res.json()
    participants = list(data[activity]['participants'])
    if test_email in participants:
        # remove if present from prior test runs
        client.delete(f"/activities/{activity}/participants?email={test_email}")

    # sign up
    res = client.post(f"/activities/{activity}/signup?email={test_email}")
    assert res.status_code == 200
    assert 'Signed up' in res.json().get('message', '')

    # verify present
    res = client.get('/activities')
    data = res.json()
    assert test_email in data[activity]['participants']

    # remove participant
    res = client.delete(f"/activities/{activity}/participants?email={test_email}")
    assert res.status_code == 200
    assert 'Removed' in res.json().get('message', '')

    # verify removed
    res = client.get('/activities')
    data = res.json()
    assert test_email not in data[activity]['participants']
