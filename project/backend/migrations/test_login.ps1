$body = @{email='admin@homestay.com'; password='123456'} | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/login' -Method POST -ContentType 'application/json' -Body $body
