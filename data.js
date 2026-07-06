/* Bicycle QC — Test Fixture Finder
   Data model. All user-facing strings are {zh, en}.
   Real fixture renders live in uploads/. */
(function () {
  const IMG = {
    frameSchematic: "uploads/Bild.jpg",
    asmStep0: "uploads/ASM_STEP0.png",
    asmStep1: "uploads/ASM_STEP1.png",
    slideTable: "uploads/J748.1_ASM.png",
    rail: "uploads/RAIL_520mm.png",
    m8cs: "uploads/Countersunk_M8x20.png",
    m12: "uploads/M12X35.png",
    m14: "uploads/DIN4782_M14X35.png",
    tnut: "uploads/J581_NUT.png",
  };

  // ---- Fixture parts library (referenced by test items) ----
  const PARTS = {
    J748: { code: "J748.1", name: { zh: "X-Y 滑台治具總成", en: "X-Y Slide-Table Assembly" }, image: IMG.slideTable, kind: { zh: "治具總成", en: "Fixture assembly" }, stock: 6, loc: "A1-03" },
    RAIL: { code: "LGR-520", name: { zh: "線性滑軌 520 mm", en: "Linear Guide Rail 520 mm" }, image: IMG.rail, kind: { zh: "導引件", en: "Guide" }, stock: 4, loc: "A2-11" },
    M8CS: { code: "ISO10642 M8×20", name: { zh: "沉頭內六角螺絲 M8×20", en: "Countersunk Hex Screw M8×20" }, image: IMG.m8cs, kind: { zh: "緊固件", en: "Fastener" }, stock: 0, loc: "C4-07" },
    M12: { code: "DIN912 M12×35", name: { zh: "內六角圓柱頭螺絲 M12×35", en: "Socket Head Cap Screw M12×35" }, image: IMG.m12, kind: { zh: "緊固件", en: "Fastener" }, stock: 60, loc: "C4-02" },
    M14: { code: "DIN912 M14×35", name: { zh: "內六角圓柱頭螺絲 M14×35", en: "Socket Head Cap Screw M14×35" }, image: IMG.m14, kind: { zh: "緊固件", en: "Fastener" }, stock: 12, loc: "C4-05" },
    TNUT: { code: "J581", name: { zh: "T 型槽螺帽", en: "T-Slot Nut" }, image: IMG.tnut, kind: { zh: "緊固件", en: "Fastener" }, stock: 40, loc: "C5-01" },
  };

  function fx(key, qty, torque) {
    const p = PARTS[key];
    return { key, ...p, qty, torque: torque || null };
  }

  // ---- Test items ----
  const ITEMS = [
    {
      id: "B-04",
      code: "B-04",
      category: { zh: "車架", en: "Frame" },
      name: { zh: "車架疲勞測試 — 踏踩力", en: "Frame Fatigue — Pedalling Forces" },
      standard: "ISO 4210-6:2023",
      clause: "§4.4",
      status: "ready",
      featured: true,
      schematic: IMG.frameSchematic,
      summary: {
        zh: "於 BB 與後勾爪間施加對稱循環踏踩力，驗證車架在踩踏負載下之疲勞壽命。內含懸吊車架以 100% sag 量測。",
        en: "Apply symmetric cyclic pedalling forces between the BB and rear dropouts to verify frame fatigue life. Suspension frames tested at 100% sag.",
      },
      params: [
        { label: { zh: "施力", en: "Force" }, value: "1100", unit: "N" },
        { label: { zh: "循環次數", en: "Cycles" }, value: "100,000", unit: "" },
        { label: { zh: "頻率", en: "Frequency" }, value: "≤ 25", unit: "Hz" },
        { label: { zh: "判定", en: "Criteria" }, value: { zh: "無裂紋／鬆動", en: "No crack / loosening" }, unit: "" },
      ],
      fixtures: [fx("J748", 1, "—"), fx("RAIL", 2, "—"), fx("M14", 8, "120 N·m"), fx("M12", 6, "86 N·m"), fx("TNUT", 12, "—"), fx("M8CS", 16, "25 N·m")],
      steps: [
        { title: { zh: "安裝底座與線性滑軌", en: "Mount base & linear rails" }, desc: { zh: "將底板以 T 型槽螺帽與 M14 螺絲鎖固於試驗機平台，裝上兩支 520 mm 線性滑軌並校正平行度 ≤ 0.05 mm。", en: "Bolt the base plate to the test-bench T-slots with T-nuts and M14 screws, mount both 520 mm linear rails and align parallelism to ≤ 0.05 mm." }, image: IMG.asmStep0 },
        { title: { zh: "安裝 X-Y 滑台與轉接板", en: "Install X-Y slide table & adapter" }, desc: { zh: "將 X-Y 滑台總成置於滑軌上，以沉頭 M8 螺絲固定轉接板，確認滑台可順暢滑動且無背隙。", en: "Place the X-Y slide-table assembly on the rails, fix the adapter plate with countersunk M8 screws, and confirm smooth, backlash-free travel." }, image: IMG.asmStep1 },
        { title: { zh: "依示意圖夾持車架", en: "Clamp frame per schematic" }, desc: { zh: "依設定圖夾持點 B5/B6/B10/C3 固定車架，致動器接於 B7 位置；懸吊車架調至 100% sag。", en: "Clamp the frame at points B5/B6/B10/C3 per the setup drawing; connect the actuator at B7. Set suspension frames to 100% sag." }, image: IMG.frameSchematic },
      ],
    },
    {
      id: "B-03",
      code: "B-03",
      category: { zh: "車架", en: "Frame" },
      name: { zh: "車架疲勞測試 — 水平力", en: "Frame Fatigue — Horizontal Forces" },
      standard: "ISO 4210-6:2023",
      clause: "§4.3",
      status: "ready",
      schematic: IMG.frameSchematic,
      summary: {
        zh: "於前叉軸位置施加前後向對稱水平循環力，模擬騎乘衝擊負載下之車架耐久性。",
        en: "Apply fore-and-aft symmetric horizontal cyclic forces at the fork-axle position to simulate frame durability under riding impact loads.",
      },
      params: [
        { label: { zh: "施力", en: "Force" }, value: "±1200", unit: "N" },
        { label: { zh: "循環次數", en: "Cycles" }, value: "100,000", unit: "" },
        { label: { zh: "頻率", en: "Frequency" }, value: "≤ 25", unit: "Hz" },
      ],
      fixtures: [fx("J748", 1, "—"), fx("RAIL", 2, "—"), fx("M14", 8, "120 N·m"), fx("TNUT", 12, "—")],
      steps: [
        { title: { zh: "安裝底座與滑軌", en: "Mount base & rails" }, desc: { zh: "以 T 型螺帽與 M14 螺絲固定底板，裝上線性滑軌。", en: "Bolt base plate with T-nuts and M14 screws, mount linear rails." }, image: IMG.asmStep0 },
        { title: { zh: "夾持車架並接致動器", en: "Clamp frame & connect actuator" }, desc: { zh: "後勾爪固定於滑台，前叉假軸接水平致動器。", en: "Fix rear dropouts to the slide table; connect horizontal actuator to the fork dummy axle." }, image: IMG.frameSchematic },
      ],
    },
    {
      id: "C-05",
      code: "C-05",
      category: { zh: "前叉", en: "Fork" },
      name: { zh: "前叉彎曲疲勞測試", en: "Fork Bending Fatigue" },
      standard: "ISO 4210-6:2023",
      clause: "§5.3",
      status: "ready",
      schematic: IMG.frameSchematic,
      summary: {
        zh: "於前叉尖端施加循環彎曲力，驗證前叉於剎車與路面衝擊下之疲勞強度。",
        en: "Apply cyclic bending force at the fork tips to verify fatigue strength under braking and road impact.",
      },
      params: [
        { label: { zh: "施力", en: "Force" }, value: "620", unit: "N" },
        { label: { zh: "循環次數", en: "Cycles" }, value: "100,000", unit: "" },
      ],
      fixtures: [fx("J748", 1, "—"), fx("RAIL", 2, "—"), fx("M12", 6, "86 N·m"), fx("TNUT", 8, "—")],
      steps: [
        { title: { zh: "固定前叉柱管", en: "Clamp steerer tube" }, desc: { zh: "以模擬頭管夾具固定前叉柱管於滑台。", en: "Clamp the steerer tube in the simulated head-tube fixture on the slide table." }, image: IMG.asmStep1 },
        { title: { zh: "接彎曲致動器", en: "Connect bending actuator" }, desc: { zh: "於前叉尖端裝假軸並接致動器。", en: "Fit a dummy axle at the fork tips and connect the actuator." }, image: IMG.frameSchematic },
      ],
    },
    {
      id: "H-02",
      code: "H-02",
      category: { zh: "把手 / 豎管", en: "Handlebar / Stem" },
      name: { zh: "把手與豎管疲勞測試", en: "Handlebar & Stem Fatigue" },
      standard: "ISO 4210-5:2023",
      clause: "§4.6",
      status: "ready",
      schematic: IMG.frameSchematic,
      summary: {
        zh: "於把手兩端施加反相循環力，驗證把手與豎管組合之疲勞耐久性。",
        en: "Apply out-of-phase cyclic forces at the handlebar ends to verify fatigue durability of the bar-and-stem assembly.",
      },
      params: [
        { label: { zh: "施力", en: "Force" }, value: "270", unit: "N" },
        { label: { zh: "循環次數", en: "Cycles" }, value: "100,000", unit: "" },
      ],
      fixtures: [fx("RAIL", 1, "—"), fx("M12", 4, "86 N·m"), fx("TNUT", 6, "—"), fx("M8CS", 8, "25 N·m")],
      steps: [
        { title: { zh: "固定豎管於模擬柱管", en: "Mount stem on dummy steerer" }, desc: { zh: "將豎管夾於模擬柱管夾具並鎖至規定扭矩。", en: "Clamp the stem on the dummy-steerer fixture and torque to spec." }, image: IMG.asmStep0 },
        { title: { zh: "接雙端致動器", en: "Connect dual-end actuators" }, desc: { zh: "於把手兩端裝夾頭，接反相致動器。", en: "Fit grips at both bar ends and connect out-of-phase actuators." }, image: IMG.frameSchematic },
      ],
    },
    {
      id: "P-06",
      code: "P-06",
      category: { zh: "踏板 / 曲柄", en: "Pedal / Crank" },
      name: { zh: "踏板與曲柄疲勞測試", en: "Pedal & Crank Fatigue" },
      standard: "ISO 4210-8:2023",
      clause: "§4.2",
      status: "draft",
      schematic: IMG.frameSchematic,
      summary: {
        zh: "於踏板軸施加向下循環力，驗證曲柄組與踏板之疲勞強度。",
        en: "Apply downward cyclic force at the pedal spindle to verify fatigue strength of the crank set and pedals.",
      },
      params: [
        { label: { zh: "施力", en: "Force" }, value: "1800", unit: "N" },
        { label: { zh: "循環次數", en: "Cycles" }, value: "100,000", unit: "" },
      ],
      fixtures: [fx("J748", 1, "—"), fx("M14", 6, "120 N·m"), fx("TNUT", 8, "—")],
      steps: [
        { title: { zh: "固定 BB 軸於治具", en: "Fix BB axle in fixture" }, desc: { zh: "以模擬 BB 夾具固定中軸於滑台。", en: "Fix the bottom-bracket axle in the simulated-BB fixture on the slide table." }, image: IMG.asmStep1 },
      ],
    },
    {
      id: "S-03",
      code: "S-03",
      category: { zh: "座墊 / 座管", en: "Saddle / Seatpost" },
      name: { zh: "座墊與座管疲勞測試", en: "Saddle & Seatpost Fatigue" },
      standard: "ISO 4210-9:2023",
      clause: "§4.3",
      status: "ready",
      schematic: IMG.frameSchematic,
      summary: {
        zh: "於座墊後端施加向下循環力，驗證座墊與座管組合之疲勞耐久性。",
        en: "Apply downward cyclic force at the saddle rear to verify fatigue durability of the saddle-and-seatpost assembly.",
      },
      params: [
        { label: { zh: "施力", en: "Force" }, value: "1000", unit: "N" },
        { label: { zh: "循環次數", en: "Cycles" }, value: "200,000", unit: "" },
      ],
      fixtures: [fx("RAIL", 1, "—"), fx("M12", 4, "86 N·m"), fx("TNUT", 6, "—")],
      steps: [
        { title: { zh: "固定座管於模擬座管夾", en: "Clamp seatpost in fixture" }, desc: { zh: "將座管插入模擬座管夾具並鎖固。", en: "Insert the seatpost into the simulated seat-tube fixture and clamp." }, image: IMG.asmStep0 },
      ],
    },
    {
      id: "W-01",
      code: "W-01",
      category: { zh: "輪組", en: "Wheel" },
      name: { zh: "車輪夾持與靜態負載", en: "Wheel Clamping & Static Load" },
      standard: "ISO 4210-7:2023",
      clause: "§4.2",
      status: "ready",
      schematic: IMG.frameSchematic,
      summary: {
        zh: "夾持車輪並於輪緣施加靜態側向力，驗證輪組之側向剛性與夾持穩定性。",
        en: "Clamp the wheel and apply a static lateral force at the rim to verify lateral stiffness and clamping stability.",
      },
      params: [
        { label: { zh: "側向力", en: "Lateral force" }, value: "370", unit: "N" },
        { label: { zh: "保持時間", en: "Hold time" }, value: "60", unit: "s" },
      ],
      fixtures: [fx("J748", 1, "—"), fx("RAIL", 2, "—"), fx("M14", 8, "120 N·m"), fx("TNUT", 10, "—")],
      steps: [
        { title: { zh: "安裝輪軸夾具", en: "Mount axle fixture" }, desc: { zh: "將車輪以快拆軸固定於滑台輪軸夾具。", en: "Fix the wheel to the slide-table axle fixture via the quick-release." }, image: IMG.asmStep1 },
      ],
    },
    {
      id: "BR-01",
      code: "BR-01",
      category: { zh: "煞車", en: "Brake" },
      name: { zh: "煞車系統制動力測試", en: "Brake System Performance" },
      standard: "ISO 4210-4:2023",
      clause: "§4.4",
      status: "draft",
      schematic: IMG.frameSchematic,
      summary: {
        zh: "於煞車桿施加規定握力，量測前後輪制動力與制動距離。",
        en: "Apply a specified lever force and measure front/rear braking force and stopping distance.",
      },
      params: [
        { label: { zh: "握力", en: "Lever force" }, value: "180", unit: "N" },
        { label: { zh: "輪轉速", en: "Wheel speed" }, value: "25", unit: "km/h" },
      ],
      fixtures: [fx("RAIL", 2, "—"), fx("M12", 4, "86 N·m"), fx("TNUT", 6, "—")],
      steps: [
        { title: { zh: "安裝輪組於滾輪機", en: "Mount wheel on roller rig" }, desc: { zh: "將輪組安裝於滾輪機並接握力致動器。", en: "Mount the wheel on the roller rig and connect the lever-force actuator." }, image: IMG.asmStep0 },
      ],
    },
  ];

  window.DATA = { ITEMS, PARTS, IMG };
})();
