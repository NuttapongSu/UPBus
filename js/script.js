//const { url } = require("inspector");
// ข้อมูลป้ายรถทั้งหมด 28 ป้าย 3 จุดจอด 1 สถานี
const allBusStops = {
  p1: "จุดจอดรถบัสหน้ามหาวิทยาลัย",
  p2: "จุดจอดรถบัสPKY",
  p3: "จุดจอดรถบัสประตูสาม",
  anr: "คณะเกษตรศาสตร์และทรัพยากรธรรมชาติ",
  it: "คณะเทคโนโลยีสารสนเทศและการสื่อสาร",
  dent: "คณะทันตแพทยศาสตร์",
  law: "คณะนิติศาสตร์",
  busi: "คณะบริหารธุรกิจและนิเทศศาสตร์",
  nurse: "คณะพยาบาลศาสตร์",
  ee: "คณะพลังงานและสิ่งแวดล้อม",
  med: "คณะเภสัชศาสตร์",
  hos: "คณะแพทยศาสตร์",
  poli: "คณะรัฐศาสตร์และสังคมศาสตร์",
  sci: "คณะวิทยาศาสตร์",
  medsci: "คณะวิทยาศาสตร์การแพทย์",
  eng: "คณะวิศวกรรมศาสตร์",
  afa: "คณะสถาปัตยกรรมศาสตร์และศิลปกรรมศาสตร์",
  ash: "คณะสหเวชศาสตร์",
  pubh: "คณะสาธารณสุขศาสตร์",
  art: "คณะศิลปศาสตร์",
  edu: "วิทยาลัยการศึกษา",
  ce: "อาคารเรียนรวม CE",
  pky: "อาคารเรียนรวม PKY",
  uba: "อาคาร 99 ปี พระอุบาลีคุณูปมาจารย์",
  pre: "อาคารสำนักงานอธิการบดี",
  pnm: "หอประชุมพญางำเมือง",
  ssb: "อาคารสงวนเสริมศรี",
  upd: "หอพักนิสิต",
  std: "สนามกีฬา",
  hup: "โรงพยาบาลมหาวิทยาลัยพะเยา",
  stup: "โรงเรียนสาธิตมหาวิทยาลัยพะเยา",
  cl: "ศูนย์การเรียนรู้เศรษฐกิจพอเพียง",
  s1: "เรือนเอื้องคำ",
  s2: "เวียงพะเยา",
  s3: "หน้าอาคาร ๙๙ ปี",
  swim: "สระว่ายน้ำ",
};

const hiddenStops = ["s1", "s3"];

const locationGroups = {
  // คณะวิทยาศาสตร์ , คณะแพทยศาสตร์ , คณะพยาบาลศาสตร์ , คณะสาธารณสุขศาสตร์ , คณะเกษตรศาสตร์และทรัพยากรธรรมชาติ
  sci: "science-group",
  nurse: "science-group",
  pubh: "science-group",
  anr: "science-group",

  // คณะเทคโนโลยีสารสนเทศและการสื่อสาร , ศูนย์การเรียนรู้เศรษฐกิจพอเพียง
  it: "ict-group",
  cl: "ict-group",

  // คณะเทคโนโลยีสารสนเทศและการสื่อสาร , ศูนย์การเรียนรู้เศรษฐกิจพอเพียง
  law: "allpky-group",
  busi: "allpky-group",
  poli: "allpky-group",
  edu: "allpky-group",
  pky: "allpky-group",
  p2: "allpky-group",

  // คณะเทคโนโลยีสารสนเทศและการสื่อสาร , ศูนย์การเรียนรู้เศรษฐกิจพอเพียง
  ee: "eng-group",
  med: "eng-group",
  eng: "eng-group",
  afa: "eng-group",
  ash: "eng-group",

  // คณะเทคโนโลยีสารสนเทศและการสื่อสาร , ศูนย์การเรียนรู้เศรษฐกิจพอเพียง
  hos: "hosup-group",
  hup: "hosup-group",

  // คณะวิทยาศาสตร์ , คณะแพทยศาสตร์ , คณะพยาบาลศาสตร์ , คณะสาธารณสุขศาสตร์ , คณะเกษตรศาสตร์และทรัพยากรธรรมชาติ
  art: "artall-group",
  medsci: "artall-group",
  ce: "artall-group",

  //  คณะพลังงานและสิ่งแวดล้อม , คณะเภสัชศาสตร์ , วิศวกรรม, คณะสถาปัตยกรรมศาสตร์และการออกแบบ , สหเวชศาสตร์
  ee: "p2-group",
  med: "p2-group",
  eng: "p2-group",
  afa: "p2-group",
  ash: "p2-group",

  // อาคารสงวน, สนามกีฬา, สระว่ายน้ำ
  ssb: "ssb-group",
  std: "ssb-group",
  swim: "ssb-group",

  //หอพัก, เวียงพะเยา
  upd: "upd-group",
  s2: "upd-group",
};

