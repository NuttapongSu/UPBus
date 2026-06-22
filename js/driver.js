// js/driver.js
const LIFF_ID = "2010471860-Y8Jlapgj";
const API_BASE = 'https://bustransit.up.ac.th/api'; // http://localhost:5000/api https://bustransit.up.ac.th/api

let dbDriverId = null;

// เมื่อโหลดหน้าเว็บเสร็จ ให้ทำงานทันที
document.addEventListener('DOMContentLoaded', async () => {
    toggleSection('loading');

    await initializeLiff();
    loadBuses();
    
    const form = document.getElementById('driverForm');
    if(form) form.addEventListener('submit', handleFormSubmit);
});

async function initializeLiff() {
    try {
        await liff.init({ liffId: LIFF_ID }); 

        if (!liff.isLoggedIn()) {
            liff.login(); 
            return;
        }

        const profile = await liff.getProfile();
        console.log("Line User:", profile.userId);
        
        // เริ่มเช็คสถานะคนขับ
        await checkDriverStatus(profile.userId);

    } catch (err) {
        console.error("LIFF Init Error:", err);
        document.getElementById('loading').innerHTML = 
            `<div class="alert alert-danger">❌ กรุณาเปิดผ่าน LINE เท่านั้น</div>`;
    }
}

// ฟังก์ชันเช็คสถานะสมาชิก
async function checkDriverStatus(lineUserId) {
    try {
        const res = await fetch(`${API_BASE}/check-driver?line_id=${lineUserId}`);
        const data = await res.json();

        if (data.is_driver) {
            dbDriverId = data.driver.id; 
            document.getElementById('driverNameDisplay').innerText = data.driver.full_name;
            
            await checkCurrentJob();
        } else {
            console.log("Not registered, redirecting...");
            window.location.replace('register.php');
        }
    } catch (error) {
        console.error("Check Driver Error:", error);
        alert("ไม่สามารถเชื่อมต่อ Server ได้");
    }
}

async function checkCurrentJob() {
    try {
        const res = await fetch(`${API_BASE}/current-job?driver_id=${dbDriverId}`);
        const data = await res.json();

        if (data.is_driving) {
            renderActiveJob(data.bus);
        } else {
            renderSelectionForm();
        }
    } catch (error) {
        console.error("Check Job Error:", error);
    }
}

function renderActiveJob(bus) {
    toggleSection('activeJobSection');

    document.getElementById('currentBusNumber').innerText = "รถเบอร์ " + bus.bus_number;
    
    const colorMap = {
        'Green':  'สายหน้ามอ (สีเขียว)',
        'Red':    'สายหอพัก (สีแดง)',
        'Blue':   'สายประตูสาม (สีน้ำเงิน)',
        'Yellow': 'รถชมงาน',
        'White':  'งานอื่นๆ',
        'Orange': 'วิ่งนอกเส้นทาง',
    };
    
    document.getElementById('currentColorText').innerText = colorMap[bus.status_color] || bus.status_color;
    
    const badge = document.getElementById('currentColorBadge');
    badge.className = `badge rounded-pill p-2 px-3 bg-${bus.status_color.toLowerCase()}`; 
    badge.innerText = bus.status_color;
}

async function renderSelectionForm() {
    toggleSection('driverForm');
    await loadBuses(); 
}

function toggleSection(sectionId) {
    document.getElementById('loading').classList.add('d-none');
    document.getElementById('activeJobSection').classList.add('d-none');
    document.getElementById('driverForm').classList.add('d-none');
    
    const el = document.getElementById(sectionId);
    if(el) el.classList.remove('d-none');
}

// ฟังก์ชันดึงข้อมูลรถ
async function loadBuses() {
    const select = document.getElementById('busSelect');
    select.innerHTML = '<option value="" selected disabled>⏳ กำลังโหลด...</option>';

    try {
        const res = await fetch(`${API_BASE}/buses`);
        const buses = await res.json();

        select.innerHTML = '<option value="" selected disabled>-- กรุณาเลือกรถ --</option>';

        buses.forEach(bus => {
            const option = document.createElement('option');
            option.value = bus.id;

            if (bus.current_driver_id) {
                option.text = `⛔ รถเบอร์ ${bus.bus_number} (${bus.driver_name || 'ไม่ทราบชื่อ'})`;
                option.disabled = true; 
                option.style.color = 'red';
            } else {
                option.text = `✅ รถเบอร์ ${bus.bus_number} (ว่าง)`;
                option.style.color = 'green';
            }

            select.appendChild(option);
        });

    } catch (error) {
        console.error("Load Buses Error:", error);
        select.innerHTML = '<option disabled>❌ โหลดข้อมูลล้มเหลว</option>';
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const busId = document.getElementById('busSelect').value;
    const color = document.getElementById('colorSelect').value;
    const messageDiv = document.getElementById('message');

    if (!busId || !color) {
        alert("กรุณาเลือกข้อมูลให้ครบถ้วน");
        return;
    }

    messageDiv.innerHTML = '<span class="text-primary">⏳ กำลังบันทึกข้อมูล...</span>';

    try {
        const res = await fetch(`${API_BASE}/update-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                driver_id: dbDriverId, 
                bus_id: busId,
                color: color
            })
        });

        const result = await res.json();
        
        if (result.success) {
            messageDiv.innerHTML = `<div class="alert alert-success mt-2">✅ สำเร็จ!</div>`;
            setTimeout(() => location.reload(), 1000);
        } else {
            messageDiv.innerHTML = `<div class="alert alert-danger mt-2">❌ ${result.message}</div>`;
        }
    } catch (error) {
        console.error(error);
        messageDiv.innerHTML = `<div class="alert alert-danger mt-2">❌ เชื่อมต่อ Server ไม่ได้</div>`;
    }
}

window.stopDriving = async function() {
    if(!confirm("ต้องการเปลี่ยนคัน?")) return;

    try {
        const res = await fetch(`${API_BASE}/stop-driving`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                driver_id: dbDriverId
            })
        });

        const result = await res.json();
        if(result.success) {
            location.reload();
        }
    } catch (error) {
        console.error("Stop Error:", error);
        alert("เกิดข้อผิดพลาดในการเลิกงาน");
    }
};