import requests

session = requests.Session()
response = session.get("http://localhost:8000/doctors/")

csrf_token = session.cookies.get("csrftoken")

# Submit location
res = session.post(
    "http://localhost:8000/set-location/",
    data={
        "csrfmiddlewaretoken": csrf_token,
        "location": "Chennai"
    },
    headers={
        "Referer": "http://localhost:8000/doctors/",
        "Origin": "http://localhost:8000"
    },
    allow_redirects=False
)

print(f"Status Code: {res.status_code}")
print(f"Location Header: {res.headers.get('Location')}")