const routeDatabase = {
  anr: {
    it: [
      // (เส้นทางที่ 1 สายประตูสาม: แนะนำ, สายตรง)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["anr", "eng", "it"] }],
      },
    ],
    cl: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["anr", "eng", "it", "cl"] }],
      },
    ],
    dent: [
      // (เส้นทางที่ 1 สายหน้ามอ: แนะนำ, สายตรง)
      {
        time: 6,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["anr", "eng", "s1", "dent"] }],
      },
    ],
    hos: [
      // (เส้นทางที่ 1: สายหน้ามอ:  สายตรง)
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["anr", "eng", "s1", "dent", "hos"] },
        ],
      },
    ],
    hup: [
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["anr", "eng", "s1", "dent", "hup"] },
        ],
      },
    ],
    pre: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["anr", "pnm", "pre"] }],
      },
    ],
    pnm: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["anr", "pnm"] }],
      },
    ],
    uba: [
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["anr", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["anr", "p2"] },
          { line: "สายหอพัก", stops: ["anr", "s3"] },
        ],
      },
    ],
    // ส่วนที่ยาก มีหลายไอคอน หลายเงื่อนไข
    s2: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["anr", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["pre", "p2"] },
          { line: "สายหอพัก", stops: ["anr", "s3", "s2"] },
        ],
      },
    ],
    // ส่วนที่ยาก มีหลายไอคอน หลายเงื่อนไข
    upd: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["anr", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["anr", "p2"] },
          { line: "สายหอพัก", stops: ["anr", "s3", "s2"] },
        ],
      },
    ],
    // ส่วนที่ยาก มีหลายไอคอน หลายเงื่อนไข
    stup: [
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["anr", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["anr", "p2"] },
          { line: "สายหอพัก", stops: ["anr", "s3", "s2", "ssb", "stup"] },
        ],
      },
    ],
    // 1
    law: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["anr", "pnm", "pre", "p2"] }],
      },
    ],
    busi: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["anr", "pnm", "pre", "p2"] }],
      },
    ],
    poli: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["anr", "pnm", "pre", "p2"] }],
      },
    ],
    edu: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["anr", "pnm", "pre", "p2"] }],
      },
    ],
    pky: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["anr", "pnm", "pre", "p2"] }],
      },
    ],
    p2: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["anr", "pnm", "pre", "p2"] }],
      },
    ],
    // 2
    ee: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["anr", "eng"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["anr", "eng"] }],
      },
    ],
    med: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["anr", "eng"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["anr", "eng"] }],
      },
    ],
    eng: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["anr", "eng"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["anr", "eng"] }],
      },
    ],
    afa: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["anr", "eng"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["anr", "eng"] }],
      },
    ],
    ash: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["anr", "eng"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["anr", "eng"] }],
      },
    ],
    // 3
    ssb: [
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["anr", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["anr", "p2"] },
          { line: "สายหอพัก", stops: ["anr", "s3", "s2", "ssb"] },
        ],
      },
    ],
    std: [
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["anr", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["anr", "p2"] },
          { line: "สายหอพัก", stops: ["anr", "s3", "s2", "ssb"] },
        ],
      },
    ],
    swim: [
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["anr", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["anr", "p2"] },
          { line: "สายหอพัก", stops: ["anr", "s3", "s2", "ssb"] },
        ],
      },
    ],
    // 4
    art: [
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["anr", "pnm"] },
          { line: "สายหอพัก", stops: ["anr", "pre"] },
          { line: "สายประตูสาม", stops: ["anr", "art"] },
        ],
      },
    ],
    medsci: [
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["anr", "pnm"] },
          { line: "สายหอพัก", stops: ["anr", "pre"] },
          { line: "สายประตูสาม", stops: ["anr", "art"] },
        ],
      },
    ],
    ce: [
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["anr", "pnm"] },
          { line: "สายหอพัก", stops: ["anr", "pre"] },
          { line: "สายประตูสาม", stops: ["anr", "art"] },
        ],
      },
    ],
    p1: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["anr", "eng", "s1", "dent", "p1"] },
        ],
      },
    ],
    p3: [
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["anr", "eng", "it", "cl", "p3"] },
        ],
      },
    ],
  },

  sci: {
    it: [
      // (เส้นทางที่ 1 สายประตูสาม: แนะนำ, สายตรง)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["sci", "eng", "it"] }],
      },
    ],
    cl: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["sci", "eng", "it", "cl"] }],
      },
    ],
    dent: [
      // (เส้นทางที่ 1 สายหน้ามอ: แนะนำ, สายตรง)
      {
        time: 6,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["sci", "eng", "s1", "dent"] }],
      },
    ],
    hos: [
      // (เส้นทางที่ 1: สายหน้ามอ:  สายตรง)
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["sci", "eng", "s1", "dent", "hos"] },
        ],
      },
    ],
    hup: [
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["sci", "eng", "s1", "dent", "hup"] },
        ],
      },
    ],
    pre: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["sci", "pnm", "pre"] }],
      },
    ],
    pnm: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["sci", "pnm"] }],
      },
    ],
    uba: [
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["sci", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["sci", "p2"] },
          { line: "สายหอพัก", stops: ["sci", "s3"] },
        ],
      },
    ],
    // ส่วนที่ยาก มีหลายไอคอน หลายเงื่อนไข
    s2: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["sci", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["sci", "p2"] },
          { line: "สายหอพัก", stops: ["sci", "s3", "s2"] },
        ],
      },
    ],
    // ส่วนที่ยาก มีหลายไอคอน หลายเงื่อนไข
    upd: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["sci", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["sci", "p2"] },
          { line: "สายหอพัก", stops: ["sci", "s3", "s2"] },
        ],
      },
    ],
    // ส่วนที่ยาก มีหลายไอคอน หลายเงื่อนไข
    stup: [
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["sci", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["sci", "p2"] },
          { line: "สายหอพัก", stops: ["sci", "s3", "s2", "ssb", "stup"] },
        ],
      },
    ],
    // 1
    law: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["sci", "pnm", "pre", "p2"] }],
      },
    ],
    busi: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["sci", "pnm", "pre", "p2"] }],
      },
    ],
    poli: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["sci", "pnm", "pre", "p2"] }],
      },
    ],
    edu: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["sci", "pnm", "pre", "p2"] }],
      },
    ],
    pky: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["sci", "pnm", "pre", "p2"] }],
      },
    ],
    p2: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["sci", "pnm", "pre", "p2"] }],
      },
    ],
    // 2
    ee: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["sci", "eng"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["sci", "eng"] }],
      },
    ],
    med: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["sci", "eng"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["sci", "eng"] }],
      },
    ],
    eng: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["sci", "eng"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["sci", "eng"] }],
      },
    ],
    afa: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["sci", "eng"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["sci", "eng"] }],
      },
    ],
    ash: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["sci", "eng"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["sci", "eng"] }],
      },
    ],
    // 3
    ssb: [
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["sci", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["sci", "p2"] },
          { line: "สายหอพัก", stops: ["sci", "s3", "s2", "ssb"] },
        ],
      },
    ],
    std: [
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["sci", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["sci", "p2"] },
          { line: "สายหอพัก", stops: ["sci", "s3", "s2", "ssb"] },
        ],
      },
    ],
    swim: [
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["sci", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["sci", "p2"] },
          { line: "สายหอพัก", stops: ["sci", "s3", "s2", "ssb"] },
        ],
      },
    ],
    // 4
    art: [
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["sci", "pnm"] },
          { line: "สายหอพัก", stops: ["sci", "pre"] },
          { line: "สายประตูสาม", stops: ["sci", "art"] },
        ],
      },
    ],
    medsci: [
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["sci", "pnm"] },
          { line: "สายหอพัก", stops: ["sci", "pre"] },
          { line: "สายประตูสาม", stops: ["sci", "art"] },
        ],
      },
    ],
    ce: [
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["sci", "pnm"] },
          { line: "สายหอพัก", stops: ["sci", "pre"] },
          { line: "สายประตูสาม", stops: ["sci", "art"] },
        ],
      },
    ],
    p1: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["sci", "eng", "s1", "dent", "p1"] },
        ],
      },
    ],
    p3: [
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["sci", "eng", "it", "cl", "p3"] },
        ],
      },
    ],
  },

  nurse: {
    it: [
      // (เส้นทางที่ 1 สายประตูสาม: แนะนำ, สายตรง)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["nurse", "eng", "it"] }],
      },
    ],
    cl: [
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["nurse", "eng", "it", "cl"] },
        ],
      },
    ],
    dent: [
      // (เส้นทางที่ 1 สายหน้ามอ: แนะนำ, สายตรง)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["nurse", "eng", "s1", "dent"] },
        ],
      },
    ],
    hos: [
      // (เส้นทางที่ 1: สายหน้ามอ:  สายตรง)
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["nurse", "eng", "s1", "dent", "hos"] },
        ],
      },
    ],
    hup: [
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["nurse", "eng", "s1", "dent", "hup"] },
        ],
      },
    ],
    pre: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["nurse", "pnm", "pre"] }],
      },
    ],
    pnm: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["nurse", "pnm"] }],
      },
    ],
    uba: [
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["nurse", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["nurse", "p2"] },
          { line: "สายหอพัก", stops: ["nurse", "s3"] },
        ],
      },
    ],
    // ส่วนที่ยาก มีหลายไอคอน หลายเงื่อนไข
    s2: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["nurse", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["nurse", "p2"] },
          { line: "สายหอพัก", stops: ["nurse", "s3", "s2"] },
        ],
      },
    ],
    // ส่วนที่ยาก มีหลายไอคอน หลายเงื่อนไข
    upd: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["nurse", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["nurse", "p2"] },
          { line: "สายหอพัก", stops: ["nurse", "s3", "s2"] },
        ],
      },
    ],
    // ส่วนที่ยาก มีหลายไอคอน หลายเงื่อนไข
    stup: [
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["nurse", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["nurse", "p2"] },
          { line: "สายหอพัก", stops: ["nurse", "s3", "s2", "ssb", "stup"] },
        ],
      },
    ],
    // 1
    law: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["nurse", "pnm", "pre", "p2"] }],
      },
    ],
    busi: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["nurse", "pnm", "pre", "p2"] }],
      },
    ],
    poli: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["nurse", "pnm", "pre", "p2"] }],
      },
    ],
    edu: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["nurse", "pnm", "pre", "p2"] }],
      },
    ],
    pky: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["nurse", "pnm", "pre", "p2"] }],
      },
    ],
    p2: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["nurse", "pnm", "pre", "p2"] }],
      },
    ],
    // 2
    ee: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["nurse", "eng"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["nurse", "eng"] }],
      },
    ],
    med: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["nurse", "eng"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["nurse", "eng"] }],
      },
    ],
    eng: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["nurse", "eng"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["nurse", "eng"] }],
      },
    ],
    afa: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["nurse", "eng"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["nurse", "eng"] }],
      },
    ],
    ash: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["nurse", "eng"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["nurse", "eng"] }],
      },
    ],
    // 3
    ssb: [
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["nurse", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["nurse", "p2"] },
          { line: "สายหอพัก", stops: ["nurse", "s3", "s2", "ssb"] },
        ],
      },
    ],
    std: [
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["nurse", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["nurse", "p2"] },
          { line: "สายหอพัก", stops: ["nurse", "s3", "s2", "ssb"] },
        ],
      },
    ],
    swim: [
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["nurse", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["nurse", "p2"] },
          { line: "สายหอพัก", stops: ["nurse", "s3", "s2", "ssb"] },
        ],
      },
    ],
    // 4
    art: [
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["nurse", "pnm"] },
          { line: "สายหอพัก", stops: ["nurse", "pre"] },
          { line: "สายประตูสาม", stops: ["nurse", "art"] },
        ],
      },
    ],
    medsci: [
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["nurse", "pnm"] },
          { line: "สายหอพัก", stops: ["nurse", "pre"] },
          { line: "สายประตูสาม", stops: ["nurse", "art"] },
        ],
      },
    ],
    ce: [
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["nurse", "pnm"] },
          { line: "สายหอพัก", stops: ["nurse", "pre"] },
          { line: "สายประตูสาม", stops: ["nurse", "art"] },
        ],
      },
    ],
    p1: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["nurse", "eng", "s1", "dent", "p1"] },
        ],
      },
    ],
    p3: [
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["nurse", "eng", "it", "cl", "p3"] },
        ],
      },
    ],
  },

  pubh: {
    it: [
      // (เส้นทางที่ 1 สายประตูสาม: แนะนำ, สายตรง)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["pubh", "eng", "it"] }],
      },
    ],
    cl: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["pubh", "eng", "it", "cl"] }],
      },
    ],
    dent: [
      // (เส้นทางที่ 1 สายหน้ามอ: แนะนำ, สายตรง)
      {
        time: 6,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["pubh", "eng", "s1", "dent"] }],
      },
    ],
    hos: [
      // (เส้นทางที่ 1: สายหน้ามอ:  สายตรง)
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["pubh", "eng", "s1", "dent", "hos"] },
        ],
      },
    ],
    hup: [
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["pubh", "eng", "s1", "dent", "hup"] },
        ],
      },
    ],
    pre: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pubh", "pnm", "pre"] }],
      },
    ],
    pnm: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pubh", "pnm"] }],
      },
    ],
    uba: [
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["sci", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["sci", "p2"] },
          { line: "สายหอพัก", stops: ["sci", "s3"] },
        ],
      },
    ],
    // ส่วนที่ยาก มีหลายไอคอน หลายเงื่อนไข
    s2: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["pubh", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["pubh", "p2"] },
          { line: "สายหอพัก", stops: ["pubh", "s3", "s2"] },
        ],
      },
    ],
    // ส่วนที่ยาก มีหลายไอคอน หลายเงื่อนไข
    upd: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["pubh", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["pubh", "p2"] },
          { line: "สายหอพัก", stops: ["pubh", "s3", "s2"] },
        ],
      },
    ],
    // ส่วนที่ยาก มีหลายไอคอน หลายเงื่อนไข
    stup: [
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["pubh", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["pubh", "p2"] },
          { line: "สายหอพัก", stops: ["pubh", "s3", "s2", "ssb", "stup"] },
        ],
      },
    ],
    // 1
    law: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pubh", "pnm", "pre", "p2"] }],
      },
    ],
    busi: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pubh", "pnm", "pre", "p2"] }],
      },
    ],
    poli: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pubh", "pnm", "pre", "p2"] }],
      },
    ],
    edu: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pubh", "pnm", "pre", "p2"] }],
      },
    ],
    pky: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pubh", "pnm", "pre", "p2"] }],
      },
    ],
    p2: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pubh", "pnm", "pre", "p2"] }],
      },
    ],
    // 2
    ee: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["pubh", "eng"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["pubh", "eng"] }],
      },
    ],
    med: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["pubh", "eng"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["pubh", "eng"] }],
      },
    ],
    eng: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["pubh", "eng"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["pubh", "eng"] }],
      },
    ],
    afa: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["pubh", "eng"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["pubh", "eng"] }],
      },
    ],
    ash: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["pubh", "eng"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["pubh", "eng"] }],
      },
    ],
    // 3
    ssb: [
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["pubh", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["pubh", "p2"] },
          { line: "สายหอพัก", stops: ["pubh", "s3", "s2", "ssb"] },
        ],
      },
    ],
    std: [
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["pubh", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["pubh", "p2"] },
          { line: "สายหอพัก", stops: ["pubh", "s3", "s2", "ssb"] },
        ],
      },
    ],
    swim: [
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["pubh", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["pubh", "p2"] },
          { line: "สายหอพัก", stops: ["pubh", "s3", "s2", "ssb"] },
        ],
      },
    ],
    // 4
    art: [
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["pubh", "pnm"] },
          { line: "สายหอพัก", stops: ["pubh", "pre"] },
          { line: "สายประตูสาม", stops: ["pubh", "art"] },
        ],
      },
    ],
    medsci: [
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["pubh", "pnm"] },
          { line: "สายหอพัก", stops: ["pubh", "pre"] },
          { line: "สายประตูสาม", stops: ["pubh", "art"] },
        ],
      },
    ],
    ce: [
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["pubh", "pnm"] },
          { line: "สายหอพัก", stops: ["pubh", "pre"] },
          { line: "สายประตูสาม", stops: ["pubh", "art"] },
        ],
      },
    ],
    p1: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["pubh", "eng", "s1", "dent", "p1"] },
        ],
      },
    ],
    p3: [
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["pubh", "eng", "it", "cl", "p3"] },
        ],
      },
    ],
  },
  it: {
    dent: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["it", "pnm", "pre", "art", "sci", "eng"],
          },
          { line: "สายประตูสาม", stops: ["it", "p1"] },
          { line: "สายหน้ามอ", stops: ["it", "s1", "dent"] },
        ],
      },
    ],

    hos: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหน้ามอ)
      {
        time: 11,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["it", "pnm", "pre", "art", "sci", "eng"],
          },
          { line: "สายประตูสาม", stops: ["it", "p1"] },
          { line: "สายหน้ามอ", stops: ["it", "s1", "dent", "hos"] },
        ],
      },
    ],

    hup: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหน้ามอ)
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["it", "pnm", "pre", "art", "sci"] },
          { line: "สายประตูสาม", stops: ["it", "eng"] },
          { line: "สายหน้ามอ", stops: ["it", "s1", "dent", "hup"] },
        ],
      },
    ],

    hos: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหน้ามอ)
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["it", "pnm", "pre", "art", "sci"] },
          { line: "สายประตูสาม", stops: ["it", "eng"] },
          { line: "สายหน้ามอ", stops: ["it", "s1", "dent", "hos"] },
        ],
      },
    ],

    pre: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["it", "pnm", "pre"] }],
      },
    ],

    pnm: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["it", "pnm"] }],
      },
    ],

    uba: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหอพัก)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["it", "pnm"] },
          { line: "สายประตูสาม", stops: ["it", "pre"] },
          { line: "สายหอพัก", stops: ["it", "p2", "s3"] },
        ],
      },
    ],

    s2: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหอพัก)
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["it", "pnm"] },
          { line: "สายประตูสาม", stops: ["it", "pre"] },
          { line: "สายหอพัก", stops: ["it", "p2", "s3", "s2"] },
        ],
      },
    ],

    upd: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหอพัก)
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["it", "pnm"] },
          { line: "สายประตูสาม", stops: ["it", "pre"] },
          { line: "สายหอพัก", stops: ["it", "p2", "s3", "s2"] },
        ],
      },
    ],

    stup: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["it", "pnm"] },
          { line: "สายประตูสาม", stops: ["it", "pre"] },
          { line: "สายหอพัก", stops: ["it", "p2", "s3", "s2", "ssb", "stup"] },
        ],
      },
    ],

    law: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหอพัก,สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["it", "pnm"] },
          { line: "สายประตูสาม", stops: ["it", "pre"] },
          { line: "สายหอพัก", stops: ["it", "p2"] },
        ],
      },
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["it", "pnm"] },
          { line: "สายประตูสาม", stops: ["it", "pre"] },
          { line: "สายหน้ามอ", stops: ["it", "p2"] },
        ],
      },
    ],

    busi: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหอพัก,สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["it", "pnm"] },
          { line: "สายประตูสาม", stops: ["it", "pre"] },
          { line: "สายหอพัก", stops: ["it", "p2"] },
        ],
      },
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["it", "pnm"] },
          { line: "สายประตูสาม", stops: ["it", "pre"] },
          { line: "สายหน้ามอ", stops: ["it", "p2"] },
        ],
      },
    ],

    poli: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหอพัก,สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["it", "pnm"] },
          { line: "สายประตูสาม", stops: ["it", "pre"] },
          { line: "สายหอพัก", stops: ["it", "p2"] },
        ],
      },
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["it", "pnm"] },
          { line: "สายประตูสาม", stops: ["it", "pre"] },
          { line: "สายหน้ามอ", stops: ["it", "p2"] },
        ],
      },
    ],

    edu: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหอพัก,สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["it", "pnm"] },
          { line: "สายประตูสาม", stops: ["it", "pre"] },
          { line: "สายหอพัก", stops: ["it", "p2"] },
        ],
      },
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["it", "pnm"] },
          { line: "สายประตูสาม", stops: ["it", "pre"] },
          { line: "สายหน้ามอ", stops: ["it", "p2"] },
        ],
      },
    ],

    pky: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหอพัก,สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["it", "pnm"] },
          { line: "สายประตูสาม", stops: ["it", "pre"] },
          { line: "สายหอพัก", stops: ["it", "p2"] },
        ],
      },
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["it", "pnm"] },
          { line: "สายประตูสาม", stops: ["it", "pre"] },
          { line: "สายหน้ามอ", stops: ["it", "p2"] },
        ],
      },
    ],

    ee: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["it", "pnm", "pre", "art", "sci", "eng"],
          },
        ],
      },
    ],

    med: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["it", "pnm", "pre", "art", "sci", "eng"],
          },
        ],
      },
    ],

    eng: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["it", "pnm", "pre", "art", "sci", "eng"],
          },
        ],
      },
    ],

    afa: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["it", "pnm", "pre", "art", "sci", "eng"],
          },
        ],
      },
    ],

    ash: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["it", "pnm", "pre", "art", "sci", "eng"],
          },
        ],
      },
    ],

    sci: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["it", "pnm", "pre", "art", "sci"] },
        ],
      },
    ],

    nurse: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["it", "pnm", "pre", "art", "sci"] },
        ],
      },
    ],

    anr: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["it", "pnm", "pre", "art", "sci"] },
        ],
      },
    ],

    pubh: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["it", "pnm", "pre", "art", "sci"] },
        ],
      },
    ],

    ssb: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหอพัก)
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["it", "pnm"] },
          { line: "สายประตูสาม", stops: ["it", "pre"] },
          { line: "สายหอพัก", stops: ["it", "p2", "s3", "s2", "ssb"] },
        ],
      },
    ],

    std: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหอพัก)
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["it", "pnm"] },
          { line: "สายประตูสาม", stops: ["it", "pre"] },
          { line: "สายหอพัก", stops: ["it", "p2", "s3", "s2", "ssb"] },
        ],
      },
    ],

    swim: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหอพัก)
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["it", "pnm"] },
          { line: "สายประตูสาม", stops: ["it", "pre"] },
          { line: "สายหอพัก", stops: ["it", "p2", "s3", "s2", "ssb"] },
        ],
      },
    ],

    art: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["it", "pnm", "pre", "art"] }],
      },
    ],

    medsci: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["it", "pnm", "pre", "art"] }],
      },
    ],

    ce: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["it", "pnm", "pre", "art"] }],
      },
    ],
    p1: [
      // (สายประตูสาม-สายหน้ามอ)
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["it", "pnm", "pre", "art", "sci"] },
          { line: "สายประตูสาม", stops: ["it", "eng"] },
          { line: "สายหน้ามอ", stops: ["it", "s1", "dent", "p1"] },
        ],
      },
    ],
    p3: [
      // (สายประตูสาม)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["it", "cl", "p3"] }],
      },
    ],
    p2: [
      // (สายประตูสาม-สายหอพัก)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["it", "pnm"] },
          { line: "สายประตูสาม", stops: ["it", "pre"] },
          { line: "สายหอพัก", stops: ["it", "p2"] },
        ],
      },
      // (สายประตูสาม-สายหน้ามอ)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["it", "pnm"] },
          { line: "สายประตูสาม", stops: ["it", "pre"] },
          { line: "สายหน้ามอ", stops: ["it", "p2"] },
        ],
      },
    ],
  },
  cl: {
    dent: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["cl", "pnm", "pre", "art", "sci"] },
          { line: "สายประตูสาม", stops: ["cl", "eng"] },
          { line: "สายหน้ามอ", stops: ["cl", "s1", "dent"] },
        ],
      },
    ],

    hos: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหน้ามอ)
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["cl", "pnm", "pre", "art", "sci"] },
          { line: "สายประตูสาม", stops: ["cl", "eng"] },
          { line: "สายหน้ามอ", stops: ["cl", "s1", "dent", "hos"] },
        ],
      },
    ],

    hup: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหน้ามอ)
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["cl", "pnm", "pre", "art", "sci"] },
          { line: "สายประตูสาม", stops: ["cl", "eng"] },
          { line: "สายหน้ามอ", stops: ["cl", "s1", "dent", "hup"] },
        ],
      },
    ],

    hos: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหน้ามอ)
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["cl", "pnm", "pre", "art", "sci"] },
          { line: "สายประตูสาม", stops: ["cl", "eng"] },
          { line: "สายหน้ามอ", stops: ["cl", "s1", "dent", "hos"] },
        ],
      },
    ],

    pre: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["cl", "pnm", "pre"] }],
      },
    ],

    pnm: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["cl", "pnm"] }],
      },
    ],

    uba: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหอพัก)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["cl", "pre"] },
          { line: "สายหอพัก", stops: ["cl", "p2", "s3"] },
        ],
      },
    ],

    s2: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหอพัก)
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["cl", "pre"] },
          { line: "สายหอพัก", stops: ["cl", "p2", "s3", "s2"] },
        ],
      },
    ],

    upd: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหอพัก)
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["cl", "pre"] },
          { line: "สายหอพัก", stops: ["cl", "p2", "s3", "s2"] },
        ],
      },
    ],

    stup: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["cl", "pre"] },
          { line: "สายหอพัก", stops: ["cl", "p2", "s3", "s2", "ssb", "stup"] },
        ],
      },
    ],

    law: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหอพัก,สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["cl", "pre"] },
          { line: "สายหอพัก", stops: ["cl", "p2"] },
        ],
      },
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["cl", "pre"] },
          { line: "สายหน้ามอ", stops: ["cl", "p2"] },
        ],
      },
    ],

    busi: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหอพัก,สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["cl", "pre"] },
          { line: "สายหอพัก", stops: ["cl", "p2"] },
        ],
      },
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["cl", "pre"] },
          { line: "สายหน้ามอ", stops: ["cl", "p2"] },
        ],
      },
    ],

    poli: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหอพัก,สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["cl", "pre"] },
          { line: "สายหอพัก", stops: ["cl", "p2"] },
        ],
      },
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["cl", "pre"] },
          { line: "สายหน้ามอ", stops: ["cl", "p2"] },
        ],
      },
    ],

    edu: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหอพัก,สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["cl", "pre"] },
          { line: "สายหอพัก", stops: ["cl", "p2"] },
        ],
      },
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["cl", "pre"] },
          { line: "สายหน้ามอ", stops: ["cl", "p2"] },
        ],
      },
    ],

    pky: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหอพัก,สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["cl", "pre"] },
          { line: "สายหอพัก", stops: ["cl", "p2"] },
        ],
      },
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["cl", "pre"] },
          { line: "สายหน้ามอ", stops: ["cl", "p2"] },
        ],
      },
    ],

    ee: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["cl", "pnm", "pre", "art", "sci", "eng"],
          },
        ],
      },
    ],

    med: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["cl", "pnm", "pre", "art", "sci", "eng"],
          },
        ],
      },
    ],

    eng: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["cl", "pnm", "pre", "art", "sci", "eng"],
          },
        ],
      },
    ],

    afa: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["cl", "pnm", "pre", "art", "sci", "eng"],
          },
        ],
      },
    ],

    ash: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["cl", "pnm", "pre", "art", "sci", "eng"],
          },
        ],
      },
    ],

    sci: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["cl", "pnm", "pre", "art", "sci"] },
        ],
      },
    ],

    nurse: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["cl", "pnm", "pre", "art", "sci"] },
        ],
      },
    ],

    anr: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["cl", "pnm", "pre", "art", "sci"] },
        ],
      },
    ],

    pubh: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["cl", "pnm", "pre", "art", "sci"] },
        ],
      },
    ],

    ssb: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหอพัก)
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["cl", "pre"] },
          { line: "สายหอพัก", stops: ["cl", "p2", "s3", "s2", "ssb"] },
        ],
      },
    ],

    std: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหอพัก)
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["cl", "pre"] },
          { line: "สายหอพัก", stops: ["cl", "p2", "s3", "s2", "ssb"] },
        ],
      },
    ],

    swim: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหอพัก)
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["cl", "pre"] },
          { line: "สายหอพัก", stops: ["cl", "p2", "s3", "s2", "ssb"] },
        ],
      },
    ],

    art: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["cl", "pnm", "pre", "art"] }],
      },
    ],

    medsci: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["cl", "pnm", "pre", "art"] }],
      },
    ],

    ce: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["cl", "pnm", "pre", "art"] }],
      },
    ],
    p1: [
      // (สายประตูสาม-สายหน้ามอ)
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["cl", "pnm", "pre", "art", "sci"] },
          { line: "สายประตูสาม", stops: ["cl", "eng"] },
          { line: "สายหน้ามอ", stops: ["cl", "s1", "dent", "p1"] },
        ],
      },
    ],
    p3: [
      // (สายประตูสาม)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["cl", "p3"] }],
      },
    ],
    p2: [
      // (สายประตูสาม-สายหอพัก)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["cl", "pre"] },
          { line: "สายหอพัก", stops: ["cl", "p2"] },
        ],
      },
      // (สายประตูสาม-สายหน้ามอ)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["cl", "pre"] },
          { line: "สายหน้ามอ", stops: ["cl", "p2"] },
        ],
      },
    ],
  },
  law: {
    it: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["law"] },
          { line: "สายหน้ามอ", stops: ["law", "art"] },
          { line: "สายประตูสาม", stops: ["law", "sci", "eng", "it"] },
        ],
      },
    ],

    cl: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["law"] },
          { line: "สายหน้ามอ", stops: ["law", "art"] },
          { line: "สายประตูสาม", stops: ["law", "sci", "eng", "it", "cl"] },
        ],
      },
    ],

    dent: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["law", "art", "sci", "eng", "s1", "dent"],
          },
        ],
      },
    ],

    hos: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 11,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["law", "art", "sci", "eng", "s1", "dent", "hos"],
          },
        ],
      },
    ],

    hup: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 11,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["law", "art", "sci", "eng", "s1", "dent", "hup"],
          },
        ],
      },
    ],

    pre: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["law"] },
          { line: "สายหน้ามอ", stops: ["law", "art"] },
          { line: "สายหอพัก", stops: ["law", "sci", "pnm", "pre"] },
        ],
      },
    ],

    pnm: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["law"] },
          { line: "สายหน้ามอ", stops: ["law", "art"] },
          { line: "สายหอพัก", stops: ["law", "sci", "pnm"] },
        ],
      },
    ],

    s3: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["law", "s3"] }],
      },
    ],

    uba: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["law", "s3"] }],
      },
    ],

    s2: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["law", "s3", "s2"] }],
      },
    ],

    upd: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["law", "s3", "upd"] }],
      },
    ],

    stup: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["law", "s3", "s2", "ssb", "stup"] },
        ],
      },
    ],

    ee: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["law", "art", "sci", "eng"] }],
      },
    ],

    med: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["law", "art", "sci", "eng"] }],
      },
    ],

    eng: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["law", "art", "sci", "eng"] }],
      },
    ],

    afa: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["law", "art", "sci", "eng"] }],
      },
    ],

    ash: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["law", "art", "sci", "eng"] }],
      },
    ],

    sci: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["law", "art", "sci"] }],
      },
    ],

    nurse: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["law", "art", "sci"] }],
      },
    ],

    anr: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["law", "art", "sci"] }],
      },
    ],

    pubh: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["law", "art", "sci"] }],
      },
    ],

    ssb: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["law", "s3", "s2", "ssb"] }],
      },
    ],

    std: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["law", "s3", "s2", "ssb"] }],
      },
    ],

    swim: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["law", "s3", "s2", "ssb"] }],
      },
    ],

    art: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["law", "s3"] }],
      },
    ],

    medsci: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["law", "s3"] }],
      },
    ],

    ce: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["law", "s3"] }],
      },
    ],

    p1: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 12,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["p2", "art", "sci", "eng", "s1", "dent", "p1"],
          },
        ],
      },
    ],

    p3: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["p2", "art"] },
          {
            line: "สายประตูสาม",
            stops: ["p2", "sci", "eng", "it", "cl", "p3"],
          },
        ],
      },
    ],
  },
  busi: {
    it: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["busi"] },
          { line: "สายหน้ามอ", stops: ["busi", "art"] },
          { line: "สายประตูสาม", stops: ["busi", "sci", "eng", "it"] },
        ],
      },
    ],

    cl: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["busi"] },
          { line: "สายหน้ามอ", stops: ["busi", "art"] },
          { line: "สายประตูสาม", stops: ["busi", "sci", "eng", "it", "cl"] },
        ],
      },
    ],

    dent: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["busi", "art", "sci", "eng", "s1", "dent"],
          },
        ],
      },
    ],

    hos: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 11,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["busi", "art", "sci", "eng", "s1", "dent", "hos"],
          },
        ],
      },
    ],

    hup: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 11,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["busi", "art", "sci", "eng", "s1", "dent", "hup"],
          },
        ],
      },
    ],

    pre: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["busi"] },
          { line: "สายหน้ามอ", stops: ["busi", "art"] },
          { line: "สายหอพัก", stops: ["busi", "sci", "pnm", "pre"] },
        ],
      },
    ],

    pnm: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["busi"] },
          { line: "สายหน้ามอ", stops: ["busi", "art"] },
          { line: "สายหอพัก", stops: ["busi", "sci", "pnm"] },
        ],
      },
    ],

    s3: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["busi", "s3"] }],
      },
    ],

    s2: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["busi", "s3", "s2"] }],
      },
    ],

    upd: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["busi", "s3", "upd"] }],
      },
    ],

    stup: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["busi", "s3", "s2", "ssb", "stup"] },
        ],
      },
    ],

    ee: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["busi", "art", "sci", "eng"] }],
      },
    ],

    med: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["busi", "art", "sci", "eng"] }],
      },
    ],

    eng: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["busi", "art", "sci", "eng"] }],
      },
    ],

    afa: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["busi", "art", "sci", "eng"] }],
      },
    ],

    ash: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["busi", "art", "sci", "eng"] }],
      },
    ],

    sci: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["busi", "art", "sci"] }],
      },
    ],

    nurse: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["busi", "art", "sci"] }],
      },
    ],

    anr: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["busi", "art", "sci"] }],
      },
    ],

    pubh: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["busi", "art", "sci"] }],
      },
    ],

    ssb: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["busi", "s3", "s2", "ssb"] }],
      },
    ],

    std: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["busi", "s3", "s2", "ssb"] }],
      },
    ],

    swim: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["busi", "s3", "s2", "ssb"] }],
      },
    ],

    art: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["busi", "s3"] }],
      },
    ],

    medsci: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["busi", "s3"] }],
      },
    ],

    ce: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["busi", "s3"] }],
      },
    ],
    uba: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["busi", "s3"] }],
      },
    ],

    p1: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 12,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["p2", "art", "sci", "eng", "s1", "dent", "p1"],
          },
        ],
      },
    ],

    p3: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["p2", "art"] },
          {
            line: "สายประตูสาม",
            stops: ["p2", "sci", "eng", "it", "cl", "p3"],
          },
        ],
      },
    ],
  },
  poli: {
    it: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["poli"] },
          { line: "สายหน้ามอ", stops: ["poli", "art"] },
          { line: "สายประตูสาม", stops: ["poli", "sci", "eng", "it"] },
        ],
      },
    ],

    cl: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["poli"] },
          { line: "สายหน้ามอ", stops: ["poli", "art"] },
          { line: "สายประตูสาม", stops: ["poli", "sci", "eng", "it", "cl"] },
        ],
      },
    ],

    dent: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["poli", "art", "sci", "eng", "s1", "dent"],
          },
        ],
      },
    ],

    hos: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 11,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["poli", "art", "sci", "eng", "s1", "dent", "hos"],
          },
        ],
      },
    ],

    hup: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 11,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["poli", "art", "sci", "eng", "s1", "dent", "hup"],
          },
        ],
      },
    ],

    pre: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["poli"] },
          { line: "สายหน้ามอ", stops: ["poli", "art"] },
          { line: "สายหอพัก", stops: ["poli", "sci", "pnm", "pre"] },
        ],
      },
    ],

    pnm: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["poli"] },
          { line: "สายหน้ามอ", stops: ["poli", "art"] },
          { line: "สายหอพัก", stops: ["poli", "sci", "pnm"] },
        ],
      },
    ],

    s3: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["poli", "s3"] }],
      },
    ],

    s2: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["poli", "s3", "s2"] }],
      },
    ],

    upd: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["poli", "s3", "upd"] }],
      },
    ],

    stup: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["poli", "s3", "s2", "ssb", "stup"] },
        ],
      },
    ],

    ee: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["poli", "art", "sci", "eng"] }],
      },
    ],

    med: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["poli", "art", "sci", "eng"] }],
      },
    ],

    eng: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["poli", "art", "sci", "eng"] }],
      },
    ],

    afa: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["poli", "art", "sci", "eng"] }],
      },
    ],

    ash: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["poli", "art", "sci", "eng"] }],
      },
    ],

    sci: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["poli", "art", "sci"] }],
      },
    ],

    nurse: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["poli", "art", "sci"] }],
      },
    ],

    anr: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["poli", "art", "sci"] }],
      },
    ],

    pubh: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["poli", "art", "sci"] }],
      },
    ],

    ssb: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["poli", "s3", "s2", "ssb"] }],
      },
    ],

    std: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["poli", "s3", "s2", "ssb"] }],
      },
    ],

    swim: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["poli", "s3", "s2", "ssb"] }],
      },
    ],

    art: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["poli", "art"] }],
      },
    ],

    medsci: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["poli", "art"] }],
      },
    ],

    ce: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["poli", "art"] }],
      },
    ],
    uba: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["poli", "s3"] }],
      },
    ],
    p1: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 12,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["poli", "art", "sci", "eng", "s1", "dent", "p1"],
          },
        ],
      },
    ],
    p3: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["poli", "art"] },
          {
            line: "สายประตูสาม",
            stops: ["poli", "sci", "eng", "it", "cl", "p3"],
          },
        ],
      },
    ],
  },
  edu: {
    it: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["edu"] },
          { line: "สายหน้ามอ", stops: ["edu", "art"] },
          { line: "สายประตูสาม", stops: ["edu", "sci", "eng", "it"] },
        ],
      },
    ],

    cl: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["edu"] },
          { line: "สายหน้ามอ", stops: ["edu", "art"] },
          { line: "สายประตูสาม", stops: ["edu", "sci", "eng", "it", "cl"] },
        ],
      },
    ],

    dent: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["edu", "art", "sci", "eng", "s1", "dent"],
          },
        ],
      },
    ],

    hos: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 11,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["edu", "art", "sci", "eng", "s1", "dent", "hos"],
          },
        ],
      },
    ],

    hup: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 11,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["edu", "art", "sci", "eng", "s1", "dent", "hup"],
          },
        ],
      },
    ],

    pre: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["edu"] },
          { line: "สายหน้ามอ", stops: ["edu", "art"] },
          { line: "สายหอพัก", stops: ["edu", "sci", "pnm", "pre"] },
        ],
      },
    ],

    pnm: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["edu"] },
          { line: "สายหน้ามอ", stops: ["edu", "art"] },
          { line: "สายหอพัก", stops: ["edu", "sci", "pnm"] },
        ],
      },
    ],

    s3: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["edu", "s3"] }],
      },
    ],

    s2: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["edu", "s3", "s2"] }],
      },
    ],

    upd: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["edu", "s3", "upd"] }],
      },
    ],

    stup: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["edu", "s3", "s2", "ssb", "stup"] },
        ],
      },
    ],

    ee: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["edu", "art", "sci", "eng"] }],
      },
    ],

    med: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["edu", "art", "sci", "eng"] }],
      },
    ],

    eng: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["edu", "art", "sci", "eng"] }],
      },
    ],

    afa: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["edu", "art", "sci", "eng"] }],
      },
    ],

    ash: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["edu", "art", "sci", "eng"] }],
      },
    ],

    sci: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["edu", "art", "sci"] }],
      },
    ],

    nurse: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["edu", "art", "sci"] }],
      },
    ],

    anr: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["edu", "art", "sci"] }],
      },
    ],

    pubh: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["edu", "art", "sci"] }],
      },
    ],

    ssb: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["edu", "s3", "s2", "ssb"] }],
      },
    ],

    std: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["edu", "s3", "s2", "ssb"] }],
      },
    ],

    swim: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["edu", "s3", "s2", "ssb"] }],
      },
    ],

    art: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["edu", "s3"] }],
      },
    ],

    medsci: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["edu", "s3"] }],
      },
    ],

    ce: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["edu", "s3"] }],
      },
    ],
    uba: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["edu", "s3"] }],
      },
    ],

    p1: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 12,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["p2", "art", "sci", "eng", "s1", "dent", "p1"],
          },
        ],
      },
    ],

    p3: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["p2", "art"] },
          {
            line: "สายประตูสาม",
            stops: ["p2", "sci", "eng", "it", "cl", "p3"],
          },
        ],
      },
    ],
  },
  pky: {
    it: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["pky"] },
          { line: "สายหน้ามอ", stops: ["pky", "art"] },
          { line: "สายประตูสาม", stops: ["pky", "sci", "eng", "it"] },
        ],
      },
    ],

    cl: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["pky"] },
          { line: "สายหน้ามอ", stops: ["pky", "art"] },
          { line: "สายประตูสาม", stops: ["pky", "sci", "eng", "it", "cl"] },
        ],
      },
    ],

    dent: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["pky", "art", "sci", "eng", "s1", "dent"],
          },
        ],
      },
    ],

    hos: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 11,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["pky", "art", "sci", "eng", "s1", "dent", "hos"],
          },
        ],
      },
    ],

    hup: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 11,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["pky", "art", "sci", "eng", "s1", "dent", "hup"],
          },
        ],
      },
    ],

    pre: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["pky"] },
          { line: "สายหน้ามอ", stops: ["pky", "art"] },
          { line: "สายหอพัก", stops: ["pky", "sci", "pnm", "pre"] },
        ],
      },
    ],

    pnm: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["pky"] },
          { line: "สายหน้ามอ", stops: ["pky", "art"] },
          { line: "สายหอพัก", stops: ["pky", "sci", "pnm"] },
        ],
      },
    ],

    s3: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pky", "s3"] }],
      },
    ],

    s2: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pky", "s3", "s2"] }],
      },
    ],

    upd: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pky", "s3", "upd"] }],
      },
    ],

    stup: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["pky", "s3", "s2", "ssb", "stup"] },
        ],
      },
    ],

    ee: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["pky", "art", "sci", "eng"] }],
      },
    ],

    med: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["pky", "art", "sci", "eng"] }],
      },
    ],

    eng: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["pky", "art", "sci", "eng"] }],
      },
    ],

    afa: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["pky", "art", "sci", "eng"] }],
      },
    ],

    ash: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["pky", "art", "sci", "eng"] }],
      },
    ],

    sci: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["pky", "art", "sci"] }],
      },
    ],

    nurse: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["pky", "art", "sci"] }],
      },
    ],

    anr: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["pky", "art", "sci"] }],
      },
    ],

    pubh: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["pky", "art", "sci"] }],
      },
    ],

    ssb: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pky", "s3", "s2", "ssb"] }],
      },
    ],

    std: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pky", "s3", "s2", "ssb"] }],
      },
    ],

    swim: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pky", "s3", "s2", "ssb"] }],
      },
    ],

    art: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pky", "s3"] }],
      },
    ],

    medsci: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pky", "s3"] }],
      },
    ],

    ce: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pky", "s3"] }],
      },
    ],

    uba: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pky", "s3"] }],
      },
    ],
    p1: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 12,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["p2", "art", "sci", "eng", "s1", "dent", "p1"],
          },
        ],
      },
    ],

    p3: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["p2", "art"] },
          {
            line: "สายประตูสาม",
            stops: ["p2", "sci", "eng", "it", "cl", "p3"],
          },
        ],
      },
    ],
  },
  ee: {
    it: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["ee", "it"] }],
      },
    ],

    cl: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["ee", "it", "cl"] }],
      },
    ],

    dent: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 7,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ee", "s1", "dent"] }],
      },
    ],

    hos: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ee", "s1", "dent", "hos"] }],
      },
    ],

    hup: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ee", "s1", "dent", "hup"] }],
      },
    ],

    pre: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ee", "pnm", "pre"] }],
      },
    ],

    pnm: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ee", "pnm"] }],
      },
    ],

    s2: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["ee"] },
          { line: "สายหน้ามอ", stops: ["ee", "pnm"] },
          { line: "สายหอพัก", stops: ["ee", "pre", "p2", "s3", "s2"] },
        ],
      },
    ],

    upd: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["ee"] },
          { line: "สายหน้ามอ", stops: ["ee", "pnm"] },
          { line: "สายหอพัก", stops: ["ee", "pre", "p2", "s3", "s2"] },
        ],
      },
    ],

    stup: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 13,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["ee"] },
          { line: "สายหน้ามอ", stops: ["ee", "pnm"] },
          {
            line: "สายหอพัก",
            stops: ["ee", "pre", "p2", "s3", "s2", "ssb", "stup"],
          },
        ],
      },
    ],

    law: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ee", "pnm", "pre", "p2"] }],
      },
    ],

    busi: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ee", "pnm", "pre", "p2"] }],
      },
    ],

    poli: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ee", "pnm", "pre", "p2"] }],
      },
    ],

    edu: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ee", "pnm", "pre", "p2"] }],
      },
    ],

    pky: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ee", "pnm", "pre", "p2"] }],
      },
    ],

    sci: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["ee"] },
          { line: "สายหน้ามอ", stops: ["ee", "pnm"] },
          { line: "สายประตูสาม", stops: ["ee", "pre", "art", "sci"] },
        ],
      },
    ],

    nurse: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["ee"] },
          { line: "สายหน้ามอ", stops: ["ee", "pnm"] },
          { line: "สายประตูสาม", stops: ["ee", "pre", "art", "sci"] },
        ],
      },
    ],

    anr: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["ee"] },
          { line: "สายหน้ามอ", stops: ["ee", "pnm"] },
          { line: "สายประตูสาม", stops: ["ee", "pre", "art", "sci"] },
        ],
      },
    ],

    pubh: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["ee"] },
          { line: "สายหน้ามอ", stops: ["ee", "pnm"] },
          { line: "สายประตูสาม", stops: ["ee", "pre", "art", "sci"] },
        ],
      },
    ],

    ssb: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["ee"] },
          { line: "สายหน้ามอ", stops: ["ee", "pre"] },
          { line: "สายหอพัก", stops: ["ee", "p2", "s3", "s2", "ssb"] },
        ],
      },
    ],

    std: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["ee"] },
          { line: "สายหน้ามอ", stops: ["ee", "pre"] },
          { line: "สายหอพัก", stops: ["ee", "p2", "s3", "s2", "ssb"] },
        ],
      },
    ],

    swim: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["ee"] },
          { line: "สายหน้ามอ", stops: ["ee", "pre"] },
          { line: "สายหอพัก", stops: ["ee", "p2", "s3", "s2", "ssb"] },
        ],
      },
    ],

    art: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["ee"] },
          { line: "สายหน้ามอ", stops: ["ee", "pnm"] },
          { line: "สายประตูสาม", stops: ["ee", "pre", "art"] },
        ],
      },
    ],

    medsci: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["ee"] },
          { line: "สายหน้ามอ", stops: ["ee", "pnm"] },
          { line: "สายประตูสาม", stops: ["ee", "pre", "art"] },
        ],
      },
    ],

    ce: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["ee"] },
          { line: "สายหน้ามอ", stops: ["ee", "pnm"] },
          { line: "สายประตูสาม", stops: ["ee", "pre", "art"] },
        ],
      },
    ],
    uba: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["ee"] },
          { line: "สายหน้ามอ", stops: ["ee", "pnm"] },
          { line: "สายหอพัก", stops: ["ee", "pre", "p2", "s3"] },
        ],
      },
    ],
    p1: [
      // (สายหน้ามอ)
      {
        time: 9,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ee", "s1", "dent", "p1"] }],
      },
    ],
    p3: [
      // (สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["ee", "it", "cl", "p3"] }],
      },
    ],
    p2: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ee", "pnm", "pre", "p2"] }],
      },
    ],
  },

  med: {
    it: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["med", "it"] }],
      },
    ],

    cl: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["med", "it", "cl"] }],
      },
    ],

    dent: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 7,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["med", "s1", "dent"] }],
      },
    ],

    hos: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["med", "s1", "dent", "hos"] }],
      },
    ],

    hup: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["med", "s1", "dent", "hup"] }],
      },
    ],

    pre: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["med", "pnm", "pre"] }],
      },
    ],

    pnm: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["med", "pnm"] }],
      },
    ],

    s2: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["med"] },
          { line: "สายหน้ามอ", stops: ["med", "pnm"] },
          { line: "สายหอพัก", stops: ["med", "pre", "p2", "s3", "s2"] },
        ],
      },
    ],

    upd: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["med"] },
          { line: "สายหน้ามอ", stops: ["med", "pnm"] },
          { line: "สายหอพัก", stops: ["med", "pre", "p2", "s3", "s2"] },
        ],
      },
    ],

    stup: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 13,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["med"] },
          { line: "สายหน้ามอ", stops: ["med", "pnm"] },
          {
            line: "สายหอพัก",
            stops: ["med", "pre", "p2", "s3", "s2", "ssb", "stup"],
          },
        ],
      },
    ],

    law: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["med", "pnm", "pre", "p2"] }],
      },
    ],

    busi: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["med", "pnm", "pre", "p2"] }],
      },
    ],

    poli: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["med", "pnm", "pre", "p2"] }],
      },
    ],

    edu: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["med", "pnm", "pre", "p2"] }],
      },
    ],

    pky: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["med", "pnm", "pre", "p2"] }],
      },
    ],

    sci: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["med"] },
          { line: "สายหน้ามอ", stops: ["med", "pnm"] },
          { line: "สายประตูสาม", stops: ["med", "pre", "art", "sci"] },
        ],
      },
    ],

    nurse: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["med"] },
          { line: "สายหน้ามอ", stops: ["med", "pnm"] },
          { line: "สายประตูสาม", stops: ["med", "pre", "art", "sci"] },
        ],
      },
    ],

    anr: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["med"] },
          { line: "สายหน้ามอ", stops: ["med", "pnm"] },
          { line: "สายประตูสาม", stops: ["med", "pre", "art", "sci"] },
        ],
      },
    ],

    pubh: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["med"] },
          { line: "สายหน้ามอ", stops: ["med", "pnm"] },
          { line: "สายประตูสาม", stops: ["med", "pre", "art", "sci"] },
        ],
      },
    ],

    ssb: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["med"] },
          { line: "สายหน้ามอ", stops: ["med", "pre"] },
          { line: "สายหอพัก", stops: ["med", "p2", "s3", "s2", "ssb"] },
        ],
      },
    ],

    std: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["med"] },
          { line: "สายหน้ามอ", stops: ["med", "pre"] },
          { line: "สายหอพัก", stops: ["med", "p2", "s3", "s2", "ssb"] },
        ],
      },
    ],

    swim: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["med"] },
          { line: "สายหน้ามอ", stops: ["med", "pre"] },
          { line: "สายหอพัก", stops: ["med", "p2", "s3", "s2", "ssb"] },
        ],
      },
    ],

    art: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["med"] },
          { line: "สายหน้ามอ", stops: ["med", "pnm"] },
          { line: "สายประตูสาม", stops: ["med", "pre", "art"] },
        ],
      },
    ],

    medsci: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["med"] },
          { line: "สายหน้ามอ", stops: ["med", "pnm"] },
          { line: "สายประตูสาม", stops: ["med", "pre", "art"] },
        ],
      },
    ],

    ce: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["med"] },
          { line: "สายหน้ามอ", stops: ["med", "pnm"] },
          { line: "สายประตูสาม", stops: ["med", "pre", "art"] },
        ],
      },
    ],
    uba: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["med"] },
          { line: "สายหน้ามอ", stops: ["med", "pnm"] },
          { line: "สายหอพัก", stops: ["med", "pre", "p2", "s3"] },
        ],
      },
    ],
    p1: [
      // (สายหน้ามอ)
      {
        time: 9,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["med", "s1", "dent", "p1"] }],
      },
    ],
    p3: [
      // (สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["med", "it", "cl", "p3"] }],
      },
    ],
    p2: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["med", "pnm", "pre", "p2"] }],
      },
    ],
  },

  eng: {
    it: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["eng", "it"] }],
      },
    ],

    cl: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["eng", "it", "cl"] }],
      },
    ],

    dent: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 7,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["eng", "s1", "dent"] }],
      },
    ],

    hos: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["eng", "s1", "dent", "hos"] }],
      },
    ],

    hup: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["eng", "s1", "dent", "hup"] }],
      },
    ],

    pre: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["eng", "pnm", "pre"] }],
      },
    ],

    pnm: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["eng", "pnm"] }],
      },
    ],

    s2: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["eng"] },
          { line: "สายหน้ามอ", stops: ["eng", "pnm"] },
          { line: "สายหอพัก", stops: ["eng", "pre", "p2", "s3", "s2"] },
        ],
      },
    ],

    upd: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["eng"] },
          { line: "สายหน้ามอ", stops: ["eng", "pnm"] },
          { line: "สายหอพัก", stops: ["eng", "pre", "p2", "s3", "s2"] },
        ],
      },
    ],

    stup: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 13,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["eng"] },
          { line: "สายหน้ามอ", stops: ["eng", "pnm"] },
          {
            line: "สายหอพัก",
            stops: ["eng", "pre", "p2", "s3", "s2", "ssb", "stup"],
          },
        ],
      },
    ],

    law: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["eng", "pnm", "pre", "p2"] }],
      },
    ],

    busi: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["eng", "pnm", "pre", "p2"] }],
      },
    ],

    poli: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["eng", "pnm", "pre", "p2"] }],
      },
    ],

    edu: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["eng", "pnm", "pre", "p2"] }],
      },
    ],

    pky: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["eng", "pnm"] },
          { line: "สายหอพัก", stops: ["eng", "pre", "p2", "s3", "s2"] },
        ],
      },
    ],

    sci: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["eng"] },
          { line: "สายหน้ามอ", stops: ["eng", "pnm"] },
          { line: "สายประตูสาม", stops: ["eng", "pre", "art", "sci"] },
        ],
      },
    ],

    nurse: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["eng"] },
          { line: "สายหน้ามอ", stops: ["eng", "pnm"] },
          { line: "สายประตูสาม", stops: ["eng", "pre", "art", "sci"] },
        ],
      },
    ],

    anr: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["eng"] },
          { line: "สายหน้ามอ", stops: ["eng", "pnm"] },
          { line: "สายประตูสาม", stops: ["eng", "pre", "art", "sci"] },
        ],
      },
    ],

    pubh: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["eng"] },
          { line: "สายหน้ามอ", stops: ["eng", "pnm"] },
          { line: "สายประตูสาม", stops: ["eng", "pre", "art", "sci"] },
        ],
      },
    ],

    ssb: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["eng"] },
          { line: "สายหน้ามอ", stops: ["eng", "pre"] },
          { line: "สายหอพัก", stops: ["eng", "p2", "s3", "s2", "ssb"] },
        ],
      },
    ],

    std: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["eng"] },
          { line: "สายหน้ามอ", stops: ["eng", "pre"] },
          { line: "สายหอพัก", stops: ["eng", "p2", "s3", "s2", "ssb"] },
        ],
      },
    ],

    swim: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["eng"] },
          { line: "สายหน้ามอ", stops: ["eng", "pre"] },
          { line: "สายหอพัก", stops: ["eng", "p2", "s3", "s2", "ssb"] },
        ],
      },
    ],

    art: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["eng"] },
          { line: "สายหน้ามอ", stops: ["eng", "pnm"] },
          { line: "สายประตูสาม", stops: ["eng", "pre", "art"] },
        ],
      },
    ],

    medsci: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["eng"] },
          { line: "สายหน้ามอ", stops: ["eng", "pnm"] },
          { line: "สายประตูสาม", stops: ["eng", "pre", "art"] },
        ],
      },
    ],

    ce: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["eng"] },
          { line: "สายหน้ามอ", stops: ["eng", "pnm"] },
          { line: "สายประตูสาม", stops: ["eng", "pre", "art"] },
        ],
      },
    ],
    uba: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["eng"] },
          { line: "สายหน้ามอ", stops: ["eng", "pnm"] },
          { line: "สายหอพัก", stops: ["eng", "pre", "p2", "s3"] },
        ],
      },
    ],
    p1: [
      // (สายหน้ามอ)
      {
        time: 9,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["eng", "s1", "dent", "p1"] }],
      },
    ],
    p2: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["eng", "pnm", "pre", "p2"] }],
      },
    ],
    p3: [
      // (สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["eng", "it", "cl", "p3"] }],
      },
    ],
  },

  afa: {
    it: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["afa", "it"] }],
      },
    ],

    cl: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["afa", "it", "cl"] }],
      },
    ],

    dent: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 7,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["afa", "s1", "dent"] }],
      },
    ],

    hos: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["afa", "s1", "dent", "hos"] }],
      },
    ],

    hup: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["afa", "s1", "dent", "hup"] }],
      },
    ],

    pre: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["afa", "pnm", "pre"] }],
      },
    ],

    pnm: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["afa", "pnm"] }],
      },
    ],

    s2: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["afa"] },
          { line: "สายหน้ามอ", stops: ["afa", "pnm"] },
          { line: "สายหอพัก", stops: ["afa", "pre", "p2", "s3", "s2"] },
        ],
      },
    ],

    upd: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["afa"] },
          { line: "สายหน้ามอ", stops: ["afa", "pnm"] },
          { line: "สายหอพัก", stops: ["afa", "pre", "p2", "s3", "s2"] },
        ],
      },
    ],

    stup: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 13,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["afa"] },
          { line: "สายหน้ามอ", stops: ["afa", "pnm"] },
          {
            line: "สายหอพัก",
            stops: ["afa", "pre", "p2", "s3", "s2", "ssb", "stup"],
          },
        ],
      },
    ],

    law: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["afa", "pnm", "pre", "p2"] }],
      },
    ],

    busi: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["afa", "pnm", "pre", "p2"] }],
      },
    ],

    poli: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["afa", "pnm", "pre", "p2"] }],
      },
    ],

    edu: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["afa", "pnm", "pre", "p2"] }],
      },
    ],

    pky: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["afa", "pnm", "pre", "p2"] }],
      },
    ],

    sci: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["afa"] },
          { line: "สายหน้ามอ", stops: ["afa", "pnm"] },
          { line: "สายประตูสาม", stops: ["afa", "pre", "art", "sci"] },
        ],
      },
    ],

    nurse: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["afa"] },
          { line: "สายหน้ามอ", stops: ["afa", "pnm"] },
          { line: "สายประตูสาม", stops: ["afa", "pre", "art", "sci"] },
        ],
      },
    ],

    anr: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["afa"] },
          { line: "สายหน้ามอ", stops: ["afa", "pnm"] },
          { line: "สายประตูสาม", stops: ["afa", "pre", "art", "sci"] },
        ],
      },
    ],

    pubh: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["afa"] },
          { line: "สายหน้ามอ", stops: ["afa", "pnm"] },
          { line: "สายประตูสาม", stops: ["afa", "pre", "art", "sci"] },
        ],
      },
    ],

    ssb: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["afa"] },
          { line: "สายหน้ามอ", stops: ["afa", "pre"] },
          { line: "สายหอพัก", stops: ["afa", "p2", "s3", "s2", "ssb"] },
        ],
      },
    ],

    std: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["afa"] },
          { line: "สายหน้ามอ", stops: ["afa", "pre"] },
          { line: "สายหอพัก", stops: ["afa", "p2", "s3", "s2", "ssb"] },
        ],
      },
    ],

    swim: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["afa"] },
          { line: "สายหน้ามอ", stops: ["afa", "pre"] },
          { line: "สายหอพัก", stops: ["afa", "p2", "s3", "s2", "ssb"] },
        ],
      },
    ],

    art: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["afa"] },
          { line: "สายหน้ามอ", stops: ["afa", "pnm"] },
          { line: "สายประตูสาม", stops: ["afa", "pre", "art"] },
        ],
      },
    ],

    medsci: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["afa"] },
          { line: "สายหน้ามอ", stops: ["afa", "pnm"] },
          { line: "สายประตูสาม", stops: ["afa", "pre", "art"] },
        ],
      },
    ],

    ce: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["afa"] },
          { line: "สายหน้ามอ", stops: ["afa", "pnm"] },
          { line: "สายประตูสาม", stops: ["afa", "pre", "art"] },
        ],
      },
    ],
    uba: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["afa"] },
          { line: "สายหน้ามอ", stops: ["afa", "pnm"] },
          { line: "สายหอพัก", stops: ["afa", "pre", "p2", "s3"] },
        ],
      },
    ],
    p1: [
      // (สายหน้ามอ)
      {
        time: 9,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["afa", "s1", "dent", "p1"] }],
      },
    ],
    p2: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["afa", "pnm", "pre", "p2"] }],
      },
    ],
    p3: [
      // (สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["afa", "it", "cl", "p3"] }],
      },
    ],
  },

  ash: {
    it: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["ash", "it"] }],
      },
    ],

    cl: [
      // (เส้นทางที่ 1 สายประตูสาม)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["ash", "it", "cl"] }],
      },
    ],

    dent: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 7,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ash", "s1", "dent"] }],
      },
    ],

    hos: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ash", "s1", "dent", "hos"] }],
      },
    ],

    hup: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ash", "s1", "dent", "hup"] }],
      },
    ],

    pre: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ash", "pnm", "pre"] }],
      },
    ],

    pnm: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ash", "pnm"] }],
      },
    ],

    s2: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["ash"] },
          { line: "สายหน้ามอ", stops: ["ash", "pnm"] },
          { line: "สายหอพัก", stops: ["ash", "pre", "p2", "s3", "s2"] },
        ],
      },
    ],

    upd: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["ash"] },
          { line: "สายหน้ามอ", stops: ["ash", "pnm"] },
          { line: "สายหอพัก", stops: ["ash", "pre", "p2", "s3", "s2"] },
        ],
      },
    ],

    stup: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 13,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["ash"] },
          { line: "สายหน้ามอ", stops: ["ash", "pnm"] },
          {
            line: "สายหอพัก",
            stops: ["ash", "pre", "p2", "s3", "s2", "ssb", "stup"],
          },
        ],
      },
    ],

    law: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ash", "pnm", "pre", "p2"] }],
      },
    ],

    busi: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ash", "pnm", "pre", "p2"] }],
      },
    ],

    poli: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ash", "pnm", "pre", "p2"] }],
      },
    ],

    edu: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ash", "pnm", "pre", "p2"] }],
      },
    ],

    pky: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ash", "pnm", "pre", "p2"] }],
      },
    ],

    uba: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["ash"] },
          { line: "สายหน้ามอ", stops: ["ash", "pnm"] },
          { line: "สายหอพัก", stops: ["ash", "pre", "p2", "s3"] },
        ],
      },
    ],

    sci: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["ash"] },
          { line: "สายหน้ามอ", stops: ["ash", "pnm"] },
          { line: "สายประตูสาม", stops: ["ash", "pre", "art", "sci"] },
        ],
      },
    ],

    nurse: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["ash"] },
          { line: "สายหน้ามอ", stops: ["ash", "pnm"] },
          { line: "สายประตูสาม", stops: ["ash", "pre", "art", "sci"] },
        ],
      },
    ],

    anr: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["ash"] },
          { line: "สายหน้ามอ", stops: ["ash", "pnm"] },
          { line: "สายประตูสาม", stops: ["ash", "pre", "art", "sci"] },
        ],
      },
    ],

    pubh: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["ash"] },
          { line: "สายหน้ามอ", stops: ["ash", "pnm"] },
          { line: "สายประตูสาม", stops: ["ash", "pre", "art", "sci"] },
        ],
      },
    ],

    ssb: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["ash"] },
          { line: "สายหน้ามอ", stops: ["ash", "pre"] },
          { line: "สายหอพัก", stops: ["ash", "p2", "s3", "s2", "ssb"] },
        ],
      },
    ],

    std: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["ash"] },
          { line: "สายหน้ามอ", stops: ["ash", "pre"] },
          { line: "สายหอพัก", stops: ["ash", "p2", "s3", "s2", "ssb"] },
        ],
      },
    ],

    swim: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["ash"] },
          { line: "สายหน้ามอ", stops: ["ash", "pre"] },
          { line: "สายหอพัก", stops: ["ash", "p2", "s3", "s2", "ssb"] },
        ],
      },
    ],

    art: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["ash"] },
          { line: "สายหน้ามอ", stops: ["ash", "pnm"] },
          { line: "สายประตูสาม", stops: ["ash", "pre", "art"] },
        ],
      },
    ],

    medsci: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["ash"] },
          { line: "สายหน้ามอ", stops: ["ash", "pnm"] },
          { line: "สายประตูสาม", stops: ["ash", "pre", "art"] },
        ],
      },
    ],

    ce: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["ash"] },
          { line: "สายหน้ามอ", stops: ["ash", "pnm"] },
          { line: "สายประตูสาม", stops: ["ash", "pre", "art"] },
        ],
      },
    ],
    p1: [
      // (สายหน้ามอ)
      {
        time: 9,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ash", "s1", "dent", "p1"] }],
      },
    ],
    p2: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ash", "pnm", "pre", "p2"] }],
      },
    ],
    p3: [
      // (สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["ash", "it", "cl", "p3"] }],
      },
    ],
  },
  pre: {
    it: [
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["pre", "art", "sci", "eng", "it"] },
        ],
      },
    ],
    cl: [
      {
        time: 6,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["pre", "art", "sci", "eng", "it", "cl"],
          },
        ],
      },
    ],
    dent: [
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["pre", "art", "sci"] },
          { line: "สายประตูสาม", stops: ["pre", "eng"] },
          { line: "สายหน้ามอ", stops: ["pre", "s1", "dent"] },
        ],
      },
    ],
    hos: [
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["pre", "art", "sci"] },
          { line: "สายประตูสาม", stops: ["pre", "eng"] },
          { line: "สายหน้ามอ", stops: ["pre", "s1", "dent", "hos"] },
        ],
      },
    ],
    hup: [
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["pre", "art", "sci"] },
          { line: "สายประตูสาม", stops: ["pre", "eng"] },
          { line: "สายหน้ามอ", stops: ["pre", "s1", "dent", "hup"] },
        ],
      },
    ],
    pnm: [
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["pre", "art"] },
          { line: "สายประตูสาม", stops: ["pre", "sci"] },
          { line: "สายหอพัก", stops: ["pre", "pnm"] },
        ],
      },
    ],
    uba: [
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["pre", "p2"] },
          { line: "สายหอพัก", stops: ["pre", "s3"] },
        ],
      },
      {
        time: 10,
        isRecommended: false,
        sections: [
          { line: "สายหน้ามอ", stops: ["pre", "p2"] },
          { line: "สายหอพัก", stops: ["pre", "s3"] },
        ],
      },
    ],
    s2: [
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["pre", "p2"] },
          { line: "สายหอพัก", stops: ["pre", "s3", "s2"] },
        ],
      },
      {
        time: 6,
        isRecommended: false,
        sections: [
          { line: "สายหน้ามอ", stops: ["pre", "p2"] },
          { line: "สายหอพัก", stops: ["pre", "s3", "s2"] },
        ],
      },
    ],
    upd: [
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["pre", "p2"] },
          { line: "สายหอพัก", stops: ["pre", "s3", "s2"] },
        ],
      },
      {
        time: 6,
        isRecommended: false,
        sections: [
          { line: "สายหน้ามอ", stops: ["pre", "p2"] },
          { line: "สายหอพัก", stops: ["pre", "s3", "s2"] },
        ],
      },
    ],
    stup: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["pre", "p2"] },
          { line: "สายหอพัก", stops: ["pre", "s3", "s2", "ssb", "stup"] },
        ],
      },
      {
        time: 9,
        isRecommended: false,
        sections: [
          { line: "สายหน้ามอ", stops: ["pre", "p2"] },
          { line: "สายหอพัก", stops: ["pre", "s3", "s2", "ssb", "stup"] },
        ],
      },
    ],
    // จุดจอดรถบัส PKY
    law: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["pre", "p2"] }],
      },
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pre", "p2"] }],
      },
    ],
    busi: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["pre", "p2"] }],
      },
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pre", "p2"] }],
      },
    ],
    poli: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["pre", "p2"] }],
      },
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pre", "p2"] }],
      },
    ],
    edu: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["pre", "p2"] }],
      },
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pre", "p2"] }],
      },
    ],
    pky: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["pre", "p2"] }],
      },
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pre", "p2"] }],
      },
    ],
    // สถานีหน้าคณะวิศว
    ee: [
      {
        time: 3,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["pre", "art", "sci", "eng"] },
        ],
      },
    ],
    med: [
      {
        time: 3,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["pre", "art", "sci", "eng"] },
        ],
      },
    ],
    eng: [
      {
        time: 3,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["pre", "art", "sci", "eng"] },
        ],
      },
    ],
    afa: [
      {
        time: 3,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["pre", "art", "sci", "eng"] },
        ],
      },
    ],
    ash: [
      {
        time: 3,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["pre", "art", "sci", "eng"] },
        ],
      },
    ],
    // สถานีหน้าคณะวิทยา
    sci: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["pre", "art", "sci"] }],
      },
    ],
    nurse: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["pre", "art", "sci"] }],
      },
    ],
    anr: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["pre", "art", "sci"] }],
      },
    ],
    pubh: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["pre", "art", "sci"] }],
      },
    ],
    // สถานีหน้าอาคารสงวนเสริมศรี
    ssb: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["pre", "p2"] },
          { line: "สายหอพัก", stops: ["pre", "s3", "s2", "ssb"] },
        ],
      },
      {
        time: 9,
        isRecommended: false,
        sections: [
          { line: "สายหน้ามอ", stops: ["pre", "p2"] },
          { line: "สายหอพัก", stops: ["pre", "s3", "s2", "ssb"] },
        ],
      },
    ],
    std: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["pre", "p2"] },
          { line: "สายหอพัก", stops: ["pre", "s3", "s2", "ssb"] },
        ],
      },
      {
        time: 9,
        isRecommended: false,
        sections: [
          { line: "สายหน้ามอ", stops: ["pre", "p2"] },
          { line: "สายหอพัก", stops: ["pre", "s3", "s2", "ssb"] },
        ],
      },
    ],
    swim: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["pre", "p2"] },
          { line: "สายหอพัก", stops: ["pre", "s3", "s2", "ssb"] },
        ],
      },
      {
        time: 9,
        isRecommended: false,
        sections: [
          { line: "สายหน้ามอ", stops: ["pre", "p2"] },
          { line: "สายหอพัก", stops: ["pre", "s3", "s2", "ssb"] },
        ],
      },
    ],
    // สถานีหน้าคณะศิลป
    art: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["pre", "art"] }],
      },
    ],
    medsci: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["pre", "art"] }],
      },
    ],
    ce: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["pre", "art"] }],
      },
    ],
    p1: [
      // (สายประตูสาม-สายหน้ามอ)
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["pre", "art"] },
          { line: "สายประตูสาม", stops: ["pre", "sci"] },
          { line: "สายหน้ามอ", stops: ["pre", "eng", "s1", "dent", "p1"] },
        ],
      },
    ],
    p2: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["pre", "p2"] }],
      },
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pre", "p2"] }],
      },
    ],
    p3: [
      // (สายประตูสาม)
      {
        time: 9,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["pre", "art", "sci", "eng", "it", "cl", "p3"],
          },
        ],
      },
    ],
  },
  pnm: {
    it: [
      {
        time: 6,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["pnm", "pre", "art", "sci", "eng", "it"],
          },
        ],
      },
    ],
    cl: [
      {
        time: 7,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["pnm", "pre", "art", "sci", "eng", "it", "cl"],
          },
        ],
      },
    ],
    dent: [
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["pnm", "pre", "art", "sci"] },
          { line: "สายประตูสาม", stops: ["pnm", "eng"] },
          { line: "สายหน้ามอ", stops: ["pnm", "s1", "dent"] },
        ],
      },
    ],
    hos: [
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["pnm", "pre", "art", "sci"] },
          { line: "สายประตูสาม", stops: ["pnm", "eng"] },
          { line: "สายหน้ามอ", stops: ["pnm", "s1", "dent", "hos"] },
        ],
      },
    ],
    hup: [
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["pnm", "pre", "art", "sci"] },
          { line: "สายประตูสาม", stops: ["pnm", "eng"] },
          { line: "สายหน้ามอ", stops: ["pnm", "s1", "dent", "hup"] },
        ],
      },
    ],
    pre: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["pnm", "pre"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pnm", "pre"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["pnm", "pre"] }],
      },
    ],
    uba: [
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["pnm", "pre", "p2"] },
          { line: "สายหอพัก", stops: ["pnm", "s3"] },
        ],
      },
      {
        time: 6,
        isRecommended: false,
        sections: [
          { line: "สายหน้ามอ", stops: ["pnm", "pre", "p2"] },
          { line: "สายหอพัก", stops: ["pnm", "s3"] },
        ],
      },
    ],
    s2: [
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["pnm", "pre", "p2"] },
          { line: "สายหอพัก", stops: ["pnm", "s3", "s2"] },
        ],
      },
      {
        time: 7,
        isRecommended: false,
        sections: [
          { line: "สายหน้ามอ", stops: ["pnm", "pre", "p2"] },
          { line: "สายหอพัก", stops: ["pnm", "s3", "s2"] },
        ],
      },
    ],
    upd: [
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["pnm", "pre", "p2"] },
          { line: "สายหอพัก", stops: ["pnm", "s3", "s2"] },
        ],
      },
      {
        time: 7,
        isRecommended: false,
        sections: [
          { line: "สายหน้ามอ", stops: ["pnm", "pre", "p2"] },
          { line: "สายหอพัก", stops: ["pnm", "s3", "s2"] },
        ],
      },
    ],
    stup: [
      {
        time: 14,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["pnm", "pre", "p2"] },
          { line: "สายหอพัก", stops: ["pnm", "s3", "s2", "ssb", "stup"] },
        ],
      },
      {
        time: 14,
        isRecommended: false,
        sections: [
          { line: "สายหน้ามอ", stops: ["pnm", "pre", "p2"] },
          { line: "สายหอพัก", stops: ["pnm", "s3", "s2", "ssb", "stup"] },
        ],
      },
    ],
    // จุดจอดรถบัส PKY
    law: [
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["pnm", "pre", "p2"] }],
      },
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pnm", "pre", "p2"] }],
      },
    ],
    busi: [
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["pnm", "pre", "p2"] }],
      },
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pnm", "pre", "p2"] }],
      },
    ],
    poli: [
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["pnm", "pre", "p2"] }],
      },
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pnm", "pre", "p2"] }],
      },
    ],
    edu: [
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["pnm", "pre", "p2"] }],
      },
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pnm", "pre", "p2"] }],
      },
    ],
    pky: [
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["pnm", "pre", "p2"] }],
      },
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pnm", "pre", "p2"] }],
      },
    ],
    // สถานีหน้าคณะวิศว
    ee: [
      {
        time: 3,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["pnm", "pre", "art", "sci", "eng"] },
        ],
      },
    ],
    med: [
      {
        time: 3,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["pnm", "pre", "art", "sci", "eng"] },
        ],
      },
    ],
    eng: [
      {
        time: 3,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["pnm", "pre", "art", "sci", "eng"] },
        ],
      },
    ],
    afa: [
      {
        time: 3,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["pnm", "pre", "art", "sci", "eng"] },
        ],
      },
    ],
    ash: [
      {
        time: 3,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["pnm", "pre", "art", "sci", "eng"] },
        ],
      },
    ],
    // สถานีหน้าคณะวิทยา
    sci: [
      {
        time: 3,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["pnm", "pre", "art", "sci"] },
        ],
      },
    ],
    nurse: [
      {
        time: 3,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["pnm", "pre", "art", "sci"] },
        ],
      },
    ],
    anr: [
      {
        time: 3,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["pnm", "pre", "art", "sci"] },
        ],
      },
    ],
    pubh: [
      {
        time: 3,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["pnm", "pre", "art", "sci"] },
        ],
      },
    ],
    // สถานีหน้าอาคารสงวนเสริมศรี
    ssb: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["pnm", "pre", "p2"] },
          { line: "สายหอพัก", stops: ["pnm", "s3", "s2", "ssb"] },
        ],
      },
      {
        time: 9,
        isRecommended: false,
        sections: [
          { line: "สายหน้ามอ", stops: ["pnm", "pre", "p2"] },
          { line: "สายหอพัก", stops: ["pnm", "s3", "s2", "ssb"] },
        ],
      },
    ],
    std: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["pnm", "pre", "p2"] },
          { line: "สายหอพัก", stops: ["pnm", "s3", "s2", "ssb"] },
        ],
      },
      {
        time: 9,
        isRecommended: false,
        sections: [
          { line: "สายหน้ามอ", stops: ["pnm", "pre", "p2"] },
          { line: "สายหอพัก", stops: ["pnm", "s3", "s2", "ssb"] },
        ],
      },
    ],
    swim: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["pnm", "pre", "p2"] },
          { line: "สายหอพัก", stops: ["pnm", "s3", "s2", "ssb"] },
        ],
      },
      {
        time: 9,
        isRecommended: false,
        sections: [
          { line: "สายหน้ามอ", stops: ["pnm", "pre", "p2"] },
          { line: "สายหอพัก", stops: ["pnm", "s3", "s2", "ssb"] },
        ],
      },
    ],
    // สถานีหน้าคณะศิลป
    art: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["pnm", "pre", "art"] }],
      },
    ],
    medsci: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["pnm", "pre", "art"] }],
      },
    ],
    ce: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["pnm", "pre", "art"] }],
      },
    ],
    p1: [
      // (สายประตูสาม-สายหน้ามอ)
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["pnm", "pre", "art"] },
          { line: "สายประตูสาม", stops: ["pnm", "sci"] },
          { line: "สายหน้ามอ", stops: ["pnm", "eng", "s1", "dent", "p1"] },
        ],
      },
    ],
    p2: [
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["pnm", "pre", "p2"] }],
      },
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["pnm", "pre", "p2"] }],
      },
    ],
    p3: [
      // (สายประตูสาม)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["pnm", "pre", "art", "sci", "eng", "it", "cl", "p3"],
          },
        ],
      },
    ],
  },
  hos: {
    it: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hos", "dent", "s1"] },
          { line: "สายหน้ามอ", stops: ["hos", "eng"] },
          { line: "สายประตูสาม", stops: ["hos", "it"] },
        ],
      },
    ],
    cl: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hos", "dent", "s1"] },
          { line: "สายหน้ามอ", stops: ["hos", "eng"] },
          { line: "สายประตูสาม", stops: ["hos", "it", "cl"] },
        ],
      },
    ],
    dent: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["hos", "dent"] }],
      },
    ],
    pre: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 11,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["hos", "dent", "s1", "eng", "pnm", "pre"],
          },
        ],
      },
    ],
    pnm: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hos", "dent", "s1", "eng", "pnm"] },
        ],
      },
    ],
    uba: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 16,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hos", "dent", "s1", "eng", "pre"] },
          { line: "สายหน้ามอ", stops: ["hos", "p2"] },
          { line: "สายหอพัก", stops: ["hos", "s3"] },
        ],
      },
    ],
    s2: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 17,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hos", "dent", "s1", "eng", "pre"] },
          { line: "สายหน้ามอ", stops: ["hos", "p2"] },
          { line: "สายหอพัก", stops: ["hos", "s3", "s2"] },
        ],
      },
    ],
    upd: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 17,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hos", "dent", "s1", "eng", "pre"] },
          { line: "สายหน้ามอ", stops: ["hos", "p2"] },
          { line: "สายหอพัก", stops: ["hos", "s3", "s2"] },
        ],
      },
    ],
    stup: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 21,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hos", "dent", "s1", "eng", "pre"] },
          { line: "สายหน้ามอ", stops: ["hos", "p2"] },
          { line: "สายหอพัก", stops: ["hos", "s3", "s2", "ssb", "stup"] },
        ],
      },
    ],
    law: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 13,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["hos", "dent", "s1", "eng", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    busi: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 13,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["hos", "dent", "s1", "eng", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    poli: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 13,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["hos", "dent", "s1", "eng", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    edu: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 13,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["hos", "dent", "s1", "eng", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    pky: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 13,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["hos", "dent", "s1", "eng", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    ee: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["hos", "dent", "s1", "eng"] }],
      },
    ],
    med: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["hos", "dent", "s1", "eng"] }],
      },
    ],
    eng: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["hos", "dent", "s1", "eng"] }],
      },
    ],
    afa: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["hos", "dent", "s1", "eng"] }],
      },
    ],
    ash: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["hos", "dent", "s1", "eng"] }],
      },
    ],
    sci: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hos", "dent", "s1", "eng", "pnm"] },
        ],
      },
    ],
    nurse: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hos", "dent", "s1", "eng", "pnm"] },
        ],
      },
    ],
    anr: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hos", "dent", "s1", "eng", "pnm"] },
        ],
      },
    ],
    pubh: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hos", "dent", "s1", "eng", "pnm"] },
        ],
      },
    ],
    ssb: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 20,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["hos", "dent", "s1", "eng", "pnm", "pre"],
          },
          { line: "สายหน้ามอ", stops: ["hos", "p2"] },
          { line: "สายหอพัก", stops: ["hos", "s3", "s2", "ssb"] },
        ],
      },
    ],
    std: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 20,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["hos", "dent", "s1", "eng", "pnm", "pre"],
          },
          { line: "สายหน้ามอ", stops: ["hos", "p2"] },
          { line: "สายหอพัก", stops: ["hos", "s3", "s2", "ssb"] },
        ],
      },
    ],
    swim: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 20,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["hos", "dent", "s1", "eng", "pnm", "pre"],
          },
          { line: "สายหน้ามอ", stops: ["hos", "p2"] },
          { line: "สายหอพัก", stops: ["hos", "s3", "s2", "ssb"] },
        ],
      },
    ],
    art: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 13,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hos", "dent", "s1", "eng"] },
          { line: "สายหน้ามอ", stops: ["hos", "pnm"] },
          { line: "สายประตูสาม", stops: ["hos", "pre", "art"] },
        ],
      },
    ],
    medsci: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 21,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hos", "dent", "s1", "eng"] },
          { line: "สายหน้ามอ", stops: ["hos", "pnm"] },
          { line: "สายประตูสาม", stops: ["hos", "pre", "art"] },
        ],
      },
    ],
    ce: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 21,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hos", "dent", "s1", "eng"] },
          { line: "สายหน้ามอ", stops: ["hos", "pnm"] },
          { line: "สายประตูสาม", stops: ["hos", "pre", "art"] },
        ],
      },
    ],
    p1: [
      // (สายหน้ามอ)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["hos", "dent", "p1"] }],
      },
    ],
    p2: [
      // (สายหน้ามอ)
      {
        time: 13,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["hos", "dent", "s1", "eng", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    p3: [
      // (สายหน้ามอ-สายประตูสาม)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hos", "dent", "s1"] },
          { line: "สายหน้ามอ", stops: ["hos", "eng"] },
          { line: "สายประตูสาม", stops: ["hos", "it", "cl", "p3"] },
        ],
      },
    ],
  },
  hup: {
    it: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hup", "dent", "s1"] },
          { line: "สายหน้ามอ", stops: ["hup", "eng"] },
          { line: "สายประตูสาม", stops: ["hup", "it"] },
        ],
      },
    ],
    cl: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hup", "dent", "s1"] },
          { line: "สายหน้ามอ", stops: ["hup", "eng"] },
          { line: "สายประตูสาม", stops: ["hup", "it", "cl"] },
        ],
      },
    ],
    dent: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["hup", "dent"] }],
      },
    ],
    pre: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 11,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["hup", "dent", "s1", "eng", "pnm", "pre"],
          },
        ],
      },
    ],
    pnm: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hup", "dent", "s1", "eng", "pnm"] },
        ],
      },
    ],
    uba: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 16,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hup", "dent", "s1", "eng", "pre"] },
          { line: "สายหน้ามอ", stops: ["hup", "p2"] },
          { line: "สายหอพัก", stops: ["hup", "s3"] },
        ],
      },
    ],
    s2: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 17,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hup", "dent", "s1", "eng", "pre"] },
          { line: "สายหน้ามอ", stops: ["hup", "p2"] },
          { line: "สายหอพัก", stops: ["hup", "s3", "s2"] },
        ],
      },
    ],
    upd: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 17,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hup", "dent", "s1", "eng", "pre"] },
          { line: "สายหน้ามอ", stops: ["hup", "p2"] },
          { line: "สายหอพัก", stops: ["hup", "s3", "s2"] },
        ],
      },
    ],
    stup: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 21,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hup", "dent", "s1", "eng", "pre"] },
          { line: "สายหน้ามอ", stops: ["hup", "p2"] },
          { line: "สายหอพัก", stops: ["hup", "s3", "s2", "ssb", "stup"] },
        ],
      },
    ],
    law: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 13,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["hup", "dent", "s1", "eng", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    busi: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 13,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["hup", "dent", "s1", "eng", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    poli: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 13,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["hup", "dent", "s1", "eng", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    edu: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 13,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["hup", "dent", "s1", "eng", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    pky: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 13,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["hup", "dent", "s1", "eng", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    ee: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["hup", "dent", "s1", "eng"] }],
      },
    ],
    med: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["hup", "dent", "s1", "eng"] }],
      },
    ],
    eng: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["hup", "dent", "s1", "eng"] }],
      },
    ],
    afa: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["hup", "dent", "s1", "eng"] }],
      },
    ],
    ash: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["hup", "dent", "s1", "eng"] }],
      },
    ],
    sci: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hup", "dent", "s1", "eng", "pnm"] },
        ],
      },
    ],
    nurse: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hup", "dent", "s1", "eng", "pnm"] },
        ],
      },
    ],
    anr: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hup", "dent", "s1", "eng", "pnm"] },
        ],
      },
    ],
    pubh: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hup", "dent", "s1", "eng", "pnm"] },
        ],
      },
    ],
    ssb: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 20,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["hup", "dent", "s1", "eng", "pnm", "pre"],
          },
          { line: "สายหน้ามอ", stops: ["hup", "p2"] },
          { line: "สายหอพัก", stops: ["hup", "s3", "s2", "ssb"] },
        ],
      },
    ],
    std: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 20,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["hup", "dent", "s1", "eng", "pnm", "pre"],
          },
          { line: "สายหน้ามอ", stops: ["hup", "p2"] },
          { line: "สายหอพัก", stops: ["hup", "s3", "s2", "ssb"] },
        ],
      },
    ],
    swim: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 20,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["hup", "dent", "s1", "eng", "pnm", "pre"],
          },
          { line: "สายหน้ามอ", stops: ["hup", "p2"] },
          { line: "สายหอพัก", stops: ["hup", "s3", "s2", "ssb"] },
        ],
      },
    ],
    art: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 13,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hup", "dent", "s1", "eng"] },
          { line: "สายหน้ามอ", stops: ["hup", "pnm"] },
          { line: "สายประตูสาม", stops: ["hup", "pre", "art"] },
        ],
      },
    ],
    medsci: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 21,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hup", "dent", "s1", "eng"] },
          { line: "สายหน้ามอ", stops: ["hup", "pnm"] },
          { line: "สายประตูสาม", stops: ["hup", "pre", "art"] },
        ],
      },
    ],
    ce: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 21,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hup", "dent", "s1", "eng"] },
          { line: "สายหน้ามอ", stops: ["hup", "pnm"] },
          { line: "สายประตูสาม", stops: ["hup", "pre", "art"] },
        ],
      },
    ],
    p1: [
      // (สายหน้ามอ)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["hup", "dent", "p1"] }],
      },
    ],
    p2: [
      // (สายหน้ามอ)
      {
        time: 13,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["hup", "dent", "s1", "eng", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    p3: [
      // (สายหน้ามอ-สายประตูสาม)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["hup", "dent", "s1"] },
          { line: "สายหน้ามอ", stops: ["hup", "eng"] },
          { line: "สายประตูสาม", stops: ["hup", "it", "cl", "p3"] },
        ],
      },
    ],
  },
  dent: {
    it: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["dent", "s1"] },
          { line: "สายหน้ามอ", stops: ["dent", "eng"] },
          { line: "สายประตูสาม", stops: ["dent", "it"] },
        ],
      },
    ],
    cl: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["dent", "s1"] },
          { line: "สายหน้ามอ", stops: ["dent", "eng"] },
          { line: "สายประตูสาม", stops: ["dent", "it", "cl"] },
        ],
      },
    ],
    hos: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["dent", "hos"] }],
      },
    ],
    hup: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["dent", "hup"] }],
      },
    ],
    pre: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["dent", "s1", "eng", "pnm", "pre"] },
        ],
      },
    ],
    pnm: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["dent", "s1", "eng", "pnm"] }],
      },
    ],
    uba: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 14,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["dent", "s1", "eng", "pnm", "pre"] },
          { line: "สายหน้ามอ", stops: ["dent", "p2"] },
          { line: "สายหอพัก", stops: ["dent", "s3"] },
        ],
      },
    ],
    s2: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 15,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["dent", "s1", "eng", "pnm", "pre"] },
          { line: "สายหน้ามอ", stops: ["dent", "p2"] },
          { line: "สายหอพัก", stops: ["dent", "s3", "s2"] },
        ],
      },
    ],
    upd: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 15,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["dent", "s1", "eng", "pnm", "pre"] },
          { line: "สายหน้ามอ", stops: ["dent", "p2"] },
          { line: "สายหอพัก", stops: ["dent", "s3", "s2"] },
        ],
      },
    ],
    stup: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 19,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["dent", "s1", "eng", "pnm", "pre"] },
          { line: "สายหน้ามอ", stops: ["dent", "p2"] },
          { line: "สายหอพัก", stops: ["dent", "s3", "s2", "ssb", "stup"] },
        ],
      },
    ],
    law: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 11,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["dent", "s1", "eng", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    busi: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 13,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["dent", "s1", "eng", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    poli: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 13,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["dent", "s1", "eng", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    edu: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 13,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["dent", "s1", "eng", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    pky: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 13,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["dent", "s1", "eng", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    ee: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["dent", "s1", "eng"] }],
      },
    ],
    med: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["dent", "s1", "eng"] }],
      },
    ],
    eng: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["dent", "s1", "eng"] }],
      },
    ],
    afa: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["dent", "s1", "eng"] }],
      },
    ],
    ash: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["dent", "s1", "eng"] }],
      },
    ],
    sci: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["dent", "s1", "eng", "pnm"] }],
      },
    ],
    nurse: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["dent", "s1", "eng", "pnm"] }],
      },
    ],
    anr: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["dent", "s1", "eng", "pnm"] }],
      },
    ],
    pubh: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["dent", "s1", "eng", "pnm"] }],
      },
    ],
    ssb: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 20,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["dent", "s1", "eng", "pnm", "pre"] },
          { line: "สายหน้ามอ", stops: ["dent", "p2"] },
          { line: "สายหอพัก", stops: ["dent", "s3", "s2", "ssb"] },
        ],
      },
    ],
    std: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 20,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["dent", "s1", "eng", "pnm", "pre"] },
          { line: "สายหน้ามอ", stops: ["dent", "p2"] },
          { line: "สายหอพัก", stops: ["dent", "s3", "s2", "ssb"] },
        ],
      },
    ],
    swim: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายหอพัก)
      {
        time: 20,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["dent", "s1", "eng", "pnm", "pre"] },
          { line: "สายหน้ามอ", stops: ["dent", "p2"] },
          { line: "สายหอพัก", stops: ["dent", "s3", "s2", "ssb"] },
        ],
      },
    ],
    art: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 13,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["dent", "s1", "eng"] },
          { line: "สายหน้ามอ", stops: ["dent", "pnm"] },
          { line: "สายประตูสาม", stops: ["dent", "pre", "art"] },
        ],
      },
    ],
    medsci: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 21,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["dent", "s1", "eng"] },
          { line: "สายหน้ามอ", stops: ["dent", "pnm"] },
          { line: "สายประตูสาม", stops: ["dent", "pre", "art"] },
        ],
      },
    ],
    ce: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 21,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["dent", "s1", "eng"] },
          { line: "สายหน้ามอ", stops: ["dent", "pnm"] },
          { line: "สายประตูสาม", stops: ["dent", "pre", "art"] },
        ],
      },
    ],
    p1: [
      // (สายหน้ามอ)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["dent", "p1"] }],
      },
    ],
    p2: [
      // (สายหอพัก)
      {
        time: 11,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["dent", "s1", "eng", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    p3: [
      // (สายหน้ามอ-สายประตูสาม)
      {
        time: 13,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["dent", "s1"] },
          { line: "สายหน้ามอ", stops: ["dent", "eng"] },
          { line: "สายประตูสาม", stops: ["dent", "it", "cl", "p3"] },
        ],
      },
    ],
  },
  art: {
    it: [
      // (เส้นทางที่ 1 สายประตูสาม: แนะนำ, สายตรง)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["art", "sci", "eng", "it"] }],
      },
    ],
    cl: [
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["art", "sci", "eng", "it", "cl"] },
        ],
      },
    ],
    dent: [
      // (เส้นทางที่ 1 สายหน้ามอ: แนะนำ, สายตรง)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["art", "sci", "eng", "s1", "dent"] },
        ],
      },
    ],
    hos: [
      // (เส้นทางที่ 1: สายหน้ามอ:  สายตรง)
      {
        time: 9,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["art", "sci", "eng", "s1", "dent", "hos"],
          },
        ],
      },
    ],
    hup: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["art", "sci", "eng", "s1", "dent", "hup"],
          },
        ],
      },
    ],
    pre: [
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["art", "sci", "pnm", "pre"] }],
      },
    ],
    pnm: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["art", "sci", "pnm"] }],
      },
    ],
    // ส่วนที่ยาก มีหลายไอคอน หลายเงื่อนไข
    uba: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["art", "sci", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["art", "p2"] },
          { line: "สายหอพัก", stops: ["art", "s3"] },
        ],
      },
    ],
    s2: [
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["art", "sci", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["art", "p2"] },
          { line: "สายหอพัก", stops: ["art", "s3", "s2"] },
        ],
      },
    ],
    // ส่วนที่ยาก มีหลายไอคอน หลายเงื่อนไข
    upd: [
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["art", "sci", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["art", "p2"] },
          { line: "สายหอพัก", stops: ["art", "s3", "s2"] },
        ],
      },
    ],
    // ส่วนที่ยาก มีหลายไอคอน หลายเงื่อนไข
    stup: [
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["art", "sci", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["art", "p2"] },
          { line: "สายหอพัก", stops: ["art", "s3", "s2", "ssb", "stup"] },
        ],
      },
    ],
    // 1
    law: [
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["art", "sci", "pnm", "pre", "p2"] },
        ],
      },
    ],
    busi: [
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["art", "sci", "pnm", "pre", "p2"] },
        ],
      },
    ],
    poli: [
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["art", "sci", "pnm", "pre", "p2"] },
        ],
      },
    ],
    edu: [
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["art", "sci", "pnm", "pre", "p2"] },
        ],
      },
    ],
    pky: [
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["art", "sci", "pnm", "pre", "p2"] },
        ],
      },
    ],
    p2: [
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["art", "sci", "pnm", "pre", "p2"] },
        ],
      },
    ],
    // 2
    ee: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["art", "sci", "eng"] }],
      },
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["art", "sci", "eng"] }],
      },
    ],
    med: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["art", "sci", "eng"] }],
      },
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["art", "sci", "eng"] }],
      },
    ],
    eng: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["art", "sci", "eng"] }],
      },
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["art", "sci", "eng"] }],
      },
    ],
    afa: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["art", "sci", "eng"] }],
      },
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["art", "sci", "eng"] }],
      },
    ],
    ash: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["art", "sci", "eng"] }],
      },
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["art", "sci", "eng"] }],
      },
    ],
    sci: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["art", "sci"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["art", "sci"] }],
      },
    ],
    nurse: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["art", "sci"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["art", "sci"] }],
      },
    ],
    anr: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["art", "sci"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["art", "sci"] }],
      },
    ],
    pubh: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["art", "sci"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["art", "sci"] }],
      },
    ],
    // 3
    ssb: [
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["art", "sci", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["art", "p2"] },
          {
            line: "สายหอพัก",
            stops: ["art", "s3", "s2", "ssb"],
          },
        ],
      },
    ],
    std: [
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["art", "sci", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["art", "p2"] },
          {
            line: "สายหอพัก",
            stops: ["art", "s3", "s2", "ssb"],
          },
        ],
      },
    ],
    swim: [
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["art", "sci", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["art", "p2"] },
          {
            line: "สายหอพัก",
            stops: ["art", "s3", "s2", "ssb"],
          },
        ],
      },
    ],
    p1: [
      // (สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["art", "sci", "eng", "s1", "dent", "p1"],
          },
        ],
      },
    ],
    p3: [
      // (สายประตูสาม)
      {
        time: 8,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["art", "sci", "eng", "it", "cl", "p3"],
          },
        ],
      },
    ],
  },
  medsci: {
    it: [
      // (เส้นทางที่ 1 สายประตูสาม: แนะนำ, สายตรง)
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["medsci", "sci", "eng", "it"] },
        ],
      },
    ],
    cl: [
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["medsci", "sci", "eng", "it", "cl"] },
        ],
      },
    ],
    dent: [
      // (เส้นทางที่ 1 สายหน้ามอ: แนะนำ, สายตรง)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["medsci", "sci", "eng", "s1", "dent"] },
        ],
      },
    ],
    hos: [
      // (เส้นทางที่ 1: สายหน้ามอ:  สายตรง)
      {
        time: 9,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["medsci", "sci", "eng", "s1", "dent", "hos"],
          },
        ],
      },
    ],
    hup: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["medsci", "sci", "eng", "s1", "dent", "hup"],
          },
        ],
      },
    ],
    pre: [
      {
        time: 3,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["medsci", "sci", "pnm", "pre"] },
        ],
      },
    ],
    pnm: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["medsci", "sci", "pnm"] }],
      },
    ],
    // ส่วนที่ยาก มีหลายไอคอน หลายเงื่อนไข
    uba: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["medsci", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["medsci", "p2"] },
          { line: "สายหอพัก", stops: ["medsci", "s3"] },
        ],
      },
    ],
    s2: [
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["medsci", "sci", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["medsci", "p2"] },
          { line: "สายหอพัก", stops: ["medsci", "s3", "s2"] },
        ],
      },
    ],
    // ส่วนที่ยาก มีหลายไอคอน หลายเงื่อนไข
    upd: [
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["medsci", "sci", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["medsci", "p2"] },
          { line: "สายหอพัก", stops: ["medsci", "s3", "s2"] },
        ],
      },
    ],
    // ส่วนที่ยาก มีหลายไอคอน หลายเงื่อนไข
    stup: [
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["medsci", "sci", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["medsci", "p2"] },
          {
            line: "สายหอพัก",
            stops: ["medsci", "s3", "s2", "ssb", "stup"],
          },
        ],
      },
    ],
    // 1
    law: [
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["medsci", "sci", "pnm", "pre", "p2"] },
        ],
      },
    ],
    busi: [
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["medsci", "sci", "pnm", "pre", "p2"] },
        ],
      },
    ],
    poli: [
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["medsci", "sci", "pnm", "pre", "p2"] },
        ],
      },
    ],
    edu: [
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["medsci", "sci", "pnm", "pre", "p2"] },
        ],
      },
    ],
    pky: [
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["medsci", "sci", "pnm", "pre", "p2"] },
        ],
      },
    ],
    p2: [
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["medsci", "sci", "pnm", "pre", "p2"] },
        ],
      },
    ],
    // 2
    ee: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["medsci", "sci", "eng"] }],
      },
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["medsci", "sci", "eng"] }],
      },
    ],
    med: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["medsci", "sci", "eng"] }],
      },
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["medsci", "sci", "eng"] }],
      },
    ],
    eng: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["medsci", "sci", "eng"] }],
      },
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["medsci", "sci", "eng"] }],
      },
    ],
    afa: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["medsci", "sci", "eng"] }],
      },
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["medsci", "sci", "eng"] }],
      },
    ],
    ash: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["medsci", "sci", "eng"] }],
      },
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["medsci", "sci", "eng"] }],
      },
    ],
    sci: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["medsci", "sci"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["medsci", "sci"] }],
      },
    ],
    nurse: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["medsci", "sci"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["medsci", "sci"] }],
      },
    ],
    anr: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["medsci", "sci"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["medsci", "sci"] }],
      },
    ],
    pubh: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["medsci", "sci"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["medsci", "sci"] }],
      },
    ],
    // 3
    ssb: [
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["medsci", "sci", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["medsci", "p2"] },
          {
            line: "สายหอพัก",
            stops: ["medsci", "sci", "s3", "s2", "ssb"],
          },
        ],
      },
    ],
    std: [
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["medsci", "sci", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["medsci", "p2"] },
          {
            line: "สายหอพัก",
            stops: ["medsci", "sci", "s3", "s2", "ssb"],
          },
        ],
      },
    ],
    swim: [
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["medsci", "sci", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["medsci", "p2"] },
          {
            line: "สายหอพัก",
            stops: ["medsci", "sci", "s3", "s2", "ssb"],
          },
        ],
      },
    ],
    p1: [
      // (สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["medsci", "sci", "eng", "s1", "dent", "p1"],
          },
        ],
      },
    ],
    p3: [
      // (สายประตูสาม)
      {
        time: 8,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["medsci", "sci", "eng", "it", "cl", "p3"],
          },
        ],
      },
    ],
  },
  ce: {
    it: [
      // (เส้นทางที่ 1 สายประตูสาม: แนะนำ, สายตรง)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["ce", "sci", "eng", "it"] }],
      },
    ],
    cl: [
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["ce", "sci", "eng", "it", "cl"] },
        ],
      },
    ],
    dent: [
      // (เส้นทางที่ 1 สายหน้ามอ: แนะนำ, สายตรง)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["ce", "sci", "eng", "s1", "dent"] },
        ],
      },
    ],
    hos: [
      // (เส้นทางที่ 1: สายหน้ามอ:  สายตรง)
      {
        time: 9,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["ce", "sci", "eng", "s1", "dent", "hos"],
          },
        ],
      },
    ],
    hup: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["ce", "sci", "eng", "s1", "dent", "hup"],
          },
        ],
      },
    ],
    pre: [
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["ce", "sci", "pnm", "pre"] }],
      },
    ],
    pnm: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["ce", "sci", "pnm"] }],
      },
    ],
    // ส่วนที่ยาก มีหลายไอคอน หลายเงื่อนไข
    uba: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ce", "sci", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["ce", "p2"] },
          { line: "สายหอพัก", stops: ["ce", "s3"] },
        ],
      },
    ],
    s2: [
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ce", "sci", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["ce", "p2"] },
          { line: "สายหอพัก", stops: ["ce", "s3", "s2"] },
        ],
      },
    ],
    // ส่วนที่ยาก มีหลายไอคอน หลายเงื่อนไข
    upd: [
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ce", "sci", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["ce", "p2"] },
          { line: "สายหอพัก", stops: ["ce", "s3", "s2"] },
        ],
      },
    ],
    // ส่วนที่ยาก มีหลายไอคอน หลายเงื่อนไข
    stup: [
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ce", "sci", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["ce", "p2"] },
          { line: "สายหอพัก", stops: ["ce", "s3", "s2", "ssb", "stup"] },
        ],
      },
    ],
    // 1
    law: [
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ce", "sci", "pnm", "pre", "p2"] },
        ],
      },
    ],
    busi: [
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ce", "sci", "pnm", "pre", "p2"] },
        ],
      },
    ],
    poli: [
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ce", "sci", "pnm", "pre", "p2"] },
        ],
      },
    ],
    edu: [
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ce", "sci", "pnm", "pre", "p2"] },
        ],
      },
    ],
    pky: [
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ce", "sci", "pnm", "pre", "p2"] },
        ],
      },
    ],
    p2: [
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ce", "sci", "pnm", "pre", "p2"] },
        ],
      },
    ],
    // 2
    ee: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ce", "sci", "eng"] }],
      },
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["ce", "sci", "eng"] }],
      },
    ],
    med: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ce", "sci", "eng"] }],
      },
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["ce", "sci", "eng"] }],
      },
    ],
    eng: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ce", "sci", "eng"] }],
      },
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["ce", "sci", "eng"] }],
      },
    ],
    afa: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ce", "sci", "eng"] }],
      },
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["ce", "sci", "eng"] }],
      },
    ],
    ash: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ce", "sci", "eng"] }],
      },
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["ce", "sci", "eng"] }],
      },
    ],
    sci: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ce", "sci"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["ce", "sci"] }],
      },
    ],
    nurse: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ce", "sci"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["ce", "sci"] }],
      },
    ],
    anr: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ce", "sci"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["ce", "sci"] }],
      },
    ],
    pubh: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["ce", "sci"] }],
      },
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["ce", "sci"] }],
      },
    ],
    // 3
    ssb: [
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ce", "sci", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["ce", "p2"] },
          { line: "สายหอพัก", stops: ["ce", "s3", "s2", "ssb"] },
        ],
      },
    ],
    std: [
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ce", "sci", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["ce", "p2"] },
          { line: "สายหอพัก", stops: ["ce", "s3", "s2", "ssb"] },
        ],
      },
    ],
    swim: [
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ce", "sci", "pnm", "pre"] },
          { line: "สายหอพัก", stops: ["ce", "p2"] },
          { line: "สายหอพัก", stops: ["ce", "s3", "s2", "ssb"] },
        ],
      },
    ],
    p1: [
      // (สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["ce", "sci", "eng", "s1", "dent", "p1"],
          },
        ],
      },
    ],
    p3: [
      // (สายประตูสาม)
      {
        time: 8,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["ce", "sci", "eng", "it", "cl", "p3"],
          },
        ],
      },
    ],
  },
  stup: {
    it: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["stup", "ssb", "s2", "art"] },
          { line: "สายหอพัก", stops: ["stup", "sci"] },
          { line: "สายประตูสาม", stops: ["stup", "eng", "it"] },
        ],
      },
    ],
    cl: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["stup", "ssb", "s2", "art"] },
          { line: "สายหอพัก", stops: ["stup", "sci"] },
          { line: "สายประตูสาม", stops: ["stup", "eng", "it", "cl"] },
        ],
      },
    ],
    dent: [
      // (เส้นทางที่ 1 สายหอพัก-สายหน้ามอ)
      {
        time: 15,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["stup", "ssb", "s2", "art"] },
          { line: "สายหอพัก", stops: ["stup", "sci"] },
          { line: "สายหน้ามอ", stops: ["stup", "eng", "s1", "dent"] },
        ],
      },
    ],
    hos: [
      // (เส้นทางที่ 1 สายหอพัก-สายหน้ามอ)
      {
        time: 16,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["stup", "ssb", "s2", "art"] },
          { line: "สายหอพัก", stops: ["stup", "sci"] },
          { line: "สายหน้ามอ", stops: ["stup", "eng", "s1", "dent", "hos"] },
        ],
      },
    ],
    hup: [
      // (เส้นทางที่ 1 สายหอพัก-สายหน้ามอ)
      {
        time: 16,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["stup", "ssb", "s2", "art"] },
          { line: "สายหอพัก", stops: ["stup", "sci"] },
          { line: "สายหน้ามอ", stops: ["stup", "eng", "s1", "dent", "hup"] },
        ],
      },
    ],
    pnm: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 9,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["stup", "ssb", "s2", "s3", "art", "sci", "pnm"],
          },
        ],
      },
    ],
    pre: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["stup", "ssb", "s2", "s3", "art", "sci", "pnm", "pre"],
          },
        ],
      },
    ],
    s2: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["stup", "ssb", "s2"] }],
      },
    ],
    upd: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["stup", "ssb", "s2"] }],
      },
    ],
    uba: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["stup", "ssb", "s2", "s3"] }],
      },
    ],
    law: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 12,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: [
              "stup",
              "ssb",
              "s2",
              "s3",
              "art",
              "sci",
              "pnm",
              "pre",
              "p2",
            ],
          },
        ],
      },
    ],
    busi: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 12,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: [
              "stup",
              "ssb",
              "s2",
              "s3",
              "art",
              "sci",
              "pnm",
              "pre",
              "p2",
            ],
          },
        ],
      },
    ],
    poli: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 12,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: [
              "stup",
              "ssb",
              "s2",
              "s3",
              "art",
              "sci",
              "pnm",
              "pre",
              "p2",
            ],
          },
        ],
      },
    ],
    edu: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 12,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: [
              "stup",
              "ssb",
              "s2",
              "s3",
              "art",
              "sci",
              "pnm",
              "pre",
              "p2",
            ],
          },
        ],
      },
    ],
    pky: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 12,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: [
              "stup",
              "ssb",
              "s2",
              "s3",
              "art",
              "sci",
              "pnm",
              "pre",
              "p2",
            ],
          },
        ],
      },
    ],
    ee: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["stup", "ssb", "s2", "art"] },
          { line: "สายหอพัก", stops: ["stup", "sci"] },
          { line: "สายประตูสาม", stops: ["stup", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["stup", "ssb", "s2", "art"] },
          { line: "สายหอพัก", stops: ["stup", "sci"] },
          { line: "สายหน้ามอ", stops: ["stup", "eng"] },
        ],
      },
    ],
    med: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["stup", "ssb", "s2", "art"] },
          { line: "สายหอพัก", stops: ["stup", "sci"] },
          { line: "สายประตูสาม", stops: ["stup", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["stup", "ssb", "s2", "art"] },
          { line: "สายหอพัก", stops: ["stup", "sci"] },
          { line: "สายหน้ามอ", stops: ["stup", "eng"] },
        ],
      },
    ],
    eng: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["stup", "ssb", "s2", "art"] },
          { line: "สายหอพัก", stops: ["stup", "sci"] },
          { line: "สายประตูสาม", stops: ["stup", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["stup", "ssb", "s2", "art"] },
          { line: "สายหอพัก", stops: ["stup", "sci"] },
          { line: "สายหน้ามอ", stops: ["stup", "eng"] },
        ],
      },
    ],
    afa: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["stup", "ssb", "s2", "art"] },
          { line: "สายหอพัก", stops: ["stup", "sci"] },
          { line: "สายประตูสาม", stops: ["stup", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["stup", "ssb", "s2", "art"] },
          { line: "สายหอพัก", stops: ["stup", "sci"] },
          { line: "สายหน้ามอ", stops: ["stup", "eng"] },
        ],
      },
    ],
    ash: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["stup", "ssb", "s2", "art"] },
          { line: "สายหอพัก", stops: ["stup", "sci"] },
          { line: "สายประตูสาม", stops: ["stup", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["stup", "ssb", "s2", "art"] },
          { line: "สายหอพัก", stops: ["stup", "sci"] },
          { line: "สายหน้ามอ", stops: ["stup", "eng"] },
        ],
      },
    ],
    sci: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 8,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["stup", "ssb", "s2", "s3", "art", "sci"],
          },
        ],
      },
    ],
    nurse: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 8,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["stup", "ssb", "s2", "s3", "art", "sci"],
          },
        ],
      },
    ],
    anr: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 8,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["stup", "ssb", "s2", "s3", "art", "sci"],
          },
        ],
      },
    ],
    pubh: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 8,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["stup", "ssb", "s2", "s3", "art", "sci"],
          },
        ],
      },
    ],
    ssb: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["stup", "ssb"] }],
      },
    ],
    std: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["stup", "ssb"] }],
      },
    ],
    swim: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["stup", "ssb"] }],
      },
    ],
    art: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["stup", "ssb", "s2", "s3", "art"] },
        ],
      },
    ],
    medsci: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["stup", "ssb", "s2", "s3", "art"] },
        ],
      },
    ],
    ce: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["stup", "ssb", "s2", "s3", "art"] },
        ],
      },
    ],
    p1: [
      // (เส้นทางที่ 1 สายหอพัก-สายหน้ามอ)
      {
        time: 14,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["stup", "ssb", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["stup", "sci"] },
          { line: "สายหน้ามอ", stops: ["stup", "eng", "s1", "dent", "p1"] },
        ],
      },
    ],
    p2: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 12,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: [
              "stup",
              "ssb",
              "s2",
              "s3",
              "art",
              "sci",
              "pnm",
              "pre",
              "p2",
            ],
          },
        ],
      },
    ],
    p3: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 14,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["stup", "ssb", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["stup", "sci"] },
          { line: "สายประตูสาม", stops: ["stup", "eng", "it", "cl", "p3"] },
        ],
      },
    ],
  },
  ssb: {
    it: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ssb", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["ssb", "sci"] },
          { line: "สายประตูสาม", stops: ["ssb", "eng", "it"] },
        ],
      },
    ],
    cl: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ssb", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["ssb", "sci"] },
          { line: "สายประตูสาม", stops: ["ssb", "eng", "it", "cl"] },
        ],
      },
    ],
    dent: [
      // (เส้นทางที่ 1 สายหอพัก-สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ssb", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["ssb", "sci"] },
          { line: "สายหน้ามอ", stops: ["ssb", "eng", "s1", "dent"] },
        ],
      },
    ],
    hos: [
      // (เส้นทางที่ 1 สายหอพัก-สายหน้ามอ)
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ssb", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["ssb", "sci"] },
          { line: "สายหน้ามอ", stops: ["ssb", "eng", "s1", "dent", "hos"] },
        ],
      },
    ],
    hup: [
      // (เส้นทางที่ 1 สายหอพัก-สายหน้ามอ)
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ssb", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["ssb", "sci"] },
          { line: "สายหน้ามอ", stops: ["ssb", "eng", "s1", "dent", "hup"] },
        ],
      },
    ],
    pnm: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ssb", "s2", "s3", "art", "sci", "pnm"] },
        ],
      },
    ],
    pre: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 8,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["ssb", "s2", "s3", "art", "sci", "pnm", "pre"],
          },
        ],
      },
    ],
    s2: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["ssb", "s2"] }],
      },
    ],
    upd: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["ssb", "s2"] }],
      },
    ],
    uba: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["ssb", "s2", "s3"] }],
      },
    ],
    stup: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["ssb", "stup"] }],
      },
    ],
    law: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["ssb", "s2", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    busi: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["ssb", "s2", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    poli: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["ssb", "s2", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    edu: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["ssb", "s2", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    pky: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["ssb", "s2", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    ee: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ssb", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["ssb", "sci"] },
          { line: "สายประตูสาม", stops: ["ssb", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ssb", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["ssb", "sci"] },
          { line: "สายหน้ามอ", stops: ["ssb", "eng"] },
        ],
      },
    ],
    med: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ssb", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["ssb", "sci"] },
          { line: "สายประตูสาม", stops: ["ssb", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ssb", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["ssb", "sci"] },
          { line: "สายหน้ามอ", stops: ["ssb", "eng"] },
        ],
      },
    ],
    eng: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ssb", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["ssb", "sci"] },
          { line: "สายประตูสาม", stops: ["ssb", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ssb", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["ssb", "sci"] },
          { line: "สายหน้ามอ", stops: ["ssb", "eng"] },
        ],
      },
    ],
    afa: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ssb", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["ssb", "sci"] },
          { line: "สายประตูสาม", stops: ["ssb", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ssb", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["ssb", "sci"] },
          { line: "สายหน้ามอ", stops: ["ssb", "eng"] },
        ],
      },
    ],
    ash: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ssb", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["ssb", "sci"] },
          { line: "สายประตูสาม", stops: ["ssb", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ssb", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["ssb", "sci"] },
          { line: "สายหน้ามอ", stops: ["ssb", "eng"] },
        ],
      },
    ],
    sci: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ssb", "s2", "s3", "art", "sci"] },
        ],
      },
    ],
    nurse: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ssb", "s2", "s3", "art", "sci"] },
        ],
      },
    ],
    anr: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ssb", "s2", "s3", "art", "sci"] },
        ],
      },
    ],
    pubh: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ssb", "s2", "s3", "art", "sci"] },
        ],
      },
    ],
    art: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["ssb", "s2", "s3", "art"] }],
      },
    ],
    medsci: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["ssb", "s2", "s3", "art"] }],
      },
    ],
    ce: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["ssb", "s2", "s3", "art"] }],
      },
    ],
    p1: [
      // (เส้นทางที่ 1 สายหอพัก-สายหน้ามอ)
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ssb", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["ssb", "sci"] },
          { line: "สายหน้ามอ", stops: ["ssb", "eng", "s1", "dent", "p1"] },
        ],
      },
    ],
    p2: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["ssb", "s2", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    p3: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 15,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["ssb", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["ssb", "sci"] },
          { line: "สายประตูสาม", stops: ["ssb", "eng", "it", "cl", "p3"] },
        ],
      },
    ],
  },

  std: {
    it: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["std", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["std", "sci"] },
          { line: "สายประตูสาม", stops: ["std", "eng", "it"] },
        ],
      },
    ],
    cl: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["std", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["std", "sci"] },
          { line: "สายประตูสาม", stops: ["std", "eng", "it", "cl"] },
        ],
      },
    ],
    dent: [
      // (เส้นทางที่ 1 สายหอพัก-สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["std", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["std", "sci"] },
          { line: "สายหน้ามอ", stops: ["std", "eng", "s1", "dent"] },
        ],
      },
    ],
    hos: [
      // (เส้นทางที่ 1 สายหอพัก-สายหน้ามอ)
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["std", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["std", "sci"] },
          { line: "สายหน้ามอ", stops: ["std", "eng", "s1", "dent", "hos"] },
        ],
      },
    ],
    hup: [
      // (เส้นทางที่ 1 สายหอพัก-สายหน้ามอ)
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["std", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["std", "sci"] },
          { line: "สายหน้ามอ", stops: ["std", "eng", "s1", "dent", "hup"] },
        ],
      },
    ],
    pnm: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["std", "s2", "s3", "art", "sci", "pnm"] },
        ],
      },
    ],
    pre: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 8,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["std", "s2", "s3", "art", "sci", "pnm", "pre"],
          },
        ],
      },
    ],
    s2: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["std", "s2"] }],
      },
    ],
    upd: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["std", "s2"] }],
      },
    ],
    uba: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["std", "s2", "s3"] }],
      },
    ],
    stup: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["std", "stup"] }],
      },
    ],
    law: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["std", "s2", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    busi: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["std", "s2", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    poli: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["std", "s2", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    edu: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["std", "s2", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    pky: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["std", "s2", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    ee: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["std", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["std", "sci"] },
          { line: "สายประตูสาม", stops: ["std", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["std", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["std", "sci"] },
          { line: "สายหน้ามอ", stops: ["std", "eng"] },
        ],
      },
    ],
    med: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["std", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["std", "sci"] },
          { line: "สายประตูสาม", stops: ["std", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["std", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["std", "sci"] },
          { line: "สายหน้ามอ", stops: ["std", "eng"] },
        ],
      },
    ],
    eng: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["std", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["std", "sci"] },
          { line: "สายประตูสาม", stops: ["std", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["std", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["std", "sci"] },
          { line: "สายหน้ามอ", stops: ["std", "eng"] },
        ],
      },
    ],
    afa: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["std", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["std", "sci"] },
          { line: "สายประตูสาม", stops: ["std", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["std", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["std", "sci"] },
          { line: "สายหน้ามอ", stops: ["std", "eng"] },
        ],
      },
    ],
    ash: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["std", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["std", "sci"] },
          { line: "สายประตูสาม", stops: ["std", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["std", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["std", "sci"] },
          { line: "สายหน้ามอ", stops: ["std", "eng"] },
        ],
      },
    ],
    sci: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["std", "s2", "s3", "art", "sci"] },
        ],
      },
    ],
    nurse: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["std", "s2", "s3", "art", "sci"] },
        ],
      },
    ],
    anr: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["std", "s2", "s3", "art", "sci"] },
        ],
      },
    ],
    pubh: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["std", "s2", "s3", "art", "sci"] },
        ],
      },
    ],
    art: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["std", "s2", "s3", "art"] }],
      },
    ],
    medsci: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["std", "s2", "s3", "art"] }],
      },
    ],
    ce: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["std", "s2", "s3", "art"] }],
      },
    ],
    p1: [
      // (เส้นทางที่ 1 สายหอพัก-สายหน้ามอ)
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["std", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["std", "sci"] },
          { line: "สายหน้ามอ", stops: ["std", "eng", "s1", "dent", "p1"] },
        ],
      },
    ],
    p2: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["std", "s2", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    p3: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 15,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["std", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["std", "sci"] },
          { line: "สายประตูสาม", stops: ["std", "eng", "it", "cl", "p3"] },
        ],
      },
    ],
  },

  swim: {
    it: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["swim", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["swim", "sci"] },
          { line: "สายประตูสาม", stops: ["swim", "eng", "it"] },
        ],
      },
    ],
    cl: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["swim", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["swim", "sci"] },
          { line: "สายประตูสาม", stops: ["swim", "eng", "it", "cl"] },
        ],
      },
    ],
    dent: [
      // (เส้นทางที่ 1 สายหอพัก-สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["swim", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["swim", "sci"] },
          { line: "สายหน้ามอ", stops: ["swim", "eng", "s1", "dent"] },
        ],
      },
    ],
    hos: [
      // (เส้นทางที่ 1 สายหอพัก-สายหน้ามอ)
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["swim", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["swim", "sci"] },
          { line: "สายหน้ามอ", stops: ["swim", "eng", "s1", "dent", "hos"] },
        ],
      },
    ],
    hup: [
      // (เส้นทางที่ 1 สายหอพัก-สายหน้ามอ)
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["swim", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["swim", "sci"] },
          { line: "สายหน้ามอ", stops: ["swim", "eng", "s1", "dent", "hup"] },
        ],
      },
    ],
    pnm: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 7,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["swim", "s2", "s3", "art", "sci", "pnm"],
          },
        ],
      },
    ],
    pre: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 8,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["swim", "s2", "s3", "art", "sci", "pnm", "pre"],
          },
        ],
      },
    ],
    s2: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["swim", "s2"] }],
      },
    ],
    upd: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["swim", "s2"] }],
      },
    ],
    uba: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["swim", "s2", "s3"] }],
      },
    ],
    stup: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["swim", "stup"] }],
      },
    ],
    law: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["swim", "s2", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    busi: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["swim", "s2", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    poli: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["swim", "s2", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    edu: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["swim", "s2", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    pky: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["swim", "s2", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    ee: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["swim", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["swim", "sci"] },
          { line: "สายประตูสาม", stops: ["swim", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["swim", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["swim", "sci"] },
          { line: "สายหน้ามอ", stops: ["swim", "eng"] },
        ],
      },
    ],
    med: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["swim", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["swim", "sci"] },
          { line: "สายประตูสาม", stops: ["swim", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["swim", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["swim", "sci"] },
          { line: "สายหน้ามอ", stops: ["swim", "eng"] },
        ],
      },
    ],
    eng: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["swim", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["swim", "sci"] },
          { line: "สายประตูสาม", stops: ["swim", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["swim", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["swim", "sci"] },
          { line: "สายหน้ามอ", stops: ["swim", "eng"] },
        ],
      },
    ],
    afa: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["swim", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["swim", "sci"] },
          { line: "สายประตูสาม", stops: ["swim", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["swim", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["swim", "sci"] },
          { line: "สายหน้ามอ", stops: ["swim", "eng"] },
        ],
      },
    ],
    ash: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["swim", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["swim", "sci"] },
          { line: "สายประตูสาม", stops: ["swim", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["swim", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["swim", "sci"] },
          { line: "สายหน้ามอ", stops: ["swim", "eng"] },
        ],
      },
    ],
    sci: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["swim", "s2", "s3", "art", "sci"] },
        ],
      },
    ],
    nurse: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["swim", "s2", "s3", "art", "sci"] },
        ],
      },
    ],
    anr: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["swim", "s2", "s3", "art", "sci"] },
        ],
      },
    ],
    pubh: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["swim", "s2", "s3", "art", "sci"] },
        ],
      },
    ],
    art: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["swim", "s2", "s3", "art"] }],
      },
    ],
    medsci: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["swim", "s2", "s3", "art"] }],
      },
    ],
    ce: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["swim", "s2", "s3", "art"] }],
      },
    ],
    p1: [
      // (เส้นทางที่ 1 สายหอพัก-สายหน้ามอ)
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["swim", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["swim", "sci"] },
          { line: "สายหน้ามอ", stops: ["swim", "eng", "s1", "dent", "p1"] },
        ],
      },
    ],
    p2: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["swim", "s2", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    p3: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 15,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["swim", "s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["swim", "sci"] },
          { line: "สายประตูสาม", stops: ["swim", "eng", "it", "cl", "p3"] },
        ],
      },
    ],
  },
  upd: {
    it: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["upd", "s3", "art"] },
          { line: "สายหอพัก", stops: ["upd", "sci"] },
          { line: "สายประตูสาม", stops: ["upd", "eng", "it"] },
        ],
      },
    ],
    cl: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["upd", "s3", "art"] },
          { line: "สายหอพัก", stops: ["upd", "sci"] },
          { line: "สายประตูสาม", stops: ["upd", "eng", "it", "cl"] },
        ],
      },
    ],
    dent: [
      // (เส้นทางที่ 1 สายหอพัก-สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["upd", "s3", "art"] },
          { line: "สายหอพัก", stops: ["upd", "sci"] },
          { line: "สายหน้ามอ", stops: ["upd", "eng", "s1", "dent"] },
        ],
      },
    ],
    hos: [
      // (เส้นทางที่ 1 สายหอพัก-สายหน้ามอ)
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["upd", "s3", "art"] },
          { line: "สายหอพัก", stops: ["upd", "sci"] },
          { line: "สายหน้ามอ", stops: ["upd", "eng", "s1", "dent", "hos"] },
        ],
      },
    ],
    hup: [
      // (เส้นทางที่ 1 สายหอพัก-สายหน้ามอ)
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["upd", "s3", "art"] },
          { line: "สายหอพัก", stops: ["upd", "sci"] },
          { line: "สายหน้ามอ", stops: ["upd", "eng", "s1", "dent", "hup"] },
        ],
      },
    ],
    pnm: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["upd", "s3", "art", "sci", "pnm"] },
        ],
      },
    ],
    pre: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["upd", "s3", "art", "sci", "pnm", "pre"],
          },
        ],
      },
    ],
    uba: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["upd", "s3"] }],
      },
    ],
    stup: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["upd", "ssb", "stup"] }],
      },
    ],
    law: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["upd", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    busi: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["upd", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    poli: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["upd", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    edu: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["upd", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    pky: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["upd", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
      ,
    ],
    ee: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["upd", "s3", "art"] },
          { line: "สายหอพัก", stops: ["upd", "sci"] },
          { line: "สายประตูสาม", stops: ["upd", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["upd", "s3", "art"] },
          { line: "สายหอพัก", stops: ["upd", "sci"] },
          { line: "สายหน้ามอ", stops: ["upd", "eng"] },
        ],
      },
    ],
    med: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["upd", "s3", "art"] },
          { line: "สายหอพัก", stops: ["upd", "sci"] },
          { line: "สายประตูสาม", stops: ["upd", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["upd", "s3", "art"] },
          { line: "สายหอพัก", stops: ["upd", "sci"] },
          { line: "สายหน้ามอ", stops: ["upd", "eng"] },
        ],
      },
    ],
    eng: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["upd", "s3", "art"] },
          { line: "สายหอพัก", stops: ["upd", "sci"] },
          { line: "สายประตูสาม", stops: ["upd", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["upd", "s3", "art"] },
          { line: "สายหอพัก", stops: ["upd", "sci"] },
          { line: "สายหน้ามอ", stops: ["upd", "eng"] },
        ],
      },
    ],
    afa: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["upd", "s3", "art"] },
          { line: "สายหอพัก", stops: ["upd", "sci"] },
          { line: "สายประตูสาม", stops: ["upd", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["upd", "s3", "art"] },
          { line: "สายหอพัก", stops: ["upd", "sci"] },
          { line: "สายหน้ามอ", stops: ["upd", "eng"] },
        ],
      },
    ],
    ash: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["upd", "s3", "art"] },
          { line: "สายหอพัก", stops: ["upd", "sci"] },
          { line: "สายประตูสาม", stops: ["upd", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["upd", "s3", "art"] },
          { line: "สายหอพัก", stops: ["upd", "sci"] },
          { line: "สายหน้ามอ", stops: ["upd", "eng"] },
        ],
      },
    ],
    sci: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["upd", "s3", "art", "sci"] }],
      },
    ],
    nurse: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["upd", "s3", "art", "sci"] }],
      },
    ],
    anr: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["upd", "s3", "art", "sci"] }],
      },
    ],
    pubh: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["upd", "s3", "art", "sci"] }],
      },
    ],
    ssb: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["upd", "ssb"] }],
      },
    ],
    std: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["upd", "ssb"] }],
      },
    ],
    swim: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["upd", "ssb"] }],
      },
    ],
    art: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["upd", "ssb"] }],
      },
    ],
    medsci: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["upd", "ssb"] }],
      },
    ],
    ce: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["upd", "ssb"] }],
      },
    ],
    p1: [
      // (เส้นทางที่ 1 สายหอพัก-สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["upd", "s3", "art"] },
          { line: "สายหอพัก", stops: ["upd", "sci"] },
          { line: "สายหน้ามอ", stops: ["upd", "eng", "s1", "dent", "p1"] },
        ],
      },
    ],
    p2: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["upd", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    p3: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 13,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["upd", "s3", "art"] },
          { line: "สายหอพัก", stops: ["upd", "sci"] },
          { line: "สายประตูสาม", stops: ["upd", "eng", "it", "cl", "p3"] },
        ],
      },
    ],
  },

  s2: {
    it: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["s2", "sci"] },
          { line: "สายประตูสาม", stops: ["s2", "eng", "it"] },
        ],
      },
    ],
    cl: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["s2", "sci"] },
          { line: "สายประตูสาม", stops: ["s2", "eng", "it", "cl"] },
        ],
      },
    ],
    dent: [
      // (เส้นทางที่ 1 สายหอพัก-สายหน้ามอ)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["s2", "sci"] },
          { line: "สายหน้ามอ", stops: ["s2", "eng", "s1", "dent"] },
        ],
      },
    ],
    hos: [
      // (เส้นทางที่ 1 สายหอพัก-สายหน้ามอ)
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["s2", "sci"] },
          { line: "สายหน้ามอ", stops: ["s2", "eng", "s1", "dent", "hos"] },
        ],
      },
    ],
    hup: [
      // (เส้นทางที่ 1 สายหอพัก-สายหน้ามอ)
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["s2", "sci"] },
          { line: "สายหน้ามอ", stops: ["s2", "eng", "s1", "dent", "hup"] },
        ],
      },
    ],
    pnm: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["s2", "s3", "art", "sci", "pnm"] },
        ],
      },
    ],
    pre: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["s2", "s3", "art", "sci", "pnm", "pre"] },
        ],
      },
    ],
    uba: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["s2", "s3"] }],
      },
    ],
    stup: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["s2", "ssb", "stup"] }],
      },
    ],
    law: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["s2", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    busi: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["s2", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    poli: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["s2", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    edu: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["s2", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    pky: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["s2", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
      ,
    ],
    ee: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["s2", "sci"] },
          { line: "สายประตูสาม", stops: ["s2", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["s2", "sci"] },
          { line: "สายหน้ามอ", stops: ["s2", "eng"] },
        ],
      },
    ],
    med: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["s2", "sci"] },
          { line: "สายประตูสาม", stops: ["s2", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["s2", "sci"] },
          { line: "สายหน้ามอ", stops: ["s2", "eng"] },
        ],
      },
    ],
    eng: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["s2", "sci"] },
          { line: "สายประตูสาม", stops: ["s2", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["s2", "sci"] },
          { line: "สายหน้ามอ", stops: ["s2", "eng"] },
        ],
      },
    ],
    afa: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["s2", "sci"] },
          { line: "สายประตูสาม", stops: ["s2", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["s2", "sci"] },
          { line: "สายหน้ามอ", stops: ["s2", "eng"] },
        ],
      },
    ],
    ash: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["s2", "sci"] },
          { line: "สายประตูสาม", stops: ["s2", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["s2", "sci"] },
          { line: "สายหน้ามอ", stops: ["s2", "eng"] },
        ],
      },
    ],
    sci: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["s2", "s3", "art", "sci"] }],
      },
    ],
    nurse: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["s2", "s3", "art", "sci"] }],
      },
    ],
    anr: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["s2", "s3", "art", "sci"] }],
      },
    ],
    pubh: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["s2", "s3", "art", "sci"] }],
      },
    ],
    ssb: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["s2", "ssb"] }],
      },
    ],
    std: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["s2", "ssb"] }],
      },
    ],
    swim: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["s2", "ssb"] }],
      },
    ],
    art: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["s2", "ssb"] }],
      },
    ],
    medsci: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["s2", "ssb"] }],
      },
    ],
    ce: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["s2", "ssb"] }],
      },
    ],
    p1: [
      // (เส้นทางที่ 1 สายหอพัก-สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["s2", "sci"] },
          { line: "สายหน้ามอ", stops: ["s2", "eng", "s1", "dent", "p1"] },
        ],
      },
    ],
    p2: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["s2", "s3", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    p3: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 13,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["s2", "s3", "art"] },
          { line: "สายหอพัก", stops: ["s2", "sci"] },
          { line: "สายประตูสาม", stops: ["s2", "eng", "it", "cl", "p3"] },
        ],
      },
    ],
  },
  uba: {
    it: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["uba", "art"] },
          { line: "สายหอพัก", stops: ["uba", "sci"] },
          { line: "สายประตูสาม", stops: ["uba", "eng", "it"] },
        ],
      },
    ],
    cl: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["uba", "art"] },
          { line: "สายหอพัก", stops: ["uba", "sci"] },
          { line: "สายประตูสาม", stops: ["uba", "eng", "it", "cl"] },
        ],
      },
    ],
    dent: [
      // (เส้นทางที่ 1 สายหอพัก-สายหน้ามอ)
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["uba", "art"] },
          { line: "สายหอพัก", stops: ["uba", "sci"] },
          { line: "สายหน้ามอ", stops: ["uba", "eng", "s1", "dent"] },
        ],
      },
    ],
    hos: [
      // (เส้นทางที่ 1 สายหอพัก-สายหน้ามอ)
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["uba", "art"] },
          { line: "สายหอพัก", stops: ["uba", "sci"] },
          { line: "สายหน้ามอ", stops: ["uba", "eng", "s1", "dent", "hos"] },
        ],
      },
    ],
    hup: [
      // (เส้นทางที่ 1 สายหอพัก-สายหน้ามอ)
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["uba", "art"] },
          { line: "สายหอพัก", stops: ["uba", "sci"] },
          { line: "สายหน้ามอ", stops: ["uba", "eng", "s1", "dent", "hup"] },
        ],
      },
    ],
    pnm: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["uba", "art", "sci", "pnm"] }],
      },
    ],
    pre: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["uba", "art", "sci", "pnm", "pre"] },
        ],
      },
    ],
    s2: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["uba", "s2"] }],
      },
    ],
    upd: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["uba", "s2"] }],
      },
    ],
    stup: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["uba", "s2", "ssb", "stup"] }],
      },
    ],
    law: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 8,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["uba", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    busi: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 8,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["uba", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    poli: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 8,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["uba", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    edu: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 8,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["uba", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    pky: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 8,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["uba", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    ee: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["uba", "art"] },
          { line: "สายหอพัก", stops: ["uba", "sci"] },
          { line: "สายประตูสาม", stops: ["uba", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["uba", "art"] },
          { line: "สายหอพัก", stops: ["uba", "sci"] },
          { line: "สายหน้ามอ", stops: ["uba", "eng"] },
        ],
      },
    ],
    med: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["uba", "art"] },
          { line: "สายหอพัก", stops: ["uba", "sci"] },
          { line: "สายประตูสาม", stops: ["uba", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["uba", "art"] },
          { line: "สายหอพัก", stops: ["uba", "sci"] },
          { line: "สายหน้ามอ", stops: ["uba", "eng"] },
        ],
      },
    ],
    eng: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["uba", "art"] },
          { line: "สายหอพัก", stops: ["uba", "sci"] },
          { line: "สายประตูสาม", stops: ["uba", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["uba", "art"] },
          { line: "สายหอพัก", stops: ["uba", "sci"] },
          { line: "สายหน้ามอ", stops: ["uba", "eng"] },
        ],
      },
    ],
    afa: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["uba", "art"] },
          { line: "สายหอพัก", stops: ["uba", "sci"] },
          { line: "สายประตูสาม", stops: ["uba", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["uba", "art"] },
          { line: "สายหอพัก", stops: ["uba", "sci"] },
          { line: "สายหน้ามอ", stops: ["uba", "eng"] },
        ],
      },
    ],
    ash: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["uba", "art"] },
          { line: "สายหอพัก", stops: ["uba", "sci"] },
          { line: "สายประตูสาม", stops: ["uba", "eng"] },
        ],
      },
      // (เส้นทางที่ 2 สายหอพัก-สายหน้ามอ)
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["uba", "art"] },
          { line: "สายหอพัก", stops: ["uba", "sci"] },
          { line: "สายหน้ามอ", stops: ["uba", "eng"] },
        ],
      },
    ],
    sci: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["uba", "art", "sci"] }],
      },
    ],
    nurse: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["uba", "art", "sci"] }],
      },
    ],
    anr: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["uba", "art", "sci"] }],
      },
    ],
    pubh: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["uba", "art", "sci"] }],
      },
    ],
    ssb: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["uba", "s2", "ssb"] }],
      },
    ],
    std: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["uba", "s2", "ssb"] }],
      },
    ],
    swim: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["uba", "s2", "ssb"] }],
      },
    ],
    art: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["uba", "art"] }],
      },
    ],
    medsci: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["uba", "art"] }],
      },
    ],
    ce: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["uba", "art"] }],
      },
    ],
    p1: [
      // (สายหอพัก-สายหน้ามอ)
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["uba", "art"] },
          { line: "สายหอพัก", stops: ["uba", "sci"] },
          { line: "สายหน้ามอ", stops: ["uba", "eng", "s1", "dent", "p1"] },
        ],
      },
    ],
    p2: [
      // (เส้นทางที่ 1 สายหอพัก)
      {
        time: 8,
        isRecommended: true,
        sections: [
          {
            line: "สายหอพัก",
            stops: ["uba", "art", "sci", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    p3: [
      // (เส้นทางที่ 1 สายหอพัก-สายประตูสาม)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["uba", "art"] },
          { line: "สายหอพัก", stops: ["uba", "sci"] },
          { line: "สายประตูสาม", stops: ["uba", "eng", "it", "cl", "p3"] },
        ],
      },
    ],
  },
  p2: {
    it: [
      {
        time: 6,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["p2", "art"] },
          { line: "สายประตูสาม", stops: ["p2", "sci", "eng", "it"] },
        ],
      },
    ],
    cl: [
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["p2", "art"] },
          { line: "สายประตูสาม", stops: ["p2", "sci", "eng", "it", "cl"] },
        ],
      },
    ],
    dent: [
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["p2", "art", "eng", "s1", "dent"] },
        ],
      },
    ],
    hos: [
      {
        time: 11,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["p2", "art", "sci", "eng", "s1", "dent", "hos"],
          },
        ],
      },
    ],
    hup: [
      {
        time: 11,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["p2", "art", "sci", "eng", "s1", "dent", "hup"],
          },
        ],
      },
    ],
    pre: [
      {
        time: 5,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["p2", "art"] },
          { line: "สายหอพัก", stops: ["p2", "sci", "pnm", "pre"] },
        ],
      },
    ],
    pnm: [
      {
        time: 4,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["p2", "art"] },
          { line: "สายหอพัก", stops: ["p2", "sci", "pnm"] },
        ],
      },
    ],
    s2: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["p2", "s3", "s2"] }],
      },
    ],
    upd: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["p2", "s3", "s2"] }],
      },
    ],
    stup: [
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหอพัก", stops: ["p2", "s3", "s2", "ssb", "stup"] },
        ],
      },
    ],
    // สถานีหน้าคณะวิศวะ
    ee: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["p2", "art", "sci", "eng"] }],
      },
    ],
    med: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["p2", "art", "sci", "eng"] }],
      },
    ],
    eng: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["p2", "art", "sci", "eng"] }],
      },
    ],
    afa: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["p2", "art", "sci", "eng"] }],
      },
    ],
    ash: [
      {
        time: 4,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["p2", "art", "sci", "eng"] }],
      },
    ],
    // สถานีหน้าคณะวิท
    sci: [
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["p2", "art", "sci"] }],
      },
    ],
    nurse: [
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["p2", "art", "sci"] }],
      },
    ],
    anr: [
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["p2", "art", "sci"] }],
      },
    ],
    pubh: [
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["p2", "art", "sci"] }],
      },
    ],
    // สถานีหน้าอาคารสงวนเสริมศรี
    ssb: [
      {
        time: 6,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["p2", "s3", "s2", "ssb"] }],
      },
    ],
    std: [
      {
        time: 6,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["p2", "s3", "s2", "ssb"] }],
      },
    ],
    swim: [
      {
        time: 6,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["p2", "s3", "s2", "ssb"] }],
      },
    ],
    // สถานีหน้าคณะศิลป
    art: [
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["p2", "art"] }],
      },
    ],
    medsci: [
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["p2", "art"] }],
      },
    ],
    ce: [
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["p2", "art"] }],
      },
    ],
    pky: [
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["p2", "art"] }],
      },
    ],
    uba: [
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายหอพัก", stops: ["p2", "s3"] }],
      },
    ],
    p1: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 12,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["p2", "art", "sci", "eng", "s1", "dent", "p1"],
          },
        ],
      },
    ],
    p3: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 10,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["p2", "art"] },
          {
            line: "สายประตูสาม",
            stops: ["p2", "sci", "eng", "it", "cl", "p3"],
          },
        ],
      },
    ],
  },
  p1: {
    it: [
      {
        time: 8,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["p1", "dent", "s1"] },
          { line: "สายหน้ามอ", stops: ["p1", "eng"] },
          { line: "สายประตูสาม", stops: ["p1", "it"] },
        ],
      },
    ],
    cl: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["p1", "dent", "s1"] },
          { line: "สายหน้ามอ", stops: ["p1", "eng"] },
          { line: "สายประตูสาม", stops: ["p1", "it", "cl"] },
        ],
      },
    ],
    hos: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["p1", "hos"] }],
      },
    ],
    hup: [
      {
        time: 1,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["p1", "hos"] }],
      },
    ],
    dent: [
      {
        time: 2,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["p1", "dent"] }],
      },
    ],
    pre: [
      {
        time: 8,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["p1", "dent", "s1", "eng", "pnm", "pre"],
          },
        ],
      },
    ],
    pnm: [
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["p1", "dent", "s1", "eng", "pnm"] },
        ],
      },
    ],
    uba: [
      {
        time: 14,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["p1", "dent", "s1", "eng", "pnm", "pre"],
          },
          { line: "สายหน้ามอ", stops: ["p1", "p2"] },
          { line: "สายหอพัก", stops: ["p1", "s3"] },
        ],
      },
    ],
    s2: [
      {
        time: 15,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["p1", "dent", "s1", "eng", "pnm", "pre"],
          },
          { line: "สายหน้ามอ", stops: ["p1", "p2"] },
          { line: "สายหอพัก", stops: ["p1", "s3", "s2"] },
        ],
      },
    ],
    upd: [
      {
        time: 15,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["p1", "dent", "s1", "eng", "pnm", "pre"],
          },
          { line: "สายหน้ามอ", stops: ["p1", "p2"] },
          { line: "สายหอพัก", stops: ["p1", "s3", "s2"] },
        ],
      },
    ],
    stup: [
      {
        time: 17,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["p1", "dent", "s1", "eng", "pnm", "pre"],
          },
          { line: "สายหน้ามอ", stops: ["p1", "p2"] },
          { line: "สายหอพัก", stops: ["p1", "s3", "s2", "ssb", "stup"] },
        ],
      },
    ],
    // สถานีหน้าคณะวิศวกรรมศาสตร์
    ee: [
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["p1", "dent", "s1", "eng"] }],
      },
    ],
    med: [
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["p1", "dent", "s1", "eng"] }],
      },
    ],
    eng: [
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["p1", "dent", "s1", "eng"] }],
      },
    ],
    afa: [
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["p1", "dent", "s1", "eng"] }],
      },
    ],
    ash: [
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายหน้ามอ", stops: ["p1", "dent", "s1", "eng"] }],
      },
    ],
    //สถานีหน้าคณะวิทยาศาสตร์
    sci: [
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["p1", "dent", "s1", "eng", "pnm"] },
        ],
      },
    ],
    nurse: [
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["p1", "dent", "s1", "eng", "pnm"] },
        ],
      },
    ],
    anr: [
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["p1", "dent", "s1", "eng", "pnm"] },
        ],
      },
    ],
    pubh: [
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["p1", "dent", "s1", "eng", "pnm"] },
        ],
      },
    ],
    //สถานีหน้าอาคารสงวนเสริมศรี
    ssb: [
      {
        time: 17,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["p1", "dent", "s1", "eng", "pnm", "pre"],
          },
          { line: "สายหน้ามอ", stops: ["p1", "p2"] },
          { line: "สายหอพัก", stops: ["p1", "s3", "s2", "ssb"] },
        ],
      },
    ],
    std: [
      {
        time: 17,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["p1", "dent", "s1", "eng", "pnm", "pre"],
          },
          { line: "สายหน้ามอ", stops: ["p1", "p2"] },
          { line: "สายหอพัก", stops: ["p1", "s3", "s2", "ssb"] },
        ],
      },
    ],
    swim: [
      {
        time: 17,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["p1", "dent", "s1", "eng", "pnm", "pre"],
          },
          { line: "สายหน้ามอ", stops: ["p1", "p2"] },
          { line: "สายหอพัก", stops: ["p1", "s3", "s2", "ssb"] },
        ],
      },
    ],
    // สถานีหน้าคณะศิลป
    art: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["p1", "dent", "s1", "eng"] },
          { line: "สายหน้ามอ", stops: ["p1", "pnm"] },
          { line: "สายประตูสาม", stops: ["p1", "pre", "art"] },
        ],
      },
    ],
    medsci: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["p1", "dent", "s1", "eng"] },
          { line: "สายหน้ามอ", stops: ["p1", "pnm"] },
          { line: "สายประตูสาม", stops: ["p1", "pre", "art"] },
        ],
      },
    ],
    ce: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["p1", "dent", "s1", "eng"] },
          { line: "สายหน้ามอ", stops: ["p1", "pnm"] },
          { line: "สายประตูสาม", stops: ["p1", "pre", "art"] },
        ],
      },
    ],
    pky: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["p1", "dent", "s1", "eng"] },
          { line: "สายหน้ามอ", stops: ["p1", "pnm"] },
          { line: "สายประตูสาม", stops: ["p1", "pre", "art"] },
        ],
      },
    ],
    // จุดจอดรถบัส PKY
    law: [
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["p1", "dent", "s1", "eng", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    busi: [
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["p1", "dent", "s1", "eng", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    poli: [
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["p1", "dent", "s1", "eng", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    edu: [
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["p1", "dent", "s1", "eng", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    pky: [
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["p1", "dent", "s1", "eng", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
    // จุดจอดรถบัสประตูสาม
    p3: [
      // (เส้นทางที่ 1 สายหน้ามอ-สายประตูสาม)
      {
        time: 12,
        isRecommended: true,
        sections: [
          { line: "สายหน้ามอ", stops: ["p1", "dent", "s1"] },
          { line: "สายหน้ามอ", stops: ["p1", "eng"] },
          { line: "สายประตูสาม", stops: ["p1", "it", "cl", "p3"] },
        ],
      },
    ],
    p2: [
      // (เส้นทางที่ 1 สายหน้ามอ)
      {
        time: 10,
        isRecommended: true,
        sections: [
          {
            line: "สายหน้ามอ",
            stops: ["p1", "dent", "s1", "eng", "pnm", "pre", "p2"],
          },
        ],
      },
    ],
  },
  p3: {
    cl: [
      {
        time: 3,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["p3", "cl"] }],
      },
    ],
    it: [
      {
        time: 11,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["p3", "cl", "pnm", "pre", "art", "sci", "eng", "it"],
          },
        ],
      },
    ],
    dent: [
      {
        time: 12,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["p3", "cl", "pnm", "pre", "art", "sci"],
          },
          { line: "สายประตูสาม", stops: ["p3", "eng"] },
          { line: "สายหน้ามอ", stops: ["p3", "s1", "dent"] },
        ],
      },
    ],
    hos: [
      {
        time: 13,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["p3", "cl", "pnm", "pre", "art", "sci"],
          },
          { line: "สายประตูสาม", stops: ["p3", "eng"] },
          { line: "สายหน้ามอ", stops: ["p3", "s1", "dent", "hos"] },
        ],
      },
    ],
    hup: [
      {
        time: 13,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["p3", "cl", "pnm", "pre", "art", "sci"],
          },
          { line: "สายประตูสาม", stops: ["p3", "eng"] },
          { line: "สายหน้ามอ", stops: ["p3", "s1", "dent", "hup"] },
        ],
      },
    ],
    pre: [
      {
        time: 6,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["p3", "cl", "pnm", "pre"] }],
      },
    ],
    pnm: [
      {
        time: 5,
        isRecommended: true,
        sections: [{ line: "สายประตูสาม", stops: ["p3", "cl", "pnm"] }],
      },
    ],
    uba: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["p3", "cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["p3", "pre"] },
          { line: "สายหอพัก", stops: ["p3", "p2", "s3"] },
        ],
      },
    ],
    s2: [
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["p3", "cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["p3", "pre"] },
          { line: "สายหอพัก", stops: ["p3", "p2", "s3", "s2"] },
        ],
      },
    ],
    upd: [
      {
        time: 11,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["p3", "cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["p3", "pre"] },
          { line: "สายหอพัก", stops: ["p3", "p2", "s3", "s2"] },
        ],
      },
    ],
    stup: [
      {
        time: 14,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["p3", "cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["p3", "pre"] },
          { line: "สายหอพัก", stops: ["p3", "p2", "s3", "s2", "ssb", "stup"] },
        ],
      },
    ],
    // สถานีหน้าคณะวิทย
    sci: [
      {
        time: 8,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["p3", "cl", "pnm", "pre", "art", "sci"],
          },
        ],
      },
    ],
    nurse: [
      {
        time: 8,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["p3", "cl", "pnm", "pre", "art", "sci"],
          },
        ],
      },
    ],
    anr: [
      {
        time: 8,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["p3", "cl", "pnm", "pre", "art", "sci"],
          },
        ],
      },
    ],
    pubh: [
      {
        time: 8,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["p3", "cl", "pnm", "pre", "art", "sci"],
          },
        ],
      },
    ],
    // สถานีหน้าคณะวิศว
    ee: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["p3", "cl", "pnm", "pre", "art", "sci", "eng"],
          },
        ],
      },
    ],
    med: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["p3", "cl", "pnm", "pre", "art", "sci", "eng"],
          },
        ],
      },
    ],
    eng: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["p3", "cl", "pnm", "pre", "art", "sci", "eng"],
          },
        ],
      },
    ],
    afa: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["p3", "cl", "pnm", "pre", "art", "sci", "eng"],
          },
        ],
      },
    ],
    ash: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["p3", "cl", "pnm", "pre", "art", "sci", "eng"],
          },
        ],
      },
    ],
    // สถานีหน้าอาคารสงวนเสริมศรี
    ssb: [
      {
        time: 13,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["p3", "cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["p3", "pre"] },
          { line: "สายหอพัก", stops: ["p3", "p2", "s3", "s2", "ssb"] },
        ],
      },
    ],
    std: [
      {
        time: 13,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["p3", "cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["p3", "pre"] },
          { line: "สายหอพัก", stops: ["p3", "p2", "s3", "s2", "ssb"] },
        ],
      },
    ],
    swim: [
      {
        time: 13,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["p3", "cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["p3", "pre"] },
          { line: "สายหอพัก", stops: ["p3", "p2", "s3", "s2", "ssb"] },
        ],
      },
    ],
    // สถานีหน้าคณะศิลป
    art: [
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["p3", "cl", "pnm", "pre", "art"] },
        ],
      },
    ],
    medsci: [
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["p3", "cl", "pnm", "pre", "art"] },
        ],
      },
    ],
    ce: [
      {
        time: 7,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["p3", "cl", "pnm", "pre", "art"] },
        ],
      },
    ],
    // จุดจอดรถบัส pky
    law: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["p3", "cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["p3", "pre"] },
          { line: "สายหอพัก", stops: ["p3", "p2"] },
        ],
      },
      {
        time: 9,
        isRecommended: false,
        sections: [
          { line: "สายประตูสาม", stops: ["p3", "cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["p3", "pre"] },
          { line: "สายหน้ามอ", stops: ["p3", "p2"] },
        ],
      },
    ],
    busi: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["p3", "cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["p3", "pre"] },
          { line: "สายหอพัก", stops: ["p3", "p2"] },
        ],
      },
      {
        time: 9,
        isRecommended: false,
        sections: [
          { line: "สายประตูสาม", stops: ["p3", "cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["p3", "pre"] },
          { line: "สายหน้ามอ", stops: ["p3", "p2"] },
        ],
      },
    ],
    poli: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["p3", "cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["p3", "pre"] },
          { line: "สายหอพัก", stops: ["p3", "p2"] },
        ],
      },
      {
        time: 9,
        isRecommended: false,
        sections: [
          { line: "สายประตูสาม", stops: ["p3", "cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["p3", "pre"] },
          { line: "สายหน้ามอ", stops: ["p3", "p2"] },
        ],
      },
    ],
    edu: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["p3", "cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["p3", "pre"] },
          { line: "สายหอพัก", stops: ["p3", "p2"] },
        ],
      },
      {
        time: 9,
        isRecommended: false,
        sections: [
          { line: "สายประตูสาม", stops: ["p3", "cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["p3", "pre"] },
          { line: "สายหน้ามอ", stops: ["p3", "p2"] },
        ],
      },
    ],
    pky: [
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["p3", "cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["p3", "pre"] },
          { line: "สายหอพัก", stops: ["p3", "p2"] },
        ],
      },
      {
        time: 9,
        isRecommended: false,
        sections: [
          { line: "สายประตูสาม", stops: ["p3", "cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["p3", "pre"] },
          { line: "สายหน้ามอ", stops: ["p3", "p2"] },
        ],
      },
    ],
    p1: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหน้ามอ)
      {
        time: 14,
        isRecommended: true,
        sections: [
          {
            line: "สายประตูสาม",
            stops: ["p3", "cl", "pnm", "pre", "art", "sci"],
          },
          { line: "สายประตูสาม", stops: ["p3", "eng"] },
          { line: "สายหน้ามอ", stops: ["p3", "s1", "dent", "p1"] },
        ],
      },
    ],
    p2: [
      // (เส้นทางที่ 1 สายประตูสาม-สายหอพัก,สายหน้ามอ)
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["p3", "cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["p3", "pre"] },
          { line: "สายหอพัก", stops: ["p3", "p2"] },
        ],
      },
      {
        time: 9,
        isRecommended: true,
        sections: [
          { line: "สายประตูสาม", stops: ["p3", "cl", "pnm"] },
          { line: "สายประตูสาม", stops: ["p3", "pre"] },
          { line: "สายหน้ามอ", stops: ["p3", "p2"] },
        ],
      },
    ],
  },
};

