<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ลงทะเบียนคนขับ - UPBusTransit</title>
    
    <link href="https://fonts.googleapis.com/css2?family=Kanit&display=swap" rel="stylesheet" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <link rel="stylesheet" href="assets/css/register.css">
    <link rel="icon" href="assets/images/location.png" type="image/png">
</head>
<body>

    <div class="register-card">
        <div class="card-header-register">
            <h3 class="mb-0"><i class="fas fa-user-plus"></i> ลงทะเบียนคนขับ</h3>
            <small>UP Bus Transit</small>
        </div>
        
        <div class="card-body">
            <div id="loading" class="text-center py-4">
                <div class="spinner-border" role="status" style="color: #06C755;"></div>
                <p class="mt-2" style="color: #06C755;">กำลังเชื่อมต่อ LINE...</p>
            </div>
            <form id="registerForm" class="d-none">

                <div class="alert alert-info py-2">
                    <small>ยินดีต้อนรับคุณ <b id="lineDisplayName"></b></small>
                </div>
                
                <div class="mb-4">
                    <label class="form-label">ชื่อ - นามสกุล</label>
                    <div class="input-group">
                        <span class="input-group-text"><i class="fas fa-user"></i></span>
                        <input type="text" class="form-control form-control-lg custom-placeholder" id="fullName" placeholder="เช่น นายขับดี ชื่นชม" required>
                    </div>
                </div>

                <hr class="my-4">

                <button type="submit" class="btn btn-register shadow-sm w-100">
                    ยืนยันการลงทะเบียน
                </button>
            </form>

            <div id="message" class="mt-3 text-center"></div>
        </div>
    </div>

    <script src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
    <script src="js/register.js"></script>
</body>
</html>