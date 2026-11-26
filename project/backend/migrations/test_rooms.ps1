$loginRes = Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/login' -Method POST -ContentType 'application/json' -Body (@{email='admin@homestay.com'; password='123456'} | ConvertTo-Json)
$token = $loginRes.access_token

$headers = @{
    Authorization = "Bearer $token"
}

$rooms = Invoke-RestMethod -Uri 'http://localhost:3000/api/admin/rooms' -Method GET -Headers $headers
Write-Output "Total rooms fetched: $($rooms.Count)"
$rooms | Select-Object -First 3 | Format-Table -Property id, room_number, apartment_name, room_type_name, status, display_status
