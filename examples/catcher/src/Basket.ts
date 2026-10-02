const SPEED = 9;

whenFlag(() => {
  me.visible = true;
  goToFront();
  goTo(0, -140);
  forever(() => {
    if (keyPressed("left arrow") || keyPressed("a")) me.x -= SPEED;
    if (keyPressed("right arrow") || keyPressed("d")) me.x += SPEED;
    me.x = Math.max(-200, Math.min(200, me.x));
  });
});

onMessage("game over", () => {
  me.visible = false;
});