let currentStartPoint = null;
let currentEndPoint = null;
let isSelectingStart = true;

// Global variables for map
const backendUrl = "https://bustransit.up.ac.th/api/get"; //https://bustransit.up.ac.th/api/get http://localhost:5000/api

let map;
let busMarkers = [];
let kmlLayers = {};
// Station icon for bus stops
const stationIcon = L.icon({
  iconUrl: "assets/images/bus-stop-1.png",
  iconSize: [65, 65],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Park icon for bus stops
const parkIcon = L.icon({
  iconUrl: "assets/images/park.png",
  iconSize: [74, 74],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const kmlPaths = {
  green: "./up_bus_transit_green.kml",
  blue: "./up_bus_transit_blue.kml",
  red: "./up_bus_transit_red.kml",
};

/*const busLineDatabase = {
  // green x active-2
  1: "green",
  2: "green",
  3: "green",
  4: "green",
  5: "green",
  6: "green",
  7: "green",
  8: "green",
  9: "green",
  10: "green",
  11: "green",
  12: "green",
  13: "green",
  14: "green",
  15: "green",
  16: "green",
  17: "green",
  18: "green",
  19: "green",
  20: "green",
  21: "green",

  // red x active-3
  22: "red",
  23: "red",
  24: "red",
  25: "red",
  26: "red",
  27: "red",

  // blue x active-4
  28: "blue",
  29: "blue",
  30: "blue",
};

/*
==================================================
 2. ฟังก์ชันควบคุมระบบค้นหา (v8.0)
==================================================
*/
function setupRouteFinder() {
  const startBtn = document.getElementById("start-point-btn");
  const endBtn = document.getElementById("end-point-btn");
  const swapBtn = document.getElementById("swap-routes-btn");

  const modal = document.getElementById("stop-selector-modal");
  const modalTitle = document.getElementById("modal-title");
  const searchInput = document.getElementById("modal-search-input");
  const stopListDiv = document.getElementById("stop-list");

  const modalRouteContext = document.querySelector(".modal-route-context");
  const modalStartText = document.getElementById("modal-start-text");
  const modalEndText = document.getElementById("modal-end-text");

  if (
    !startBtn ||
    !endBtn ||
    !modal ||
    !searchInput ||
    !modalTitle ||
    !stopListDiv ||
    !modalStartText ||
    !modalEndText ||
    !modalRouteContext
  ) {
    console.error("setupRouteFinder: ❌ หา Element ของ Modal ใหม่ไม่ครบ!");
    return;
  }
  console.log("setupRouteFinder: 2. ✅ Modal Logic v8.0 พร้อม!");

  startBtn.classList.add("placeholder-active");
  endBtn.classList.add("placeholder-active");

  function renderStopList(filter = "") {
    stopListDiv.innerHTML = "";
    const searchTerm = filter.toLowerCase().trim();
    let hasResults = false;

    Object.entries(allBusStops).forEach((entry) => {
      const stopId = entry[0];
      const stopName = entry[1];

      if (hiddenStops.includes(stopId)) {
        return;
      }

      if (stopName.toLocaleLowerCase().includes(searchTerm)) {
        const stopButton = document.createElement("button");
        stopButton.textContent = stopName;
        stopButton.dataset.stopId = stopId;
        stopButton.classList.add("stop-choice-btn");

        if (
          (isSelectingStart && stopId === currentStartPoint) ||
          (!isSelectingStart && stopId === currentEndPoint)
        ) {
          stopButton.classList.add("is-selected");
        }

        stopListDiv.appendChild(stopButton);
        hasResults = true;
      }
    });
    if (!hasResults && searchTerm !== "") {
      stopListDiv.innerHTML = '<div class="no-results">ไม่พบป้ายที่ค้นหา</div>';
    }
  }

  function showBlankState(isStart) {
    const typeText = isStart ? "จุดเริ่มต้น" : "จุดหมาย";

    stopListDiv.innerHTML = `
      <div class="stop-list-helper">
        <img src="assets/images/location.png" alt="Start" class="icon-start">
        <img src="assets/images/mark-end-1.png" alt="End" class="icon-end">
        <h1>โปรดพิมพ์</h1>
        <p>เพื่อค้นหา${typeText}ของคุณ</p>
      </div>
    `;
  }

  function openStopSelector(isStart) {
    isSelectingStart = isStart;
    searchInput.value = "";

    if (isStart) {
      modal.classList.add("theme-start");
      modal.classList.remove("theme-end");
      modalTitle.textContent = "เลือกจุดเริ่มต้น";
      searchInput.placeholder = "| ค้นหาจุดเริ่มต้น...";
    } else {
      modal.classList.add("theme-end");
      modal.classList.remove("theme-start");
      modalTitle.textContent = "เลือกจุดหมาย";
      searchInput.placeholder = "| ค้นหาจุดหมาย...";
    }

    if (startBtn.classList.contains("placeholder-active")) {
      modalStartText.textContent = "";
    } else {
      modalStartText.textContent = startBtn.textContent;
      modalStartText.style.color = "#D97706";
    }

    if (endBtn.classList.contains("placeholder-active")) {
      modalEndText.textContent = "";
    } else {
      modalEndText.textContent = endBtn.textContent;
      modalEndText.style.color = "#8F37CB";
    }

    renderStopList("");

    modal.classList.remove("modal-hidden");
    searchInput.focus();
  }

  // ---  เพิ่ม Event Listener สำหรับช่องค้นหา ---
  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.trim();

    if (searchTerm === "") {
      renderStopList("");
    } else {
      renderStopList(searchTerm);
    }
  });

  // ---  Event Listeners  ---
  startBtn.addEventListener("click", () => openStopSelector(true));
  endBtn.addEventListener("click", () => openStopSelector(false));

  // --- Event close ---
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.add("modal-hidden");
    }
  });

  stopListDiv.addEventListener("click", (e) => {
    const clickedButton = e.target.closest(".stop-choice-btn");

    if (clickedButton) {
      const stopId = clickedButton.dataset.stopId;
      const stopName = clickedButton.textContent.trim();
      if (isSelectingStart) {
        currentStartPoint = stopId;
        startBtn.textContent = stopName;
        startBtn.classList.remove("placeholder-active");
      } else {
        currentEndPoint = stopId;
        endBtn.textContent = stopName;
        endBtn.classList.remove("placeholder-active");
      }
      modal.classList.add("modal-hidden");
      if (currentStartPoint && currentEndPoint) {
        calculateAndShowRoutes();
      }
    }
  });

  // (ปุ่มสลับ)
  swapBtn.addEventListener("click", () => {
    [currentStartPoint, currentEndPoint] = [currentEndPoint, currentStartPoint];

    let tempStartText = startBtn.textContent;
    let tempEndText = endBtn.textContent;

    if (tempStartText === "เลือกจุดเริ่มต้น") tempStartText = "";
    if (tempEndText === "เลือกจุดหมาย") tempEndText = "";

    startBtn.textContent = tempEndText || "เลือกจุดเริ่มต้น";
    endBtn.textContent = tempStartText || "เลือกจุดหมาย";

    const startHasVal = tempEndText && tempEndText !== "";
    const endHasVal = tempStartText && tempStartText !== "";

    startBtn.classList.toggle("placeholder-active", !startHasVal);
    endBtn.classList.toggle("placeholder-active", !endHasVal);

    const icon = swapBtn.querySelector("img");
    if (icon) {
      const currentRotate = icon.style.transform;
      icon.style.transform =
        currentRotate === "rotate(180deg)" ? "rotate(0deg)" : "rotate(180deg)";
    }

    if (currentStartPoint && currentEndPoint) {
      console.log("สลับข้อมูลแล้ว... กำลังโหลดเส้นทางใหม่");
      calculateAndShowRoutes(currentStartPoint, currentEndPoint);
    }
  });
}

