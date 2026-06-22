// backend/busRoutes.js
const express = require('express');
const router = express.Router();
const db = require('./db'); 

router.get('/check-driver', async (req, res) => {
    try {
        const { line_id } = req.query;
        if (!line_id) return res.status(400).json({ error: 'Line ID is required' });

        const [rows] = await db.query(
            'SELECT id, full_name, line_user_id FROM drivers WHERE line_user_id = ?', 
            [line_id]
        );

        if (rows.length > 0) {
            res.json({ 
                is_driver: true, 
                driver: rows[0] 
            });
        } else {
            res.json({ is_driver: false });
        }
    } catch (error) {
        console.error('Check driver error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/register', async (req, res) => {
    const { line_user_id, full_name } = req.body;

    if (!line_user_id || !full_name) {
        return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบ' });
    }

    try {
        const [existing] = await db.query('SELECT id FROM drivers WHERE line_user_id = ?', [line_user_id]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'คุณลงทะเบียนไปแล้ว' });
        }

        await db.query(
            'INSERT INTO drivers (line_user_id, full_name, created_at) VALUES (?, ?, NOW())',
            [line_user_id, full_name]
        );

        res.json({ success: true, message: 'ลงทะเบียนสำเร็จ' });
    } catch (error) {
        console.error('Register Error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดที่ Server' });
    }
});

router.get('/buses', async (req, res) => {
    try {
        const sql = `
            SELECT 
                buses.id, 
                buses.bus_number, 
                buses.status_color, 
                buses.current_driver_id,
                drivers.full_name AS driver_name
            FROM buses 
            LEFT JOIN drivers ON buses.current_driver_id = drivers.id
            ORDER BY CAST(buses.bus_number AS UNSIGNED) ASC
        `;
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching buses');
    }
});

router.post('/update-status', async (req, res) => {
    const { bus_id, driver_id, color } = req.body; 

    if (!bus_id || !driver_id || !color) {
        return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบ' });
    }

    try {
        await db.query(
            'UPDATE buses SET current_driver_id = NULL, status_color = "Purple" WHERE current_driver_id = ?',[driver_id]);

        await db.query(
            'UPDATE buses SET current_driver_id = ?, status_color = ? WHERE id = ?',
            [driver_id, color, bus_id]
        );

        res.json({ success: true, message: 'เริ่มงานสำเร็จ' });
    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({ success: false, message: 'อัปเดตสถานะไม่สำเร็จ' });
    }
});

router.post('/stop-driving', async (req, res) => {
    const { driver_id } = req.body;

    if (!driver_id) return res.status(400).json({ success: false });

    try {
        await db.query(
            'UPDATE buses SET current_driver_id = NULL, status_color = "Purple" WHERE current_driver_id = ?',
            [driver_id]
        );

        res.json({ success: true, message: 'เลิกงานสำเร็จ' });
    } catch (error) {
        console.error("Stop Error:", error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

router.get('/current-job', async (req, res) => {
    const { driver_id } = req.query;
    try {
        const [rows] = await db.query(
            'SELECT * FROM buses WHERE current_driver_id = ?', 
            [driver_id]
        );
        
        if (rows.length > 0) {
            res.json({ is_driving: true, bus: rows[0] });
        } else {
            res.json({ is_driving: false });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error checking job' });
    }
});

module.exports = router;