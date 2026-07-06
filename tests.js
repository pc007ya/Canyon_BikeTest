/* FRM205 Test Items — authored from "FO-QM-26-02 Testing Instructions Frame
   FRM205 V03" (Author M. Sudy, rev. 13.05.2026).
   Each item lists the required jigs (制具) with quantities + setup torques and a
   condensed installation sequence. Loaded after jigs.js, before store.js.
   Loads (force / cycles) follow the platform-specific Canyon Testing Conditions. */
(function () {
  const P = window.DATA.PARTS;
  function fx(key, qty, torque) {
    const p = P[key];
    if (!p) { console.warn("missing jig", key); return null; }
    return { key, code: p.code, name: p.name, image: p.image, kind: p.kind, qty, torque: torque || null };
  }
  const EQ = window.DATA.EQUIPMENT || {};
  function eqfx(key, qty) {
    const e = EQ[key];
    if (!e) { console.warn("missing equipment", key); return null; }
    return { key, code: e.code, name: e.name, image: e.image || "", kind: e.kind, qty: qty || 1 };
  }
  const IMGDIR = "uploads/FeedClaude/";
  const img = (folder, file) => IMGDIR + folder + "/" + file;

  const CAT = {
    gen: { zh: "通用程序", en: "General" },
    stiff: { zh: "剛性", en: "Stiffness" },
    fat: { zh: "疲勞", en: "Fatigue" },
    imp: { zh: "衝擊", en: "Impact" },
    str: { zh: "強度", en: "Strength" },
  };
  const PER_TC = { zh: "依測試條件", en: "Per Testing Conditions" };
  const STD = "FRM205 V03";

  const ITEMS = [
    /* ============ GENERAL ASSEMBLY PROCEDURES (0.1 – 0.6) ============ */
    {
      id: "frm-01", code: "FRM·01", category: CAT.gen,
      name: { zh: "避震器假件組裝 (通用)", en: "Shock Dummy Assembly (General)" },
      standard: STD, clause: "§0.1", status: "ready", featured: true,
      schematic: img("01_Shock_Dummy_Assembly", "page_11_img_1.png"),
      summary: {
        zh: "以避震器假件螺絲 D25 將避震器假件 A37 調整至所需 sag 長度，置入避震器襯套 D49 後鎖固至車架。為多數車架測試的共用前置程序。",
        en: "Set the Shock Dummy A37 to the required sag length with the shock dummy screws D25, insert the shock bushings D49, then bolt it to the frame. Shared pre-step for most frame tests.",
      },
      params: [
        { label: { zh: "0% sag 長度", en: "0% sag length" }, value: "190", unit: "mm (C1)" },
        { label: { zh: "30% sag 長度", en: "30% sag length" }, value: "180", unit: "mm (C2)" },
        { label: { zh: "100% sag 長度", en: "100% sag length" }, value: "150", unit: "mm (C3)" },
      ],
      fixtures: [fx("A37", 1, "B2.1 前 5 / B2.2 後 18 N·m")],
      steps: [
        { title: { zh: "設定 sag 長度", en: "Set sag length" }, desc: { zh: "以避震器假件螺絲 D25 將 A37 調至測試指定之 sag 長度 (0% / 30% / 100%)。", en: "Adjust A37 to the test-specified sag length (0% / 30% / 100%) using the shock dummy screws D25." }, image: img("01_Shock_Dummy_Assembly", "page_11_img_1.png") },
        { title: { zh: "置入避震器襯套 D49", en: "Insert shock bushings D49" }, desc: { zh: "於後避震器假件置入 2× 襯套 D49。", en: "Insert 2× bushings D49 into the rear shock dummy." }, image: img("01_Shock_Dummy_Assembly", "page_11_img_5.jpeg") },
        { title: { zh: "鎖固至車架", en: "Bolt to frame" }, desc: { zh: "將避震器假件組裝至車架，前側鎖 B2.1 = 5 N·m、後側 B2.2 = 18 N·m、調整螺絲 B38 = 20 N·m。", en: "Mount the shock dummy to the frame: front B2.1 = 5 N·m, rear B2.2 = 18 N·m, adjustment screws B38 = 20 N·m." }, image: img("01_Shock_Dummy_Assembly", "page_11_img_2.png") },
      ],
    },
    {
      id: "frm-02", code: "FRM·02", category: CAT.gen,
      name: { zh: "煞車座與輪轂組裝 (通用)", en: "Brake Mount & Hub Assembly (General)" },
      standard: STD, clause: "§0.2", status: "ready",
      schematic: img("02_Brake_Mount_Hub_Assembly", "page_12_img_1.jpeg"),
      summary: {
        zh: "將 Brake Mount Adaptor D39 置入後勾爪非傳動側，安裝後輪轂，並於鎖固後穿軸假件 A90 時將轉接器推貼至車架接觸面，確保定位。（Brakeload 設定不適用）",
        en: "Insert Brake Mount Adaptor D39 into the non-drive-side rear dropout, fit the rear hub, and push the adaptor against the frame contact face while tightening the Rear Thru Axle Dummy A90 to ensure position. (Not relevant for Brakeload setup.)",
      },
      params: [
        { label: { zh: "後穿軸扭矩", en: "Thru axle torque" }, value: "15", unit: "N·m (B5)" },
      ],
      fixtures: [fx("A90", 1, "15 N·m"), fx("A10", 1, "—")],
      steps: [
        { title: { zh: "置入煞車座轉接器 D39", en: "Insert brake mount adaptor D39" }, desc: { zh: "將 Brake Mount Adaptor D39 置入後勾爪非傳動側。", en: "Put Brake Mount Adaptor D39 into the rear dropout on the non-drive side." }, image: img("02_Brake_Mount_Hub_Assembly", "page_12_img_1.jpeg") },
        { title: { zh: "安裝輪轂並鎖固穿軸", en: "Fit hub & tighten thru axle" }, desc: { zh: "安裝後輪轂後鎖固 A90；鎖固同時將轉接器推貼至車架接觸面以確保定位。", en: "Fit the rear hub then tighten A90; while tightening, push the adaptor onto the frame contact face to ensure position." }, image: img("02_Brake_Mount_Hub_Assembly", "page_12_img_2.jpeg") },
      ],
    },
    {
      id: "frm-03", code: "FRM·03", category: CAT.gen,
      name: { zh: "Flip Chip 方向設定 (通用)", en: "Flip Chip Orientation (General)" },
      standard: STD, clause: "§0.3", status: "ready",
      schematic: img("03_Flip_Chip_Orientation", "page_13_img_1.jpeg"),
      summary: {
        zh: "依規定方向組裝主樞軸 Flip Chip。標準設定為 HIGH 位置；LOW 位置僅用於 size M 之 R&D 驗證樣品（依測試條件）。",
        en: "Assemble the main-pivot Flip Chip in the required orientation. HIGH is the standard setup; LOW is only for size-M R&D validation samples per Testing Conditions.",
      },
      params: [
        { label: { zh: "標準設定", en: "Standard" }, value: { zh: "HIGH 位置", en: "HIGH position" }, unit: "" },
        { label: { zh: "R&D 設定", en: "R&D only" }, value: { zh: "LOW (size M)", en: "LOW (size M)" }, unit: "" },
      ],
      fixtures: [],
      steps: [
        { title: { zh: "HIGH 位置（標準）", en: "HIGH position (standard)" }, desc: { zh: "將 Flip Chip 裝於 HIGH 位置作為標準量產測試設定。", en: "Mount the Flip Chip in the HIGH position as the standard production test setup." }, image: img("03_Flip_Chip_Orientation", "page_13_img_3.jpeg") },
        { title: { zh: "LOW 位置（僅 R&D）", en: "LOW position (R&D only)" }, desc: { zh: "LOW 位置允許主樞軸「低」設定，僅用於 size M 之指定 R&D 樣品。", en: "The LOW position enables the 'low' main-pivot setup — only for defined size-M R&D samples." }, image: img("03_Flip_Chip_Orientation", "page_13_img_7.jpeg") },
      ],
    },
    {
      id: "frm-04", code: "FRM·04", category: CAT.gen,
      name: { zh: "假叉勾爪固定 (通用)", en: "Dummy Fork Dropout Fixation (General)" },
      standard: STD, clause: "§0.4", status: "ready",
      schematic: img("04_Dummy_Fork_Dropout_Fixation", "page_14_img_1.png"),
      summary: {
        zh: "固定假叉 A1 勾爪時，自 A6 固定選項中擇一：手桿式 J311.1 或螺桿式 J554.1（B44 = 20 N·m）。",
        en: "To fix the Dummy Fork A1 dropout, choose one A6 option: hand-lever J311.1 or threaded J554.1 (B44 = 20 N·m).",
      },
      params: [
        { label: { zh: "J554 固定扭矩", en: "J554 fixation torque" }, value: "20", unit: "N·m (B44)" },
      ],
      fixtures: [fx("A6", 1, "J554: 20 N·m")],
      steps: [
        { title: { zh: "選項 A — J311.1 手桿式", en: "Option A — J311.1 hand lever" }, desc: { zh: "以快拆手桿式 J311.1 夾持假叉勾爪。", en: "Clamp the dummy-fork dropout with the quick hand-lever J311.1." }, image: img("04_Dummy_Fork_Dropout_Fixation", "page_14_img_1.png") },
        { title: { zh: "選項 B — J554.1 螺桿式", en: "Option B — J554.1 threaded" }, desc: { zh: "以螺桿式 J554.1 固定勾爪，鎖至 B44 = 20 N·m。", en: "Fix the dropout with the threaded J554.1, torque to B44 = 20 N·m." }, image: img("04_Dummy_Fork_Dropout_Fixation", "page_14_img_2.jpeg") },
      ],
    },
    {
      id: "frm-05", code: "FRM·05", category: CAT.gen,
      name: { zh: "32 吋踏踩疲勞機台設定 (通用)", en: "32-inch Pedalling Fatigue Machine Setup (General)" },
      standard: STD, clause: "§0.5", status: "ready",
      schematic: img("05_32inch_Pedalling_Fatigue_Setup", "page_15_img_1.jpeg"),
      summary: {
        zh: "將踏踩疲勞機台改為 32 吋設定：中心距 356 mm + 50 mm = 406 mm。使用 2× PED 側板後桿固定 A101 與 PED 桿延伸 A102（詳見「32 inch Adaptations on Canyon TMs」）。",
        en: "Convert the pedalling-fatigue rig to the 32-inch setup: centre-to-centre 356 mm + 50 mm = 406 mm. Use 2× PED side-plate rear-rod fixation A101 and PED rod extension A102 (see '32 inch Adaptations on Canyon TMs').",
      },
      params: [
        { label: { zh: "中心距", en: "Centre-to-centre" }, value: "406", unit: "mm" },
      ],
      fixtures: [fx("A101", 2, "—"), fx("A102", 2, "—")],
      steps: [
        { title: { zh: "加裝 32 吋側板與桿延伸", en: "Add 32\" side plates & rod extensions" }, desc: { zh: "於兩側裝上 A101 與 A102，將中心距調整至 406 mm。", en: "Fit A101 and A102 on both sides; set the centre-to-centre distance to 406 mm." }, image: img("05_32inch_Pedalling_Fatigue_Setup", "page_15_img_2.jpeg") },
        { title: { zh: "確認機台幾何", en: "Verify rig geometry" }, desc: { zh: "確認延伸桿與固定座定位無誤後再裝載車架。", en: "Confirm the extension rods and fixations are correctly positioned before mounting a frame." }, image: img("05_32inch_Pedalling_Fatigue_Setup", "page_15_img_3.jpeg") },
      ],
    },
    {
      id: "frm-06", code: "FRM·06", category: CAT.gen,
      name: { zh: "32 吋煞車負載疲勞機台設定 (通用)", en: "32-inch Brakeload Fatigue Machine Setup (General)" },
      standard: STD, clause: "§0.6", status: "ready",
      schematic: img("06_32inch_Brakeload_Fatigue_Setup", "page_16_img_2.jpeg"),
      summary: {
        zh: "將煞車負載疲勞機台改為 32 吋設定，使用 PED 側板後桿固定 A101（J782.1）。詳見「32 inch Adaptations on Canyon TMs」。",
        en: "Convert the brakeload-fatigue rig to the 32-inch setup using the PED side-plate rear-rod fixation A101 (J782.1). See '32 inch Adaptations on Canyon TMs'.",
      },
      params: [
        { label: { zh: "槓桿臂負載孔", en: "Lever-arm load hole" }, value: { zh: "32 吋孔位", en: "32\" hole" }, unit: "(C7)" },
      ],
      fixtures: [fx("A101", 2, "—")],
      steps: [
        { title: { zh: "加裝 32 吋固定座", en: "Add 32\" fixation" }, desc: { zh: "裝上 A101 (J782.1) 側板後桿固定，將機台改為 32 吋幾何。", en: "Fit the A101 (J782.1) side-plate rear-rod fixation to convert the rig to 32-inch geometry." }, image: img("06_32inch_Brakeload_Fatigue_Setup", "page_16_img_3.jpeg") },
      ],
    },

    /* ============ FLEX PIVOT BENDING ============ */
    {
      id: "frm-07", code: "FRM·07", category: CAT.fat,
      name: { zh: "柔性樞軸彎曲測試", en: "Flex Pivot Bending Test" },
      standard: STD, clause: "P.18", status: "ready", featured: true,
      schematic: img("07_Flex_Pivot_Bending_Test", "page_18_img_1.jpeg"),
      summary: {
        zh: "於萬用試驗機上，以柔性樞軸彎曲治具 A79 夾持鏈支與座撐，施加拉/壓彎曲負載驗證柔性樞軸耐久性。座撐須以水平儀校正水平。",
        en: "On a universal test machine, clamp the chain stay and seat stay in the Flex Pivot Bending jig A79 and apply pull/compression bending to verify flex-pivot durability. Align the seat stays horizontal with a water level.",
      },
      params: [
        { label: { zh: "試驗機", en: "Machine" }, value: { zh: "萬用試驗機", en: "Universal TM" }, unit: "" },
        { label: { zh: "施力方向", en: "Load direction" }, value: { zh: "拉 / 壓", en: "Pull / Comp." }, unit: "" },
        { label: { zh: "施力", en: "Load" }, value: PER_TC, unit: "" },
      ],
      fixtures: [fx("A88", 1, "15 N·m (B50)"), fx("A79", 1, "B45 = 2 / B50 = 15 N·m")],
      steps: [
        { title: { zh: "安裝線性軸承底座", en: "Mount base linear bearing" }, desc: { zh: "於試驗機平台安裝線性軸承底座 A88。", en: "Mount the Base Linear Bearing A88 on the machine table." }, image: img("07_Flex_Pivot_Bending_Test", "page_18_img_1.jpeg") },
        { title: { zh: "安裝彎曲治具 A79", en: "Mount bending jig A79" }, desc: { zh: "將柔性樞軸彎曲治具 A79 裝於平台與負載缸介面，所有固定螺絲鎖 B50 = 15 N·m。", en: "Fit the Flex Pivot Bending jig A79 on the table and load-cylinder interface; torque all fixing screws B50 = 15 N·m." }, image: img("07_Flex_Pivot_Bending_Test", "page_18_img_3.jpeg") },
        { title: { zh: "夾持鏈支", en: "Clamp chain stay" }, desc: { zh: "使用已組裝主樞軸 CS 軸承的後三角，將鏈支置於 CS 座並以 CS Bolt 固定。", en: "Use the rear triangle with assembled main-pivot CS bearings; mount the chain stay in the CS mount and secure with the CS Bolt." }, image: img("07_Flex_Pivot_Bending_Test", "page_18_img_4.jpeg") },
        { title: { zh: "校正並固定座撐", en: "Align & secure seat stay" }, desc: { zh: "以水平儀將座撐校正至水平，以 SS Bolt 固定；確認負載元零預載後開始測試。", en: "Align the seat stays horizontal with a water level, secure with the SS Bolt; ensure zero preload on the load cell, then start." }, image: img("07_Flex_Pivot_Bending_Test", "page_18_img_5.jpeg") },
      ],
    },

    /* ============ HT STIFFNESS ============ */
    {
      id: "frm-08", code: "FRM·08", category: CAT.stiff,
      name: { zh: "頭管剛性測試", en: "Head-Tube (HT) Stiffness" },
      standard: STD, clause: "P.19", status: "ready",
      schematic: img("08_HT_Stiffness", "page_19_img_1.jpeg"),
      summary: {
        zh: "於頭管以施力假件 A40 搭配上/下固定錐 A45/A46 施加由傳動側至非傳動側之負載，量測頭管剛性。懸吊車架或實叉以 0% sag 測試。",
        en: "Apply a drive-side to non-drive-side load at the head tube via the HT force-introduction dummy A40 with top/bottom fixing cones A45/A46, and measure HT stiffness. Suspension frames / real forks tested at 0% sag.",
      },
      params: [
        { label: { zh: "Sag 設定", en: "Sag" }, value: "0%", unit: "(C1)" },
        { label: { zh: "施力假件扭矩", en: "Force intro nut" }, value: "10", unit: "N·m (B9)" },
        { label: { zh: "施力", en: "Load" }, value: PER_TC, unit: "" },
      ],
      fixtures: [fx("A37", 1, "B2.1 5 / B2.2 18 N·m"), fx("A2", 1, "—"), fx("A90", 1, "15 N·m"), fx("A40", 1, "10 N·m"), fx("A45", 1, "—"), fx("A46", 1, "—"), fx("A7", 1, "—")],
      steps: [
        { title: { zh: "前置組裝", en: "Pre-assembly" }, desc: { zh: "依 FRM·03 組裝 Flip Chip、FRM·01 組裝避震器假件 A37，車架裝上 RD hanger D6。", en: "Assemble Flip Chip (FRM·03) and Shock Dummy A37 (FRM·01); fit RD hanger D6 to the frame." }, image: img("03_Flip_Chip_Orientation", "page_13_img_1.jpeg") },
        { title: { zh: "上機並固定後輪轂", en: "Mount on rig & rear hub" }, desc: { zh: "將 Zedler 後輪轂 A2 裝於試驗台，車架以後穿軸假件 A90 上機（依 FRM·02）。", en: "Mount Zedler Rear Hub A2 on the rig; install the frame with Rear Thru Axle Dummy A90 (per FRM·02)." }, image: img("08_HT_Stiffness", "page_19_img_1.jpeg") },
        { title: { zh: "裝施力假件與固定錐", en: "Fit force dummy & cones" }, desc: { zh: "以剛性扭力扳手 A7 於頭管裝上施力假件 A40 與上/下固定錐 A45/A46（B9 = 10 N·m）。", en: "Using the stiffness torque wrench A7, fit the force dummy A40 with top/bottom cones A45/A46 in the HT (B9 = 10 N·m)." }, image: img("08_HT_Stiffness", "page_19_img_1.jpeg") },
        { title: { zh: "感測器與預載歸零", en: "Sensors & preload" }, desc: { zh: "架設量測感測器並裝上砝碼，預載一次後歸零，再開始第一段測試。", en: "Position the measuring sensors and weight, preload once and zero, then start the first sequence." }, image: img("08_HT_Stiffness", "page_19_img_1.jpeg") },
      ],
    },

    /* ============ BB STIFFNESS ============ */
    {
      id: "frm-09", code: "FRM·09", category: CAT.stiff,
      name: { zh: "BB 剛性測試", en: "Bottom-Bracket (BB) Stiffness" },
      standard: STD, clause: "P.20", status: "ready",
      schematic: img("09_BB_Stiffness", "page_20_img_1.jpeg"),
      summary: {
        zh: "以曲柄/鏈條假件 A5 於 BB 施加 45° 負載量測 BB 剛性。組裝假叉 A1（含上/下 HT 軸承假件）、Zedler 前後輪轂、BB 軸承 A4 後上機並校正水平。",
        en: "Apply a 45° load at the BB via the crank/chain dummy A5 to measure BB stiffness. Assemble the dummy fork A1 (with upper/lower HT bearing dummies), Zedler front/rear hubs and BB bearing A4, then mount and level.",
      },
      params: [
        { label: { zh: "施力角度", en: "Load angle" }, value: "45", unit: "°" },
        { label: { zh: "前叉長度", en: "Fork length" }, value: "571", unit: "mm (C4)" },
        { label: { zh: "Sag 設定", en: "Sag" }, value: "0%", unit: "" },
      ],
      fixtures: [fx("A37", 1, "B2.1 5 / B2.2 18 N·m"), fx("A1", 1, "B7 = 12 N·m"), fx("A8", 1, "—"), fx("A9", 1, "—"), fx("A3", 1, "—"), fx("A2", 1, "—"), fx("A4", 1, "—"), fx("A90", 1, "15 N·m"), fx("A6", 1, "B11 = 10 N·m"), fx("A5", 1, "—"), fx("A7", 1, "—")],
      steps: [
        { title: { zh: "前置組裝", en: "Pre-assembly" }, desc: { zh: "依 FRM·03/01 組裝 Flip Chip 與避震器假件 A37，裝 RD hanger D6。", en: "Assemble Flip Chip and Shock Dummy A37 (FRM·03/01); fit RD hanger D6." }, image: img("03_Flip_Chip_Orientation", "page_13_img_1.jpeg") },
        { title: { zh: "組裝假叉與軸承", en: "Assemble dummy fork & bearings" }, desc: { zh: "假叉 A1 配上/下 HT 軸承假件 A8/A9，鎖頭碗螺帽至 B7 = 12 N·m 並調至 0% sag 叉長 C4。", en: "Fit dummy fork A1 with upper/lower HT bearing dummies A8/A9; torque head-set nut B7 = 12 N·m and set to 0% sag fork length C4." }, image: img("09_BB_Stiffness", "page_20_img_1.jpeg") },
        { title: { zh: "輪轂與 BB 軸承上機", en: "Hubs & BB bearing on rig" }, desc: { zh: "裝 Zedler 前輪轂 A3、後輪轂 A2 與 BB 軸承 A4，以 A90 與前軸假件 A6 上機（依 FRM·02）。", en: "Mount Zedler front hub A3, rear hub A2 and BB bearing A4; install with A90 and front axle dummy A6 (per FRM·02)." }, image: img("09_BB_Stiffness", "page_20_img_1.jpeg") },
        { title: { zh: "裝曲柄假件並校正", en: "Fit crank dummy & align" }, desc: { zh: "裝曲柄/鏈條假件 A5，以正確夾持螺帽調至水平；預載歸零後開始測試。", en: "Mount crank/chain dummy A5, use the correct clamping nut to level it; preload, zero, then start." }, image: img("09_BB_Stiffness", "page_20_img_1.jpeg") },
      ],
    },

    /* ============ STATIC CLAMP TEST ============ */
    {
      id: "frm-10", code: "FRM·10", category: CAT.str,
      name: { zh: "靜態夾持測試 (Canyon Inhouse)", en: "Static Clamp Test (Canyon Inhouse)" },
      standard: STD, clause: "P.23", status: "ready",
      schematic: img("10_Static_Clamp_Test", "page_23_img_1.jpeg"),
      summary: {
        zh: "使用 HT 剛性試驗台，於實座管裝上靜態夾持假件 A48（槓桿臂 150 mm），座墊假件調至與座管軸 90°，施加靜態負載驗證夾持強度。",
        en: "Using the HT-stiffness rig, fit the Static Clamp Test Dummy A48 (150 mm lever arm) on a real seatpost; set the saddle dummy to 90° to the seatpost axis and apply a static load to verify clamp strength.",
      },
      params: [
        { label: { zh: "槓桿臂長度", en: "Lever arm" }, value: "150", unit: "mm (C19)" },
        { label: { zh: "座墊角度", en: "Saddle angle" }, value: "90", unit: "°" },
        { label: { zh: "插入深度", en: "Insertion depth" }, value: "80", unit: "mm (C9)" },
      ],
      fixtures: [fx("A37", 1, "B2.1 5 / B2.2 18 N·m"), fx("A2", 1, "—"), fx("A90", 1, "15 N·m"), fx("A48", 1, "B41 = 5 N·m")],
      steps: [
        { title: { zh: "前置組裝與上機", en: "Pre-assembly & mounting" }, desc: { zh: "依 FRM·03/01 組裝 Flip Chip 與 A37，使用 HT 剛性試驗台，後輪轂 A2 + 後穿軸 A90 上機（依 FRM·02）。", en: "Assemble Flip Chip and A37 (FRM·03/01); use the HT-stiffness rig, mount rear hub A2 + thru axle A90 (per FRM·02)." }, image: img("10_Static_Clamp_Test", "page_23_img_1.jpeg") },
        { title: { zh: "裝靜態夾持假件", en: "Fit static clamp dummy" }, desc: { zh: "調整 A48 槓桿臂長度 (150 mm)，將實座管 D9 + A48 以座管夾 D8 於插入深度 C9 = 80 mm 鎖固，使用組裝膏 C14。", en: "Set the A48 lever arm (150 mm); fit the real seatpost D9 + A48 with seat clamp D8 at insertion depth C9 = 80 mm, using assembly paste C14." }, image: img("10_Static_Clamp_Test", "page_23_img_2.jpeg") },
        { title: { zh: "校正角度並施力", en: "Set angle & load" }, desc: { zh: "座墊假件調至與座管軸 90°（B41 = 5 N·m），最終檢查後施加靜態負載。", en: "Set the saddle dummy 90° to the seatpost axis (B41 = 5 N·m); after final check, apply the static load." }, image: img("10_Static_Clamp_Test", "page_23_img_3.png") },
      ],
    },

    /* ============ BB PRESSING STRENGTH ============ */
    {
      id: "frm-11", code: "FRM·11", category: CAT.str,
      name: { zh: "BB 壓入強度測試", en: "BB Pressing Strength" },
      standard: STD, clause: "P.31", status: "ready",
      schematic: img("11_BB_Pressing_Strength", "page_31_img_1.jpeg"),
      summary: {
        zh: "於 BB 壓入工具 A28 之 M12 螺紋與頭部上潤滑脂，裝入車架 BB，以校正扭力扳手鎖至規定扭矩（可由 SQE/實驗室依專案調整）。",
        en: "Grease the thread and head of the BB Pressing Tool A28 M12 screw, assemble it inside the frame BB, and tighten with a calibrated torque wrench to the required torque (adjustable per project by SQE/lab).",
      },
      params: [
        { label: { zh: "潤滑", en: "Lubrication" }, value: { zh: "螺紋上脂 C13", en: "Grease thread C13" }, unit: "" },
        { label: { zh: "鎖固扭矩", en: "Torque" }, value: PER_TC, unit: "" },
      ],
      fixtures: [fx("A28", 1, "依專案 / Per project")],
      steps: [
        { title: { zh: "上脂", en: "Grease" }, desc: { zh: "於 BB 壓入工具 A28 之 M12 螺紋與頭部塗布潤滑脂 C13。", en: "Apply grease C13 to the M12 thread and head of the BB Pressing Tool A28." }, image: img("11_BB_Pressing_Strength", "page_31_img_2.jpeg") },
        { title: { zh: "裝入車架 BB", en: "Assemble in frame BB" }, desc: { zh: "將 BB 壓入工具裝入車架 BB 內。", en: "Assemble the BB Pressing Tool inside the frame BB." }, image: img("11_BB_Pressing_Strength", "page_31_img_4.jpeg") },
        { title: { zh: "鎖至規定扭矩", en: "Tighten to torque" }, desc: { zh: "以校正扭力扳手鎖固至規定扭矩（可依專案調整）。", en: "Tighten with a calibrated torque wrench to the required torque (project-adjustable)." }, image: img("11_BB_Pressing_Strength", "page_31_img_1.jpeg") },
      ],
    },

    /* ============ PEDALING STATIC ONE-SIDED ============ */
    {
      id: "frm-12", code: "FRM·12", category: CAT.fat,
      name: { zh: "單側靜態踏踩測試", en: "Pedalling Static — One-Sided" },
      standard: STD, clause: "P.32", status: "ready",
      schematic: img("12_Pedaling_Static_One_Sided", "page_32_img_1.jpeg"),
      summary: {
        zh: "32 吋設定下，以踏踩疲勞施力治具 A19（含 BB 墊片 A18、缸延伸 A74）對單側施加靜態踏踩力。後勾爪自由水平，後勾爪固定 A76 不裝。",
        en: "In the 32-inch setup, apply a one-sided static pedalling force via the pedalling-fatigue force jig A19 (with BB spacers A18 and cylinder extensions A74). Rear dropout free/horizontal; rear-dropout fixation A76 NOT fitted.",
      },
      params: [
        { label: { zh: "機台設定", en: "Setup" }, value: "32\"", unit: "(406 mm)" },
        { label: { zh: "Sag 設定", en: "Sag" }, value: "0%", unit: "" },
        { label: { zh: "施力", en: "Load" }, value: PER_TC, unit: "" },
      ],
      fixtures: [fx("A101", 2, "—"), fx("A102", 2, "—"), fx("A37", 1, "B2 5/18 N·m"), fx("A1", 1, "B7 = 12 N·m"), fx("A8", 1, "—"), fx("A9", 1, "—"), fx("A11", 1, "—"), fx("A10", 1, "—"), fx("A90", 1, "15 N·m"), fx("A6", 1, "B11 = 10 N·m"), fx("A17", 1, "—"), fx("A19", 1, "B10 = 6 N·m"), fx("A18", 2, "—"), fx("A74", 2, "—"), fx("A77", 1, "—")],
      steps: [
        { title: { zh: "32 吋機台與前置組裝", en: "32\" rig & pre-assembly" }, desc: { zh: "依 FRM·05 設定 32 吋機台；依 FRM·03/01 組裝 Flip Chip 與 A37，裝 RD hanger D6。", en: "Set up the 32\" rig (FRM·05); assemble Flip Chip and A37 (FRM·03/01); fit RD hanger D6." }, image: img("05_32inch_Pedalling_Fatigue_Setup", "page_15_img_1.jpeg") },
        { title: { zh: "假叉、輪轂與上機", en: "Dummy fork, hubs & mount" }, desc: { zh: "裝假叉 A1（A8/A9，B7 = 12 N·m），裝前輪轂 A11、後輪轂 A10，以 A90 + 前軸假件 A6 上機（依 FRM·02）。", en: "Fit dummy fork A1 (A8/A9, B7 = 12 N·m); mount front hub A11, rear hub A10; install with A90 + front axle dummy A6 (per FRM·02)." }, image: img("12_Pedaling_Static_One_Sided", "page_33_img_2.png") },
        { title: { zh: "BB 軸承與施力治具", en: "BB bearing & force jig" }, desc: { zh: "裝 BB 軸承疲勞 A17，組裝施力治具 A19 + BB 墊片 A18，左右缸各裝缸延伸 A74。", en: "Fit BB bearing fatigue A17; assemble force jig A19 + BB spacers A18; fit cylinder extension A74 on left and right cylinders." }, image: img("12_Pedaling_Static_One_Sided", "page_32_img_2.png") },
        { title: { zh: "水平校正與致動器", en: "Level & actuators" }, desc: { zh: "將車架與施力治具調水平，接致動器（B10 = 6 N·m）。後勾爪固定 A76 不裝、假叉勾爪以 50 N·m 固定。", en: "Level the frame and force jig, connect actuators (B10 = 6 N·m). A76 NOT fitted; dummy-fork dropout fixed at 50 N·m." }, image: img("12_Pedaling_Static_One_Sided", "page_33_img_3.png") },
      ],
    },

    /* ============ CHAIN STAY FATIGUE ============ */
    {
      id: "frm-13", code: "FRM·13", category: CAT.fat,
      name: { zh: "鏈支疲勞測試", en: "Chain Stay Fatigue" },
      standard: STD, clause: "P.34", status: "ready",
      schematic: img("13_Chain_Stay_Fatigue", "page_34_img_1.jpeg"),
      summary: {
        zh: "32 吋設定下，加裝萬向接頭前叉勾爪 A75 並以後勾爪固定 A76（B37 = 40 N·m）鎖死後勾爪，再以施力治具 A19 + 缸延伸 A74 施加踏踩疲勞力驗證鏈支耐久。",
        en: "In the 32-inch setup, add the universal-joint fork dropout A75 and lock the rear dropout with fixation A76 (B37 = 40 N·m), then apply pedalling fatigue via force jig A19 + cylinder extensions A74 to verify chain-stay durability.",
      },
      params: [
        { label: { zh: "機台設定", en: "Setup" }, value: "32\"", unit: "(406 mm)" },
        { label: { zh: "後勾爪固定", en: "Rear DO fixation" }, value: "40", unit: "N·m (B37)" },
        { label: { zh: "施力", en: "Load" }, value: PER_TC, unit: "" },
      ],
      fixtures: [fx("A101", 2, "—"), fx("A102", 2, "—"), fx("A37", 1, "B2 5/18 N·m"), fx("A1", 1, "B7 = 12 N·m"), fx("A8", 1, "—"), fx("A9", 1, "—"), fx("A75", 1, "—"), fx("A11", 1, "—"), fx("A10", 1, "—"), fx("A76", 1, "40 N·m"), fx("A90", 1, "15 N·m"), fx("A6", 1, "B11 = 10 N·m"), fx("A17", 1, "—"), fx("A19", 1, "B10 = 6 N·m"), fx("A18", 2, "—"), fx("A74", 2, "—")],
      steps: [
        { title: { zh: "32 吋機台與前置組裝", en: "32\" rig & pre-assembly" }, desc: { zh: "依 FRM·05 設定機台，組裝 Flip Chip、A37、假叉 A1（A8/A9）。", en: "Set up the 32\" rig (FRM·05); assemble Flip Chip, A37, dummy fork A1 (A8/A9)." }, image: img("13_Chain_Stay_Fatigue", "page_34_img_1.jpeg") },
        { title: { zh: "萬向接頭與後勾爪固定", en: "Universal joint & rear DO fixation" }, desc: { zh: "於試驗台裝萬向接頭前叉勾爪 A75；裝前/後輪轂 A11/A10，以後勾爪固定 A76 鎖死後勾爪（B37 = 40 N·m）。", en: "Mount universal-joint fork dropout A75; fit front/rear hubs A11/A10; lock the rear dropout with A76 (B37 = 40 N·m)." }, image: img("13_Chain_Stay_Fatigue", "page_35_img_4.png") },
        { title: { zh: "BB 軸承與施力治具", en: "BB bearing & force jig" }, desc: { zh: "車架以 A90 + 前軸假件 A6 上機；裝 BB 軸承 A17、施力治具 A19 + 墊片 A18，左右缸裝延伸 A74。", en: "Install frame with A90 + front axle dummy A6; fit BB bearing A17, force jig A19 + spacers A18, cylinder extensions A74." }, image: img("13_Chain_Stay_Fatigue", "page_35_img_1.jpeg") },
        { title: { zh: "水平校正並開始", en: "Level & start" }, desc: { zh: "假踏板保持水平，調整車架與施力治具水平後接致動器，選擇正確測試按鈕開始。", en: "Keep the dummy pedal horizontal; level frame and jig, connect actuators, select the correct test button and start." }, image: img("13_Chain_Stay_Fatigue", "page_34_img_2.jpeg") },
      ],
    },

    /* ============ PEDALING FATIGUE ISO LOAD ============ */
    {
      id: "frm-14", code: "FRM·14", category: CAT.fat,
      name: { zh: "踏踩疲勞測試 (ISO 負載)", en: "Pedalling Fatigue — ISO Load" },
      standard: STD, clause: "P.36", status: "ready",
      schematic: img("14_Pedaling_Fatigue_ISO_Load", "page_36_img_1.jpeg"),
      summary: {
        zh: "32 吋設定下，以踏踩疲勞施力治具 A19（45° 負載）施加 ISO 規定之循環踏踩力。常規 PED 缸設定不用延伸，後勾爪固定 A76 不裝。",
        en: "In the 32-inch setup, apply ISO cyclic pedalling forces (45° load) via the pedalling-fatigue force jig A19. Regular PED cylinder setup without extensions; rear-dropout fixation A76 NOT fitted.",
      },
      params: [
        { label: { zh: "機台設定", en: "Setup" }, value: "32\"", unit: "(406 mm)" },
        { label: { zh: "施力角度", en: "Load angle" }, value: "45", unit: "°" },
        { label: { zh: "Sag 設定", en: "Sag" }, value: "0%", unit: "" },
      ],
      fixtures: [fx("A101", 2, "—"), fx("A102", 2, "—"), fx("A37", 1, "B2 5/18 N·m"), fx("A1", 1, "B7 = 12 N·m"), fx("A8", 1, "—"), fx("A9", 1, "—"), fx("A11", 1, "—"), fx("A10", 1, "—"), fx("A90", 1, "15 N·m"), fx("A6", 1, "B11 = 10 N·m"), fx("A17", 1, "—"), fx("A19", 1, "B10 = 6 N·m"), fx("A18", 2, "—"), fx("A77", 1, "—")],
      steps: [
        { title: { zh: "32 吋機台與前置組裝", en: "32\" rig & pre-assembly" }, desc: { zh: "依 FRM·05 設定機台，組裝 Flip Chip、A37、假叉 A1（A8/A9）並上前/後輪轂 A11/A10。", en: "Set up the 32\" rig (FRM·05); assemble Flip Chip, A37, dummy fork A1 (A8/A9), front/rear hubs A11/A10." }, image: img("14_Pedaling_Fatigue_ISO_Load", "page_36_img_1.jpeg") },
        { title: { zh: "上機與 BB 軸承", en: "Mount & BB bearing" }, desc: { zh: "以 A90 + 前軸假件 A6 上機（依 FRM·02），裝 BB 軸承疲勞 A17。", en: "Install with A90 + front axle dummy A6 (per FRM·02); fit BB bearing fatigue A17." }, image: img("14_Pedaling_Fatigue_ISO_Load", "page_37_img_2.png") },
        { title: { zh: "施力治具與致動器", en: "Force jig & actuators" }, desc: { zh: "組裝施力治具 A19 + 墊片 A18（常規缸設定，無延伸），調水平後接致動器（B10 = 6 N·m）。", en: "Assemble force jig A19 + spacers A18 (regular cylinders, no extension); level then connect actuators (B10 = 6 N·m)." }, image: img("14_Pedaling_Fatigue_ISO_Load", "page_37_img_1.png") },
      ],
    },

    /* ============ JUMP LOAD ============ */
    {
      id: "frm-15", code: "FRM·15", category: CAT.fat,
      name: { zh: "跳躍負載測試", en: "Jump Load" },
      standard: STD, clause: "P.38", status: "ready",
      schematic: img("15_Jump_Load", "page_38_img_1.jpeg"),
      summary: {
        zh: "32 吋設定下，將施力治具 A19 之支腳調為垂直並以跳躍負載治具 A20 固定於缸上，於 100% sag 施加跳躍負載。",
        en: "In the 32-inch setup, set the force-jig A19 legs vertical and fix them to the cylinders with the Jump Load jig A20; apply the jump load at 100% sag.",
      },
      params: [
        { label: { zh: "機台設定", en: "Setup" }, value: "32\"", unit: "(406 mm)" },
        { label: { zh: "Sag 設定", en: "Sag" }, value: "100%", unit: "(C3/C6)" },
        { label: { zh: "施力", en: "Load" }, value: PER_TC, unit: "" },
      ],
      fixtures: [fx("A101", 2, "—"), fx("A102", 2, "—"), fx("A37", 1, "B2 5/18 N·m"), fx("A1", 1, "B7 = 12 N·m"), fx("A8", 1, "—"), fx("A9", 1, "—"), fx("A11", 1, "—"), fx("A10", 1, "—"), fx("A90", 1, "15 N·m"), fx("A6", 1, "B11 = 10 N·m"), fx("A17", 1, "—"), fx("A19", 1, "B10 = 6 N·m"), fx("A18", 2, "—"), fx("A20", 1, "—"), fx("A77", 1, "—")],
      steps: [
        { title: { zh: "32 吋機台與前置組裝", en: "32\" rig & pre-assembly" }, desc: { zh: "依 FRM·05 設定機台，組裝 Flip Chip、A37、假叉 A1，並上前/後輪轂與 BB 軸承 A17（100% sag）。", en: "Set up the 32\" rig (FRM·05); assemble Flip Chip, A37, dummy fork A1, hubs and BB bearing A17 (100% sag)." }, image: img("15_Jump_Load", "page_38_img_1.jpeg") },
        { title: { zh: "施力治具與跳躍治具", en: "Force jig & jump jig" }, desc: { zh: "組裝施力治具 A19 + 墊片 A18，支腳調垂直並以跳躍負載治具 A20 固定於缸上。", en: "Assemble force jig A19 + spacers A18; set legs vertical and fix to cylinders with Jump Load jig A20." }, image: img("15_Jump_Load", "page_39_img_1.png") },
        { title: { zh: "調整並開始", en: "Adjust & start" }, desc: { zh: "調整車架與測試缸，最終檢查後開始測試。", en: "Adjust the frame and test cylinders; after final check, start." }, image: img("15_Jump_Load", "page_39_img_3.png") },
      ],
    },

    /* ============ SEATLOAD STATIC ============ */
    {
      id: "frm-16", code: "FRM·16", category: CAT.fat,
      name: { zh: "座墊負載靜態測試", en: "Seatload Static" },
      standard: STD, clause: "P.40", status: "ready",
      schematic: img("16_Seatload_Static", "page_40_img_1.jpeg"),
      summary: {
        zh: "32 吋設定下，將座管假件 A21 調至尺寸對應長度 C10、插入深度 C9 = 80 mm，以座墊負載疲勞施力治具 A23 施加靜態座墊負載。30%(MTB) sag。",
        en: "In the 32-inch setup, set the seatpost dummy A21 to the size-specific length C10 at insertion depth C9 = 80 mm, and apply a static seat load via the seatload-fatigue force jig A23. 30% (MTB) sag.",
      },
      params: [
        { label: { zh: "Sag 設定", en: "Sag" }, value: "30%", unit: "(MTB)" },
        { label: { zh: "插入深度", en: "Insertion depth" }, value: "80", unit: "mm (C9)" },
        { label: { zh: "座管長度", en: "SP length" }, value: { zh: "依尺寸 C10", en: "Size C10" }, unit: "" },
      ],
      fixtures: [fx("A101", 2, "—"), fx("A102", 2, "—"), fx("A37", 1, "B2 5/18 N·m"), fx("A1", 1, "B7 = 12 N·m"), fx("A8", 1, "—"), fx("A9", 1, "—"), fx("A11", 1, "—"), fx("A10", 1, "—"), fx("A90", 1, "15 N·m"), fx("A6", 1, "B11 = 10 N·m"), fx("A21", 1, "B12 = 6 N·m"), fx("A23", 1, "—"), fx("A77", 1, "—")],
      steps: [
        { title: { zh: "32 吋機台與前置組裝", en: "32\" rig & pre-assembly" }, desc: { zh: "依 FRM·05 設定機台，組裝 Flip Chip、A37、假叉 A1，並上前/後輪轂（依 FRM·02）。", en: "Set up the 32\" rig (FRM·05); assemble Flip Chip, A37, dummy fork A1, hubs (per FRM·02)." }, image: img("16_Seatload_Static", "page_40_img_1.jpeg") },
        { title: { zh: "座管假件安裝", en: "Seatpost dummy" }, desc: { zh: "座管假件 A21 調至長度 C10，用組裝膏 C14，以座管夾 D8 於插入深度 C9 = 80 mm 鎖固（B12 = 6 N·m）。", en: "Set seatpost dummy A21 to length C10; use assembly paste C14; clamp with D8 at insertion depth C9 = 80 mm (B12 = 6 N·m)." }, image: img("16_Seatload_Static", "page_40_img_2.jpeg") },
        { title: { zh: "施力治具與致動器", en: "Force jig & actuators" }, desc: { zh: "組裝座墊負載施力治具 A23 並固定於測試缸，調整缸位後最終檢查並開始。", en: "Assemble seatload force jig A23, fix to the test cylinders, adjust and start after final check." }, image: img("16_Seatload_Static", "page_41_img_1.png") },
      ],
    },

    /* ============ SEATLOAD FATIGUE ============ */
    {
      id: "frm-17", code: "FRM·17", category: CAT.fat,
      name: { zh: "座墊負載疲勞測試", en: "Seatload Fatigue" },
      standard: STD, clause: "P.42", status: "ready",
      schematic: img("17_Seatload_Fatigue", "page_42_img_4.jpeg"),
      summary: {
        zh: "與座墊負載靜態相同之 32 吋設定，以座墊負載疲勞施力治具 A23 施加循環座墊負載驗證座管/座束疲勞耐久。30%(MTB) sag。",
        en: "Same 32-inch setup as Seatload Static; apply cyclic seat loads via the seatload-fatigue force jig A23 to verify seatpost/clamp fatigue durability. 30% (MTB) sag.",
      },
      params: [
        { label: { zh: "Sag 設定", en: "Sag" }, value: "30%", unit: "(MTB)" },
        { label: { zh: "插入深度", en: "Insertion depth" }, value: "80", unit: "mm (C9)" },
        { label: { zh: "施力", en: "Load" }, value: PER_TC, unit: "" },
      ],
      fixtures: [fx("A101", 2, "—"), fx("A102", 2, "—"), fx("A37", 1, "B2 5/18 N·m"), fx("A1", 1, "B7 = 12 N·m"), fx("A8", 1, "—"), fx("A9", 1, "—"), fx("A11", 1, "—"), fx("A10", 1, "—"), fx("A90", 1, "15 N·m"), fx("A6", 1, "B11 = 10 N·m"), fx("A21", 1, "B12 = 6 N·m"), fx("A23", 1, "—"), fx("A77", 1, "—")],
      steps: [
        { title: { zh: "32 吋機台與前置組裝", en: "32\" rig & pre-assembly" }, desc: { zh: "依 FRM·05 設定機台，組裝 Flip Chip、A37、假叉 A1，並上前/後輪轂（依 FRM·02）。", en: "Set up the 32\" rig (FRM·05); assemble Flip Chip, A37, dummy fork A1, hubs (per FRM·02)." }, image: img("17_Seatload_Fatigue", "page_42_img_4.jpeg") },
        { title: { zh: "座管假件安裝", en: "Seatpost dummy" }, desc: { zh: "座管假件 A21 調至長度 C10，用組裝膏 C14，以座管夾 D8 於插入深度 C9 = 80 mm 鎖固（B12 = 6 N·m）。", en: "Set seatpost dummy A21 to length C10; use paste C14; clamp with D8 at C9 = 80 mm (B12 = 6 N·m)." }, image: img("17_Seatload_Fatigue", "page_42_img_1.jpeg") },
        { title: { zh: "施力治具與致動器", en: "Force jig & actuators" }, desc: { zh: "組裝座墊負載疲勞施力治具 A23 並固定於測試缸，調整缸位後開始循環測試。", en: "Assemble seatload-fatigue force jig A23, fix to cylinders, adjust and start cyclic testing." }, image: img("17_Seatload_Fatigue", "page_43_img_1.png") },
      ],
    },

    /* ============ HORIZONTAL FATIGUE ============ */
    {
      id: "frm-18", code: "FRM·18", category: CAT.fat,
      name: { zh: "水平疲勞測試", en: "Horizontal Fatigue" },
      standard: STD, clause: "P.44", status: "ready",
      schematic: img("18_Horizontal_Fatigue", "page_44_img_1.jpeg"),
      summary: {
        zh: "組裝假叉 A1（含 HT 軸承假件）與前/後輪轂後上機，於前軸位置以缸施加水平循環力驗證車架水平耐久。30%(MTB) sag。",
        en: "Assemble the dummy fork A1 (with HT bearing dummies) and front/rear hubs, then apply horizontal cyclic force at the front-axle position via the cylinder to verify horizontal frame durability. 30% (MTB) sag.",
      },
      params: [
        { label: { zh: "Sag 設定", en: "Sag" }, value: "30%", unit: "(MTB)" },
        { label: { zh: "前叉長度", en: "Fork length" }, value: "541", unit: "mm (C5)" },
        { label: { zh: "施力", en: "Load" }, value: PER_TC, unit: "" },
      ],
      fixtures: [fx("A37", 1, "B2 5/18 N·m"), fx("A1", 1, "B7 = 12 N·m"), fx("A8", 1, "—"), fx("A9", 1, "—"), fx("A11", 1, "—"), fx("A10", 1, "—"), fx("A90", 1, "15 N·m"), fx("A6", 1, "B11 = 10 N·m")],
      steps: [
        { title: { zh: "前置組裝", en: "Pre-assembly" }, desc: { zh: "依 FRM·03/01 組裝 Flip Chip 與 A37，裝 RD hanger D6。", en: "Assemble Flip Chip and A37 (FRM·03/01); fit RD hanger D6." }, image: img("18_Horizontal_Fatigue", "page_44_img_1.jpeg") },
        { title: { zh: "假叉、輪轂與上機", en: "Dummy fork, hubs & mount" }, desc: { zh: "裝假叉 A1（A8/A9，B7 = 12 N·m）與前/後輪轂 A11/A10，以 A90 + 前軸假件 A6 上機（依 FRM·02）。", en: "Fit dummy fork A1 (A8/A9, B7 = 12 N·m) and front/rear hubs A11/A10; install with A90 + front axle dummy A6 (per FRM·02)." }, image: img("18_Horizontal_Fatigue", "page_44_img_1.jpeg") },
        { title: { zh: "調整前軸缸並開始", en: "Adjust front-axle cylinder & start" }, desc: { zh: "調整前軸缸位置，最終檢查後開始水平循環測試。", en: "Adjust the front-axle cylinder position; after final check, start horizontal cyclic testing." }, image: img("18_Horizontal_Fatigue", "page_44_img_1.jpeg") },
      ],
    },

    /* ============ REAR BRAKE STATIC STRENGTH / FATIGUE ============ */
    {
      id: "frm-19", code: "FRM·19", category: CAT.fat,
      name: { zh: "後煞車靜態強度／疲勞測試", en: "Rear Brake Static Strength / Fatigue" },
      standard: STD, clause: "P.45", status: "ready", featured: true,
      schematic: img("19_Rear_Brake_Static_Strength_Fatigue", "page_45_img_1.jpeg"),
      summary: {
        zh: "32 吋煞車負載設定下，以後碟煞輪轂 A24、碟盤 A27、槓桿臂假件 DB A29、卡鉗假件 A25 與卡鉗吊架 A26 模擬煞車負載路徑，於對應輪徑孔位施加負載。0% sag。",
        en: "In the 32-inch brakeload setup, simulate the brake load path with rear disc-brake hub A24, disc A27, lever-arm dummy DB A29, caliper dummy A25 and caliper hanger A26; apply load at the wheel-diameter hole. 0% sag.",
      },
      params: [
        { label: { zh: "機台設定", en: "Setup" }, value: "32\"", unit: "(brakeload)" },
        { label: { zh: "碟盤直徑", en: "Disc dia." }, value: "160", unit: "mm (C8)" },
        { label: { zh: "卡鉗鎖碟扭矩", en: "Caliper-to-disc" }, value: "80", unit: "N·m (B16)" },
      ],
      fixtures: [fx("A101", 2, "—"), fx("A37", 1, "B2 5/18 N·m"), fx("A1", 1, "B7 = 12 N·m"), fx("A8", 1, "—"), fx("A9", 1, "—"), fx("A11", 1, "—"), fx("A24", 1, "—"), fx("A27", 1, "B15 = 8 N·m"), fx("A29", 1, "—"), fx("A25", 1, "B14/B16 8/80 N·m"), fx("A26", 1, "B13 = 8 N·m"), fx("A90", 1, "15 N·m"), fx("A6", 1, "B11 = 10 N·m"), fx("A58", 1, "—"), fx("A52", 1, "—")],
      steps: [
        { title: { zh: "32 吋機台與前置組裝", en: "32\" rig & pre-assembly" }, desc: { zh: "依 FRM·06 設定 32 吋煞車負載機台，組裝 Flip Chip、A37、假叉 A1（A8/A9）。", en: "Set up the 32\" brakeload rig (FRM·06); assemble Flip Chip, A37, dummy fork A1 (A8/A9)." }, image: img("19_Rear_Brake_Static_Strength_Fatigue", "page_45_img_1.jpeg") },
        { title: { zh: "碟盤與槓桿臂組裝", en: "Disc & lever arm" }, desc: { zh: "前輪轂 A11、後碟煞輪轂 A24 上機；以 DB 軸帽將碟盤 A27 與槓桿臂假件 DB A29 固定於後碟煞輪轂（B15 = 8 N·m）。", en: "Mount front hub A11 and rear disc-brake hub A24; fix disc A27 and lever-arm dummy DB A29 on the hub with the DB hub nut (B15 = 8 N·m)." }, image: img("19_Rear_Brake_Static_Strength_Fatigue", "page_45_img_2.png") },
        { title: { zh: "上機與穿軸定位", en: "Mount & thru axle" }, desc: { zh: "煞車座轉接器 D39 入後勾爪，車架上機鎖前軸假件 A6，後穿軸 A90 先輕鎖（依 FRM·02）後鎖至額定。", en: "Insert brake mount adaptor D39; mount frame, tighten front axle dummy A6, snug then torque Rear Thru Axle A90 (per FRM·02)." }, image: img("19_Rear_Brake_Static_Strength_Fatigue", "page_46_img_7.png") },
        { title: { zh: "卡鉗與碟盤鎖固", en: "Caliper & disc fixation" }, desc: { zh: "卡鉗吊架 A26 + 卡鉗假件 A25 裝於煞車座（先輕鎖）；以氣動起子 A52 鎖固碟盤與反持螺帽 A58 避免碟盤變形，再依額定鎖固吊架（B13/B14/B16）。", en: "Fit caliper hanger A26 + caliper dummy A25 on the brake mount (loose); use impact screwdriver A52 to tighten disc-to-caliper with counterhold nut A58 (avoid disc deformation), then final-torque the hanger (B13/B14/B16)." }, image: img("19_Rear_Brake_Static_Strength_Fatigue", "page_47_img_1.jpeg") },
        { title: { zh: "安裝負載缸並開始", en: "Install cylinder & start" }, desc: { zh: "將負載缸裝於對應輪徑孔位並調整；靜態強度測試前先預載 100N 歸零，最終檢查後開始。", en: "Install the load cylinder in the correct wheel-diameter hole and adjust; for static strength preload 100N and zero first, then start after final check." }, image: img("19_Rear_Brake_Static_Strength_Fatigue", "page_46_img_2.jpeg") },
      ],
    },

    /* ============ REVERSE FALLING FRAME ============ */
    {
      id: "frm-20", code: "FRM·20", category: CAT.imp,
      name: { zh: "逆向落架測試", en: "Reverse Falling Frame" },
      standard: STD, clause: "P.48", status: "ready", featured: true,
      schematic: img("20_Reverse_Falling_Frame", "page_48_img_1.png"),
      summary: {
        zh: "於衝擊試驗台前後裝逆向落架墊片 A93，以衝擊前叉假件 A33、衝擊滾輪 A35、BB 衝擊假件 A31（50 kg）與可調座管衝擊假件 A63（30 kg）設定，依落下高度施加衝擊。100% sag（叉與避震器）。",
        en: "Fit reverse-falling-frame spacers A93 front and rear in the impact rig; set up with impact fork dummy A33, impact roll A35, BB impact dummy A31 (50 kg) and adjustable seatpost impact dummy A63 (30 kg); apply impact per drop height. 100% sag (fork & shock).",
      },
      params: [
        { label: { zh: "Sag 設定", en: "Sag" }, value: "100%", unit: "" },
        { label: { zh: "BB 衝擊配重", en: "BB impact weight" }, value: "50", unit: "kg (C17)" },
        { label: { zh: "座管衝擊配重", en: "SP impact weight" }, value: "30", unit: "kg (C18)" },
      ],
      fixtures: [fx("A93", 2, "B46/B47 12/25 N·m"), fx("A37", 1, "B38 = 20 N·m"), fx("A33", 1, "B17 = 20 N·m"), fx("A8", 1, "—"), fx("A9", 1, "—"), fx("A10", 1, "—"), fx("A35", 1, "—"), fx("A34", 1, "B20 = 25 N·m"), fx("A32", 1, "—"), fx("A31", 1, "—"), fx("A63", 1, "B42/B43 20/25 N·m"), fx("A36", 1, "—")],
      steps: [
        { title: { zh: "安裝落架墊片與前置組裝", en: "Spacers & pre-assembly" }, desc: { zh: "於衝擊台前後裝逆向落架墊片 A93（頂板 8×B46、軸承座 4×B47）；依 FRM·01 調 A37 並鎖 D25，組裝 Flip Chip。", en: "Fit reverse-falling-frame spacers A93 front/rear (top plate 8×B46, bearing mount 4×B47); set A37 (FRM·01), tighten D25, assemble Flip Chip." }, image: img("20_Reverse_Falling_Frame", "page_48_img_3.png") },
        { title: { zh: "衝擊前叉與輪轂", en: "Impact fork & hubs" }, desc: { zh: "裝衝擊前叉假件 A33（A8/A9，B17 = 20 N·m）至 100% sag 叉長；後輪轂 A10 配衝擊滾輪 A35，前輪轂衝擊叉 A34 上機（B20 = 25 N·m）。", en: "Fit impact fork dummy A33 (A8/A9, B17 = 20 N·m) at 100% sag length; rear hub A10 with impact roll A35; mount front hub impact fork A34 (B20 = 25 N·m)." }, image: img("20_Reverse_Falling_Frame", "page_50_img_1.jpeg") },
        { title: { zh: "BB 與座管衝擊配重", en: "BB & SP impact weights" }, desc: { zh: "裝 BB 衝擊軸承 A32、BB 衝擊假件 A31 + 50 kg (C17)；裝可調座管衝擊假件 A63 + 座管夾 D8（插入深度 C9，組裝膏 C14）並掛 30 kg (C18)。", en: "Fit BB impact bearing A32, BB impact dummy A31 + 50 kg (C17); fit adjustable seatpost impact dummy A63 + clamp D8 (depth C9, paste C14) and 30 kg (C18)." }, image: img("20_Reverse_Falling_Frame", "page_49_img_2.jpeg") },
        { title: { zh: "感測器與落下", en: "Sensor & drop" }, desc: { zh: "於衝擊叉裝角度感測器支架 A36（水平校正），以專用繩索將車架拉至落下高度後開始測試。", en: "Fit angle sensor holder A36 on the impact fork (water level); pull the frame to drop height with the special rope, then start." }, image: img("20_Reverse_Falling_Frame", "page_49_img_3.jpeg") },
      ],
    },

    /* ============ FALLING FRAME ============ */
    {
      id: "frm-21", code: "FRM·21", category: CAT.imp,
      name: { zh: "落架測試", en: "Falling Frame" },
      standard: STD, clause: "P.51", status: "ready",
      schematic: img("21_Falling_Frame", "page_51_img_1.jpeg"),
      summary: {
        zh: "以衝擊前叉假件 A33、BB 衝擊假件 A31（50 kg）與可調座管衝擊假件 A63（30 kg）設定（不裝逆向落架墊片 A93），依試驗台箭頭定位後施加落架衝擊。0% sag。",
        en: "Set up with impact fork dummy A33, BB impact dummy A31 (50 kg) and adjustable seatpost impact dummy A63 (30 kg); reverse-falling-frame spacers A93 NOT fitted. Position per rig arrows, then apply the falling-frame impact. 0% sag.",
      },
      params: [
        { label: { zh: "Sag 設定", en: "Sag" }, value: "0%", unit: "" },
        { label: { zh: "BB 衝擊配重", en: "BB impact weight" }, value: "50", unit: "kg (C15)" },
        { label: { zh: "座管衝擊配重", en: "SP impact weight" }, value: "30", unit: "kg (C16)" },
      ],
      fixtures: [fx("A37", 1, "B2 5/18 N·m"), fx("A33", 1, "B17 = 20 N·m"), fx("A8", 1, "—"), fx("A9", 1, "—"), fx("A10", 1, "—"), fx("A90", 1, "15 N·m"), fx("A32", 1, "—"), fx("A31", 1, "—"), fx("A63", 1, "B42/B43 20/25 N·m"), fx("A73", 1, "—"), fx("A36", 1, "—")],
      steps: [
        { title: { zh: "前置組裝", en: "Pre-assembly" }, desc: { zh: "依 FRM·03/01 組裝 Flip Chip 與 A37，裝 RD hanger D6（不裝 A93）。", en: "Assemble Flip Chip and A37 (FRM·03/01); fit RD hanger D6 (A93 NOT fitted)." }, image: img("21_Falling_Frame", "page_52_img_1.jpeg") },
        { title: { zh: "衝擊前叉與上機", en: "Impact fork & mount" }, desc: { zh: "裝衝擊前叉假件 A33（A8/A9，B17 = 20 N·m）；後輪轂 A10 上機，以後穿軸 A90 固定（依 FRM·02），依箭頭定位。", en: "Fit impact fork dummy A33 (A8/A9, B17 = 20 N·m); mount rear hub A10, fix with A90 (per FRM·02), position per arrows." }, image: img("21_Falling_Frame", "page_51_img_1.jpeg") },
        { title: { zh: "BB 與座管衝擊配重", en: "BB & SP impact weights" }, desc: { zh: "裝 BB 衝擊軸承 A32、BB 衝擊假件 A31 + 50 kg (C15)；裝可調座管衝擊假件 A63（以安裝輔具 A73 定高）+ 30 kg (C16)。", en: "Fit BB impact bearing A32, BB impact dummy A31 + 50 kg (C15); fit adjustable seatpost impact dummy A63 (height set with mounting aid A73) + 30 kg (C16)." }, image: img("21_Falling_Frame", "page_52_img_2.jpeg") },
        { title: { zh: "感測器與開始", en: "Sensor & start" }, desc: { zh: "於 RD hanger 裝角度感測器支架 A36（水平校正）；HT 不另加配重，最終檢查後開始。", en: "Fit angle sensor holder A36 on the RD hanger (water level); add no extra HT weight; start after final check." }, image: img("21_Falling_Frame", "page_52_img_3.jpeg") },
      ],
    },

    /* ============ FALLING MASS ============ */
    {
      id: "frm-22", code: "FRM·22", category: CAT.imp,
      name: { zh: "落錘質量測試", en: "Falling Mass" },
      standard: STD, clause: "P.53", status: "ready",
      schematic: img("22_Falling_Mass", "page_53_img_1.jpeg"),
      summary: {
        zh: "以衝擊前叉假件 A33 與後輪轂 A10 上機，將車架定位至衝擊位置（衝擊滾輪須觸及衝擊體），以安全帶固定；每次衝擊前預載 225N。0% sag。",
        en: "Mount with impact fork dummy A33 and rear hub A10, position the frame at the impact point (impact roll must touch the impact body), secure with the safety belt; preload 225N before every impact. 0% sag.",
      },
      params: [
        { label: { zh: "Sag 設定", en: "Sag" }, value: "0%", unit: "" },
        { label: { zh: "每次衝擊預載", en: "Preload / impact" }, value: "225", unit: "N" },
        { label: { zh: "衝擊前叉扭矩", en: "Impact fork torque" }, value: "20", unit: "N·m (B17)" },
      ],
      fixtures: [fx("A37", 1, "B2 5/18 N·m"), fx("A33", 1, "B17 = 20 N·m"), fx("A8", 1, "—"), fx("A9", 1, "—"), fx("A10", 1, "—"), fx("A90", 1, "15 N·m"), fx("A35", 1, "—")],
      steps: [
        { title: { zh: "前置組裝與衝擊前叉", en: "Pre-assembly & impact fork" }, desc: { zh: "依 FRM·03/01 組裝 Flip Chip 與 A37；裝衝擊前叉假件 A33（A8/A9，B17 = 20 N·m）。", en: "Assemble Flip Chip and A37 (FRM·03/01); fit impact fork dummy A33 (A8/A9, B17 = 20 N·m)." }, image: img("22_Falling_Mass", "page_53_img_1.jpeg") },
        { title: { zh: "上機與定位", en: "Mount & position" }, desc: { zh: "後輪轂 A10 上機，以後穿軸 A90 固定（依 FRM·02）；定位至衝擊位置使衝擊滾輪觸及衝擊體，以安全帶固定。", en: "Mount rear hub A10, fix with A90 (per FRM·02); position so the impact roll touches the impact body, secure with the safety belt." }, image: img("22_Falling_Mass", "page_53_img_2.png") },
        { title: { zh: "預載並開始", en: "Preload & start" }, desc: { zh: "每次衝擊前對系統預載 225N，最終檢查後開始測試。", en: "Preload the system 225N before every impact; start after final check." }, image: img("22_Falling_Mass", "page_53_img_3.png") },
      ],
    },

    /* ============ HEADTUBE PUSH / PULL ============ */
    {
      id: "frm-23", code: "FRM·23", category: CAT.str,
      name: { zh: "頭管推／拉測試", en: "Head-Tube Push / Pull" },
      standard: STD, clause: "P.54", status: "ready",
      schematic: img("23_Headtube_Push_Pull", "page_54_img_1.png"),
      summary: {
        zh: "於供應商萬用試驗機上，以 Ultimate 測試前叉假件 A80（含 Ultimate HT 軸承假件 A83/A84）與後勾爪固定 A87，沿輪距軸線施加推/拉負載。25%(MTB) sag，缸速 C20 = 10 mm/min。",
        en: "On the supplier's universal test machine, apply push/pull load collinear with the wheelbase using the Ultimate Test Dummy Fork A80 (with Ultimate HT bearing dummies A83/A84) and rear DO fixation A87. 25% (MTB) sag, cylinder speed C20 = 10 mm/min.",
      },
      params: [
        { label: { zh: "Sag 設定", en: "Sag" }, value: "25%", unit: "(MTB)" },
        { label: { zh: "缸速", en: "Cylinder speed" }, value: "10", unit: "mm/min (C20)" },
        { label: { zh: "Ultimate 叉頭碗扭矩", en: "Ultimate head-set" }, value: "20", unit: "N·m (B51)" },
      ],
      fixtures: [fx("A37", 1, "B2 5/18 N·m"), fx("A87", 1, "15 N·m (B50)"), fx("A10", 1, "—"), fx("A80", 1, "B51 = 20 N·m"), fx("A83", 1, "—"), fx("A84", 1, "—"), fx("A90", 1, "15 N·m"), fx("A85", 1, "B56 = 20 N·m")],
      steps: [
        { title: { zh: "前置組裝與後勾爪固定", en: "Pre-assembly & rear DO fixation" }, desc: { zh: "依 FRM·03/01 組裝 Flip Chip 與 A37；於萬用試驗機裝後勾爪固定 A87（不用底座 A88），後輪轂 A10 入 A87。", en: "Assemble Flip Chip and A37 (FRM·03/01); mount rear DO fixation A87 on the universal TM (no base bearing A88), fit rear hub A10 in A87." }, image: img("23_Headtube_Push_Pull", "page_54_img_1.png") },
        { title: { zh: "Ultimate 假叉組裝", en: "Ultimate dummy fork" }, desc: { zh: "組裝 Ultimate 測試前叉假件 A80（A83/A84，B51 = 20 N·m）並調整軸承預壓。", en: "Assemble Ultimate Test Dummy Fork A80 (A83/A84, B51 = 20 N·m) and set bearing play." }, image: img("23_Headtube_Push_Pull", "page_54_img_2.jpeg") },
        { title: { zh: "接負載缸並校正", en: "Connect cylinder & align" }, desc: { zh: "以萬用負載缸轉接組 A85 連接負載缸（B56 = 20 N·m），前後勾爪垂直對齊使負載與輪距共線；缸速設 C20。", en: "Connect the load cylinder with the universal adaptor set A85 (B56 = 20 N·m); align front/rear dropouts vertically so the load is collinear with the wheelbase; set cylinder speed C20." }, image: img("23_Headtube_Push_Pull", "page_55_img_1.png") },
      ],
    },

    /* ============ BOTTOM OUT TEST ============ */
    {
      id: "frm-24", code: "FRM·24", category: CAT.str,
      name: { zh: "Bottom Out 測試", en: "Bottom Out Test" },
      standard: STD, clause: "P.56", status: "ready",
      schematic: img("24_Bottom_Out_Test", "page_56_img_3.jpeg"),
      summary: {
        zh: "於萬用試驗機，以線性軸承底座 A88、BB 固定 A92、前軸向固定 A86 與後輪轂 Bottom Out A112 將車架水平固定，沿輪距施加負載至 100% sag（壓縮）。缸速 C20。",
        en: "On the universal TM, fix the frame horizontal using base linear bearing A88, BB fixation A92, frontal axial fixation A86 and rear hub bottom-out A112; apply load along the wheelbase to 100% sag (compressed). Cylinder speed C20.",
      },
      params: [
        { label: { zh: "Sag 設定", en: "Sag" }, value: "100%", unit: "壓縮 / comp." },
        { label: { zh: "BB 軸扭矩", en: "BB axle torque" }, value: "80", unit: "N·m (B54)" },
        { label: { zh: "缸速", en: "Cylinder speed" }, value: "10", unit: "mm/min (C20)" },
      ],
      fixtures: [fx("A37", 1, "B2 5/18 N·m"), fx("A88", 1, "15 N·m (B50)"), fx("A92", 1, "B54 = 80 N·m"), fx("A86", 1, "—"), fx("A85", 1, "B56 = 20 N·m"), fx("A112", 1, "B55 = 40 N·m"), fx("A1", 1, "B7 = 12 N·m"), fx("A8", 1, "—"), fx("A9", 1, "—"), fx("A11", 1, "—"), fx("A17", 1, "—"), fx("A90", 1, "15 N·m")],
      steps: [
        { title: { zh: "前置組裝與機台治具", en: "Pre-assembly & rig jigs" }, desc: { zh: "依 FRM·03/01 組裝 Flip Chip 與 A37；於平台裝線性軸承底座 A88、BB 固定 A92、前軸向固定 A86。", en: "Assemble Flip Chip and A37 (FRM·03/01); mount base linear bearing A88, BB fixation A92, frontal axial fixation A86." }, image: img("24_Bottom_Out_Test", "page_56_img_3.jpeg") },
        { title: { zh: "負載缸與假叉", en: "Cylinder & dummy fork" }, desc: { zh: "負載缸裝萬用轉接組 A85 與後輪轂 Bottom Out A112（置中）；裝假叉 A1（A8/A9）與前輪轂 A11。", en: "Fit universal adaptor set A85 + rear hub bottom-out A112 (centred) on the cylinder; fit dummy fork A1 (A8/A9) and front hub A11." }, image: img("24_Bottom_Out_Test", "page_56_img_1.jpeg") },
        { title: { zh: "BB 固定與上機", en: "BB fixation & mounting" }, desc: { zh: "BB 軸承 A17 入車架並固定於 A92 軸（B54 = 80 N·m）；車架以前軸向固定與 BB 固定上機（輪距水平），後輪轂以 A90 固定，缸速 C20。", en: "Fit BB bearing A17 and fix on the A92 axle (B54 = 80 N·m); mount frame in frontal axial + BB fixation (wheelbase horizontal), fix rear hub with A90, set cylinder speed C20." }, image: img("24_Bottom_Out_Test", "page_56_img_2.jpeg") },
      ],
    },

    /* ============ SEATLOAD TO FAILURE / THRESHOLD ============ */
    {
      id: "frm-25", code: "FRM·25", category: CAT.str,
      name: { zh: "座墊負載至破壞／門檻測試", en: "Seatload — To Failure / Threshold" },
      standard: STD, clause: "P.57", status: "ready",
      schematic: img("25_Seatload_To_Failure", "page_57_img_1.jpeg"),
      summary: {
        zh: "於萬用試驗機，以前軸向固定 A86、後勾爪固定 A87（裝於底座 A88）與座管假件 A113 將車架水平固定，以 M16 負載缸轉接 A89 對座管施加負載至破壞/門檻，記錄變形、力與計算能量。缸速 C20。",
        en: "On the universal TM, fix the frame horizontal with frontal axial fixation A86, rear DO fixation A87 (on base bearing A88) and seatpost dummy A113; apply seat load to failure/threshold via the M16 load-cylinder adapter A89, recording deflection, force and calculated energy. Cylinder speed C20.",
      },
      params: [
        { label: { zh: "Sag 設定", en: "Sag" }, value: "25%", unit: "(MTB)" },
        { label: { zh: "缸速", en: "Cylinder speed" }, value: "10", unit: "mm/min (C20)" },
        { label: { zh: "座管夾扭矩", en: "SP clamp torque" }, value: "6", unit: "N·m (B57)" },
      ],
      fixtures: [fx("A86", 1, "15 N·m (B50)"), fx("A88", 1, "15 N·m (B50)"), fx("A87", 1, "15 N·m (B50)"), fx("A11", 1, "—"), fx("A10", 1, "—"), fx("A1", 1, "B7 = 12 N·m"), fx("A8", 1, "—"), fx("A9", 1, "—"), fx("A113", 1, "B57 = 6 N·m"), fx("A90", 1, "15 N·m"), fx("A6", 1, "B11 = 10 N·m"), fx("A89", 1, "B56 = 20 N·m")],
      steps: [
        { title: { zh: "機台治具與輪轂", en: "Rig jigs & hubs" }, desc: { zh: "車架裝 RD hanger D6；於萬用試驗機裝前軸向固定 A86（前輪轂 A11）、底座 A88 + 後勾爪固定 A87（後輪轂 A10）。", en: "Fit RD hanger D6; on the universal TM mount frontal axial fixation A86 (front hub A11), base bearing A88 + rear DO fixation A87 (rear hub A10)." }, image: img("25_Seatload_To_Failure", "page_57_img_2.jpeg") },
        { title: { zh: "假叉與座管假件", en: "Dummy fork & seatpost dummy" }, desc: { zh: "裝假叉 A1（A8/A9，B7 = 12 N·m）；以座管夾 D8 將座管假件 A113 裝入車架（B57 = 6 N·m，長度 C10/深度 C9）。", en: "Fit dummy fork A1 (A8/A9, B7 = 12 N·m); fit seatpost dummy A113 with clamp D8 (B57 = 6 N·m, length C10 / depth C9)." }, image: img("25_Seatload_To_Failure", "page_57_img_4.png") },
        { title: { zh: "上機與接負載缸", en: "Mount & connect cylinder" }, desc: { zh: "車架上機，後勾爪以 A90、前叉以 A6 固定；座管假件以 M16 負載缸轉接 A89 接機台，缸速 C20 後開始並記錄變形/力/能量。", en: "Mount frame, fix rear DO with A90 and fork with A6; connect seatpost dummy via M16 adapter A89, set speed C20, start and record deflection/force/energy." }, image: img("25_Seatload_To_Failure", "page_58_img_2.jpeg") },
      ],
    },

    /* ============ IPU IMPACT TEST ============ */
    {
      id: "frm-26", code: "FRM·26", category: CAT.imp,
      name: { zh: "IPU 衝擊測試 (Canyon Inhouse)", en: "IPU Impact Test (Canyon Inhouse)" },
      standard: STD, clause: "P.59", status: "ready", featured: true,
      schematic: img("26_IPU_Impact_Test", "page_59_img_1.jpeg"),
      summary: {
        zh: "車架以 BB 錐固定、後勾爪以 A90 固定（HT 水平），於頭管裝真實 HT 軸承與壓縮環後，組裝 IPU 轉向管/夾環/龍頭/把手假件與配重，釋放把手使其自由旋轉造成 IPU 衝擊。雙向測試。",
        en: "Fix the frame by the BB cone and rear DO with A90 (HT horizontal); fit real HT bearings + compression ring, then assemble IPU steer-tube / clamp-ring / stem / handlebar dummies with weights, and release the handlebar to free-rotate and cause the IPU impact. Both directions.",
      },
      params: [
        { label: { zh: "HT 方向", en: "HT orientation" }, value: { zh: "水平", en: "Horizontal" }, unit: "" },
        { label: { zh: "把手配重", en: "Handlebar weights" }, value: { zh: "依等級", en: "Per level" }, unit: "(A111)" },
        { label: { zh: "測試方向", en: "Directions" }, value: { zh: "雙向", en: "Both" }, unit: "" },
      ],
      fixtures: [fx("A10", 1, "—"), fx("A90", 1, "15 N·m"), fx("A106", 1, "—"), fx("A107", 1, "—"), fx("A108", 1, "—"), fx("A109", 1, "—"), fx("A110", 1, "—"), fx("A111", 1, "—")],
      steps: [
        { title: { zh: "上機與 HT 軸承", en: "Mount & HT bearings" }, desc: { zh: "後輪轂 A10 上機，車架以 BB 錐固定、後勾爪以 A90 固定（HT 水平）；於頭管裝 HT 軸承 D2.1/D2.2 與壓縮環 D3。", en: "Mount rear hub A10, fix frame by BB cone and rear DO with A90 (HT horizontal); fit HT bearings D2.1/D2.2 and compression ring D3." }, image: img("26_IPU_Impact_Test", "page_59_img_1.jpeg") },
        { title: { zh: "IPU 假件組裝", en: "IPU dummies" }, desc: { zh: "裝 IPU 轉向管假件 A106、夾環假件 A107、龍頭假件 A108（先不鎖）；裝墊環與頂蓋假件 A109，以頂螺絲 D43 調軸承預壓後鎖固龍頭與夾環。", en: "Fit IPU steer-tube A106, clamp-ring A107, stem A108 (loose); fit spacers and top-cap dummy A109, set bearing play with top screw D43, then torque stem and clamp ring." }, image: img("26_IPU_Impact_Test", "page_59_img_2.jpeg") },
        { title: { zh: "把手配重與衝擊", en: "Handlebar weights & impact" }, desc: { zh: "裝 IPU 把手假件 A110 與所需配重 A111，校正把手水平並以固定座固定；釋放把手使其自由旋轉造成衝擊，雙向測試。", en: "Fit IPU handlebar dummy A110 + required weights A111, level and fix it; release to free-rotate and cause the impact, both directions." }, image: img("26_IPU_Impact_Test", "page_59_img_4.jpeg") },
      ],
    },

    /* ============ IPU OVERLOAD TEST ============ */
    {
      id: "frm-27", code: "FRM·27", category: CAT.imp,
      name: { zh: "IPU 過載測試 (Canyon Inhouse)", en: "IPU Overload Test (Canyon Inhouse)" },
      standard: STD, clause: "P.60", status: "ready",
      schematic: img("27_IPU_Overload_Test", "page_60_img_6.jpeg"),
      summary: {
        zh: "於車架頭管以真實 HT 軸承 D2.1/D2.2 與壓縮環 D3 裝入 IPU 過載假件 A114（確保衝擊切口面對準 IPU chip），鎖至額定後以校正扭力扳手依測試條件對 IPU chip 施加扭力負載。雙向測試。",
        en: "Mount the IPU Overload Dummy A114 in the HT with real HT bearings D2.1/D2.2 and compression ring D3 (ensure the impact cut-out faces the IPU chip), torque the nut, then apply a torque load to the IPU chip with a calibrated torque wrench per Testing Conditions. Both directions.",
      },
      params: [
        { label: { zh: "過載假件螺帽扭矩", en: "Overload dummy nut" }, value: "2", unit: "N·m (B58)" },
        { label: { zh: "扭力負載", en: "Torque load" }, value: PER_TC, unit: "" },
        { label: { zh: "測試方向", en: "Directions" }, value: { zh: "雙向", en: "Both" }, unit: "" },
      ],
      fixtures: [fx("A114", 1, "B58 = 2 N·m"), fx("A7", 1, "—")],
      steps: [
        { title: { zh: "裝入過載假件", en: "Mount overload dummy" }, desc: { zh: "於頭管以真實 HT 軸承 D2.1/D2.2 與壓縮環 D3 裝入 IPU 過載假件 A114，確保衝擊切口面對準 IPU chip，螺帽鎖至 B58 = 2 N·m。", en: "Mount IPU Overload Dummy A114 in the HT with real HT bearings D2.1/D2.2 and compression ring D3, ensure the cut-out faces the IPU chip, torque nut B58 = 2 N·m." }, image: img("27_IPU_Overload_Test", "page_60_img_2.jpeg") },
        { title: { zh: "施加扭力負載", en: "Apply torque load" }, desc: { zh: "以校正扭力扳手依測試條件對 IPU chip 施加扭力負載；傳動側 (順時針) 與非傳動側 (逆時針) 皆需測試。", en: "Apply the torque load to the IPU chip with a calibrated torque wrench per Testing Conditions; test both drive side (CW) and non-drive side (CCW)." }, image: img("27_IPU_Overload_Test", "page_60_img_1.jpeg") },
      ],
    },

    /* ============ SCRUBLOAD FATIGUE ============ */
    {
      id: "frm-29", code: "FRM·29", category: CAT.fat,
      name: { zh: "刷負載疲勞測試 (Canyon Inhouse)", en: "Scrubload Fatigue (Canyon Inhouse)" },
      standard: STD, clause: "P.62", status: "ready",
      schematic: img("29_Scrubload_Fatigue", "page_62_img_1.jpeg"),
      summary: {
        zh: "以刷負載避震器假件 A59（前墊片 A62 + 襯套 D49，50% sag = 170 mm）裝入車架，配假叉 A1、後輪轂 A10、BB 軸承 A17 與刷負載試驗台 BB 軸；調整前後槓桿臂 406 mm，後輪槓桿臂以水平儀校正垂直。",
        en: "Fit the scrub-load shock dummy A59 (front spacer A62 + bushings D49, 50% sag = 170 mm) into the frame with dummy fork A1, rear hub A10, BB bearing A17 and the scrub-load rig BB axle; set front/rear lever arms to 406 mm and align the rear-wheel lever arm vertical with a water level.",
      },
      params: [
        { label: { zh: "避震器 sag", en: "Shock sag" }, value: "50%", unit: "(170 mm, C25)" },
        { label: { zh: "前叉 sag", en: "Fork sag" }, value: "30%", unit: "(C5)" },
        { label: { zh: "槓桿臂長度", en: "Lever arm" }, value: "406", unit: "mm (C24/C31)" },
      ],
      fixtures: [fx("A59", 1, "—"), fx("A62", 2, "—"), fx("A1", 1, "B7 = 12 N·m"), fx("A8", 1, "—"), fx("A9", 1, "—"), fx("A10", 1, "—"), fx("A90", 1, "15 N·m"), fx("A6", 1, "B11 = 10 N·m"), fx("A17", 1, "—"), fx("A18", 2, "—"), fx("A94", 1, "—")],
      steps: [
        { title: { zh: "刷負載避震器假件組裝", en: "Scrub-load shock dummy" }, desc: { zh: "於刷負載避震器假件 A59 裝前墊片 A62 與避震器襯套 D49，調至 50% sag (C25 = 170 mm) 後裝入車架並鎖固。", en: "Fit front spacer A62 and shock bushings D49 in the scrub-load shock dummy A59, set to 50% sag (C25 = 170 mm), then mount and tighten in the frame." }, image: img("29_Scrubload_Fatigue", "page_63_img_1.jpeg") },
        { title: { zh: "假叉、輪轂與槓桿臂", en: "Dummy fork, hub & lever arms" }, desc: { zh: "裝假叉 A1（A8/A9）至 30% sag 叉長 C5；後輪轂 A10 上機；前後槓桿臂 (C24/C31) 調至 406 mm。", en: "Fit dummy fork A1 (A8/A9) to 30% sag length C5; mount rear hub A10; set front/rear lever arms (C24/C31) to 406 mm." }, image: img("29_Scrubload_Fatigue", "page_62_img_2.jpeg") },
        { title: { zh: "BB 軸與校正", en: "BB axle & alignment" }, desc: { zh: "裝 BB 軸承 A17，將刷負載試驗台 BB 軸以墊片 A18 置中組裝並鎖預壓；車架以 A90、前軸假件 A6 與 BB 軸固定螺絲固定，後輪槓桿臂以水平儀校正垂直。", en: "Fit BB bearing A17, assemble the scrub-load rig BB axle centred with spacers A18 and set play; fix the frame with A90, front axle dummy A6 and the BB-axle screws; align the rear-wheel lever arm vertical with a water level." }, image: img("29_Scrubload_Fatigue", "page_63_img_3.jpeg") },
      ],
    },
  ];

  /* ---- Required equipment (設備) per test. Quantities are the count THIS test
     needs; the vendor stock-take takes the MAX across all tests (shared, not
     summed). Entries are [equipmentKey, qty] (qty defaults to 1). ---- */
  const EQUIP = {
    "frm-01": [["E11", 1]],
    "frm-02": [["E11", 1]],
    "frm-03": [],
    "frm-04": [["E11", 1]],
    "frm-05": [["E02", 1]],
    "frm-06": [["E03", 1]],
    "frm-07": [["E01", 1], ["E06", 1], ["E07", 1], ["E08", 1], ["E12", 1]],
    "frm-08": [["E05", 1], ["E07", 1], ["E08", 1], ["E09", 1], ["E11", 1], ["E12", 1]],
    "frm-09": [["E05", 1], ["E07", 1], ["E08", 1], ["E09", 1], ["E11", 1], ["E12", 1]],
    "frm-10": [["E05", 1], ["E07", 1], ["E08", 1], ["E11", 1]],
    "frm-11": [["E11", 1]],
    "frm-12": [["E02", 1], ["E06", 2], ["E07", 1], ["E08", 1], ["E12", 1]],
    "frm-13": [["E02", 1], ["E06", 2], ["E07", 1], ["E08", 1]],
    "frm-14": [["E02", 1], ["E06", 2], ["E07", 1], ["E08", 1]],
    "frm-15": [["E02", 1], ["E06", 2], ["E07", 1], ["E08", 1]],
    "frm-16": [["E02", 1], ["E06", 1], ["E07", 1], ["E08", 1], ["E12", 1]],
    "frm-17": [["E02", 1], ["E06", 1], ["E07", 1], ["E08", 1]],
    "frm-18": [["E01", 1], ["E06", 1], ["E07", 1], ["E08", 1]],
    "frm-19": [["E03", 1], ["E06", 1], ["E07", 1], ["E08", 1]],
    "frm-20": [["E04", 1], ["E10", 1], ["E08", 1], ["E12", 1]],
    "frm-21": [["E04", 1], ["E10", 1], ["E08", 1], ["E12", 1]],
    "frm-22": [["E04", 1], ["E07", 1], ["E08", 1]],
    "frm-23": [["E01", 1], ["E06", 1], ["E07", 1], ["E08", 1], ["E09", 1]],
    "frm-24": [["E01", 1], ["E06", 1], ["E07", 1], ["E08", 1], ["E09", 1]],
    "frm-25": [["E01", 1], ["E06", 1], ["E07", 1], ["E08", 1], ["E09", 1]],
    "frm-26": [["E04", 1], ["E10", 1], ["E08", 1], ["E12", 1]],
    "frm-27": [["E11", 1]],
    "frm-29": [["E02", 1], ["E06", 2], ["E07", 1], ["E08", 1], ["E12", 1]],
  };
  ITEMS.forEach((it) => {
    it.equipment = (EQUIP[it.id] || []).map(([k, q]) => eqfx(k, q)).filter(Boolean);
  });

  window.DATA = window.DATA || {};
  window.DATA.ITEMS = ITEMS;
})();
