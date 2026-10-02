// Title card: shown until the player clicks to open the diner.
whenFlag(() => {
  switchCostume("thumbnail");
  goTo(0, 0);
  goToFront();
  me.visible = true;
  waitUntil(() => !mouseDown());
  waitUntil(() => mouseDown());
  me.visible = false;
  broadcast("new game");
});