/* ==================================================
   ฟังก์ชันผู้ช่วย (สำหรับ calculateAndShowRoutes)
  ================================================== */

// [ผู้ช่วย 1] ฟังก์ชัน "สร้างแท็กสายรถ" (เช่น > สายประตูสาม >)
function buildLineTags(lines) {
  let html = "";
  lines.forEach((line, index) => {
    if (index > 0) {
      // ไอคอนต่อรถ
      html += ` 
                <span class="route-arrow">
                    <img src="assets/images/arrange-square.png" alt="ต่อรถ">
                </span> `;
    }
    let lineClass = "line-" + line.replace(/\s+/g, "-");
    html += `<span class="route-line ${lineClass}">${line}</span>`;
  });
  return html;
}

// [ผู้ช่วย 2] ฟังก์ชัน "สร้างแท็กป้ายรถ" (เช่น > คณะพยาบาล >)
function buildStopTags(stopIds) {
  let html = "";
  stopIds.forEach((stopId, index) => {
    if (index === 0) return;

    // (ค้นหา "ชื่อป้าย" จาก ID ใน allBusStops)
    const stopName = allBusStops[stopId] || "ไม่ทราบสถานี";
    html +=
      ' <span class="route-arrow"><img src="assets/images/arrow-circle-right.png" alt="arrow-right-icon"></span> ';

    // [Feature 4] ไอคอนหน้าสถานี
    html += `
            <span class="route-stop-name">
                <img src="assets/images/mark-end-1.png" alt="stop"> 
                ${stopName}
            </span>`;
  });
  return html;
}

