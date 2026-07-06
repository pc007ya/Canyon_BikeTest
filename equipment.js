/* FRM205 Equipment Library (設備庫).
   Distinct from the A-code jigs/fixtures (制具): these are the shared test
   machines, actuators, instruments and tools a rig needs. Required quantity
   for a vendor stock-take is the MAX across all tests (equipment is shared and
   not accumulated), unlike fixtures which sum.
   Keyed by E-code. Loaded AFTER jigs.js, BEFORE tests.js (tests reference it). */
(function () {
  const KIND = {
    machine: { zh: "試驗機", en: "Test machine" },
    actuator: { zh: "致動", en: "Actuator" },
    instr: { zh: "量測儀器", en: "Instrument" },
    tool: { zh: "工具", en: "Tool" },
  };
  const E = {
    E01: { code: "TM-UNI", name: { zh: "萬用試驗機", en: "Universal Test Machine" }, kind: KIND.machine, stock: 2, loc: "M01", image: "" },
    E02: { code: "TM-PED32", name: { zh: "踏踩疲勞試驗機 (32\")", en: "Pedalling Fatigue Rig (32\")" }, kind: KIND.machine, stock: 1, loc: "M02", image: "" },
    E03: { code: "TM-BRK32", name: { zh: "煞車負載疲勞試驗機 (32\")", en: "Brakeload Fatigue Rig (32\")" }, kind: KIND.machine, stock: 1, loc: "M03", image: "" },
    E04: { code: "TM-IMP", name: { zh: "衝擊試驗台", en: "Impact Test Rig" }, kind: KIND.machine, stock: 1, loc: "M04", image: "" },
    E05: { code: "TM-STIFF", name: { zh: "剛性試驗台", en: "Stiffness Test Bench" }, kind: KIND.machine, stock: 1, loc: "M05", image: "" },
    E06: { code: "ACT-SH", name: { zh: "伺服液壓致動器", en: "Servo-Hydraulic Actuator" }, kind: KIND.actuator, stock: 4, loc: "M06", image: "" },
    E07: { code: "SEN-LC", name: { zh: "負載元 (Load Cell)", en: "Load Cell" }, kind: KIND.instr, stock: 4, loc: "I01", image: "" },
    E08: { code: "SYS-DAQ", name: { zh: "數據擷取／控制系統", en: "DAQ & Control Unit" }, kind: KIND.instr, stock: 2, loc: "I02", image: "" },
    E09: { code: "SEN-LVDT", name: { zh: "位移感測器 (LVDT)", en: "Displacement Sensor (LVDT)" }, kind: KIND.instr, stock: 4, loc: "I03", image: "" },
    E10: { code: "SEN-ANG", name: { zh: "角度感測器", en: "Angle Sensor" }, kind: KIND.instr, stock: 2, loc: "I04", image: "" },
    E11: { code: "TOOL-TQ", name: { zh: "校正扭力扳手", en: "Calibrated Torque Wrench" }, kind: KIND.tool, stock: 3, loc: "T10", image: "" },
    E12: { code: "TOOL-LVL", name: { zh: "水平儀", en: "Spirit Level" }, kind: KIND.tool, stock: 3, loc: "T11", image: "" },
  };
  window.DATA = window.DATA || {};
  window.DATA.EQUIPMENT = E;
})();
