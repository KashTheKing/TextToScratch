// Title card: a sprite named "Thumbnail" starts on top of everything, so it's the first thing players
// see and it becomes the project's thumbnail when the project is saved. The green flag hides it.
whenFlag(() => {
  me.visible = false;
});
