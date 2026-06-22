const fs = require('fs');
const path = require('path');

function parseKmlCoords(kmlText) {
  // เอาเฉพาะ LineString (เส้นทางถนนจริง) ไม่เอา Point (หมุดป้ายจอด) ไม่งั้นเส้นจะกระโดดมั่ว
  const lineStrings = kmlText.match(/<LineString>[\s\S]*?<\/LineString>/g) || [];
  const coords = [];
  lineStrings.forEach(ls => {
    const coordMatch = ls.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
    if (!coordMatch) return;
    coordMatch[1].trim().split(/\s+/).forEach(pair => {
      const [lng, lat] = pair.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) coords.push({ lat, lng });
    });
  });
  return coords;
}

const ROUTE_FILES = {
  red:   path.join(__dirname, '..', '..', 'up_bus_transit_red.kml'),
  green: path.join(__dirname, '..', '..', 'up_bus_transit_green.kml'),
  blue:  path.join(__dirname, '..', '..', 'up_bus_transit_blue.kml'),
};

const ROUTE_PATHS = {};
Object.entries(ROUTE_FILES).forEach(([color, file]) => {
  try {
    ROUTE_PATHS[color] = parseKmlCoords(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error(`Mock GPS: cannot read ${color} KML:`, err.message);
    ROUTE_PATHS[color] = [];
  }
});

const ROUTE_COLORS = Object.keys(ROUTE_PATHS).filter(c => ROUTE_PATHS[c].length > 1);

let busStates = null;

function initStates(deviceIds) {
  busStates = deviceIds.map((deviceId, i) => {
    const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
    const routePath = ROUTE_PATHS[color];
    return {
      deviceId,
      color,
      idx: Math.random() * (routePath.length - 1),
      dir: Math.random() < 0.5 ? 1 : -1,
      speed: 15 + Math.random() * 20, // km/h
      odo: Math.floor(Math.random() * 5000000), // เมตร (0–5000 km)
      soc: 40 + Math.random() * 50,
    };
  });
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function bearingBetween(a, b) {
  const toRad = d => d * Math.PI / 180;
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function generate(deviceIds) {
  if (!busStates) initStates(deviceIds);

  return busStates.map(state => {
    const routePath = ROUTE_PATHS[state.color];
    if (routePath.length < 2) {
      return {
        id: state.deviceId, lat: '19.029100', lng: '99.894600',
        speed: '0', bearing: '0', acc: '0', soc: '50', bv: '0', be: '0', odo: '0',
        datetime: new Date().toISOString(),
      };
    }

    // เคลื่อนที่สุ่มเล็กน้อยรอบความเร็วเดิม ให้ดูเป็นธรรมชาติ ไม่ใช่เส้นตรงเป๊ะ
    const step = (0.3 + Math.random() * 0.4) * state.dir;
    state.idx += step;

    if (state.idx >= routePath.length - 1) { state.idx = routePath.length - 1; state.dir = -1; }
    if (state.idx <= 0) { state.idx = 0; state.dir = 1; }

    const i0 = Math.floor(state.idx);
    const i1 = Math.min(i0 + 1, routePath.length - 1);
    const t = state.idx - i0;
    const lat = lerp(routePath[i0].lat, routePath[i1].lat, t);
    const lng = lerp(routePath[i0].lng, routePath[i1].lng, t);
    // ถ้าวิ่งถอยหลัง (dir=-1) ให้บวก 180° เพื่อให้หน้ารถชี้ทิศที่วิ่งจริง
    const rawBearing = bearingBetween(routePath[i0], routePath[i1]);
    const bearing = state.dir > 0 ? rawBearing : (rawBearing + 180) % 360;

    state.odo += state.speed * (10 / 3600) * 1000; // tick ~10 วินาที → เมตร
    state.soc = Math.max(20, state.soc - 0.05);

    return {
      id: state.deviceId,
      datetime: new Date().toISOString().replace('T', ' ').slice(0, 19),
      acc: '1',
      lat: lat.toFixed(6),
      lng: lng.toFixed(6),
      speed: state.speed.toFixed(0),
      bearing: bearing.toFixed(0),
      gps: '10',
      gsm: '20',
      driver_id: '',
      driver_name: '',
      ext_in: '4.00',
      ext_ex: '24.00',
      odo: state.odo.toFixed(0),
      rpm: '0',
      bv: (600 + Math.random() * 20).toFixed(1),
      be: (8 + Math.random() * 5).toFixed(2),
      minct: '29', maxct: '32', mincv: '3.24', maxcv: '3.29',
      itemp: '', otemp: '',
      soc: state.soc.toFixed(2),
      kwh: '', soh: '',
    };
  });
}

module.exports = { generate };