/*
  ==================================================
    ฟังก์ชันคำนวณและแสดงผลเส้นทาง
  ==================================================
  */
function calculateAndShowRoutes() {
  const resultsPanel = document.getElementById("route-results-container");
  const resultsBody = document.getElementById("results-body");

  if (!resultsPanel || !resultsBody) {
    console.error(
      "calculateAndShowRoutes: ❌ หา '.results-container' หรือ 'results-body' ไม่เจอ!"
    );
    return;
  }
  resultsBody.innerHTML = "";

  if (!currentStartPoint || !currentEndPoint) {
    resultsPanel.classList.remove("results-visible");
    return;
  }

  const routes = routeDatabase[currentStartPoint]?.[currentEndPoint] || [];

  const startGroup = locationGroups[currentStartPoint] || currentStartPoint;
  const endGroup = locationGroups[currentEndPoint] || currentEndPoint;

  // [Case 1] เลือกป้ายซ้ำ / กลุ่มเดียวกัน
  if (startGroup === endGroup) {
    resultsBody.innerHTML = `
      <div class="route-result-item">
          <div class="alert-icons">
              <img src="assets/images/location.png" alt="User" class="icon-3d">
              
                <img src="assets/images/arrow-circle-right.png" alt="User" class="arrow-circle"> 
              

              <img src="assets/images/mark-end-1.png" alt="Pin" class="icon-3d">
          </div>
          <div class="alert-text">คุณอยู่ที่จุดหมายแล้ว</div>
      </div>
    `;

    // [Case 2] หาไม่เจอ (Array ว่าง)
  } else if (routes.length === 0) {
    resultsBody.innerHTML = '<div class="route-result-item">ไม่พบเส้นทาง</div>';

    // [Case 3] เจอเส้นทาง (วนลูปสร้าง HTML)
  } else {
    let allRoutesHTML = "";

    routes.sort(
      (a, b) => (b.isRecommended === true) - (a.isRecommended === true)
    );

    let hasPrintedRecHeader = false;
    let hasPrintedOtherHeader = false;

    routes.forEach((route, index) => {
      if (route.isRecommended && !hasPrintedRecHeader) {
        allRoutesHTML += '<div class="recommend-badge">เส้นทางแนะนำ</div>';
        hasPrintedRecHeader = true;
      }
      if (!route.isRecommended && !hasPrintedOtherHeader) {
        allRoutesHTML +=
          '<div class="other-routes-title">เส้นทางเลือกอื่น</div>';
        hasPrintedOtherHeader = true;
      }

      // --- A. สร้าง HTML แถวบน (Summary) ---
      const linesHtml = route.sections
        .map((section, index) => {
          const lineClass = "line-" + section.line.trim().replace(/\s+/g, "-");
          const transferIcon =
            index > 0
              ? `
                        <span class="route-arrow">
                            <img src="assets/images/arrange-square.png" alt="ต่อรถ">
                        </span>`
              : "";
          return `${transferIcon} <span class="route-line ${lineClass}">${section.line}</span>`;
        })
        .join("");

      const summaryHtml = `<div class="route-lines-wrapper">${linesHtml}</div>`;

      // --- B. สร้าง HTML แถวเดียว (Single Line) ---
      let totalStops = 0;
      let singleLineHtml = "";

      const lastSection = route.sections[route.sections.length - 1];
      const finalStopId = lastSection.stops[lastSection.stops.length - 1];

      route.sections.forEach((section) => {
        if (section.stops && section.stops.length > 0) {
          totalStops += section.stops.length - 1;
        }
      });

      // (1. เพิ่มไอคอน user + จำนวนสถานี)
      singleLineHtml += `
        <span><img src="assets/images/location.png" alt="location" class="route-item-icon"></span>
        <span class="stop-count">อีก ${totalStops} สถานี</span>
        <span class="route-arrow"><img src="assets/images/arrow-circle-right.png" alt=">"></span>
      `;

      // (2. วนลูป พื่อ "เพิ่ม" [Bus] [Line] [Stop])
      route.sections.forEach((section, sectionIndex) => {
        const cleanLineName = section.line.trim().replace(/\s+/g, "-");
        const lineClass = "line-" + cleanLineName;
        const isTransferRoute = route.sections.length > 1;

        const isHeadingToParking = section.stops.some((stopId) => {
          const name = allBusStops[stopId] || "";
          return name.includes("จุดจอด") || stopId.startsWith("park_");
        });

        const previousLine =
          sectionIndex > 0 ? route.sections[sectionIndex - 1].line : null;
        const isSameLine = previousLine && section.line === previousLine;
        const shouldShowBusInfo = isSameLine && isHeadingToParking;
        const shouldnotsameline = !isSameLine && !isHeadingToParking;

        if (sectionIndex === 0) {
          const extensionClass = isTransferRoute ? "no-extension" : "";
          singleLineHtml += `
                <img src="assets/images/bus-icon-${section.line}.png" alt="bus" class="route-item-icon">
                <span class="route-line ${lineClass} ${extensionClass}">${section.line}</span>
            `;
        } else {
          // 1) สายเดียวกัน + มีจุดจอด
          if (isSameLine && isHeadingToParking) {
            singleLineHtml += `
                    <span class="transfer-circle ${lineClass}">
                      <img src="assets/images/arrange-square.png">
                    </span>
                `;

            // 2) สายเดียว + ไม่มีจุดจอด
          } else if (isSameLine && !isHeadingToParking) {
            singleLineHtml += `
                    <span class="transfer-circle ${lineClass}">
                      <img src="assets/images/arrange-square.png">
                    </span>
                `;

            // 3) คนละสาย + ไม่มีจุดจอด
          } else if (!isSameLine && !isHeadingToParking) {
            singleLineHtml += `
                    <img src="assets/images/bus-icon-${section.line}.png" class="route-item-icon">
                    <span class="route-line-1 ${lineClass} connect-left">${section.line}</span>
                `;

            // 4) คนละสาย + มีจุดจอด
          } else if (!isSameLine && isHeadingToParking) {
            singleLineHtml += `
                    <img src="assets/images/bus-icon-${section.line}.png" class="route-item-icon">
                    <span class="route-line-1 ${lineClass} connect-left">${section.line}</span>
                `;
          }
        }

        // ============================================================
        //  รายชื่อป้าย (Stops)
        // ============================================================
        section.stops.forEach((stopId, stopIndex) => {
          if (stopIndex === 0) return;

          const stopName = allBusStops[stopId] || "ไม่ทราบสถานี";
          let iconHtml = "";
          let extraClass = "";

          // --- จัดการลูกศรคั่นป้าย ---
          let showArrow = true;

          if (stopIndex === 1) {
            // 1. ช่วงแรก (ถ้ามีต่อรถ): ซ่อนลูกศร
            if (sectionIndex === 0) showArrow = false;

            // 2. ต่อรถไปจุดจอด: แสดงลูกศรปกติ (เพราะต่อจากสี่เหลี่ยม)
            if (sectionIndex > 0 && isHeadingToParking) showArrow = false;

            // 3. ต่อรถไปทั่วไป: ซ่อนลูกศร (เพราะต่อจากชื่อสาย connect-left)
            if (sectionIndex > 0 && !isHeadingToParking) showArrow = false;
          }

          if (showArrow) {
            singleLineHtml +=
              ' <span class="arrow-right-icon"><img src="assets/images/arrow-circle-right.png" alt=">"></span> ';
          }

          const isSectionEnd = stopIndex === section.stops.length - 1;
          const isParking =
            stopName.includes("จุดจอด") || stopId.startsWith("park_");

          if (isParking) {
            iconHtml = `
                <img src="assets/images/park.png" alt="P" class="route-stop-icon">
                <span class="parking-text-icon"></span> 
            `;
            extraClass = "is-parking";
          } else if (stopId === finalStopId) {
            // [Case A: ป้าย "ปลายทาง"]
            iconHtml = `
                          <img src="assets/images/mark-end-1.png" alt="stop" class="route-stop-icon">
                          <img src="assets/images/line-hori.png" alt="divider" class="route-stop-icon-1">
                          <img src="assets/images/bus-stop-1.png" alt="bus-stop" class="route-stop-icon-2">
                      `;
            extraClass = `final-stop-highlight-${section.line.replace(
              /\s+/g,
              "-"
            )}`;
          } else if (isSectionEnd) {
            // [Case B: ป้าย "ต่อรถ"]
            iconHtml = `
                          <img src="assets/images/bus-stop-1.png" alt="bus-stop" class="route-stop-icon-2">
                      `;
          } else {
            // [Case C: ป้ายธรรมดา]
            iconHtml = `
                          <img src="assets/images/bus-stop-1.png" alt="bus-stop" class="route-stop-icon-2">
                      `;
          }

          const bgClass = isParking ? "" : `${lineClass}-light`;

          singleLineHtml += `
              <span class="route-stop-tag ${lineClass}-light ${bgClass} ${extraClass}">
                  ${iconHtml}
                  ${stopName}
              </span>`;
        });
      });

      // --- C. ประกอบร่าง ---
      const recommendedClass = route.isRecommended ? "recommended" : "";

      singleLineHtml += `
          <span class="route-divider"><img src="assets/images/line-hori.png" alt="divider"></span>
          <span class="route-time">ประมาณ ${route.time} นาที</span>
      `;

      allRoutesHTML += `
                  <div class="route-result-item ${recommendedClass}">

                        <div class="route-single-line-wrapper">
                            ${singleLineHtml} </div>
                  </div>`;
    });

    resultsBody.innerHTML = allRoutesHTML;
  }
  resultsPanel.classList.add("results-visible");
}

