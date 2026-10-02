// A walkable 3D scene drawn with the pen: WASD / arrows to move and turn, Q/E to look up/down.
import * as ThreeD from "tts/3d";
import * as Input from "tts/input";
import * as Time from "tts/time";

let yaw = 0;
let pitch = -10;
let spin = 0;

/** A spinning pyramid with filled faces. */
function pyramid(x: number, z: number, size: number) {
  const h = size * 1.4;
  ThreeD.rotate(size, 0, spin);
  const ax = ThreeD.rx;
  const az = ThreeD.rz;
  ThreeD.rotate(0, size, spin);
  const bx = ThreeD.rx;
  const bz = ThreeD.rz;
  setPenColor("#FF6680");
  ThreeD.triangle3d(x + ax, 0, z + az, x + bx, 0, z + bz, x, h, z);
  setPenColor("#FFAB19");
  ThreeD.triangle3d(x + bx, 0, z + bz, x - ax, 0, z - az, x, h, z);
  setPenColor("#9966FF");
  ThreeD.triangle3d(x - ax, 0, z - az, x - bx, 0, z - bz, x, h, z);
  setPenColor("#4CBF56");
  ThreeD.triangle3d(x - bx, 0, z - bz, x + ax, 0, z + az, x, h, z);
}

whenFlag(() => {
  me.visible = false;
  ThreeD.setCamera(0, 60, -400, 0, pitch);
  ThreeD.setCulling(true);
  forever(() => {
    const dt = Time.delta();
    yaw += Input.axisX() * 90 * dt;
    if (keyPressed("q")) pitch = Math.min(45, pitch + 60 * dt);
    if (keyPressed("e")) pitch = Math.max(-45, pitch - 60 * dt);
    ThreeD.cam3d.yaw = yaw;
    ThreeD.cam3d.pitch = pitch;
    ThreeD.moveForward(Input.axisY() * 220 * dt);
    spin += 60 * dt;

    penClear();
    setPenColor("#4C97FF");
    ThreeD.grid(0, 80, 12);
    setPenColor("#FFFFFF");
    ThreeD.cube(-200, 40, 150, 80);
    ThreeD.cube(220, 60, 300, 120);
    ThreeD.box(0, 20, 500, 300, 40, 40);
    pyramid(0, 150, 60);
  });
});
