// Table of ambient API functions -> Scratch opcodes. Args are consumed positionally.
// s: shadow slot type ('n' number, 's' text, 'pn' positive, 'int' integer, 'whole', 'ang', 'col', 'b' boolean, 'msg' broadcast)
export type Slot = "n" | "s" | "pn" | "int" | "whole" | "ang" | "col" | "b" | "msg";
export type Arg =
  | { i: string; s: Slot; def?: string | number }
  | { i: string; menu: [string, string]; sp?: Record<string, string>; def?: string }
  | { f: string; map?: (v: string) => string };
export interface Spec {
  op: string;
  args?: Arg[];
  fx?: Record<string, string>; // fixed fields
  m?: Record<string, string>; // extra mutation attrs
}

const n = (i: string, s: Slot = "n"): Arg => ({ i, s });
const t = (i: string): Arg => ({ i, s: "s" });
const menu = (i: string, op: string, f = i, sp?: Record<string, string>, def?: string): Arg => ({ i, menu: [op, f], sp, def });
const fld = (f: string, map?: (v: string) => string): Arg => ({ f, map });
const up = (v: string) => v.toUpperCase();

const TARGET = { mouse: "_mouse_", random: "_random_", edge: "_edge_", myself: "_myself_", _stage_: "_stage_" };
const stop = (opt: string, hasnext: boolean): Spec => ({ op: "control_stop", fx: { STOP_OPTION: opt }, m: { hasnext: String(hasnext) } });

// Tables have no prototype, so names like `valueOf` or `toString` never match Object.prototype members.
const table = (o: object) => Object.assign(Object.create(null), o);

export const STACK: Record<string, Spec> = table({
  move: { op: "motion_movesteps", args: [n("STEPS")] },
  turnRight: { op: "motion_turnright", args: [n("DEGREES")] },
  turnLeft: { op: "motion_turnleft", args: [n("DEGREES")] },
  goTo: { op: "motion_gotoxy", args: [n("X"), n("Y")] },
  goToTarget: { op: "motion_goto", args: [menu("TO", "motion_goto_menu", "TO", TARGET)] },
  glide: { op: "motion_glidesecstoxy", args: [n("SECS"), n("X"), n("Y")] },
  glideToTarget: { op: "motion_glideto", args: [n("SECS"), menu("TO", "motion_glideto_menu", "TO", TARGET)] },
  pointInDirection: { op: "motion_pointindirection", args: [n("DIRECTION", "ang")] },
  pointTowards: { op: "motion_pointtowards", args: [menu("TOWARDS", "motion_pointtowards_menu", "TOWARDS", TARGET)] },
  bounceOnEdge: { op: "motion_ifonedgebounce" },

  say: { op: "looks_say", args: [t("MESSAGE")] },
  sayFor: { op: "looks_sayforsecs", args: [t("MESSAGE"), n("SECS")] },
  think: { op: "looks_think", args: [t("MESSAGE")] },
  thinkFor: { op: "looks_thinkforsecs", args: [t("MESSAGE"), n("SECS")] },
  switchCostume: { op: "looks_switchcostumeto", args: [menu("COSTUME", "looks_costume")] },
  nextCostume: { op: "looks_nextcostume" },
  switchBackdrop: { op: "looks_switchbackdropto", args: [menu("BACKDROP", "looks_backdrops")] },
  nextBackdrop: { op: "looks_nextbackdrop" },
  changeEffect: { op: "looks_changeeffectby", args: [fld("EFFECT", up), n("CHANGE")] },
  setEffect: { op: "looks_seteffectto", args: [fld("EFFECT", up), n("VALUE")] },
  clearEffects: { op: "looks_cleargraphiceffects" },
  goToFront: { op: "looks_gotofrontback", fx: { FRONT_BACK: "front" } },
  goToBack: { op: "looks_gotofrontback", fx: { FRONT_BACK: "back" } },
  moveForward: { op: "looks_goforwardbackwardlayers", args: [n("NUM", "int")], fx: { FORWARD_BACKWARD: "forward" } },
  moveBackward: { op: "looks_goforwardbackwardlayers", args: [n("NUM", "int")], fx: { FORWARD_BACKWARD: "backward" } },

  playSound: { op: "sound_play", args: [menu("SOUND_MENU", "sound_sounds_menu")] },
  playSoundUntilDone: { op: "sound_playuntildone", args: [menu("SOUND_MENU", "sound_sounds_menu")] },
  stopAllSounds: { op: "sound_stopallsounds" },
  setSoundEffect: { op: "sound_seteffectto", args: [fld("EFFECT", up), n("VALUE")] },
  changeSoundEffect: { op: "sound_changeeffectby", args: [fld("EFFECT", up), n("VALUE")] },
  clearSoundEffects: { op: "sound_cleareffects" },

  broadcast: { op: "event_broadcast", args: [n("BROADCAST_INPUT", "msg")] },
  broadcastAndWait: { op: "event_broadcastandwait", args: [n("BROADCAST_INPUT", "msg")] },

  wait: { op: "control_wait", args: [n("DURATION", "pn")] },
  stopAll: stop("all", false),
  stopThis: stop("this script", false),
  stopOthers: stop("other scripts in sprite", true),
  createClone: { op: "control_create_clone_of", args: [menu("CLONE_OPTION", "control_create_clone_of_menu", "CLONE_OPTION", TARGET, "myself")] },
  deleteClone: { op: "control_delete_this_clone" },

  askAndWait: { op: "sensing_askandwait", args: [t("QUESTION")] },
  resetTimer: { op: "sensing_resettimer" },

  penDown: { op: "pen_penDown" },
  penUp: { op: "pen_penUp" },
  penClear: { op: "pen_clear" },
  stamp: { op: "pen_stamp" },
  setPenColor: { op: "pen_setPenColorToColor", args: [n("COLOR", "col")] },
  setPenSize: { op: "pen_setPenSizeTo", args: [n("SIZE")] },
  changePenSize: { op: "pen_changePenSizeBy", args: [n("SIZE")] },
  setPenParam: { op: "pen_setPenColorParamTo", args: [menu("COLOR_PARAM", "pen_menu_colorParam", "colorParam"), n("VALUE")] },
  changePenParam: { op: "pen_changePenColorParamBy", args: [menu("COLOR_PARAM", "pen_menu_colorParam", "colorParam"), n("VALUE")] },
});