/*
==================================================
 3. ฟังก์ชันควบคุม "แผงสไลด์" (Bottom Sheet)
==================================================
*/
function setupBottomSheet() {
  const triggerButton = document.getElementById("open-route-panel-btn");
  const panel = document.getElementById("route-finder-container");
  const resultsPanel = document.getElementById("route-results-container");
  const overlay = document.getElementById("panel-overlay");
  const delb = document.getElementById("sidebar-spacer");

  if (!triggerButton || !panel || !resultsPanel || !delb || !overlay) {
    console.error("setupBottomSheet: ❌ ไม่พบบุ่มเปิดแผงหรือแผงเอง!");
    return;
  }
  console.log("setupBottomSheet: ✅ ควบคุม 2 แผง... พร้อม!");

  function openPanel() {
    panel.classList.add("open");
    overlay.classList.remove("panel-overlay-hidden");
    overlay.classList.add("panel-overlay-visible");
    triggerButton.style.display = "none";
    delb.style.display = "none";
  }

  function closePanel() {
    panel.classList.remove("open");
  }

  window.openResultsPanel = function () {
    resultsPanel.classList.add("results-visible");
  };

  function closeResultsPanel() {
    resultsPanel.classList.remove("results-visible");
  }

  function closeAllPanels() {
    closePanel();
    closeResultsPanel();

    setTimeout(() => {
      overlay.classList.add("panel-overlay-hidden");
      overlay.classList.remove("panel-overlay-visible");
      triggerButton.style.display = "block";
      delb.style.display = "block";
    }, 400);

    const startBtn = document.getElementById("start-point-btn");
    const endBtn = document.getElementById("end-point-btn");
    if (startBtn) {
      startBtn.textContent = "เลือกจุดเริ่มต้น";
      startBtn.classList.add("placeholder-active");
    }
    if (endBtn) {
      endBtn.textContent = "เลือกจุดหมาย";
      endBtn.classList.add("placeholder-active");
    }
    currentStartPoint = null;
    currentEndPoint = null;
  }

  triggerButton.addEventListener("click", openPanel);
  overlay.addEventListener("click", closeAllPanels);

  window.closePanel = closePanel;
}

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  setupMap();
  setupNavLinks();
  setupSidePanel();
  setupFilterButtons();
  setupFormTabs();
  setupFormInteractions();
  setupChoices();
  setupNumericInput();
  setupSubmitFeedback();
  setupEvaluationTypeSwitcher();
  setupEvaluationSubmit();
  setupNewsSlider();

  setupBottomSheet();
  setupRouteFinder();
});

