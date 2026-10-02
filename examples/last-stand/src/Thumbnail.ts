// Title card: shown on the green flag until the player clicks (or presses space).
let clicked = false;

whenClicked(() => {
  clicked = true;
});

whenFlag(() => {
  clicked = false;
  goTo(0, 0);
  me.visible = true;
  goToFront();
  waitUntil(() => clicked || mouseDown() || keyPressed("space"));
  playSound("start");
  waitUntil(() => !mouseDown());
  me.visible = false;
  broadcast("new game");
});