export const REPORT: Record<string, Spec> = table({
  touching: { op: "sensing_touchingobject", args: [menu("TOUCHINGOBJECTMENU", "sensing_touchingobjectmenu", "TOUCHINGOBJECTMENU", TARGET)] },
  touchingColor: { op: "sensing_touchingcolor", args: [n("COLOR", "col")] },
  distanceTo: { op: "sensing_distanceto", args: [menu("DISTANCETOMENU", "sensing_distancetomenu", "DISTANCETOMENU", TARGET)] },
  answer: { op: "sensing_answer" },
  keyPressed: { op: "sensing_keypressed", args: [menu("KEY_OPTION", "sensing_keyoptions")] },
  mouseDown: { op: "sensing_mousedown" },
  mouseX: { op: "sensing_mousex" },
  mouseY: { op: "sensing_mousey" },
  loudness: { op: "sensing_loudness" },
  timer: { op: "sensing_timer" },
  daysSince2000: { op: "sensing_dayssince2000" },
  username: { op: "sensing_username" },
  current: { op: "sensing_current", args: [fld("CURRENTMENU", up)] },
  valueOf: { op: "sensing_of", args: [menu("OBJECT", "sensing_of_object_menu", "OBJECT", TARGET), fld("PROPERTY")] },
  random: { op: "operator_random", args: [n("FROM"), n("TO")] },
});

export const MATHOP: Record<string, string> = table({
  sin: "sin", cos: "cos", tan: "tan", asin: "asin", acos: "acos", atan: "atan",
  "Math.abs": "abs", "Math.floor": "floor", "Math.ceil": "ceiling", "Math.sqrt": "sqrt",
  "Math.log": "ln", "Math.log10": "log", "Math.exp": "e ^",
});

export const HATS: Record<string, Spec> = table({
  whenFlag: { op: "event_whenflagclicked" },
  whenKey: { op: "event_whenkeypressed", args: [fld("KEY_OPTION")] },
  whenBackdrop: { op: "event_whenbackdropswitchesto", args: [fld("BACKDROP")] },
  whenGreater: { op: "event_whengreaterthan", args: [fld("WHENGREATERTHANMENU", up), n("VALUE")] },
  onClone: { op: "control_start_as_clone" },
  // whenClicked / onMessage are special-cased in compile.ts
});

interface Prop { get?: Spec; set?: [string, string, Slot?]; change?: [string, string] }
export const PROPS: Record<string, Prop> = table({
  x: { get: { op: "motion_xposition" }, set: ["motion_setx", "X"], change: ["motion_changexby", "DX"] },
  y: { get: { op: "motion_yposition" }, set: ["motion_sety", "Y"], change: ["motion_changeyby", "DY"] },
  direction: { get: { op: "motion_direction" }, set: ["motion_pointindirection", "DIRECTION", "ang"], change: ["motion_turnright", "DEGREES"] },
  size: { get: { op: "looks_size" }, set: ["looks_setsizeto", "SIZE"], change: ["looks_changesizeby", "CHANGE"] },
  volume: { get: { op: "sound_volume" }, set: ["sound_setvolumeto", "VOLUME"], change: ["sound_changevolumeby", "VOLUME"] },
  costumeNumber: { get: { op: "looks_costumenumbername", fx: { NUMBER_NAME: "number" } } },
  costumeName: { get: { op: "looks_costumenumbername", fx: { NUMBER_NAME: "name" } } },
  backdropNumber: { get: { op: "looks_backdropnumbername", fx: { NUMBER_NAME: "number" } } },
  backdropName: { get: { op: "looks_backdropnumbername", fx: { NUMBER_NAME: "name" } } },
  // visible / draggable / rotationStyle are special-cased (set only)
});

export const SHADOW: Record<string, number> = { n: 4, pn: 5, int: 7, whole: 6, ang: 8, col: 9, s: 10 };