// Navigation active link setup
function setupNavLinks() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const navLinks = document.querySelectorAll(".nav-menu a");

  navLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (href === currentPage || (currentPage === "" && href === "index.html")) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

// Side panel functionality
function setupSidePanel() {
  const menuButton = document.querySelector(".menu-btn");
  const notificationButton = document.querySelector(".notification-btn");
  const menuPanel = document.getElementById("menuPanel");
  const notificationPanel = document.getElementById("notificationPanel");
  const closeMenuBtn = document.getElementById("closeMenuPanelBtn");
  const closeNotificationBtn = document.getElementById(
    "closeNotificationPanelBtn"
  );
  const drawerOverlay = document.getElementById("drawerOverlay");
  const rightUiContainer = document.getElementById("rightUiContainer");

  const panelWidth = 100;
  const mapShift = panelWidth / 2;

  let isPanelOpen = false;

  function setActiveButton(activeButton) {
    if (menuButton) menuButton.classList.remove("active");
    if (notificationButton) notificationButton.classList.remove("active");
    if (activeButton) activeButton.classList.add("active");
  }

  function openPanel(panelToShow, buttonToActivate) {
    closeAllPanels(false);
    if (panelToShow) panelToShow.style.display = "block";
    if (drawerOverlay) drawerOverlay.classList.add("open");
    if (rightUiContainer) rightUiContainer.classList.add("open");
    setActiveButton(buttonToActivate);

    if (map && !isPanelOpen) {
      setTimeout(() => {
        map.panBy([-mapShift, 0], { animate: true, duration: 0.4 });
      }, 100);
    }
    isPanelOpen = true;
  }

  function closeAllPanels(keepButtonActive = false) {
    if (menuPanel) menuPanel.style.display = "none";
    if (notificationPanel) notificationPanel.style.display = "none";
    if (drawerOverlay) drawerOverlay.classList.remove("open");
    if (rightUiContainer) rightUiContainer.classList.remove("open");
    if (!keepButtonActive) {
      setActiveButton(null);
    }

    if (map && isPanelOpen) {
      setTimeout(() => {
        map.panBy([mapShift, 0], { animate: true, duration: 0.4 });
      }, 100);
    }
    isPanelOpen = false;
  }

  if (menuButton && menuPanel) {
    menuButton.addEventListener("click", () => {
      if (menuPanel.style.display === "block") {
        closeAllPanels();
      } else {
        openPanel(menuPanel, menuButton);
      }
    });
  }

  if (notificationButton && notificationPanel) {
    notificationButton.addEventListener("click", () => {
      if (notificationPanel.style.display === "block") {
        closeAllPanels();
      } else {
        openPanel(notificationPanel, notificationButton);
      }
    });
  }

  const actualCloseMenuBtn =
    document.getElementById("closePanelBtn") ||
    document.getElementById("closeMenuPanelBtn");
  if (actualCloseMenuBtn)
    actualCloseMenuBtn.addEventListener("click", () => closeAllPanels());
  if (closeNotificationBtn)
    closeNotificationBtn.addEventListener("click", () => closeAllPanels());
  if (drawerOverlay)
    drawerOverlay.addEventListener("click", () => closeAllPanels());

  closeAllPanels();
}

