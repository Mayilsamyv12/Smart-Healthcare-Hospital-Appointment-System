
import urllib.request
import urllib.error

endpoints = [
    'http://127.0.0.1:8000/',
    'http://127.0.0.1:8000/admin/',
    # Add other likely endpoints based on file structure
]

for url in endpoints:
    try:
        resp = urllib.request.urlopen(url)
        print(f"GET {url} : {resp.getcode()}")
    except urllib.error.HTTPError as e:
        print(f"GET {url} : {e.code}")
    except Exception as e:
        print(f"GET {url} : FAILED {e}")
