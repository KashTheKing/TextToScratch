// The player: Input + Physics on screen, Camera to scroll the world.
import * as Input from "tts/input";
import * as Physics from "tts/physics";
import * as Camera from "tts/camera";
import * as Scene from "tts/scene";
import * as Anim from "tts/anim";
import { game, LEVEL_END } from "./Stage";

const SPAWN_X = -180;
const SPAWN_Y = -100;

// position in world coordinates
let wx = SPAWN_X;
let wy = SPAWN_Y;

function respawn() {
  wx = SPAWN_X;
  wy = SPAWN_Y;
  Physics.setVelocity(0, 0);
  Camera.lookAt(0, 0);
}

function animate() {
  if (Physics.vx > 0.5) pointInDirection(90);
  if (Physics.vx < -0.5) pointInDirection(-90);
  if (!Physics.onGround) Anim.show("jump");
  else if (Math.abs(Physics.vx) > 1) Anim.play("walk", 2, 8);
  else Anim.show("idle"); // standing still: one costume, no animation
}

whenFlag(() => {
  me.visible = false;
  me.rotationStyle = "left-right";
  Physics.configure(0.8, 0.8, 14);
  Physics.setHitbox("physics");
});

onMessage("scene play", () => {
  respawn();
  me.visible = true;
  goToFront();
  while (Scene.is("play")) {
    // 1. put the player on screen relative to the camera (world sprites were placed with this camera)
    Camera.place(wx, wy);
    // 2. input + physics, colliding with the level tiles on screen
    Physics.push(Input.axisX() * 1.2, 0);
    const jump = Input.jumpPressed();
    if (jump) Physics.jump(12);
    Physics.step("Level");
    animate();
    // 3. read the world position back and move the camera
    wx = Camera.toWorldX(me.x);
    wy = Camera.toWorldY(me.y);
    Camera.follow(wx, wy, 0.12);
    Camera.clampTo(0, 0, 960, 0);
    game.progress = (wx - SPAWN_X) / (LEVEL_END - SPAWN_X);
    // Scratch keeps sprites on stage (y can't go much below -180), so "fell in a pit" is just below the floor
    if (wy < -165) {
      Camera.shake(6);
      respawn();
    }
  }
  me.visible = false;
});
