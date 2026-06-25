// js/register.js

const API_BASE = 'https://bustransit.up.ac.th/api';
const LIFF_ID = "2010471860-Y8Jlapgj";

let currentLineUserId = '';

document.addEventListener('DOMContentLoaded', async () => {
    await initializeLiff();
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
});

async function initializeLiff() {
    try {
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isLoggedIn()) { liff.login(); return; }

        const profile = await liff.getProfile();
        currentLineUserId = profile.userId;

        try {
            const checkRes = await fetch(`${API_BASE}/driver/check?line_id=${currentLineUserId}`);
            const checkData = await checkRes.json();

            if (checkData.is_driver) {
                window.location.replace('driver.php');
                return;
            }
        } catch (e) {
            console.log("Check driver error, showing register form anyway");
        }

        const displayName = profile.displayName;
        document.getElementById('lineDisplayName').innerText = displayName;
        document.getElementById('loading').classList.add('d-none');
        document.getElementById('registerForm').classList.remove('d-none');

    } catch (err) {
        console.error("LIFF Error:", err);
        document.getElementById('loading').innerHTML = 
            `<div class="alert alert-danger">❌ เปิดผ่าน LINE เท่านั้น</div>`;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const fullName = document.getElementById('fullName').value;
    const messageDiv = document.getElementById('message');

    // ตรวจสอบข้อมูลว่าง
    if(fullName.trim() === "") {
        alert("กรุณากรอกชื่อ-นามสกุล");
        return;
    }

    if(!currentLineUserId) {
        alert("ไม่พบข้อมูล LINE User ID กรุณารีเฟรช");
        return;
    }

    messageDiv.innerHTML = '<span class="text-secondary">⏳ กำลังบันทึกข้อมูล...</span>';

    try {
        // ยิงข้อมูลไปที่ Backend
        const response = await fetch(`${API_BASE}/driver/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                line_user_id: currentLineUserId,
                full_name: fullName,
            })
        });

        const result = await response.json();

        if (result.success) {
            messageDiv.innerHTML = `<div class="alert alert-success">✅ ลงทะเบียนสำเร็จ! ยินดีต้อนรับคุณ ${fullName}</div>`;

            setTimeout(() => {
                window.location.href = 'driver.php';
            }, 2000);
        } else {
            const errMsg = result.error || '';
            if (errMsg.includes("ลงทะเบียนแล้ว") || errMsg.includes("already")) {
                messageDiv.innerHTML = `
                    <div class="alert alert-info">
                        ℹ️ คุณเคยลงทะเบียนไว้แล้ว<br>
                        กำลังพาไปหน้าคนขับ...
                    </div>`;

                setTimeout(() => {
                    window.location.replace('driver.php');
                }, 2000);
            } else {
                messageDiv.innerHTML = `<div class="alert alert-warning">⚠️ ${errMsg || 'เกิดข้อผิดพลาด'}</div>`;
            }
        }

    } catch (error) {
        console.error(error);
        messageDiv.innerHTML = `<div class="alert alert-danger">❌ เชื่อมต่อ Server ไม่ได้</div>`;
    }
}