<!DOCTYPE html>
<html lang="th">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>เปลี่ยนสาย - UPBusTransit</title>

    <link href="https://fonts.googleapis.com/css2?family=Kanit&display=swap" rel="stylesheet" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel='stylesheet' href='https://cdn-uicons.flaticon.com/2.4.0/uicons-thin-rounded/css/uicons-thin-rounded.css'>
    <link rel="stylesheet" href="assets/css/driver.css">
    <link rel="icon" href="assets/images/bus-all.png" type="image/png">
</head>

<body>

    <div class="driver-card">
        <div class="card-header-custom">
            <h3 class="mb-0"><img src="assets/images/allbus.png" alt="End" class="change-line"> เปลี่ยนสายรถบัส EV</h3>
            <small>UP Bus Transit</small>
        </div>
        <div class="card-body">
            <div id="loading" class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-2 text-muted">กำลังระบุตัวตนคนขับ...</p>
            </div>
            <div id="activeJobSection" class="d-none text-center">
                <div class="alert alert-success">
                    <h4 class="alert-heading">กำลังปฏิบัติงาน ✅</h4>
                    <p class="mb-0">คุณไม่ต้องเลือกใหม่ ระบบจำค่าเดิมไว้แล้ว</p>
                </div>
                
                <div class="p-4 border rounded mb-3 bg-light">
                    <h1 class="display-4 mb-0" id="currentBusNumber">-</h1>
                    <small class="text-muted">หมายเลขรถ</small>
                    <hr>
                    <h3 id="currentColorText">-</h3>
                    <div id="currentColorBadge" class="badge rounded-pill bg-secondary p-2 px-3">
                        Status Color
                    </div>
                </div>

                <button onclick="stopDriving()" class="btn btn-danger w-100 py-3 mb-2">
                    🛑 เปลี่ยนรถ
                </button>
            </div>
            <form id="driverForm" class="d-none">
                <div class="alert alert-primary d-flex align-items-center mb-4">
                    <i class="fi fi-tr-seatbelt-safety-driver me-3 fs-3"></i>
                    <div>
                        <small>สวัสดีคนขับ</small><br>
                        <strong id="driverNameDisplay"></strong>
                    </div>
                </div>
                <div class="mb-4">
                    <label class="form-label">🚌 เลือกรถที่จะขับ</label>
                    <select class="form-select form-select-lg" id="busSelect" required>
                        <option value="" selected disabled>กำลังโหลดรายชื่อรถ...</option>
                    </select>
                </div>

                <div class="mb-4">
                    <label class="form-label">🎨 วันนี้วิ่งสายสีอะไร?</label>
                    <select class="form-select form-select-lg" id="colorSelect" required>
                        <option value="" selected disabled></option>
                        <option value="Green" class="bg-green">🟢 สายหน้ามอ (สีเขียว)</option>
                        <option value="Red" class="bg-red">🔴 สายหอพัก (สีแดง)</option>
                        <option value="Blue" class="bg-blue">🔵 สายประตูสาม (สีน้ำเงิน)</option>
                        <option value="Yellow" class="bg-yellow">🟡 รถสำหรับชมงาน (เช่น ดูงานภายในมอ)</option>
                        <option value="White" class="bg-white">⚪ รถสำหรับงานอื่นๆ (เช่น คอนเสิร์ต, ยืมรถ)</option>
                        <option value="Orange">🟠 วิ่งนอกเส้นทาง</option>
                    </select>
                </div>

                <hr class="my-4">

                <button type="submit" class="btn btn-upbus shadow-sm">
                    ยืนยันเปลี่ยนสาย
                </button>
            </form>

            <div id="message" class="mt-3 text-center"></div>
        </div>
    </div>

    <script src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
    <script src="js/driver.js"></script>
</body>

</html>