// Filter buttons setup
function setupFilterButtons() {
  const allButton = document.querySelector(".filter-btn.active-1");
  const greenButton = document.querySelector(".filter-btn.active-2");
  const blueButton = document.querySelector(".filter-btn.active-3");
  const redButton = document.querySelector(".filter-btn.active-4");

  const specificButtons = [greenButton, blueButton, redButton];

  if (!allButton || !greenButton || !blueButton || !redButton) {
    console.error("Filter buttons not found!");
    return;
  }

  function updateVisibleLayers() {
    if (!map) {
      console.warn("Map is not ready for layer updates.");
      return;
    }
    console.log("Updating visible KML layers...");

    const showAll = allButton.classList.contains("active");
    const showGreen = greenButton.classList.contains("active");
    const showBlue = blueButton.classList.contains("active");
    const showRed = redButton.classList.contains("active");

    // green
    if ((showAll || showGreen) && !map.hasLayer(kmlLayers.green)) {
      kmlLayers.green.addTo(map);
    } else if (!showAll && !showGreen && map.hasLayer(kmlLayers.green)) {
      kmlLayers.green.remove();
    }
    // red
    if ((showAll || showRed) && !map.hasLayer(kmlLayers.red)) {
      kmlLayers.red.addTo(map);
    } else if (!showAll && !showRed && map.hasLayer(kmlLayers.red)) {
      kmlLayers.red.remove();
    }
    // blue
    if ((showAll || showBlue) && !map.hasLayer(kmlLayers.blue)) {
      kmlLayers.blue.addTo(map);
    } else if (!showAll && !showBlue && map.hasLayer(kmlLayers.blue)) {
      kmlLayers.blue.remove();
    }
  }

  // --- 3. เพิ่ม Event Listeners (เหมือนเดิม แต่เพิ่ม .updateVisibleLayers()) ---

  allButton.addEventListener("click", () => {
    specificButtons.forEach((btn) => btn.classList.remove("active"));
    allButton.classList.add("active");

    updateVisibleLayers();
    updateBusLocations();
  });

  specificButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const currentlyActiveCount = document.querySelectorAll(
        ".filter-btn:not(.active-1).active"
      ).length;
      const isAlreadyActive = button.classList.contains("active");

      if (currentlyActiveCount >= 2 && !isAlreadyActive) return;

      allButton.classList.remove("active");
      button.classList.toggle("active");

      const isAnyActive = Array.from(specificButtons).some((btn) =>
        btn.classList.contains("active")
      );
      if (!isAnyActive) {
        allButton.classList.add("active");
      }

      updateVisibleLayers();
      updateBusLocations();
    });
  });

  allButton.classList.add("active");
}

// Form tabs setup
function setupFormTabs() {
  const tabs = document.querySelectorAll(".tab-link");
  const contents = document.querySelectorAll(".form-content");

  if (tabs.length === 0 || contents.length === 0) {
    console.warn("Tab elements or content elements not found.");
    return;
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      contents.forEach((c) => c.classList.remove("active"));

      tab.classList.add("active");

      const tabId = tab.dataset.tab;
      const contentElement = document.getElementById(tabId);

      if (contentElement) {
        contentElement.classList.add("active");
      } else {
        console.error(`Content element with ID "${tabId}" not found.`);
      }
    });
  });

  const isAnyTabActive = Array.from(tabs).some((t) =>
    t.classList.contains("active")
  );
  if (!isAnyTabActive && tabs.length > 0) {
    tabs[0].classList.add("active");
    const firstTabId = tabs[0].dataset.tab;
    const firstContent = document.getElementById(firstTabId);
    if (firstContent) firstContent.classList.add("active");
  }
}

// Form interactions setup
function setupFormInteractions() {
  const wrappers = document.querySelectorAll(".input-wrapper");

  wrappers.forEach((wrapper) => {
    const input = wrapper.querySelector('select, textarea, input[type="text"]');
    if (!input) return;

    function checkContent() {
      let hasContent = false;
      if (input.tagName === "TEXTAREA" || input.tagName === "INPUT") {
        hasContent = input.value.length > 0;
      } else if (input.tagName === "SELECT") {
        hasContent = input.value !== "";
      }

      if (hasContent) {
        wrapper.classList.add("has-content");
      } else {
        wrapper.classList.remove("has-content");
      }
    }

    checkContent();

    if (input.tagName === "TEXTAREA" || input.tagName === "INPUT") {
      input.addEventListener("input", checkContent);
    }
    if (input.tagName === "SELECT") {
      input.addEventListener("change", checkContent);
    }
  });
}

// Choices.js setup for select elements
function setupChoices() {
  const selectElement = document.getElementById("complaint-topic");
  if (selectElement) {
    const choices = new Choices(selectElement, {
      searchEnabled: false,
      itemSelectText: "เลือก",
      shouldSort: false,
    });
  }
}

// Numeric input setup
function setupNumericInput() {
  const busNumberInput = document.getElementById("bus-number");

  if (busNumberInput) {
    busNumberInput.addEventListener("input", (event) => {
      let value = event.target.value.replace(/[^0-9]/g, "");
      
      if (value !== "") {
        let num = parseInt(value);
        if (num > 30) value = "30"; 
        if (num === 0) value = "";   
      }
      
      event.target.value = value;
    });
  }
}

// Submit feedback setup
function setupSubmitFeedback() {
  const complaintForm = document.getElementById("complaint-form");

  if (complaintForm) {
    const submitButton = complaintForm.querySelector(".submit-btn");

    complaintForm.addEventListener("submit", function (event) {
      event.preventDefault();
      console.log("Form submitted (simulation)");
      submitButton.classList.add("success");
      submitButton.textContent = "ส่งข้อร้องเรียนแล้ว";
      submitButton.disabled = true;
    });
  }

  const evaluateForm = document.getElementById("evaluate-form");

  if (evaluateForm) {
    const submitButtonEval = evaluateForm.querySelector(".submit-btn");

    evaluateForm.addEventListener("submit", function (event) {
      event.preventDefault();
      console.log("Evaluation Form submitted (simulation)");
      submitButtonEval.classList.add("success");
      submitButtonEval.textContent = "ส่งแบบประเมินแล้ว";
      submitButtonEval.disabled = true;
    });
  }
}

// Evaluation type switcher setup
function setupEvaluationTypeSwitcher() {
  const typeButtons = document.querySelectorAll(".eval-type-btn");
  const formSections = document.querySelectorAll(".eval-form-section");

  if (typeButtons.length === 0 || formSections.length === 0) return;

  typeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      typeButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      const evalType = button.dataset.evalType;
      formSections.forEach((section) => section.classList.remove("active"));

      const targetSection = document.querySelector(
        `.eval-form-section[data-eval-form="${evalType}"]`
      );
      if (targetSection) targetSection.classList.add("active");
    });
  });
}

// Evaluation submit setup
function setupEvaluationSubmit() {
  const evaluateFormApp = document.getElementById("evaluate-form-app");
  const evaluateFormTravel = document.getElementById("evaluate-form-travel");

  if (evaluateFormApp) {
    const submitButtonApp = document.querySelector(
      '.submit-btn[form="evaluate-form-app"]'
    );

    submitButtonApp.addEventListener("click", function (event) {
      event.preventDefault();

      if (evaluateFormApp.checkValidity()) {
        console.log("App Evaluation Form submitted");
        submitButtonApp.classList.add("success");
        submitButtonApp.textContent = "ส่งแบบประเมินแล้ว";
        submitButtonApp.disabled = true;
      } else {
        evaluateFormApp.reportValidity();
      }
    });
  }

  if (evaluateFormTravel) {
    const submitButtonTravel = document.querySelector(
      '.submit-btn[form="evaluate-form-travel"]'
    );

    submitButtonTravel.addEventListener("click", function (event) {
      event.preventDefault();

      if (evaluateFormTravel.checkValidity()) {
        console.log("Travel Evaluation Form submitted");
        submitButtonTravel.classList.add("success");
        submitButtonTravel.textContent = "ส่งแบบประเมินแล้ว";
        submitButtonTravel.disabled = true;
      } else {
        evaluateFormTravel.reportValidity();
      }
    });
  }
}

/**
 * ฟังก์ชันสำหรับสร้าง KML layer (ผู้ช่วยของ setupMap)
 * @param {string} url - URL ของไฟล์ .kml
 * @param {object} styleOptions - { color: '...', weight: 5 }
 * @returns {L.Layer} - KML layer ที่สร้างขึ้น
 */

function createKmlLayer(url, styleOptions) {
  const layer = omnivore
    .kml(
      url,
      null,
      L.geoJson(null, {
        pointToLayer: function (feature, latlng) {
          let isParkStation = false;
          if (feature.properties && feature.properties.name) {
            const stationName = feature.properties.name.trim();
            if (
              stationName === "จุดจอดรถบัสหน้ามหาวิทยาลัย" ||
              stationName === "จุดจอดรถบัสPKY" ||
              stationName === "จุดจอดรถบัสประตูสาม"
            ) {
              isParkStation = true;
            }
          }

          const iconToUse = isParkStation ? parkIcon : stationIcon;
          const marker = L.marker(latlng, { icon: iconToUse });

          if (feature.properties && feature.properties.name) {
            marker.bindPopup(feature.properties.name);
          }
          return marker;
        },
      })
    )
    .on("ready", () => {
      console.log(`✅ KML data ${url} loaded!`);
      layer.eachLayer(function (l) {
        if (typeof l.setStyle === "function") {
          l.setStyle(styleOptions);
        }
      });
    })
    .on("error", (e) => {
      console.error(`❌ KML Load Error for ${url}:`, e);
      alert(`ไม่สามารถโหลดไฟล์เส้นทาง (${url}) ได้`);
    });

  return layer;
}

// Map setup with Leaflet
function setupMap() {
  map = L.map("map", {
    zoomControl: false,
  }).setView([19.0298679, 99.9036598], 15);

  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { attribution: "Tiles © Esri &mdash; Source: Esri, Maxar, Earthstar Geographics" }
  ).addTo(map);

  const coordDisplay = document.getElementById("debug-coord-display");
  if (coordDisplay) {
    function updateDebugCoords() {
      const center = map.getCenter();
      const lat = center.lat.toFixed(7); // (ทศนิยม 7 ตำแหน่ง)
      const lng = center.lng.toFixed(7);
      coordDisplay.innerHTML = `Lat: ${lat}<br>Lng: ${lng}`;
    }
    map.on("moveend", updateDebugCoords);
    updateDebugCoords();
  }

  console.log("Creating KML layers...");

  kmlLayers.green = createKmlLayer(kmlPaths.green, {
    color: "#27ae60",
    weight: 5,
  });
  kmlLayers.blue = createKmlLayer(kmlPaths.blue, {
    color: "#1177FC",
    weight: 5,
  });
  kmlLayers.red = createKmlLayer(kmlPaths.red, { color: "#FF3859", weight: 5 });

  kmlLayers.green.addTo(map);
  kmlLayers.blue.addTo(map);
  kmlLayers.red.addTo(map);
  console.log("Default KML layer (all) added to map.");

  // Start updating bus locations
  updateBusLocations();
  setInterval(updateBusLocations, 5000);
}

// Function to update bus locations from backend
async function updateBusLocations() {
  try {
    const showAll = document
      .querySelector(".filter-btn.active-1")
      ?.classList.contains("active");
    const showGreen = document
      .querySelector(".filter-btn.active-2")
      ?.classList.contains("active");
    const showBlue = document
      .querySelector(".filter-btn.active-3")
      ?.classList.contains("active");
    const showRed = document
      .querySelector(".filter-btn.active-4")
      ?.classList.contains("active");
    // const showYellow = document
    //   .querySelector(".filter-btn.active-5")
    //   ?.classList.contains("active");
    // const showWhite = document
    //   .querySelector(".filter-btn.active-6")
    //   ?.classList.contains("active");

    const res = await fetch(backendUrl);

    if (!res.ok) throw new Error("Network Error: " + res.status);
    const data = await res.json();

    busMarkers.forEach((m) => map.removeLayer(m));
    busMarkers = [];

    let busesShown = 0;

    data.forEach((bus) => {
      const lat = parseFloat(bus.latitude);
      const lng = parseFloat(bus.longitude);
      const imei = bus.imei_id;
      const date = formatDate(bus.date);

      const busColor = bus.color || "Purple";
      const driverName = bus.driver_name || bus.driver || "ไม่ระบุ";

      if (!isNaN(lat) && !isNaN(lng)) {
        const busNumberMatch = imei.match(/TC0*(\d+)/);
        const busNumber = busNumberMatch ? parseInt(busNumberMatch[1]) : null;

        if (busNumber === null) {
          console.warn(`Skipping bus with invalid IMEI format: ${imei}`);
          return;
        }

        let shouldShow = false;

        if (showAll) {
          shouldShow = true;
        } else {
          if (busColor === "Green" && showGreen) shouldShow = true;
          else if (busColor === "Red" && showRed) shouldShow = true;
          else if (busColor === "Blue" && showBlue) shouldShow = true;
          //  else if (busColor === "Yellow" && showYellow) shouldShow = true;
          //  else if (busColor === "White" && showWhite) shouldShow = true;
        }

        if (!shouldShow) {
          return;
        }

        const lineClass = `line-${busColor.toLowerCase()}`;

        const busDivIcon = L.divIcon({
          className: `bus-div-icon ${lineClass}`,
          html: `<span class="bus-number-badge">${busNumber}</span>`,
          iconSize: [56, 56],
          iconAnchor: [28, 56],
          popupAnchor: [0, -60],
        });

        const marker = L.marker([lat, lng], { icon: busDivIcon })
          .addTo(map)
          .bindPopup(
            `<table class="bus-popup-table">
               <tr>
                 <td class="bus-popup-icon">🚌</td>
                 <td class="bus-popup-header" colspan="2">${imei}</td>
               </tr>
               <tr>
                 <td class="bus-popup-icon">🎨</td>
                 <td class="bus-popup-label">สาย:</td>
                 <td class="bus-popup-value"><b>${busColor} Line</b></td>
               </tr>
               <tr>
                 <td class="bus-popup-icon">👤</td>
                 <td class="bus-popup-label">คนขับ:</td>
                 <td class="bus-popup-value">${driverName}</td>
               </tr>
               <tr>
                 <td class="bus-popup-icon">📍</td>
                 <td class="bus-popup-label">Lat:</td>
                 <td class="bus-popup-value">${
                   !isNaN(lat) ? lat.toFixed(6) : "N/A"
                 }</td>
               </tr>
               <tr>
                 <td class="bus-popup-icon">📍</td>
                 <td class="bus-popup-label">Lng:</td>
                 <td class="bus-popup-value">${
                   !isNaN(lng) ? lng.toFixed(6) : "N/A"
                 }</td>
               </tr>
               <tr>
                 <td class="bus-popup-icon">🕒</td>
                 <td class="bus-popup-value" colspan="2">${date || "N/A"}</td>
               </tr>
             </table>`
          );

        busMarkers.push(marker);
        busesShown++;
      }
    });

    console.log(`✅ Updated ${busMarkers.length} buses (that are not null)`);
  } catch (err) {
    console.error("❌ Error updating bus:", err);
  }
}

// ====== 🕒 FORMAT DATE ======
function formatDate(isoDate) {
  if (!isoDate) return "N/A";
  return new Date(isoDate).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// News slider setup
function setupNewsSlider() {
  const slides = document.querySelectorAll("#notificationPanel .news-slide");
  const dots = document.querySelectorAll("#notificationPanel .dot");
  let currentSlide = 0;
  let slideInterval;

  function showSlide(index) {
    slides.forEach((slide, i) => slide.classList.toggle("active", i === index));
    dots.forEach((dot, i) => dot.classList.toggle("active", i === index));
    currentSlide = index;
  }

  function nextSlide() {
    let nextIndex = (currentSlide + 1) % slides.length;
    showSlide(nextIndex);
  }

  function startSlider() {
    stopSlider();
    slideInterval = setInterval(nextSlide, 5000);
  }

  function stopSlider() {
    clearInterval(slideInterval);
  }

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const slideIndex = parseInt(dot.dataset.slide);
      showSlide(slideIndex);
      startSlider();
    });
  });

  if (slides.length > 0) {
    showSlide(0);
    startSlider();
  }

  const sliderContainer = document.querySelector(
    "#notificationPanel .news-slider-container"
  );
  if (sliderContainer) {
    sliderContainer.addEventListener("mouseenter", stopSlider);
    sliderContainer.addEventListener("mouseleave", startSlider);
  }
}

// ===========================================================
 // จัดการระบบร้องเรียน และ แบบประเมิน
// ===========================================================

document.addEventListener('DOMContentLoaded', function() {
    
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.form-content');

    if (tabLinks.length > 0) {
        tabLinks.forEach(link => {
            link.addEventListener('click', () => {
                tabLinks.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                link.classList.add('active');
                const tabId = link.getAttribute('data-tab');
                document.getElementById(tabId).classList.add('active');
            });
        });
    }

    const evalTypeBtns = document.querySelectorAll('.eval-type-btn');
    const evalForms = document.querySelectorAll('.eval-form-section');

    if (evalTypeBtns.length > 0) {
        evalTypeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                evalTypeBtns.forEach(b => b.classList.remove('active'));
                evalForms.forEach(f => f.classList.remove('active'));

                btn.classList.add('active');
                const type = btn.getAttribute('data-eval-type'); 
                const targetForm = document.querySelector(`.eval-form-section[data-eval-form="${type}"]`);
                if (targetForm) targetForm.classList.add('active');
            });
        });
    }
});

function previewImage(input) {
    const placeholder = document.getElementById('upload-placeholder');
    const preview = document.getElementById('image-preview');

    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
            placeholder.style.display = 'none'; 
        }
        reader.readAsDataURL(input.files[0]);
    } else {
        preview.src = '#';
        preview.style.display = 'none';
        placeholder.style.display = 'flex'; 
    }
}

function showAlert(button) {
    const formId = button.getAttribute('form');
    const form = document.getElementById(formId);
    
    if (!form) return; 

    const title = button.getAttribute('data-title') || 'ยืนยันการส่งข้อมูล?';
    const desc = button.getAttribute('data-desc') || '';

    if (!form.checkValidity()) {
        form.reportValidity(); 
        return;
    }

    Swal.fire({
        title: title,
        text: desc,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#8F37CB',
        cancelButtonColor: '#d33',
        confirmButtonText: 'ยืนยันส่งข้อมูล',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            submitData(formId, form);
        }
    });
}

function submitData(formId, form) {
    let url = '';
    let bodyData = null;
    let headers = {};

    Swal.fire({
        title: 'กำลังส่งข้อมูล...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    if (formId === 'complaint-form') {
        url = '/complaints';

        bodyData = new FormData(); 

        const topicVal = document.getElementById('complaint-topic').value;
        const busVal = document.getElementById('bus-number').value;
          if (!busVal || busVal < 1 || busVal > 30) {
              Swal.fire('ผิดพลาด', 'กรุณาระบุหมายเลขรถระหว่าง 1-30', 'error');
              return; 
          }
        const detailVal = document.getElementById('complaint-details').value;
        const fileInput = document.getElementById('file-upload'); 

        bodyData.append('topic', topicVal);
        bodyData.append('bus_number', busVal);
        bodyData.append('detail', detailVal);
        
        if (fileInput && fileInput.files[0]) {
            bodyData.append('image', fileInput.files[0]);
        }

    } else if (formId === 'evaluate-form-app') {
        url = '/evaluate/app';
        
        const formData = new FormData(form);
        const data = {
            service: formData.get('app_service'),
            status: formData.get('app_status'),
            efficiency: formData.get('app_efficiency')
        };
        bodyData = JSON.stringify(data);
        headers = { 'Content-Type': 'application/json' };

    } else if (formId === 'evaluate-form-travel') {
        url = '/evaluate/travel';
        
        const formData = new FormData(form);
        const data = {
            comfort: formData.get('travel_comfort'),
            time: formData.get('travel_time'),
            safety: formData.get('travel_safety')
        };
        bodyData = JSON.stringify(data);
        headers = { 'Content-Type': 'application/json' };
    }

    fetch(url, {
        method: 'POST',
        headers: headers,
        body: bodyData
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            Swal.fire({
                icon: 'success',
                title: 'สำเร็จ!',
                text: data.message,
                confirmButtonColor: '#8F37CB'
            });

            form.reset();

            if (formId === 'complaint-form') {
                const preview = document.getElementById('image-preview');
                const placeholder = document.getElementById('upload-placeholder');
                if(preview) {
                    preview.style.display = 'none';
                    preview.src = '#';
                }
                if(placeholder) {
                    placeholder.style.display = 'flex';
                }
            }
        } else {
            Swal.fire('เกิดข้อผิดพลาด', data.message || 'ส่งข้อมูลไม่สำเร็จ', 'error');
        }
    })
    .catch(err => {
        console.error(err);
        Swal.fire('Error', 'ไม่สามารถเชื่อมต่อ Server ได้ (เช็ค Port 5000)', 'error');
    });
}
