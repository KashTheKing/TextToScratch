whenFlag(() => {
  goTo(200, 82);
  waitUntil(() => touching("Player"));
  broadcast("win");
});
